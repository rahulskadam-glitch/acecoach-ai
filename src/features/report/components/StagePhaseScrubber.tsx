"use client";

import { MOTION_STAGES, type MotionStage } from "../motion/motion-model";

export default function StagePhaseScrubber({
  currentStage,
  onSeekToStage,
}: {
  currentStage: MotionStage;
  onSeekToStage: (stage: MotionStage) => void;
}) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex items-center justify-between mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <span>Shot Phases</span>
        <span className="text-ath-sky">Selected: {MOTION_STAGES.find((s) => s.id === currentStage)?.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MOTION_STAGES.map((s, idx) => {
          const isSelected = s.id === currentStage;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSeekToStage(s.id)}
              className={`rounded-xl p-2.5 text-center transition ${
                isSelected
                  ? "bg-ath-green text-slate-950 font-bold shadow-lg shadow-ath-green/20 ring-2 ring-ath-green"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-[0.62rem] font-bold uppercase block opacity-75">{idx + 1}.</span>
              <span className="text-xs font-semibold leading-snug">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
