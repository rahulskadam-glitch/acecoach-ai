import { ExternalLink, FlaskConical, ShieldCheck } from "lucide-react";

import BestRepLab from "@/components/analysis/BestRepLab";
import BiomechanicsBodyMap from "@/components/analysis/BiomechanicsBodyMap";
import MeasurementCoverage from "@/components/analysis/MeasurementCoverage";
import MotionChart from "@/components/analysis/MotionChart";
import ProgressComparisonCard from "@/components/analysis/ProgressComparisonCard";
import TechniqueAnalytics from "@/components/analysis/TechniqueAnalytics";
import type { ProgressComparison } from "@/modules/analysis/progress";
import type { AnalysisReport } from "@/modules/analysis/types";

export default function AdvancedAnalysisSection({ report, progressComparison }: { report: AnalysisReport; progressComparison: ProgressComparison | null }) {
  return (
    <details id="advanced-analysis" className="scroll-mt-24 rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-4">
      <summary className="cursor-pointer list-none rounded-2xl px-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><FlaskConical className="h-5 w-5 text-sky-300" /><div><p className="font-semibold text-white">Advanced analysis for coaches and sports scientists</p><p className="mt-1 text-sm text-slate-500">Open detailed measurements, swing consistency, evidence, and model limitations.</p></div></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">Optional technical depth</span></div>
      </summary>
      <div className="mt-4 space-y-6 border-t border-white/10 pt-6">
        {progressComparison ? <ProgressComparisonCard comparison={progressComparison} /> : null}
        <BiomechanicsBodyMap report={report} />
        <BestRepLab report={report} />
        <TechniqueAnalytics report={report} />
        <MotionChart report={report} />
        <MeasurementCoverage coverage={report.measurementCoverage} />
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><div className="flex items-center gap-2 text-sky-200"><ShieldCheck className="h-4 w-4" /><p className="font-semibold">What this report can and cannot measure</p></div><p className="mt-3 text-sm leading-7 text-slate-300">{report.safetyNote}</p><ul className="mt-4 space-y-2 text-sm text-slate-500">{report.limitations.map((item) => <li key={item}>• {item}</li>)}</ul></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><p className="font-semibold text-white">Evidence and coaching basis</p><div className="mt-4 space-y-3">{report.evidence.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{item.title}</p><p className="mt-1 text-xs text-emerald-300">{item.organization}{item.year ? ` · ${item.year}` : ""}</p></div>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white" aria-label={`Open ${item.title}`}><ExternalLink className="h-4 w-4" /></a> : null}</div><p className="mt-2 text-xs leading-5 text-slate-500">{item.use}</p></div>)}</div></div>
        </section>
      </div>
    </details>
  );
}
