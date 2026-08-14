"use client";

import { CheckCircle2, Eye, Footprints, Gauge, Play, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";

import type { AnalysisReport } from "@/modules/analysis/types";
import { buildNextGenerationStory } from "../model/next-generation-story";

const INTENT_STYLE = {
  orient: { icon: Play, active: "border-blue-300 bg-blue-950 text-white", dot: "bg-blue-500" },
  cause: { icon: Footprints, active: "border-amber-300 bg-amber-500 text-slate-950", dot: "bg-amber-500" },
  effect: { icon: Eye, active: "border-rose-300 bg-rose-600 text-white", dot: "bg-rose-500" },
  correction: { icon: Target, active: "border-emerald-300 bg-emerald-600 text-white", dot: "bg-emerald-500" },
  clean: { icon: Play, active: "border-blue-300 bg-blue-950 text-white", dot: "bg-blue-500" },
} as const;

export default function NextGenerationCoachStory({ report }: { report: AnalysisReport }) {
  const story = useMemo(() => buildNextGenerationStory(report), [report]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = story.visualStory.beats[activeIndex];
  const trace = report.ontologyReasoning;

  function showBeat(index: number) {
    const beat = story.visualStory.beats[index];
    setActiveIndex(index);
    window.dispatchEvent(new CustomEvent("acecoach:story-beat", { detail: beat }));
    document.getElementById("key-moment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section aria-labelledby="next-gen-story-title" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-6 bg-[radial-gradient(circle_at_90%_10%,rgba(16,185,129,.14),transparent_30%),linear-gradient(135deg,#071b2e,#102f50)] p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-blue-200"><Sparkles className="h-4 w-4" />AceCoach Intelligence 4.1<span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 normal-case tracking-normal text-white">{story.confidenceLabel}</span></div>
          <h2 id="next-gen-story-title" className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">{story.playerCoaching.coachRead}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100/80">{story.playerCoaching.why}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">One cue for the next rep</p>
          <p className="mt-2 text-2xl font-semibold leading-8">“{story.playerCoaching.feel}”</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-blue-100/70"><ShieldCheck className="h-4 w-4 text-emerald-300" />{story.evidenceLabel} · {trace ? (trace.status === "FAULT_CONFIRMED" ? "Repeated pattern" : "Working hypothesis") : "Camera limits considered"}</p>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {trace ? <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-950"><span className="font-semibold">Why this cue</span><span>{trace.candidateCount > 1 ? "AceCoach compared several possible explanations and selected the best-supported one." : "This cue matches the clearest pattern visible in your video."}</span></div> : null}
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Keep this</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{story.playerCoaching.keep ?? "Keep the part of the stroke that already repeats well."}</p></div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">The coaching story</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Follow cause → effect → correction</h3></div><p className="text-xs text-slate-500">One visual idea at a time</p></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" role="tablist" aria-label="Coaching story beats">
            {story.visualStory.beats.map((beat, index) => {
              const style = INTENT_STYLE[beat.intent];
              const Icon = style.icon;
              const selected = index === activeIndex;
              return <button key={beat.beatId} type="button" role="tab" aria-selected={selected} onClick={() => showBeat(index)} className={`relative min-h-20 rounded-2xl border p-3 text-left transition ${selected ? style.active : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"}`}><span className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-wide"><span className={`h-2 w-2 rounded-full ${style.dot}`} /><Icon className="h-3.5 w-3.5" />{index + 1}</span><span className="mt-2 block text-xs font-semibold leading-5">{beat.label}</span></button>;
            })}
          </div>
          <div role="tabpanel" className="mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{active.label}</p><p className="mt-2 text-lg font-semibold leading-7 text-slate-950">{active.caption}</p></div>
            <button type="button" onClick={() => showBeat(activeIndex)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173F6A] px-4 text-sm font-semibold text-white hover:bg-[#103554]"><Play className="h-4 w-4" />Show on my video</button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Eye className="h-4 w-4 text-blue-700" />Watch</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{story.playerCoaching.watch}</p></div>
          <div className="rounded-2xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Gauge className="h-4 w-4 text-amber-700" />Train</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{story.playerCoaching.train}</p></div>
          <div className="rounded-2xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Target className="h-4 w-4 text-emerald-700" />Working when</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{story.playerCoaching.success}</p></div>
        </div>
      </div>
    </section>
  );
}
