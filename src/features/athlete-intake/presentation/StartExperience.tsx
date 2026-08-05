"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { connectJourneyAnalysis, saveJourneyIntake } from "@/app/actions/journey-actions";
import { queueAnalysisVideo } from "@/app/actions/analysis-actions";
import { ensureContextSafetyReadiness, runSafetyPrecheck } from "@/app/actions/context-safety-actions";
import { deleteVideo, recordVideoMetadata, updateVideoCaptureContext } from "@/app/actions/video-actions";
import { createClient } from "@/lib/supabase/client";
import type { SportDefinition } from "@/lib/sports";

const MAX_BYTES = 150 * 1024 * 1024;
const MAX_SECONDS = 30.25;
const ACCEPTED = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);
const DRAFT_KEY = "acecoach-v6-intake-draft";

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
    video.onerror = () => reject(new Error("AceCoach could not read this video. Try MP4, MOV, M4V, or WEBM."));
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
    messages.push("The file is larger than 150 MB. Trim the clip before uploading.");
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
  const [video, setVideo] = useState<VideoCheck | null>(null);
  const [registered, setRegistered] = useState<RegisteredVideo | null>(null);
  const [movement, setMovement] = useState("");
  const [cameraAngle, setCameraAngle] = useState("unknown");
  const [shotSituation, setShotSituation] = useState("controlled_practice");
  const [shotIntent, setShotIntent] = useState("consistency");
  const [specificQuestion, setSpecificQuestion] = useState("");
  const [ageBand, setAgeBand] = useState(initialProfile.ageBand);
  const [playingLevel, setPlayingLevel] = useState(initialProfile.playingLevel);
  const [dominantSide, setDominantSide] = useState(initialProfile.dominantSide);
  const [primaryGoal, setPrimaryGoal] = useState(initialProfile.primaryGoal);
  const [silhouettePreference, setSilhouettePreference] = useState(initialProfile.silhouettePreference);
  const [heightCm, setHeightCm] = useState(initialProfile.heightCm?.toString() ?? "");
  const [consent, setConsent] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as Record<string, string>;
        if (draft.sportId !== sport.id) return;
        setMovement(draft.movement ?? "");
        setCameraAngle(draft.cameraAngle ?? "unknown");
        setShotSituation(draft.shotSituation ?? "controlled_practice");
        setShotIntent(draft.shotIntent ?? "consistency");
        setSpecificQuestion(draft.specificQuestion ?? "");
        setAgeBand(draft.ageBand ?? initialProfile.ageBand);
        setPlayingLevel(draft.playingLevel ?? initialProfile.playingLevel);
        setDominantSide(draft.dominantSide ?? initialProfile.dominantSide);
        setPrimaryGoal(draft.primaryGoal ?? initialProfile.primaryGoal);
        setSilhouettePreference(draft.silhouettePreference ?? initialProfile.silhouettePreference);
        setHeightCm(draft.heightCm ?? initialProfile.heightCm?.toString() ?? "");
      } catch {
        window.sessionStorage.removeItem(DRAFT_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialProfile, sport.id]);

  useEffect(() => {
    const draft = { sportId: sport.id, movement, cameraAngle, shotSituation, shotIntent, specificQuestion, ageBand, playingLevel, dominantSide, primaryGoal, silhouettePreference, heightCm };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [ageBand, cameraAngle, dominantSide, heightCm, movement, playingLevel, primaryGoal, shotIntent, shotSituation, silhouettePreference, specificQuestion, sport.id]);

  useEffect(() => () => { if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl); }, [video?.previewUrl]);

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the video.");
    } finally {
      setBusy(false);
    }
  }

  const guardianRequired = ageBand === "under_10" || ageBand === "10_12" || ageBand === "under_13";
  const ready = Boolean(video && video.quality !== "fail" && movement && ageBand && (!guardianRequired || guardianConsent) && playingLevel && dominantSide && consent && !busy);
  const readiness = [
    ["Video ready", Boolean(video && video.quality !== "fail")],
    ["Movement chosen", Boolean(movement)],
    [guardianRequired ? "Guardian confirmed" : "Age confirmed", Boolean(ageBand && (!guardianRequired || guardianConsent))],
    ["Playing level", Boolean(playingLevel)],
    ["Dominant side", Boolean(dominantSide)],
    ["Processing consent", consent],
  ] as const;
  const selectedMovement = useMemo(() => sport.actions.find((item) => item.id === movement), [movement, sport.actions]);

  async function analyze() {
    if (!video || !ready || !selectedMovement) return;
    setBusy(true);
    setError(null);
    try {
      setUploadStage("Saving your movement details");
      await saveJourneyIntake({ sportId: sport.id, ageBand, playingLevel, dominantSide, primaryGoal, silhouettePreference, heightCm: heightCm ? Number(heightCm) : null, serviceProcessing: consent, guardianConsent, actionType: movement, cameraAngle, shotSituation, shotIntent, specificQuestion });

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
          const saved = await recordVideoMetadata({ fileName: video.file.name, storagePath, strokeType: selectedMovement.label, sportId: sport.id, actionType: movement, duration: video.duration, fileSizeBytes: video.file.size, mimeType: video.file.type || "video/mp4", checksumSha256: checksum, captureContext: { cameraAngle, shotSituation, shotIntent, specificQuestion } });
          if (saved.storage_path !== storagePath) await supabase.storage.from("videos").remove([storagePath]);
          uploaded = { id: saved.id, storagePath: saved.storage_path, fileName: video.file.name };
          setRegistered(uploaded);
        } catch (cause) {
          await supabase.storage.from("videos").remove([storagePath]);
          throw cause;
        }
      } else {
        setUploadStage("Updating the shot context");
        await updateVideoCaptureContext(uploaded.id, { cameraAngle, shotSituation, shotIntent, specificQuestion });
      }
      setUploadStage("Creating your analysis session");
      const queued = await queueAnalysisVideo(
        uploaded.id,
        { cameraAngle, shotSituation, shotIntent, specificQuestion },
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
      setError(cause instanceof Error ? cause.message : "Unable to start the analysis.");
      setBusy(false);
      setUploadStage(null);
    }
  }

  const quality = video ? qualityPresentation(video.quality) : null;
  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">{sport.name} analysis</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">Upload one movement.<br />Tell us what we are seeing.</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">Tell us the stroke and a little about you so the feedback fits. We ask only for information that changes the analysis or coaching plan.</p>
      </div>

      <div className="mt-10 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">A · Your video</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Choose a short, clear clip</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">≤ 30 sec · ≤ 150 MB</span></div>
          {!video ? <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-800 shadow-sm"><UploadCloud className="h-7 w-7" /></span><span className="mt-5 text-lg font-semibold text-slate-950">Choose your {sport.name.toLowerCase()} video</span><span className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Keep the full athlete, both feet, and the racket, bat, or equipment visible. Include two to five repetitions where possible.</span></button> : (
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
          <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,.m4v" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">{sport.filmingTips.slice(0, 3).map((tip) => <div key={tip} className="rounded-xl bg-slate-50 p-3.5">{tip}</div>)}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">B · About this movement</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">What movement is in the video?</h2><p className="mt-2 text-sm leading-6 text-slate-600">AceCoach will check your selection, but it will never silently replace it.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Movement or stroke <span className="text-rose-600">*</span><select value={movement} onChange={(event) => setMovement(event.target.value)} className={inputClass} required><option value="">Choose the movement</option>{sport.actions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Camera angle<select value={cameraAngle} onChange={(event) => setCameraAngle(event.target.value)} className={inputClass}><option value="unknown">Not sure</option><option value="side">Side view</option><option value="rear">Rear view</option><option value="front">Front view</option><option value="diagonal">Diagonal view</option></select></label>
            <label className="text-sm font-medium text-slate-700">Shot situation<select value={shotSituation} onChange={(event) => setShotSituation(event.target.value)} className={inputClass}><option value="controlled_practice">Controlled practice or feed</option><option value="neutral_rally">Neutral rally ball</option><option value="attacking">Attacking ball</option><option value="defensive_on_run">Defensive or on the run</option><option value="return_of_serve">Return of serve</option><option value="unknown">Not sure</option></select></label>
            <label className="text-sm font-medium text-slate-700">Main intention<select value={shotIntent} onChange={(event) => setShotIntent(event.target.value)} className={inputClass}><option value="consistency">Consistency and control</option><option value="depth">Depth</option><option value="heavy_topspin">Heavier topspin</option><option value="flatter_drive">Flatter drive</option><option value="angle">Create angle</option><option value="approach">Approach the net</option><option value="defensive_height">Defensive height and time</option><option value="unknown">Not sure</option></select></label>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">Specific question <span className="font-normal text-slate-400">optional</span><textarea value={specificQuestion} onChange={(event) => setSpecificQuestion(event.target.value)} maxLength={500} rows={3} className={`${inputClass} py-3`} placeholder="Example: Why does my forehand feel rushed?" /></label>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">C · About you</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Only what changes the coaching</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Age band <span className="text-rose-600">*</span><select value={ageBand} onChange={(event) => { setAgeBand(event.target.value); setGuardianConsent(false); }} className={inputClass}><option value="">Choose age band</option><option value="under_10">Under 10</option><option value="10_12">10–12</option><option value="13_15">13–15</option><option value="16_18">16–18</option><option value="19_29">19–29</option><option value="30_39">30–39</option><option value="40_49">40–49</option><option value="50_59">50–59</option><option value="60_plus">60+</option></select></label>
            <label className="text-sm font-medium text-slate-700">Playing level <span className="text-rose-600">*</span><select value={playingLevel} onChange={(event) => setPlayingLevel(event.target.value)} className={inputClass}><option value="">Choose level</option><option value="new">New to the sport</option><option value="beginner">Beginner</option><option value="developing">Developing</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="competitive">Competitive</option><option value="coach_professional">Coach / professional</option></select></label>
            <label className="text-sm font-medium text-slate-700">Dominant side <span className="text-rose-600">*</span><select value={dominantSide} onChange={(event) => setDominantSide(event.target.value)} className={inputClass}><option value="">Choose side</option><option value="right">Right</option><option value="left">Left</option></select></label>
            <label className="text-sm font-medium text-slate-700">Height <span className="font-normal text-slate-400">optional</span><div className="relative"><input value={heightCm} onChange={(event) => setHeightCm(event.target.value.replace(/[^0-9.]/g, "").slice(0, 5))} inputMode="decimal" min={80} max={230} className={`${inputClass} pr-12`} placeholder="175" /><span className="pointer-events-none absolute bottom-3.5 right-3.5 text-sm text-slate-400">cm</span></div><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Helps scale body-relative reach and spacing. It does not turn one camera into a laboratory 3D measurement.</span></label>
            <label className="text-sm font-medium text-slate-700">Reference body style<select value={silhouettePreference} onChange={(event) => setSilhouettePreference(event.target.value)} className={inputClass}><option value="player-matched">Player-proportioned</option><option value="neutral">Neutral</option><option value="female">Female</option><option value="male">Male</option></select></label>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">Primary goal <span className="font-normal text-slate-400">optional</span><input value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value)} maxLength={180} className={inputClass} placeholder="Improve control and timing" /></label>
          <label className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-blue-800" /><span className="text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-950">Allow AceCoach to process this video for your analysis.</span><br />This is required for the service. It is separate from any optional model-training or research consent.</span></label>
          {guardianRequired ? <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"><input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-800" /><span className="text-sm leading-6 text-amber-950"><span className="font-semibold">Parent or guardian confirmation required.</span><br />I am the parent or guardian managing this athlete’s account and I approve this analysis.</span></label> : null}
        </section>

        {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{error}</div> : null}
        {busy ? <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><LoaderCircle className="h-5 w-5 animate-spin" />{uploadStage ?? "Preparing your analysis"}</div> : null}

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-300/40 backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div><div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-700" />Your original remains private and downloadable.</div><ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">{readiness.map(([label, done]) => <li key={label} className={done ? "text-emerald-700" : ""}>{done ? "✓" : "○"} {label}</li>)}</ul></div>
          <button type="button" onClick={analyze} disabled={!ready} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173F6A] px-6 font-semibold text-white shadow-sm transition hover:bg-[#103554] disabled:cursor-not-allowed disabled:bg-slate-300 sm:mt-0 sm:w-auto">Analyze my video<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
