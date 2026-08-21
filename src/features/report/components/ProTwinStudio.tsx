"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  SplitSquareVertical,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisReport } from "../../../modules/analysis/types";
import HumanSilhouette from "../motion/HumanSilhouette";
import {
  interpolatePoses,
  MOTION_STAGES,
  type MotionStage,
  type Pose,
} from "../motion/motion-model";
import {
  getProArchetypesForAction,
  PRO_ARCHETYPES,
  type ProArchetypeId,
} from "../motion/pro-archetypes";

type ProTwinStudioProps = {
  report: AnalysisReport;
  actionType: string;
  currentStage: MotionStage;
  currentTime?: number;
  onSeekToStage: (stage: MotionStage) => void;
  dominantSide?: "left" | "right";
  videoUrl?: string;
};

type ViewMode = "side_by_side" | "curtain_wipe";

const STAGE_SEQUENCE: MotionStage[] = [
  "ready",
  "unit_turn",
  "backswing",
  "forward_swing_contact",
  "follow_through",
  "recovery",
];

const STAGE_BOUNDS = [0.0, 0.18, 0.42, 0.65, 0.85, 1.0];

export default function ProTwinStudio({
  actionType,
  currentStage,
  onSeekToStage,
  dominantSide = "right",
  videoUrl,
}: ProTwinStudioProps) {
  const availableArchetypes = useMemo(() => getProArchetypesForAction(actionType), [actionType]);
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<ProArchetypeId | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("side_by_side");
  const [wipePercent, setWipePercent] = useState<number>(50);

  // 60FPS Kinematic Stroke Loop Player
  const [isAnimatingTwin, setIsAnimatingTwin] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<0.5 | 1.0>(1.0);
  const [animatedPose, setAnimatedPose] = useState<Pose | null>(null);

  // Smooth Morphing Transition Tween between individual stages
  const [transitionPose, setTransitionPose] = useState<Pose | null>(null);
  const prevStageRef = useRef<MotionStage>(currentStage);
  const prevArchetypeRef = useRef(PRO_ARCHETYPES.alcaraz_modern);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeArchetype = useMemo(() => {
    if (selectedArchetypeId && availableArchetypes.some((a) => a.id === selectedArchetypeId)) {
      return PRO_ARCHETYPES[selectedArchetypeId];
    }
    return availableArchetypes[0] ?? PRO_ARCHETYPES.alcaraz_modern;
  }, [selectedArchetypeId, availableArchetypes]);

  const currentProPose: Pose = activeArchetype.stagePoses[currentStage];
  const stageMetric = activeArchetype.telemetryByStage[currentStage];

  // 60FPS Kinematic Interpolation Loop
  useEffect(() => {
    if (!isAnimatingTwin) return;

    let frameId: number;
    let startTime: number | null = null;
    const duration = 2200 / animSpeed;

    const animateLoop = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) % duration;
      const progress = elapsed / duration;

      let segIdx = 0;
      for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
        if (progress >= STAGE_BOUNDS[i] && progress < STAGE_BOUNDS[i + 1]) {
          segIdx = i;
          break;
        }
      }

      const stageA = STAGE_SEQUENCE[segIdx % STAGE_SEQUENCE.length];
      const stageB = STAGE_SEQUENCE[(segIdx + 1) % STAGE_SEQUENCE.length];
      const segStart = STAGE_BOUNDS[segIdx];
      const segEnd = STAGE_BOUNDS[segIdx + 1] ?? 1.0;
      const localT = (progress - segStart) / (segEnd - segStart);

      const poseA = activeArchetype.stagePoses[stageA];
      const poseB = activeArchetype.stagePoses[stageB];
      const lerped = interpolatePoses(poseA, poseB, Math.max(0, Math.min(1, localT)));

      setAnimatedPose(lerped);
      frameId = requestAnimationFrame(animateLoop);
    };

    frameId = requestAnimationFrame(animateLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isAnimatingTwin, animSpeed, activeArchetype]);

  // Smooth Morphing Transition Tween between individual stages
  useEffect(() => {
    if (isAnimatingTwin) return;

    const prevStage = prevStageRef.current;
    const prevArchetype = prevArchetypeRef.current;

    if (prevStage === currentStage && prevArchetype.id === activeArchetype.id) return;

    const fromPose = prevArchetype.stagePoses[prevStage];
    const toPose = activeArchetype.stagePoses[currentStage];

    let start: number | null = null;
    let animId: number;
    const tweenDuration = 240;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / tweenDuration);
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      const interpolated = interpolatePoses(fromPose, toPose, easeProgress);
      setTransitionPose(interpolated);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setTransitionPose(null);
        prevStageRef.current = currentStage;
        prevArchetypeRef.current = activeArchetype;
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [currentStage, activeArchetype, isAnimatingTwin]);

  const activeProPoseToRender = isAnimatingTwin && animatedPose ? animatedPose : transitionPose ?? currentProPose;

  const stageTime = useMemo(() => {
    const map: Record<MotionStage, number> = {
      ready: 0.15,
      unit_turn: 0.45,
      backswing: 0.85,
      forward_swing_contact: 1.2,
      follow_through: 1.45,
      recovery: 1.7,
    };
    return map[currentStage] ?? 1.2;
  }, [currentStage]);

  const stageIndex = STAGE_SEQUENCE.indexOf(currentStage);

  return (
    <div className="space-y-3.5">
      {/* 🍏 HERO FULL-BLEED VIDEO & 3D MOTION STUDIO CONTAINER */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ath-navy">
        {/* Top Floating Controls Bar */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
          {/* Pro Archetype Switcher Pill */}
          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur-xl shadow-lg">
            {availableArchetypes.map((a) => {
              const isSelected = a.id === activeArchetype.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedArchetypeId(a.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-black transition ${
                    isSelected
                      ? "bg-white text-slate-950 shadow-md"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.themeColor }} />
                  <span>{a.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Pill (50/50 Dual vs Curtain Wipe) */}
          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur-xl shadow-lg">
            <button
              type="button"
              onClick={() => setViewMode("side_by_side")}
              className={`rounded-full px-3 py-1 text-[0.65rem] font-black transition ${
                viewMode === "side_by_side"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              50/50 Dual
            </button>
            <button
              type="button"
              onClick={() => setViewMode("curtain_wipe")}
              className={`rounded-full px-3 py-1 text-[0.65rem] font-black transition ${
                viewMode === "curtain_wipe"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Curtain Wipe
            </button>
          </div>
        </div>

        {/* 🎬 MAIN DUAL VIEWPORT CANVAS */}
        {viewMode === "side_by_side" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 pt-14 pb-3 px-3 gap-3">
            {/* Left Box: Athlete 60FPS Video */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <SplitSquareVertical className="h-8 w-8 text-slate-600 mb-1" />
                  <p className="text-xs font-bold text-slate-300">Athlete 60FPS Video</p>
                  <p className="text-[0.62rem] text-slate-500">{stageTime.toFixed(2)}s Sync Frame</p>
                </div>
              )}
              <div className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[0.62rem] font-bold text-white backdrop-blur border border-white/10">
                Your Stroke
              </div>
            </div>

            {/* Right Box: Pro 3D Motion Twin */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#081525] border border-white/10 flex items-center justify-center">
              <HumanSilhouette
                pose={activeProPoseToRender}
                dominantSide={dominantSide}
                themeColor={activeArchetype.themeColor}
                color={activeArchetype.themeColor}
                label={activeArchetype.name}
              />
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[0.62rem] font-bold text-white backdrop-blur border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeArchetype.themeColor }} />
                <span>{activeArchetype.name}</span>
              </div>
            </div>
          </div>
        ) : (
          /* CURTAIN WIPE OVERLAY MODE */
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden pt-12">
            {/* Background: Athlete Video */}
            <div className="absolute inset-0 h-full w-full bg-slate-900 flex items-center justify-center">
              {videoUrl ? (
                <video ref={videoRef} src={videoUrl} playsInline muted className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <SplitSquareVertical className="h-10 w-10 text-slate-600 mb-1" />
                  <p className="text-xs font-bold text-slate-300">Athlete Video</p>
                </div>
              )}
            </div>

            {/* Foreground: Pro Twin clipped by Wipe Percent */}
            <div
              className="absolute inset-0 h-full overflow-hidden bg-[#081525]/90 pointer-events-none"
              style={{ clipPath: `polygon(${wipePercent}% 0, 100% 0, 100% 100%, ${wipePercent}% 100%)` }}
            >
              <HumanSilhouette
                pose={activeProPoseToRender}
                dominantSide={dominantSide}
                themeColor={activeArchetype.themeColor}
                color={activeArchetype.themeColor}
                label={activeArchetype.name}
              />
            </div>

            {/* Curtain Wipe Slider Handle */}
            <div
              className="absolute inset-y-0 z-20 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
              style={{ left: `${wipePercent}%` }}
            >
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl text-xs font-black">
                ⇄
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={wipePercent}
              onChange={(e) => setWipePercent(Number(e.target.value))}
              className="absolute inset-0 h-full w-full opacity-0 cursor-ew-resize z-30"
              aria-label="Curtain Wipe Split Position"
            />
          </div>
        )}

        {/* Bottom Video Action Bar (Play/Pause & 0.5x Slow-Mo) */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAnimatingTwin(!isAnimatingTwin)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition ${
                isAnimatingTwin
                  ? "bg-rose-500 text-white shadow-rose-500/30"
                  : "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
              }`}
            >
              {isAnimatingTwin ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isAnimatingTwin ? "Pause" : "Play 60FPS"}</span>
            </button>

            <button
              type="button"
              onClick={() => setAnimSpeed(animSpeed === 0.5 ? 1.0 : 0.5)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[0.68rem] font-bold text-slate-300 hover:text-white"
            >
              {animSpeed}x Speed
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prev = (stageIndex - 1 + STAGE_SEQUENCE.length) % STAGE_SEQUENCE.length;
                onSeekToStage(STAGE_SEQUENCE[prev]);
              }}
              className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 active:scale-95"
              aria-label="Previous Phase"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs font-bold text-slate-300">
              Phase {stageIndex + 1} / 6
            </span>
            <button
              type="button"
              onClick={() => {
                const next = (stageIndex + 1) % STAGE_SEQUENCE.length;
                onSeekToStage(STAGE_SEQUENCE[next]);
              }}
              className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 active:scale-95"
              aria-label="Next Phase"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 🍏 6-STAGE TIMELINE SCRUBBER PILL BAR */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {MOTION_STAGES.map((s, idx) => {
          const isCurrent = s.id === currentStage;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setIsAnimatingTwin(false);
                setAnimatedPose(null);
                onSeekToStage(s.id);
              }}
              className={`rounded-2xl p-2.5 text-center transition active:scale-95 border ${
                isCurrent
                  ? "border-emerald-400 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="text-[0.6rem] font-bold uppercase tracking-wider block opacity-70">
                P{idx + 1}
              </span>
              <span className="text-xs font-black block mt-0.5 truncate">
                {s.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 🍏 COMPACT COMPARISON DELTA & COACH CUE (ALL ON ONE SCREEN) */}
      <div className="rounded-2xl border border-white/10 bg-ath-navy p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              {stageMetric.joint}
            </h4>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-400">You: <strong className="text-white">{stageMetric.athleteValue}</strong></span>
            <span className="text-slate-400">Pro: <strong className="text-emerald-300">{stageMetric.proValue}</strong></span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.62rem] font-black text-emerald-300">
              {stageMetric.deltaLabel}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 text-xs text-slate-300">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <div>
            <strong className="text-white font-bold">Coach Feel Cue: </strong>
            <span>“{stageMetric.coachingCue}”</span>
          </div>
        </div>
      </div>
    </div>
  );
}
