"use client";

import { AlertTriangle, BadgeCheck, CircleGauge, MessageSquareText, ShieldCheck } from "lucide-react";

import { competitiveScorecard, reviewCoverageScore, reviewThemes } from "@/lib/benchmark/review-themes";

function tone(score: number) {
  if (score >= 4) return "text-emerald-300";
  if (score >= 3) return "text-amber-300";
  return "text-rose-300";
}

export default function ReviewDrivenBenchmark() {
  const overall = Number((competitiveScorecard.reduce((total, row) => total + row.score, 0) / competitiveScorecard.length).toFixed(1));
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(15,23,42,0.82)_52%,rgba(2,6,23,0.94))] p-7 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-emerald-300"><MessageSquareText className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Review-led product benchmark</p></div>
            <h1 className="mt-4 text-4xl font-semibold text-white">What athletes repeatedly ask for—and how much AceCoach has incorporated</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">This scorecard separates product coverage from scientific validation. A theme is counted only when the package contains a concrete mitigation, workflow, test, or disclosure.</p>
          </div>
          <div className="grid min-w-[250px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Review incorporation</p><p className="mt-2 text-4xl font-bold text-emerald-300">{reviewCoverageScore}<span className="text-lg text-slate-500">/5</span></p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Overall platform</p><p className={`mt-2 text-4xl font-bold ${tone(overall)}`}>{overall}<span className="text-lg text-slate-500">/5</span></p></div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center gap-3"><CircleGauge className="h-5 w-5 text-sky-300" /><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Competitive capability scorecard</p><h2 className="mt-1 text-2xl font-semibold text-white">Honest position after v3.2</h2></div></div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-3 py-2">Capability</th><th className="px-3 py-2">AceCoach</th><th className="px-3 py-2">Best</th><th className="px-3 py-2">Assessment</th></tr></thead>
            <tbody>{competitiveScorecard.map((row) => <tr key={row.capability} className="bg-slate-950/60"><td className="rounded-l-xl px-3 py-4 font-medium text-white">{row.capability}</td><td className={`px-3 py-4 text-lg font-bold ${tone(row.score)}`}>{row.score.toFixed(1)}</td><td className="px-3 py-4 text-slate-400">{row.benchmark.toFixed(1)}</td><td className="rounded-r-xl px-3 py-4 leading-6 text-slate-400">{row.note}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {reviewThemes.map((theme) => (
          <article key={theme.id} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Player review theme</p><h3 className="mt-2 text-xl font-semibold text-white">{theme.label}</h3></div><span className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold ${tone(theme.coverageScore)}`}>{theme.coverageScore.toFixed(1)}/5</span></div>
            <p className="mt-4 text-sm leading-6 text-slate-300"><span className="font-semibold text-white">What players need:</span> {theme.playerNeed}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400"><span className="font-semibold text-slate-300">Recurring feedback:</span> {theme.recurringFeedback}</p>
            <div className="mt-4 space-y-2">{theme.aceCoachResponse.map((item) => <div key={item} className="flex gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{item}</div>)}</div>
            <div className={`mt-4 flex gap-2 rounded-xl p-3 text-xs leading-5 ${theme.outcomeStatus === "strong" ? "bg-emerald-500/10 text-emerald-200" : theme.outcomeStatus === "developing" ? "bg-amber-500/10 text-amber-200" : "bg-rose-500/10 text-rose-200"}`}>{theme.outcomeStatus === "strong" ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}{theme.evidenceNote}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
