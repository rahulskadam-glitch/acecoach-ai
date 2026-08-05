"use client";

import { ChevronLeft, ChevronRight, Eye, EyeOff, Pause, Play, RotateCcw, SlidersHorizontal, Sparkles, Target, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getReferenceExperience, type AthleteReferenceContext } from "@/lib/reference/registry";
import type { AnalysisReport } from "@/modules/analysis/types";
import { concise, plainLanguage } from "../model/plain-language";
import HumanSilhouette, { type SilhouetteStyle } from "../motion/HumanSilhouette";
import {
  MOTION_STAGES,
  nearestFrame,
  poseAtProgress,
  progressForTime,
  stageAnchors,
  stageForTime,
  stagePose,
  type JointName,
  type MotionStage,
  type Point,
  type Pose,
} from "../motion/motion-model";

function preferredStyle(gender?: string | null): SilhouetteStyle {
  const value = (gender ?? "").toLowerCase();
  if (value.includes("female") || value.includes("woman") || value.includes("girl")) return "female";
  if (value.includes("male") || value.includes("man") || value.includes("boy")) return "male";
  return "neutral";
}

function activeJoint(stage: MotionStage, side: "left" | "right"): JointName {
  if (stage === "loading" || stage === "recovery") return `${side}_ankle` as JointName;
  if (stage === "preparation") return `${side}_wrist` as JointName;
  return `${side}_wrist` as JointName;
}

function stageTitle(stage: MotionStage) {
  return MOTION_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

function simpleStageCopy(stage: MotionStage) {
  const copy: Record<MotionStage, { player: string; category: string; elite: string; target: string }> = {
    preparation: {
      player: "Check whether your body and racket are ready before the forward swing starts.",
      category: "Turn early enough to create time and comfortable spacing.",
      elite: "Top players prepare early while keeping options open.",
      target: "Prepare earlier",
    },
    loading: {
      player: "Check your base, balance, and the space you create before accelerating.",
      category: "Use the legs and body to support the swing—not the arm alone.",
      elite: "Top players load smoothly and keep the head stable.",
      target: "Build a stable base",
    },
    swing: {
      player: "Check whether the hand and racket travel smoothly toward the ball.",
      category: "Let the body start the movement and the racket follow.",
      elite: "Top players accelerate in a clear sequence from body to racket.",
      target: "Smooth the swing path",
    },
    contact: {
      player: "Check the distance between your body and the estimated contact point.",
      category: "Meet the ball with space and balance.",
      elite: "Top players protect a stable contact window while adapting to the ball.",
      target: "Create space at contact",
    },
    finish: {
      player: "Check whether the finish stays balanced and matches the intended shot.",
      category: "Allow the racket to slow down naturally without losing posture.",
      elite: "Top players finish freely while staying ready for the next movement.",
      target: "Finish under control",
    },
    recovery: {
      player: "Check how quickly you return to a useful ready position.",
      category: "Recover immediately after the finish.",
      elite: "Top players connect the end of one shot to the start of the next.",
      target: "Recover sooner",
    },
  };
  return copy[stage];
}

function swingPath(actionType: string, tier: "category" | "elite", side: "left" | "right", level?: string | null) {
  return Array.from({ length: 26 }, (_, index) => {
    const pose = poseAtProgress(actionType, tier, side, index / 25, level);
    return pose[`${side}_wrist` as JointName];
  });
}

function userTargetPoint(frame: ReturnType<typeof nearestFrame>, categoryPose: Pose, joint: JointName): Point | null {
  const landmarks = frame?.keyLandmarks;
  if (!landmarks) return null;
  const leftShoulder = landmarks.left_shoulder;
  const rightShoulder = landmarks.right_shoulder;
  const current = landmarks[joint];
  if (!leftShoulder || !rightShoulder || !current) return null;
  const userCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
  const userWidth = Math.max(Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y), 0.08);
  const categoryCenter = {
    x: (categoryPose.left_shoulder.x + categoryPose.right_shoulder.x) / 2,
    y: (categoryPose.left_shoulder.y + categoryPose.right_shoulder.y) / 2,
  };
  const categoryWidth = Math.max(Math.hypot(
    categoryPose.right_shoulder.x - categoryPose.left_shoulder.x,
    categoryPose.right_shoulder.y - categoryPose.left_shoulder.y,
  ), 0.08);
  const relative = {
    x: (categoryPose[joint].x - categoryCenter.x) / categoryWidth,
    y: (categoryPose[joint].y - categoryCenter.y) / categoryWidth,
  };
  return { x: userCenter.x + relative.x * userWidth, y: userCenter.y + relative.y * userWidth };
}

