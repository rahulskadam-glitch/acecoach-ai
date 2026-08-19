"use client";

import { AlertTriangle, ArrowRight, Camera, CheckCircle2, Images, LoaderCircle, RefreshCw, ShieldCheck, Target, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { connectJourneyAnalysis, saveJourneyIntake } from "@/app/actions/journey-actions";
import { queueAnalysisVideo } from "@/app/actions/analysis-actions";
import { ensureContextSafetyReadiness, runSafetyPrecheck } from "@/app/actions/context-safety-actions";
import { deleteVideo, recordVideoMetadata, updateVideoCaptureContext } from "@/app/actions/video-actions";
import { createClient } from "@/lib/supabase/client";
import { normalizePlayerAgeBand, PLAYER_AGE_BANDS, requiresGuardianConfirmation } from "@/lib/athlete/age-bands";
import type { SportDefinition } from "@/lib/sports";

import PreRecordingChecklistModal from "./PreRecordingChecklistModal";
import VideoCaptureMasterGuide from "./VideoCaptureMasterGuide";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB capacity
const MAX_SECONDS = 30.25;
const ACCEPTED = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);
// Versioned so drafts created with the retired overlapping 16–18 band cannot
// incorrectly require guardian approval for an adult player.
const DRAFT_KEY = "athlentra-tennis-intake-v2";

type VideoCheck = {
  file: File;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
  quality: "good" | "warning" | "fail";
  messages: string[];
};

type RegisteredVideo = {
  id: string;
  storagePath: string;
  fileName: string;
};

type InitialProfile = {
  ageBand: string;
  playingLevel: string;
  dominantSide: string;
  primaryGoal: string;
  silhouettePreference: string;
  heightCm: number | null;
};

function safeFilename(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) || "movement.mp4";
}

async function fileMetadata(file: File): Promise<VideoCheck> {
  const previewUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = previewUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Athlentra could not read this video. Try MP4, MOV, M4V, or WEBM."));
  });
  const duration = Number(video.duration || 0);
  const width = video.videoWidth;
  const height = video.videoHeight;
  const messages: string[] = [];
  let quality: VideoCheck["quality"] = "good";
  if (!ACCEPTED.has(file.type || "video/mp4")) {
    quality = "fail";
    messages.push("This video format is not supported.");
  }
  if (file.size > MAX_BYTES) {
    quality = "fail";
    messages.push(`The file is ${(file.size / (1024 * 1024)).toFixed(1)} MB (max 50 MB). Trim the clip before uploading.`);
  }
  if (duration < 1.5 || duration > MAX_SECONDS) {
    quality = "fail";
    messages.push("Use a clip between 1.5 and 30 seconds.");
  }
  if (width < 640 || height < 360) {
    quality = quality === "fail" ? "fail" : "warning";
    messages.push("The resolution is low; smaller movement details may be unavailable.");
  }
  if (height > width) {
    quality = quality === "fail" ? "fail" : "warning";
    messages.push("Landscape video usually keeps the full athlete and equipment visible.");
  }
  if (messages.length === 0) messages.push("File type, duration, size, and resolution passed the local check.");
  return { file, previewUrl, duration, width, height, quality, messages };
}

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function qualityPresentation(quality: VideoCheck["quality"]) {
  if (quality === "good") return { title: "Good to analyze", style: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: CheckCircle2 };
  if (quality === "warning") return { title: "Usable with limitations", style: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle };
  return { title: "Record again for a reliable report", style: "border-rose-200 bg-rose-50 text-rose-900", icon: X };
}

