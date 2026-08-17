"use client";

import { Sparkles, UserCheck, Zap } from "lucide-react";
import type { MotionStage } from "../motion/motion-model";
import { PRO_ARCHETYPES, type ProArchetypeId, getProArchetypesForAction } from "../motion/pro-archetypes";

type ProMotionTwinControlsProps = {
  actionType: string;
  selectedArchetypeId: ProArchetypeId;
  onSelectArchetype: (id: ProArchetypeId) => void;
  ghostOpacity: number;
  onChangeGhostOpacity: (opacity: number) => void;
  currentStage: MotionStage;
};

export default function ProMotionTwinControls({
  actionType,
  selectedArchetypeId,
  onSelectArchetype,
  ghostOpacity,
  onChangeGhostOpacity,
  currentStage,
}: ProMotionTwinControlsProps) {
  const availableArchetypes = getProArchetypesForAction(actionType);
  const activeArchetype = PRO_ARCHETYPES[selectedArchetypeId] ?? availableArchetypes[0] ?? PRO_ARCHETYPES.alcaraz_modern;
  const delta = activeArchetype.keyDeltas[currentStage];

  return (
    <div className="mt-4 rounded-2xl border border-sky-500/20 bg-slate-950/90 p-4 text-white shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-sky-400">Pro Motion Twin</span>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[0.62rem] font-semibold text-sky-300 ring-1 ring-sky-500/30">
                {activeArchetype.badge}
              </span>
            </div>
            <p className="text-xs text-slate-300">Synchronized ATP/WTA Ghost Skeleton Comparison</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span>Ghost blend:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={ghostOpacity}
              onChange={(e) => onChangeGhostOpacity(Number(e.target.value))}
              className="h-1.5 w-24 cursor-pointer accent-sky-400"
              aria-label="Pro ghost opacity"
            />
            <span className="w-8 font-mono text-[0.68rem] text-sky-400">{Math.round(ghostOpacity * 100)}%</span>
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">Pro Archetype:</span>
        {availableArchetypes.map((archetype) => {
          const isSelected = archetype.id === activeArchetype.id;
          return (
            <button
              key={archetype.id}
              type="button"
              onClick={() => onSelectArchetype(archetype.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30 ring-2 ring-sky-300"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {archetype.name}
            </button>
          );
        })}
      </div>

      {delta ? (
        <div className="mt-3.5 grid gap-3 rounded-xl border border-sky-500/20 bg-sky-950/30 p-3 sm:grid-cols-3">
          <div className="rounded-lg bg-black/40 p-2.5">
            <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">Signature Style</span>
            <p className="mt-1 text-xs font-semibold text-white">{activeArchetype.signature}</p>
            <p className="mt-0.5 text-[0.65rem] text-sky-300">{activeArchetype.stanceType}</p>
          </div>

          <div className="rounded-lg bg-black/40 p-2.5">
            <span className="text-[0.62rem] font-bold uppercase tracking-wider text-sky-400">Target Checkpoint</span>
            <p className="mt-1 text-xs font-semibold text-white">{delta.joint}</p>
            <p className="mt-0.5 font-mono text-[0.68rem] text-sky-300">{delta.targetMetric}</p>
          </div>

          <div className="rounded-lg bg-black/40 p-2.5">
            <div className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-emerald-400">
              <Zap className="h-3 w-3" />
              <span>Coach Kinematic Cue</span>
            </div>
            <p className="mt-1 text-xs leading-4 text-slate-200">{delta.coachInsight}</p>
          </div>
        </div>
      ) : null}

      {/* Compliance & Educational Methodology Disclaimer */}
      <p className="mt-3 border-t border-white/5 pt-2.5 text-[0.65rem] leading-relaxed text-slate-400">
        <span className="font-semibold text-slate-300">Methodology Note:</span> Pro Archetypes represent generalized kinematic models derived from high-speed biomechanical principles for educational and technique training purposes. Movement models are independent benchmarks and are not affiliated with or endorsed by any individual professional athlete or tour organization.
      </p>
    </div>
  );
}