function PlayerCueOverlay({
  frame,
  stage,
  categoryPose,
  side,
}: {
  frame: ReturnType<typeof nearestFrame>;
  stage: MotionStage;
  categoryPose: Pose;
  side: "left" | "right";
}) {
  const joint = activeJoint(stage, side);
  const current = frame?.keyLandmarks?.[joint];
  const target = userTargetPoint(frame, categoryPose, joint);
  if (!current || !target) return null;
  const markerId = `player-arrow-${stage}`;
  const path = `M ${current.x * 100} ${current.y * 100} Q ${((current.x + target.x) / 2) * 100} ${(Math.min(current.y, target.y) - 0.08) * 100} ${target.x * 100} ${target.y * 100}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#fb7185" /></marker>
      </defs>
      <path d={path} fill="none" stroke="#fb7185" strokeWidth="1.1" strokeDasharray="2 2" markerEnd={`url(#${markerId})`} />
      <circle cx={current.x * 100} cy={current.y * 100} r="2.1" fill="rgba(251,113,133,.18)" stroke="#fb7185" strokeWidth="0.7" />
      <circle cx={target.x * 100} cy={target.y * 100} r="2.5" fill="rgba(52,211,153,.16)" stroke="#34d399" strokeWidth="0.7" />
    </svg>
  );
}

