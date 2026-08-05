"use client";

import { motion } from "framer-motion";
import { AlertTriangle, FileVideo2, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";

import { analyzeVideo } from "@/app/actions/analysis-actions";
import AnalysisProgressOverlay from "@/components/analysis/AnalysisProgressOverlay";
import { deleteVideo, getVideoDownloadUrl, recordVideoMetadata } from "@/app/actions/video-actions";
import { Button } from "@/components/ui/button";
import { getSport, supportedSports } from "@/lib/sports";
import { readPendingUploads, writePendingUploads, type PendingUploadRecord } from "@/features/upload";
import { createClient } from "@/lib/supabase/client";

import CapturePreflight, { type CaptureCandidate } from "./CapturePreflight";
import UploadHistory from "./UploadHistory";

const MAX_ANALYSIS_SECONDS = 30;
const MIN_RECOMMENDED_WIDTH = 720;

export type UploadedVideo = {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  progress: number;
  status: "Uploading" | "Completed";
  strokeType: string;
  sportId: string;
  sportName: string;
  actionType: string;
  actionLabel: string;
  storagePath?: string;
  previewUrl?: string;
  durationSeconds?: number | null;
};

type VideoUploaderProps = {
  initialUploads?: UploadedVideo[];
  initialSportId?: string;
  initialActionType?: string;
};

type VideoMetadata = { durationSeconds: number | null; width: number | null; height: number | null };

function safeStorageName(name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "";
  const stem = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "video";
  return `${stem}${extension}`;
}

async function readVideoMetadata(file: File): Promise<VideoMetadata> {
  if (!file.type.startsWith("video/")) return { durationSeconds: null, width: null, height: null };
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ durationSeconds: null, width: null, height: null });
    }, 8_000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const metadata = {
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      };
      cleanup();
      resolve(metadata);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve({ durationSeconds: null, width: null, height: null });
    };
    video.src = url;
  });
}

