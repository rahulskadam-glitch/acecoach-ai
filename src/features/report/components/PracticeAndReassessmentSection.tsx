import { CalendarCheck2, Dumbbell, RotateCcw, Target } from "lucide-react";

import GuidedPracticePlan from "@/components/analysis/GuidedPracticePlan";
import type { PracticeCheckin, StoredPracticePlan } from "@/modules/analysis/progress";
import type { AnalysisReport } from "@/modules/analysis/types";
import { concise, plainLanguage } from "../model/plain-language";

export default function PracticeAndReassessmentSection({
  report,
  practicePlan,
  onToggle,
  onReady,
  onCheckin,
  checkins,
}: {
  report: AnalysisReport;
  practicePlan: StoredPracticePlan | null;
  onToggle: (itemId: string, completed: boolean) => Promise<void>;
  onReady: () => Promise<void>;
  onCheckin: (itemId: string, formData: FormData) => Promise<void>;
  checkins: PracticeCheckin[];
}) {
  if (practicePlan) {
    return <div id="practice-reassess" className="scroll-mt-24"><GuidedPracticePlan plan={practicePlan} onToggle={onToggle} onReady={onReady} onCheckin={onCheckin} checkins={checkins} /></div>;
  }

  const drills = report.drills.slice(0, 2);
  return (
    <section id="practice-reassess" className="scroll-mt-24 rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,.12),rgba(15,23,42,.82))] p-6 lg:p-8">
      <div className="flex items-center gap-2 text-emerald-300"><CalendarCheck2 className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">4 · Practice and reassessment</p></div>
      <h2 className="mt-3 text-3xl font-semibold text-white">Train one change, then record it again</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-4">
          {drills.map((drill, index) => (
            <article key={drill.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-slate-950">{index + 1}</span><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">Practice drill</p><h3 className="mt-1 text-lg font-semibold text-white">{plainLanguage(drill.name)}</h3></div></div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{concise(drill.purpose, 190)}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300"><span className="font-semibold text-white">Do:</span> {plainLanguage(drill.dosage)}</div><div className="rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300"><span className="font-semibold text-white">Cue:</span> “{plainLanguage(drill.cue)}”</div></div>
              <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-100"><span className="font-semibold">Pass when:</span> {plainLanguage(drill.successMetric)}</p>
            </article>
          ))}
        </div>
        <aside className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] p-6">
          <div className="flex items-center gap-2 text-violet-200"><RotateCcw className="h-5 w-5" /><p className="font-semibold">Record the reassessment</p></div>
          <p className="mt-4 text-sm leading-7 text-slate-300">{plainLanguage(report.nextSession.recordingPlan)}</p>
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/45 p-4"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-200">Next objective</p><p className="mt-2 text-base font-semibold text-white">{plainLanguage(report.nextSession.objective)}</p></div>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">{report.nextSession.successCriteria.slice(0, 3).map((item) => <li key={item} className="flex gap-3"><Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{plainLanguage(item)}</li>)}</ul>
          <a href="/upload" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300"><Dumbbell className="h-4 w-4" />Record another session</a>
        </aside>
      </div>
    </section>
  );
}