export default function SynchronizedHumanComparison({
  videoUrl,
  report,
  sportId,
  actionType,
  athleteContext,
}: {
  videoUrl: string;
  report: AnalysisReport;
  sportId: string;
  actionType: string;
  athleteContext?: AthleteReferenceContext;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const primaryIndex = report.frameSummary?.primaryRepetitionIndex ?? report.repetitions?.[0]?.index ?? null;
  const primary = report.repetitions?.find((item) => item.index === primaryIndex) ?? report.repetitions?.[0];
  const start = primary?.startSeconds ?? 0;
  const end = primary?.endSeconds ?? Math.max(report.frameSummary?.durationSeconds ?? 1, 1);
  const anchors = useMemo(() => stageAnchors(report, start, end), [end, report, start]);
  const [time, setTime] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.5);
  const [stage, setStage] = useState<MotionStage>("preparation");
  const [appearanceMode, setAppearanceMode] = useState<"player-matched" | SilhouetteStyle>("player-matched");
  const [showGuides, setShowGuides] = useState(false);
  const style = appearanceMode === "player-matched" ? preferredStyle(athleteContext?.gender) : appearanceMode;
  const frames = useMemo(() => report.frameSummary?.frameMetrics ?? [], [report.frameSummary?.frameMetrics]);
  const currentFrame = useMemo(() => nearestFrame(frames, time), [frames, time]);
  const progress = progressForTime(time, start, end);
  const side: "left" | "right" = (athleteContext?.dominantSide ?? report.frameSummary?.dominantSide ?? "right").toLowerCase().startsWith("left") ? "left" : "right";
  const categoryPose = poseAtProgress(actionType, "category", side, progress, athleteContext?.playingLevel);
  const elitePose = poseAtProgress(actionType, "elite", side, progress, athleteContext?.playingLevel);
  const joint = activeJoint(stage, side);
  const categoryStagePose = stagePose(actionType, stage, "category", side, athleteContext?.playingLevel);
  const eliteStagePose = stagePose(actionType, stage, "elite", side, athleteContext?.playingLevel);
  const reference = useMemo(() => getReferenceExperience(sportId, actionType, athleteContext), [actionType, athleteContext, sportId]);
  const checkpoint = reference?.checkpoints.find((item) => item.id === stage)
    ?? reference?.checkpoints.find((item) => (stage === "swing" || stage === "finish") && (item.id === "contact" || item.id === "recovery"));
  const area = report.coachingAreas?.find((item) => {
    const id = item.id.toLowerCase();
    if (stage === "preparation") return id.includes("prepar") || id.includes("backlift");
    if (stage === "loading") return id.includes("load") || id.includes("foot") || id.includes("base");
    if (stage === "swing") return id.includes("swing") || id.includes("hand") || id.includes("sequence");
    if (stage === "contact") return id.includes("contact") || id.includes("spacing");
    if (stage === "finish") return id.includes("finish") || id.includes("follow");
    return id.includes("recover");
  });
  const defaultCopy = simpleStageCopy(stage);

  function updateFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    const next = video.currentTime;
    if (next >= end) {
      video.currentTime = start;
      setTime(start);
      setStage("preparation");
    } else {
      setTime(next);
      setStage(stageForTime(next, anchors));
    }
    if (!video.paused) animationRef.current = requestAnimationFrame(updateFromVideo);
  }

  useEffect(() => () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }, []);

  useEffect(() => {
    function handleSeek(event: Event) {
      const custom = event as CustomEvent<{ time?: number }>;
      if (typeof custom.detail?.time !== "number") return;
      seek(custom.detail.time);
      document.getElementById("watch-compare")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("acecoach:seek-video", handleSeek);
    return () => window.removeEventListener("acecoach:seek-video", handleSeek);
  });

  function seek(next: number) {
    const value = Math.max(start, Math.min(end, next));
    if (videoRef.current) videoRef.current.currentTime = value;
    setTime(value);
    setStage(stageForTime(value, anchors));
  }

  async function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < start || video.currentTime >= end) video.currentTime = start;
      video.playbackRate = rate;
      try {
        await video.play();
      } catch {
        setPlaying(false);
        return;
      }
      setPlaying(true);
      animationRef.current = requestAnimationFrame(updateFromVideo);
    } else {
      video.pause();
      setPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }

  function changeRate(value: number) {
    setRate(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  }

  return (
    <section id="watch-compare" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/72 shadow-2xl shadow-black/25">
      <div className="border-b border-white/10 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">2 · Watch and compare</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">See your movement beside two synchronized human models</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Your video stays clean by default and acts as the master clock. The two semi-transparent reference bodies follow the same stroke phase. Turn on one difference guide only when you need it.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
              <SlidersHorizontal className="h-4 w-4 text-violet-300" />
              Reference body
              <select value={appearanceMode} onChange={(event) => setAppearanceMode(event.target.value as "player-matched" | SilhouetteStyle)} className="bg-transparent font-semibold text-white outline-none">
                <option value="player-matched">Player-proportioned</option><option value="neutral">Neutral</option><option value="female">Female</option><option value="male">Male</option>
              </select>
            </label>
            <button type="button" onClick={() => setShowGuides((value) => !value)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${showGuides ? "border-rose-400/30 bg-rose-400/10 text-rose-100" : "border-white/10 bg-slate-950/60 text-slate-300"}`}>{showGuides ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showGuides ? "Hide difference guide" : "Compare one difference"}</button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {MOTION_STAGES.map((item) => (
            <button key={item.id} type="button" onClick={() => seek(anchors[item.id])} className={`rounded-full px-4 py-2 text-sm font-medium transition ${stage === item.id ? "bg-violet-400 text-slate-950" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>{item.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-6">
        <article className="overflow-hidden rounded-2xl border border-rose-500/25 bg-slate-950/75">
          <div className="flex items-center gap-2 border-b border-white/10 p-4 text-rose-200"><Target className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.15em]">Your movement</p></div>
          <div className="relative aspect-video overflow-hidden bg-black">
            <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" className="h-full w-full object-contain" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onLoadedMetadata={() => seek(start)} />
            {showGuides ? <PlayerCueOverlay frame={currentFrame} stage={stage} categoryPose={categoryStagePose} side={side} /> : null}
            <div className="absolute left-3 top-3 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-white backdrop-blur"><span className="font-semibold text-rose-200">{stageTitle(stage)}</span> · {time.toFixed(2)} s</div>
          </div>
          <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">What we see</p><p className="mt-2 text-sm leading-6 text-slate-300">{concise(area?.observation ?? defaultCopy.player, 170)}</p></div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-sky-500/25 bg-slate-950/75">
          <div className="flex items-center gap-2 border-b border-white/10 p-4 text-sky-200"><Users className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.15em]">Your next target</p></div>
          <div className="aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,.15),transparent_42%),#020617] p-2">
            <HumanSilhouette pose={categoryPose} style={style} dominantSide={side} color="#38bdf8" outline="#7dd3fc" opacity={0.46} label="Category human movement model" swingPath={swingPath(actionType, "category", side, athleteContext?.playingLevel)} activeJoint={joint} targetPoint={categoryStagePose[joint]} targetLabel={defaultCopy.target} />
          </div>
          <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Appropriate for your level</p><p className="mt-2 text-sm leading-6 text-slate-300">{concise(checkpoint?.focus ?? area?.coachingGoal ?? defaultCopy.category, 170)}</p></div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-slate-950/75">
          <div className="flex items-center gap-2 border-b border-white/10 p-4 text-emerald-200"><Sparkles className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.15em]">Best-in-class principle</p></div>
          <div className="aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,.15),transparent_42%),#020617] p-2">
            <HumanSilhouette pose={elitePose} style={style} dominantSide={side} color="#34d399" outline="#6ee7b7" opacity={0.54} label="Best-in-class human movement model" swingPath={swingPath(actionType, "elite", side)} activeJoint={joint} targetPoint={eliteStagePose[joint]} targetLabel="Advanced pattern" />
          </div>
          <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Pattern to notice</p><p className="mt-2 text-sm leading-6 text-slate-300">{concise(checkpoint?.eliteFocus ?? defaultCopy.elite, 170)}</p></div>
        </article>
      </div>

      <div className="border-t border-white/10 bg-slate-950/65 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => seek(start)} className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-300 hover:text-white" aria-label="Restart stroke"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={() => seek(time - 1 / Math.max(report.frameSummary?.fps ?? 30, 1))} className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-300 hover:text-white" aria-label="Previous frame"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={toggle} className="flex items-center gap-2 rounded-full bg-violet-400 px-5 py-3 font-semibold text-slate-950 hover:bg-violet-300">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? "Pause" : "Play together"}</button>
          <button type="button" onClick={() => seek(time + 1 / Math.max(report.frameSummary?.fps ?? 30, 1))} className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-300 hover:text-white" aria-label="Next frame"><ChevronRight className="h-4 w-4" /></button>
          {[0.1, 0.25, 0.5, 1].map((value) => <button key={value} type="button" onClick={() => changeRate(value)} className={`rounded-full px-4 py-2 text-sm ${rate === value ? "border border-violet-300 bg-violet-400/15 text-violet-100" : "border border-white/10 text-slate-400"}`}>{value}×</button>)}
          <p className="ml-auto text-sm text-slate-500">{Math.round(progress * 100)}% through the selected swing</p>
        </div>
        <input type="range" min={start} max={end} step={1 / Math.max(report.frameSummary?.fps ?? 30, 1)} value={Math.min(Math.max(time, start), end)} onChange={(event) => seek(Number(event.target.value))} className="mt-4 w-full accent-violet-400" aria-label="Synchronized swing timeline" />
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-300"><span className="font-semibold text-white">Use this cue:</span> “{plainLanguage(area?.cue ?? report.coachingPlaybook?.feelCue ?? report.priorities[0]?.cue ?? "Move smoothly through the target.")}”</div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Player-proportioned mode uses the saved side, level, and selected body-style preference. This release does not reconstruct the athlete’s face or clothing and does not claim motion-capture accuracy.</p>
      </div>
    </section>
  );
}