function assessCandidate(file: File, metadata: VideoMetadata): CaptureCandidate {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (metadata.durationSeconds !== null && metadata.durationSeconds > MAX_ANALYSIS_SECONDS + 0.25) {
    blockers.push(`Trim the clip to ${MAX_ANALYSIS_SECONDS} seconds or less. Short clips process faster and reduce dead-time.`);
  }
  if (metadata.durationSeconds !== null && metadata.durationSeconds < 1.5) blockers.push("The clip is too short to contain a complete movement.");
  if (metadata.width !== null && metadata.width < MIN_RECOMMENDED_WIDTH) warnings.push("Resolution is below 720 pixels wide. Pose tracking may be less stable.");
  if (metadata.width && metadata.height && metadata.height > metadata.width) warnings.push("Portrait video can work, but landscape usually preserves the racket area, feet, and recovery space better.");
  if (metadata.durationSeconds === null) warnings.push("The browser could not read video metadata. The server will validate the file before analysis.");
  return { id: crypto.randomUUID(), file, ...metadata, warnings, blockers };
}

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(); } catch (cause) {
      lastError = cause;
      if (attempt < attempts) await new Promise((resolve) => window.setTimeout(resolve, 450 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The operation failed after retrying.");
}

export default function VideoUploader({ initialUploads, initialSportId = "tennis", initialActionType }: VideoUploaderProps) {
  const router = useRouter();
  const startingSport = getSport(initialSportId);
  const startingAction = startingSport.actions.some((action) => action.id === initialActionType) ? initialActionType! : startingSport.actions[0].id;

  const [uploads, setUploads] = useState<UploadedVideo[]>(initialUploads ?? []);
  const [sportId, setSportId] = useState(startingSport.id);
  const [actionType, setActionType] = useState(startingAction);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportReady, setReportReady] = useState<{ sessionId: string; fileName: string } | null>(null);
  const [candidates, setCandidates] = useState<CaptureCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recoveredPending, setRecoveredPending] = useState<PendingUploadRecord[]>(() => typeof window === "undefined" ? [] : readPendingUploads(window.localStorage));
  const previewUrls = useRef(new Set<string>());

  const sport = useMemo(() => getSport(sportId), [sportId]);
  const selectedAction = useMemo(() => sport.actions.find((action) => action.id === actionType) ?? sport.actions[0], [actionType, sport]);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);


  function persistPending(record: PendingUploadRecord | null, localId: string) {
    const current = readPendingUploads(window.localStorage).filter((item) => item.localId !== localId);
    const next = record ? [record, ...current] : current;
    writePendingUploads(window.localStorage, next);
    setRecoveredPending(next);
  }

  function handleSportChange(nextSportId: string) {
    const nextSport = getSport(nextSportId);
    setSportId(nextSport.id);
    setActionType(nextSport.actions[0].id);
    setCandidates([]);
    setError(null);
  }

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      setError(rejectedFiles.map(({ file, errors }) => `${file.name}: ${errors.map((item) => item.message).join(", ")}`).join(" "));
      return;
    }
    if (acceptedFiles.length === 0) return;
    setError(null);
    setReportReady(null);
    const assessed = await Promise.all(acceptedFiles.map(async (file) => assessCandidate(file, await readVideoMetadata(file))));
    setCandidates(assessed);
  }, []);

  const uploadCandidates = useCallback(async () => {
    if (candidates.length === 0 || candidates.some((candidate) => candidate.blockers.length > 0)) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setUploading(false);
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError(userError?.message ?? "Unable to identify your account.");
      setUploading(false);
      return;
    }

    try {
      for (const candidate of candidates) {
        const file = candidate.file;
        const storageFileName = `${Date.now()}-${crypto.randomUUID()}-${safeStorageName(file.name)}`;
        const storagePath = `${user.id}/${sport.id}/${storageFileName}`;
        const uploadId = crypto.randomUUID();
        const timestamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.add(previewUrl);

        setUploads((current) => [{ id: uploadId, fileName: file.name, size: file.size, uploadedAt: timestamp, progress: 8, status: "Uploading", strokeType: selectedAction.label, sportId: sport.id, sportName: sport.name, actionType: selectedAction.id, actionLabel: selectedAction.label, storagePath, previewUrl, durationSeconds: candidate.durationSeconds }, ...current]);
        persistPending({ localId: uploadId, fileName: file.name, fileSize: file.size, sportId: sport.id, actionType: selectedAction.id, storagePath, status: "uploading", attempt: 1, updatedAt: new Date().toISOString() }, uploadId);

        try {
          const checksumSha256 = await sha256(file);
          const uploadResult = await withRetry(async () => {
            const result = await supabase.storage.from("videos").upload(storagePath, file, { cacheControl: "3600", upsert: false, contentType: file.type || "video/mp4" });
            if (result.error) throw new Error(result.error.message);
            return result;
          });
          void uploadResult;
          persistPending({ localId: uploadId, fileName: file.name, fileSize: file.size, sportId: sport.id, actionType: selectedAction.id, storagePath, status: "registering", attempt: 1, updatedAt: new Date().toISOString() }, uploadId);

          try {
            const savedVideo = await recordVideoMetadata({ fileName: file.name, storagePath, strokeType: selectedAction.label, sportId: sport.id, actionType: selectedAction.id, duration: candidate.durationSeconds, fileSizeBytes: file.size, mimeType: file.type || "video/mp4", checksumSha256 });
            if (savedVideo.storage_path !== storagePath) await supabase.storage.from("videos").remove([storagePath]);
            setUploads((current) => current.map((upload) => upload.id === uploadId ? { ...upload, id: savedVideo.id, storagePath: savedVideo.storage_path, sportId: savedVideo.sport_id, actionType: savedVideo.action_type, progress: 100, status: "Completed" } : upload));
            persistPending(null, uploadId);
            setCandidates((current) => current.filter((item) => item.id !== candidate.id));
          } catch (metadataError) {
            await supabase.storage.from("videos").remove([storagePath]);
            throw metadataError;
          }
        } catch (uploadError) {
          setUploads((current) => current.filter((upload) => upload.id !== uploadId));
          URL.revokeObjectURL(previewUrl);
          previewUrls.current.delete(previewUrl);
          persistPending({ localId: uploadId, fileName: file.name, fileSize: file.size, sportId: sport.id, actionType: selectedAction.id, storagePath, status: "failed", attempt: 3, updatedAt: new Date().toISOString() }, uploadId);
          throw uploadError;
        }
      }
      setCandidates([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, [candidates, selectedAction.id, selectedAction.label, sport.id, sport.name]);

  const onAnalyze = useCallback(async (video: UploadedVideo) => {
    setAnalyzingId(video.id);
    setError(null);
    setReportReady(null);
    try {
      const { sessionId } = await analyzeVideo(video.id);
      setReportReady({ sessionId, fileName: video.fileName });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze this video right now.");
    } finally {
      setAnalyzingId(null);
    }
  }, []);

  const onDownload = useCallback(async (video: UploadedVideo) => {
    setError(null);
    try {
      const { url } = await getVideoDownloadUrl(video.id);
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download the original video.");
    }
  }, []);

  const onDelete = useCallback(async (video: UploadedVideo) => {
    if (!window.confirm(`Delete “${video.fileName}” and its analysis reports? This cannot be undone.`)) return;
    setDeletingId(video.id);
    setError(null);
    try {
      await deleteVideo(video.id);
      if (video.previewUrl) {
        URL.revokeObjectURL(video.previewUrl);
        previewUrls.current.delete(video.previewUrl);
      }
      setUploads((current) => current.filter((upload) => upload.id !== video.id));
      if (reportReady?.fileName === video.fileName) setReportReady(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the video.");
    } finally {
      setDeletingId(null);
    }
  }, [reportReady, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "video/mp4": [".mp4", ".m4v"], "video/quicktime": [".mov"], "video/webm": [".webm"] }, maxSize: 500 * 1024 * 1024, multiple: true, disabled: uploading });
  const inputClass = "w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/60";

  const analyzingVideo = uploads.find((item) => item.id === analyzingId) ?? null;

  return (
    <div className="space-y-6">
      {analyzingVideo ? <AnalysisProgressOverlay fileName={analyzingVideo.fileName} /> : null}
      {recoveredPending.length > 0 ? <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" /><div className="flex-1"><p className="font-semibold text-white">AceCoach found {recoveredPending.length} interrupted upload record{recoveredPending.length === 1 ? "" : "s"}</p><p className="mt-2 text-sm leading-6 text-slate-300">Browsers cannot restore the original file bytes after a refresh. Choose the same file again; its SHA-256 checksum prevents a duplicate video record.</p></div><button type="button" onClick={() => { writePendingUploads(window.localStorage, []); setRecoveredPending([]); }} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Dismiss interrupted upload notice"><X className="h-4 w-4" /></button></div></div> : null}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Capture setup</p><h2 className="mt-2 text-2xl font-semibold text-white">Choose the movement, then upload a clean clip</h2></div><div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">MP4, MOV, M4V, WEBM · ≤ {MAX_ANALYSIS_SECONDS}s · ≤ 500 MB</div></div>
        <div className="mt-7 grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm text-slate-300">Sport<select value={sportId} onChange={(event) => handleSportChange(event.target.value)} className={inputClass}>{supportedSports.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="space-y-2 text-sm text-slate-300">Intended movement<select value={actionType} onChange={(event) => { setActionType(event.target.value); setCandidates([]); }} className={inputClass}>{sport.actions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select></label></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{sport.filmingTips.map((tip, index) => <div key={tip} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300"><ShieldCheck className="h-4 w-4" /> Capture {index + 1}</div><p className="mt-2 text-sm leading-6 text-slate-400">{tip}</p></div>)}</div>
        <div {...getRootProps()} className={`mt-6 rounded-[1.75rem] border border-dashed p-8 text-center transition ${isDragActive ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-slate-950/70 hover:border-emerald-500/30"} ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}><input {...getInputProps()} /><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><UploadCloud className="h-8 w-8" /></div><h3 className="mt-5 text-xl font-semibold text-white">{isDragActive ? "Drop the clip here" : `Choose ${sport.name} · ${selectedAction.label} footage`}</h3><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">AceCoach checks duration, resolution, and orientation before upload, then applies server-side athlete visibility and pose-quality gates.</p><Button type="button" className="mt-6 rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400" disabled={uploading}><FileVideo2 className="mr-2 h-4 w-4" />Choose video files</Button></div>
        {error ? <div role="alert" className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      </motion.div>

      {candidates.length > 0 ? <CapturePreflight candidates={candidates} uploading={uploading} onCancel={() => setCandidates([])} onConfirm={uploadCandidates} /> : null}

      {reportReady ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100"><p className="font-semibold">Analysis complete for {reportReady.fileName}</p><p className="mt-1 text-sm text-emerald-100/70">Open the synchronized video, coach summary, repetition lab, and measurable practice plan.</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" onClick={() => router.push(`/report/${reportReady.sessionId}`)} className="rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400">View coaching report</Button><Button type="button" variant="outline" onClick={() => setReportReady(null)} className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10">Dismiss</Button></div></div> : null}

      <UploadHistory uploads={uploads} analyzingId={analyzingId} deletingId={deletingId} onAnalyze={onAnalyze} onDownload={onDownload} onDelete={onDelete} />
    </div>
  );
}
