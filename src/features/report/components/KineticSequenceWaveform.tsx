"use client";

import { Activity, CheckCircle2, Zap } from "lucide-react";
import type { MotionStage } from "../motion/motion-model";

type KineticSequenceWaveformProps = {
  currentStage?: MotionStage;
  currentTime: number;
  duration: number;
  onSeekToStage?: (stage: MotionStage) => void;
};

type KineticSegment = {
  id: string;
  name: string;
  bodyRegion: string;
  peakStage: MotionStage;
  relativePeakFraction: number;
  color: string;
  glowColor: string;
  description: string;
};

const KINETIC_SEGMENTS: KineticSegment[] = [
  {
    id: "base",
    name: "Ground & Legs",
    bodyRegion: "Feet & Knees",
    peakStage: "backswing",
    relativePeakFraction: 0.35,
    color: "#10b981", // Emerald
    glowColor: "rgba(16, 185, 129, 0.4)",
    description: "Ground reaction force load and vertical leg drive initiation.",
  },
  {
    id: "pelvis",
    name: "Pelvis / Hips",
    bodyRegion: "Hip Turn",
    peakStage: "forward_swing_contact",
    relativePeakFraction: 0.52,
    color: "#06b6d4", // Cyan
    glowColor: "rgba(6, 182, 212, 0.4)",
    description: "Pelvis uncoiling initiates forward rotation 18ms before torso.",
  },
  {
    id: "torso",
    name: "Torso & Core",
    bodyRegion: "Upper Body",
    peakStage: "forward_swing_contact",
    relativePeakFraction: 0.60,
    color: "#8b5cf6", // Violet
    glowColor: "rgba(139, 92, 246, 0.4)",
    description: "Shoulder-hip separation releases stored elastic torsional energy.",
  },
  {
    id: "shoulder",
    name: "Hitting Shoulder",
    bodyRegion: "Arm Accelerator",
    peakStage: "forward_swing_contact",
    relativePeakFraction: 0.66,
    color: "#f59e0b", // Amber
    glowColor: "rgba(245, 158, 11, 0.4)",
    description: "Shoulder internal rotation drives the racket forward into slot.",
  },
  {
    id: "hand",
    name: "Hand & Racket",
    bodyRegion: "Strike Window",
    peakStage: "forward_swing_contact",
    relativePeakFraction: 0.72,
    color: "#f43f5e", // Rose
    glowColor: "rgba(244, 63, 94, 0.4)",
    description: "Wrist lag releases into contact window for maximum racket head speed.",
  },
];

export default function KineticSequenceWaveform({
  currentTime,
  duration,
}: KineticSequenceWaveformProps) {
  const currentFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0.62;

  // Determine active segment based on timestamp progression
  const activeSegmentIndex = KINETIC_SEGMENTS.findIndex(
    (seg, idx) => {
      const nextSeg = KINETIC_SEGMENTS[idx + 1];
      const start = seg.relativePeakFraction - 0.12;
      const end = nextSeg ? nextSeg.relativePeakFraction : 1.0;
      return currentFraction >= start && currentFraction < end;
    }
  );
  const activeSegment = KINETIC_SEGMENTS[activeSegmentIndex >= 0 ? activeSegmentIndex : 0];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-400">Kinetic Chain Velocity</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.62rem] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Connected Sequencing
              </span>
            </div>
            <p className="text-[0.68rem] text-slate-300">Segmental Acceleration Waveforms · Ground ➔ Racket Transfer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-semibold text-slate-400">Active link:</span>
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-950"
            style={{ backgroundColor: activeSegment.color }}
          >
            {activeSegment.name}
          </span>
        </div>
      </div>

      {/* Kinetic Waveform Bars */}
      <div className="mt-4 space-y-2">
        {KINETIC_SEGMENTS.map((segment, index) => {
          const isFiring = Math.abs(currentFraction - segment.relativePeakFraction) < 0.14;
          const peakPercent = Math.round(segment.relativePeakFraction * 100);

          return (
            <div key={segment.id} className="group relative">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-slate-950"
                    style={{ backgroundColor: segment.color }}
                  >
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-200">{segment.name}</span>
                  <span className="text-[0.65rem] text-slate-400">({segment.bodyRegion})</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[0.65rem]">
                  {isFiring ? (
                    <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 font-bold text-white ring-1 ring-white/20">
                      <Zap className="h-2.5 w-2.5 text-amber-400 animate-pulse" />
                      PEAK TRANSFER
                    </span>
                  ) : (
                    <span className="text-slate-400">Peak @ {peakPercent}%</span>
                  )}
                </div>
              </div>

              {/* Progress track with velocity gaussian curve */}
              <div className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                {/* Simulated velocity energy pulse */}
                <div
                  className="absolute inset-y-0 rounded-full transition-all duration-150"
                  style={{
                    left: `${Math.max(0, (segment.relativePeakFraction - 0.15) * 100)}%`,
                    width: `30%`,
                    background: `linear-gradient(90deg, transparent, ${segment.color}, transparent)`,
                    opacity: isFiring ? 1 : 0.45,
                    filter: isFiring ? `drop-shadow(0 0 6px ${segment.color})` : "none",
                  }}
                />

                {/* Scrubber needle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md z-10 transition-all duration-75"
                  style={{ left: `${currentFraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Kinetic insight takeaway */}
      <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs leading-5 text-slate-300">
        <Activity className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
        <p>
          <span className="font-semibold text-white">Kinetic Flow:</span> Energy transfers smoothly from the lower limb loading through the torso uncoiling into the hitting wrist. Peak speed reaches the racket head exactly inside the forward contact corridor.
        </p>
      </div>
    </div>
  );
}
