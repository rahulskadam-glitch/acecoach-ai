import { ArrowRight, CalendarClock, CheckCircle2, Focus, Target } from "lucide-react";
import Link from "next/link";

import { getSport } from "@/lib/sports";

export type ImprovementFocus = {
  id: string;
  sessionId: string;
  sportId: string;
  actionType: string;
  primaryGoal: string;
  coachingCue: string | null;
  status: string;
  completedItems: number;
  totalItems: number;
  reassessmentDueAt: string | null;
};

export default function ImprovementFocusCard({ focus }: { focus: ImprovementFocus | null }) {
  if (!focus) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-white/10 bg-slate-900/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-sky-300"><Focus className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Current improvement focus</p></div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Create your first measurable improvement loop</h2>
            <p className="mt-2 text-sm text-slate-400">Analyze a reliable clip to receive one priority, a guided practice plan, and a comparable reassessment.</p>
          </div>
          <Link href="/upload" className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400">Analyze a movement</Link>
        </div>
      </section>
    );
  }

  const sport = getSport(focus.sportId);
  const percent = focus.totalItems > 0 ? Math.round((focus.completedItems / focus.totalItems) * 100) : 0;
  const due = focus.reassessmentDueAt
    ? new Date(focus.reassessmentDueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const ready = focus.status === "ready_for_reassessment";

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(15,23,42,0.82)_48%,rgba(2,6,23,0.92))] shadow-lg shadow-black/20">
      <div className="grid gap-0 lg:grid-cols-[1fr_0.45fr]">
        <div className="p-6">
          <div className="flex items-center gap-3 text-emerald-300"><Target className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Current improvement focus</p></div>
          <p className="mt-3 text-sm capitalize text-slate-400">{sport.name} · {focus.actionType.replaceAll("_", " ")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{focus.primaryGoal}</h2>
          {focus.coachingCue ? <p className="mt-4 text-lg text-emerald-100">Cue: “{focus.coachingCue}”</p> : null}

          <div className="mt-6 max-w-2xl">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Practice plan</span><span className="font-semibold text-white">{focus.completedItems}/{focus.totalItems} complete</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} /></div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-slate-950/45 p-6 lg:border-l lg:border-t-0">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${ready ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
            {ready ? <CheckCircle2 className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}
          </div>
          <p className="mt-4 font-semibold text-white">{ready ? "Ready to reassess" : "Practice before adding another correction"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{ready ? "Record the same drill and camera angle to measure change." : due ? `Suggested reassessment by ${due}.` : "Complete the plan, then reassess under the same conditions."}</p>
          <Link href={`/report/${focus.sessionId}`} className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Open improvement plan<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