export default function StartExperience({ userId, sport, initialProfile }: { userId: string; sport: SportDefinition; initialProfile: InitialProfile }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<VideoCheck | null>(null);
  const [registered, setRegistered] = useState<RegisteredVideo | null>(null);
  const [movement, setMovement] = useState("");
  const [cameraAngle, setCameraAngle] = useState("side");
  const [courtSurface, setCourtSurface] = useState("hard_court");
  const [footworkStance, setFootworkStance] = useState("auto_detect");
  const [shotSituation, setShotSituation] = useState("controlled_practice");
  const [shotIntent, setShotIntent] = useState("consistency");
  const [specificQuestion, setSpecificQuestion] = useState("");
  const [ageBand, setAgeBand] = useState(() => normalizePlayerAgeBand(initialProfile.ageBand));
  const [playingLevel, setPlayingLevel] = useState(initialProfile.playingLevel);
  const [dominantSide, setDominantSide] = useState(initialProfile.dominantSide || "right");
  const [primaryGoal, setPrimaryGoal] = useState(initialProfile.primaryGoal);
  const [silhouettePreference, setSilhouettePreference] = useState(initialProfile.silhouettePreference);
  const [heightCm, setHeightCm] = useState(initialProfile.heightCm?.toString() ?? "");
  const [consent, setConsent] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklistTarget, setChecklistTarget] = useState<"camera" | "upload" | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as Record<string, string>;
        if (draft.sportId !== sport.id) return;
        const savedMovement = draft.movement ?? "";
        setMovement(sport.actions.some((action) => action.id === savedMovement) ? savedMovement : "");
        setCameraAngle(draft.cameraAngle ?? "side");
        setCourtSurface(draft.courtSurface ?? "hard_court");
        setFootworkStance(draft.footworkStance ?? "auto_detect");
        setShotSituation(draft.shotSituation ?? "controlled_practice");
        setShotIntent(draft.shotIntent ?? "consistency");
        setSpecificQuestion(draft.specificQuestion ?? "");
        setAgeBand(normalizePlayerAgeBand(draft.ageBand ?? initialProfile.ageBand));
        setPlayingLevel(draft.playingLevel ?? initialProfile.playingLevel);
        setDominantSide(draft.dominantSide ?? initialProfile.dominantSide ?? "right");
        setPrimaryGoal(draft.primaryGoal ?? initialProfile.primaryGoal);
        setSilhouettePreference(draft.silhouettePreference ?? initialProfile.silhouettePreference);
        setHeightCm(draft.heightCm ?? initialProfile.heightCm?.toString() ?? "");
      } catch {
        window.sessionStorage.removeItem(DRAFT_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialProfile, sport.actions, sport.id]);

  useEffect(() => {
    const draft = {
      sportId: sport.id,
      movement,
      cameraAngle,
      courtSurface,
      footworkStance,
      shotSituation,
      shotIntent,
      specificQuestion,
      ageBand,
      playingLevel,
      dominantSide,
      primaryGoal,
      silhouettePreference,
      heightCm,
    };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [ageBand, cameraAngle, courtSurface, dominantSide, footworkStance, heightCm, movement, playingLevel, primaryGoal, shotIntent, shotSituation, silhouettePreference, specificQuestion, sport.id]);

  useEffect(() => () => { if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl); }, [video?.previewUrl]);

  function handleInitiateRecord() {
    try {
      if (window.sessionStorage.getItem("athlentra_skip_recording_checklist") === "true") {
        cameraInputRef.current?.click();
        return;
      }
    } catch {
      // ignore
    }
    setChecklistTarget("camera");
  }

  function handleInitiateUpload() {
    try {
      if (window.sessionStorage.getItem("athlentra_skip_recording_checklist") === "true") {
        inputRef.current?.click();
        return;
      }
    } catch {
      // ignore
    }
    setChecklistTarget("upload");
  }

  function handleConfirmChecklist() {
    const target = checklistTarget;
    setChecklistTarget(null);
    if (target === "camera") {
      cameraInputRef.current?.click();
    } else if (target === "upload") {
      inputRef.current?.click();
    }
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl);
    if (registered) {
      setError("Remove the uploaded video before selecting a replacement.");
      return;
    }
    try {
      setVideo(await fileMetadata(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read the video.");
    }
  }

  async function removeRegistered() {
    if (!registered) return;
    if (!window.confirm(`Delete “${registered.fileName}”? This removes the uploaded original and any linked analysis.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteVideo(registered.id);
      setRegistered(null);
      setVideo(null);
      if (inputRef.current) inputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the video.");
    } finally {
      setBusy(false);
    }
  }

  const guardianRequired = requiresGuardianConfirmation(ageBand);
  const numericHeight = Number(heightCm);
  const validHeight = Number.isFinite(numericHeight) && numericHeight >= 80 && numericHeight <= 230;
  const requirementsMet = Boolean(
    video
    && video.quality !== "fail"
    && movement
    && cameraAngle
    && ageBand
    && (!guardianRequired || guardianConsent)
    && playingLevel
    && dominantSide
    && validHeight
    && consent
  );
  const ready = requirementsMet && !busy;
  const readiness = [
    ["Stroke chosen", Boolean(movement)],
    ["Camera angle set", Boolean(cameraAngle)],
    ["Video ready", Boolean(video && video.quality !== "fail")],
    [guardianRequired ? "Guardian confirmed" : "Age confirmed", Boolean(ageBand && (!guardianRequired || guardianConsent))],
    ["Playing level", Boolean(playingLevel)],
    ["Dominant side", Boolean(dominantSide)],
    ["Height", validHeight],
    ["Processing consent", consent],
  ] as const;
  const selectedMovement = useMemo(() => sport.actions.find((item) => item.id === movement), [movement, sport.actions]);

  async function analyze() {
    if (!video || !ready || !selectedMovement) return;
    setBusy(true);
    setError(null);
    try {
      setUploadStage("Saving your movement details");
      await saveJourneyIntake({
        sportId: sport.id,
        ageBand,
        playingLevel,
        dominantSide,
        primaryGoal,
        silhouettePreference,
        heightCm: numericHeight,
        serviceProcessing: consent,
        guardianConsent,
        actionType: movement,
        cameraAngle,
        shotSituation,
        shotIntent,
        courtSurface,
        footworkStance,
        specificQuestion,
      });

      setUploadStage("Verifying profile and consent safeguards");
      await ensureContextSafetyReadiness({
        ageBand,
        playingLevel,
        dominantSide,
        guardianConsent,
      });

      setUploadStage("Running safety precheck");
      const checksum = await sha256(video.file);
      const precheck = await runSafetyPrecheck(checksum);

      let uploaded = registered;
      if (!uploaded) {
        setUploadStage("Uploading your original video");
        const storagePath = `${userId}/${sport.id}/${Date.now()}-${crypto.randomUUID()}-${safeFilename(video.file.name)}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage.from("videos").upload(storagePath, video.file, { upsert: false, contentType: video.file.type || "video/mp4", cacheControl: "3600" });
        if (uploadError) throw new Error(uploadError.message);
        try {
          setUploadStage("Confirming upload ownership");
          const saved = await recordVideoMetadata({
            fileName: video.file.name,
            storagePath,
            strokeType: selectedMovement.label,
            sportId: sport.id,
            actionType: movement,
            duration: video.duration,
            fileSizeBytes: video.file.size,
            mimeType: video.file.type || "video/mp4",
            checksumSha256: checksum,
            captureContext: { cameraAngle, shotSituation, shotIntent, courtSurface, footworkStance, specificQuestion },
          });
          if (saved.storage_path !== storagePath) await supabase.storage.from("videos").remove([storagePath]);
          uploaded = { id: saved.id, storagePath: saved.storage_path, fileName: video.file.name };
          setRegistered(uploaded);
        } catch (cause) {
          await supabase.storage.from("videos").remove([storagePath]);
          throw cause;
        }
      } else {
        setUploadStage("Updating the shot context");
        await updateVideoCaptureContext(uploaded.id, { cameraAngle, shotSituation, shotIntent, courtSurface, footworkStance, specificQuestion });
      }
      setUploadStage("Creating your analysis session");
      const queued = await queueAnalysisVideo(
        uploaded.id,
        { cameraAngle, shotSituation, shotIntent, courtSurface, footworkStance, specificQuestion },
        {
          sourceVideoHash: checksum,
          precheckStatus: precheck.status,
          message: precheck.message,
        },
      );
      await connectJourneyAnalysis(queued.sessionId, uploaded.id);
      window.sessionStorage.removeItem(DRAFT_KEY);
      router.push(`/analysis/${queued.sessionId}`);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Unable to start the analysis.";
      if (/exceeded|size|413|large/i.test(msg)) {
        setError("This video exceeds the 50 MB storage limit. Please trim the video to a single stroke (3–8 seconds) or record in 1080p/720p.");
      } else if (/Load failed|NetworkError|fetch/i.test(msg)) {
        setError("Video upload was interrupted. Please ensure a stable connection and try a shorter 3–6 second video clip.");
      } else {
        setError(msg);
      }
      setBusy(false);
      setUploadStage(null);
    }
  }

  const quality = video ? qualityPresentation(video.quality) : null;
  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#d6e2cf] bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#40916c] focus:ring-2 focus:ring-[#c9a227]/30";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#40916c]">{sport.name} analysis</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">Which stroke are we working on?</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">Select your stroke, confirm the camera view, then record or upload a short clip.</p>
      </div>

      <div className="mt-10 space-y-6">
        {/* Step 1: Pick a stroke (Mandatory) */}
        <section className="ath-card p-5 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#40916c]">1 · Select stroke</p>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-rose-700">Required</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sport.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                aria-pressed={movement === action.id}
                onClick={() => setMovement(action.id)}
                className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                  movement === action.id
                    ? "border-[#1b4332] bg-[#1b4332] text-white shadow-lg ring-2 ring-[#d7e022]"
                    : "border-[#d6e2cf] bg-[#e6ede0] text-slate-800 hover:border-[#52705f] hover:bg-white"
                }`}
              >
                <Target className={`h-4 w-4 ${movement === action.id ? "text-[#d7e022]" : "text-[#40916c]"}`} />
                <span className="mt-3 block text-sm font-semibold">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Camera Angle & Court Environment */}
        {movement ? (
          <section className="ath-card p-5 sm:p-8 animate-in fade-in duration-200">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#40916c]">2 · Camera & Court Setup</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Help the AI calibrate angles</h2>
            
            <div className="mt-5 space-y-5">
              {/* Camera Angle (1-Tap Pill Selector) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Camera Angle <span className="text-rose-600">*</span></label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "side", label: "Side View (90°)", desc: "Best for swing lag" },
                    { id: "rear", label: "Behind Baseline", desc: "Best for trajectory" },
                    { id: "diagonal", label: "Diagonal (45°)", desc: "Best for 3D depth" },
                    { id: "front", label: "Facing Player", desc: "Best for head balance" },
                  ].map((angle) => (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => setCameraAngle(angle.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        cameraAngle === angle.id
                          ? "border-[#1b4332] bg-[#1b4332] text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span className="block text-xs font-bold">{angle.label}</span>
                      <span className={`mt-0.5 block text-[0.65rem] ${cameraAngle === angle.id ? "text-[#d7e022]" : "text-slate-500"}`}>{angle.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Chips: Court Surface & Footwork Stance */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Court Surface</label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { id: "hard_court", label: "Hard Court" },
                      { id: "clay", label: "Clay" },
                      { id: "grass", label: "Grass" },
                      { id: "indoor", label: "Indoor" },
                    ].map((surf) => (
                      <button
                        key={surf.id}
                        type="button"
                        onClick={() => setCourtSurface(surf.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          courtSurface === surf.id
                            ? "bg-[#1b4332] text-white font-semibold shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {surf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Shot Situation</label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { id: "controlled_practice", label: "Controlled Feed" },
                      { id: "neutral_rally", label: "Rally" },
                      { id: "attacking", label: "Attacking" },
                      { id: "defensive_on_run", label: "On the run" },
                    ].map((sit) => (
                      <button
                        key={sit.id}
                        type="button"
                        onClick={() => setShotSituation(sit.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          shotSituation === sit.id
                            ? "bg-[#1b4332] text-white font-semibold shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {sit.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Step 3: Add Video */}
        {movement ? (
          <section className="ath-card p-5 sm:p-8 animate-in fade-in duration-200 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#40916c]">3 · Add video</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Record {selectedMovement?.label.toLowerCase()}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#e6ede0] px-3 py-1.5 text-xs font-medium text-[#40916c]">≤ 30 sec</span>
            </div>

            {/* Visual Do's & Don'ts Master Recording Guide */}
            <VideoCaptureMasterGuide />

            {!video ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="relative min-h-60 overflow-hidden rounded-2xl bg-[#1b4332] p-5 text-white">
                  <div className="absolute inset-x-8 bottom-7 top-16 border border-white/15 [transform:perspective(420px)_rotateX(58deg)]"><div className="absolute inset-x-0 top-1/2 border-t border-white/20" /><div className="absolute bottom-0 left-1/2 top-0 border-l border-white/20" /></div>
                  <div className="relative flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-[#d7e022]" />Frame the full movement</div>
                  <div className="absolute bottom-6 left-1/2 h-28 w-14 -translate-x-1/2"><span className="absolute left-4 top-0 h-8 w-8 rounded-full bg-[#8AD8FF]" /><span className="absolute left-7 top-8 h-14 border-l-[6px] border-white" /><span className="absolute left-1 top-11 w-12 rotate-12 border-t-[5px] border-white" /><span className="absolute bottom-0 left-2 h-12 rotate-[24deg] border-l-[6px] border-white" /><span className="absolute bottom-0 right-1 h-12 -rotate-[24deg] border-r-[6px] border-white" /></div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Before you record</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    {["Turn the phone sideways (landscape or clean portrait).", "Stand 4–6 metres (15–20 ft) away at chest height.", "Keep full body, feet, racket, and ball path visible.", "Capture 4 clean repetitions in good light (10–25s)."].map((tip) => <li key={tip} className="flex gap-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{tip}</li>)}
                  </ul>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={handleInitiateRecord} className="ath-primary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm"><Camera className="h-4 w-4" />Record</button>
                    <button type="button" onClick={handleInitiateUpload} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d6e2cf] bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-[#e6ede0]"><Images className="h-4 w-4" />Choose video</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"><video src={video.previewUrl} controls playsInline className="aspect-video h-full w-full object-contain" /></div>
                <div className="space-y-4">
                  {quality ? <div className={`rounded-2xl border p-4 ${quality.style}`}><div className="flex items-center gap-2 font-semibold"><quality.icon className="h-5 w-5" />{quality.title}</div><ul className="mt-3 space-y-2 text-sm leading-6">{video.messages.map((message) => <li key={message}>• {message}</li>)}</ul></div> : null}
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-900">{video.file.name}</p><p className="mt-1">{video.duration.toFixed(1)} sec · {video.width}×{video.height} · {(video.file.size / 1024 / 1024).toFixed(1)} MB</p></div>
                  {registered ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />Upload completed</div><p className="mt-2 leading-6">The original is registered securely and can be downloaded from My videos.</p></div> : null}
                  <div className="flex flex-wrap gap-3">{registered ? <button type="button" onClick={removeRegistered} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete video</button> : <button type="button" onClick={() => { setVideo(null); if (inputRef.current) inputRef.current.value = ""; }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Replace video</button>}</div>
                </div>
              </div>
            )}
            <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,.m4v" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />

            <PreRecordingChecklistModal
              isOpen={checklistTarget !== null}
              targetAction={checklistTarget}
              cameraAngle={cameraAngle}
              strokeLabel={selectedMovement?.label ?? "Your Stroke"}
              onClose={() => setChecklistTarget(null)}
              onConfirm={handleConfirmChecklist}
            />
          </section>
        ) : null}

        {/* Step 4: Player details */}
        {movement ? (
          <section className="ath-card p-6 sm:p-8 animate-in fade-in duration-200">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#40916c]">4 · Player details</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Personalize your biomechanics</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Dominant hand <span className="text-rose-600">*</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["right", "left"].map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setDominantSide(side)}
                      className={`min-h-11 rounded-xl border text-sm font-bold capitalize transition ${
                        dominantSide === side
                          ? "border-[#1b4332] bg-[#1b4332] text-white shadow-sm"
                          : "border-[#d6e2cf] bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {side} Handed
                    </button>
                  ))}
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Height <span className="text-rose-600">*</span>
                <div className="relative">
                  <input
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
                    inputMode="decimal"
                    type="number"
                    min={80}
                    max={230}
                    required
                    className={`${inputClass} pr-12`}
                    placeholder="175"
                  />
                  <span className="pointer-events-none absolute bottom-3.5 right-3.5 text-sm text-slate-400">cm</span>
                </div>
                <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Used to scale body-relative reach and spacing.</span>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Age band <span className="text-rose-600">*</span>
                <select value={ageBand} onChange={(event) => { setAgeBand(normalizePlayerAgeBand(event.target.value)); setGuardianConsent(false); }} className={inputClass}>
                  <option value="">Choose age band</option>
                  {PLAYER_AGE_BANDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Athlentra is available to players aged 13 and older.</span>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Playing level <span className="text-rose-600">*</span>
                <select value={playingLevel} onChange={(event) => setPlayingLevel(event.target.value)} className={inputClass}>
                  <option value="">Choose level</option>
                  <option value="new">New to the sport</option>
                  <option value="beginner">Beginner</option>
                  <option value="developing">Developing</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="competitive">Competitive</option>
                  <option value="coach_professional">Coach / professional</option>
                </select>
              </label>
            </div>
            
            <label className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-blue-800" />
              <span className="text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-950">Allow Athlentra to process this video for your analysis.</span><br />This is required for the service. It is separate from any optional model-training or research consent.</span>
            </label>
            {guardianRequired ? (
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-800" />
                <span className="text-sm leading-6 text-amber-950"><span className="font-semibold">Parent or guardian approval</span><br />I am the parent or guardian for this player and approve this video analysis.</span>
              </label>
            ) : null}
          </section>
        ) : null}

        {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{error}</div> : null}
        {busy ? <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><LoaderCircle className="h-5 w-5 animate-spin" />{uploadStage ?? "Preparing your analysis"}</div> : null}

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-300/40 backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-700" />Private and under your control</div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">{readiness.map(([label, done]) => <li key={label} className={done ? "text-emerald-700" : ""}>{done ? "✓" : "○"} {label}</li>)}</ul>
          </div>
          <button
            type="button"
            onClick={analyze}
            disabled={!ready}
            aria-disabled={!ready}
            className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition sm:mt-0 sm:w-auto ${
              requirementsMet
                ? "bg-[#1b4332] text-white shadow-[0_10px_24px_rgba(7,27,45,0.2)] hover:bg-[#12324a] focus-visible:ring-2 focus-visible:ring-[#1b4332] focus-visible:ring-offset-2"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            } ${busy ? "cursor-wait" : ""}`}
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Starting analysis…" : "Analyze my video"}
            {!busy ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
