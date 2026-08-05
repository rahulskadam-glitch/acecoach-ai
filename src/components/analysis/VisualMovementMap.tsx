"use client";

import { ArrowRight, CheckCircle2, CircleDot, Target, TriangleAlert } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";

const ORDER = [
  ["footwork_base", "Footwork"],
  ["backlift_preparation", "Preparation"],
  ["lower_body_loading", "Loading"],
  ["body_position", "Body position"],
  ["hand_swing_path", "Swing path"],
  ["contact_spacing", "Contact"],
  ["ending_position", "Finish & recovery"],
] as const;

function statusMeta(status: "strength" | "developing" | "priority") {
  if (status === "strength") return { label: "Keep", icon: CheckCircle2, card: "border-emerald-500/25 bg-emerald-500/[0.06]", text: "text-emerald-200" };
  if (status === "priority") return { label: "Fix", icon: Target, card: "border-amber-500/25 bg-amber-500/[0.06]", text: "text-amber-200" };
  return { label: "Build", icon: CircleDot, card: "border-sky-500/20 bg-sky-500/[0.05]", text: "text-sky-200" };
}

export default function VisualMovementMap({ report }: { report: AnalysisReport }) {
  const areas = report.coachingAreas ?? [];
  if (areas.length === 0) return null;

  const ordered = ORDER
    .map(([id, fallbackLabel]) => {
      const area = areas.find((item) => item.id === id);
      return area ? { ...area, label: area.label || fallbackLabel } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (ordered.length === 0) return null;

  function jump(time?: number | null) {
    if (typeof time !== "number") return;
    window.dispatchEvent(new CustomEvent("acecoach:seek-video", { detail: { time } }));
    document.getElementById("synchronized-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="movement-map" className="scroll-mt-24 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Simple movement map</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">See the whole swing in one line</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Green is a quality to preserve, blue is developing, and amber is where the next improvement should start. Select a stage to see it in the video.</p>
        </div>
        {!report.qualityGate.canUseTechniqueScore ? <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"><TriangleAlert className="h-4 w-4" />Limited by the reliability gate</div> : null}
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {ordered.map((area, index) => {
          const meta = statusMeta(area.status);
          const Icon = meta.icon;
          return (
            <div key={area.id} className="flex min-w-[220px] items-stretch gap-3">
              <button type="button" onClick={() => jump(area.timestampSeconds)} className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${meta.card}`}>
                <div className="flex items-center justify-between gap-3"><span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${meta.text}`}><Icon className="h-4 w-4" />{meta.label}</span><span className="text-2xl font-semibold text-white">{area.score}</span></div>
                <h3 className="mt-3 font-semibold text-white">{area.label}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{area.coachingGoal}</p>
                <p className="mt-3 text-sm font-medium text-emerald-300">“{area.cue}”</p>
              </button>
              {index < ordered.length - 1 ? <div className="hidden items-center text-slate-700 xl:flex"><ArrowRight className="h-5 w-5" /></div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
