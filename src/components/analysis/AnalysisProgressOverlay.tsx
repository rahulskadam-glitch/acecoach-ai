"use client";

import { Circle, LoaderCircle, ShieldCheck, Sparkles, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const STAGES = [
  { label: "Preparing the private clip", afterSeconds: 0 },
  { label: "Decoding every frame", afterSeconds: 4 },
  { label: "Tracking the athlete", afterSeconds: 12 },
  { label: "Finding repetitions and phases", afterSeconds: 28 },
  { label: "Building the coaching plan", afterSeconds: 55 },
] as const;

export default function AnalysisProgressOverlay({ fileName }: { fileName: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeIndex = useMemo(() => {
    let index = 0;
    STAGES.forEach((stage, candidate) => {
      if (elapsed >= stage.afterSeconds) index = candidate;
    });
    return index;
  }, [elapsed]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="analysis-progress-title">
      <section className="w-full max-w-xl rounded-[2rem] border border-sky-400/20 bg-slate-900 p-7 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 text-sky-300"><Sparkles className="h-5 w-5" /><p className="text-xs font-semibold uppercase tracking-[0.2em]">Movement intelligence</p></div>
        <h2 id="analysis-progress-title" className="mt-4 text-3xl font-semibold text-white">Your clip is being analyzed</h2>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400"><Video className="h-4 w-4" /><span className="truncate">{fileName}</span></div>

        <div className="mt-7 space-y-3" aria-live="polite">
          {STAGES.map((stage, index) => {
            const active = index === activeIndex;
            return (
              <div key={stage.label} className={`flex items-center gap-3 rounded-2xl border p-4 ${active ? "border-sky-400/30 bg-sky-400/10" : "border-white/10 bg-slate-950/45"}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-sky-400/15 text-sky-200" : "bg-white/5 text-slate-600"}`}>
                  {active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Circle className="h-3 w-3" />}
                </div>
                <div>
                  <p className={`text-sm font-medium ${active ? "text-white" : "text-slate-500"}`}>{stage.label}</p>
                  {active ? <p className="mt-1 text-xs text-sky-200/70">Estimated current step</p> : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-xs leading-5 text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          <p>The highlighted step is a time-based estimate, not a confirmed completion state or percentage. Timing varies with clip length and your computer. Keep this window open until the report is ready.</p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-600">Elapsed {elapsed}s</p>
      </section>
    </div>
  );
}
