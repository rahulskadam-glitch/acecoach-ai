import { CalendarCheck2, CheckCircle2, Target } from "lucide-react";
import Link from "next/link";

import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";
import { createClient, requireUser } from "@/lib/supabase/server";

type PracticePlanRow = {
  id: string;
  session_id: string | null;
  sport_id: string | null;
  action_type: string;
  primary_goal: string;
  coaching_cue: string | null;
  completion?: Record<string, boolean> | null;
  plan?: {
    sessions?: Array<{ id?: string }> | null;
  } | null;
  status: string;
  reassessment_due_at?: string | null;
};

export default async function PracticePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("practice_plans").select("id, session_id, sport_id, action_type, primary_goal, coaching_cue, completion, plan, status, reassessment_due_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  const plans = (data ?? []) as PracticePlanRow[];
  return <AthleteWorkspaceShell><div className="space-y-6"><WorkspacePageHeader eyebrow="Guided practice" title="Turn one visible correction into repeatable movement" description="Each plan stays connected to its analysis session, cue, success condition, completion evidence, and reassessment." /><section className="space-y-4">{plans.length === 0 ? <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-slate-900/60 p-8 text-center"><Target className="mx-auto h-7 w-7 text-emerald-300" /><h2 className="mt-4 text-xl font-semibold text-white">No active practice plan</h2><p className="mt-2 text-sm text-slate-400">Analyze a movement and open its report to create the first measurable plan.</p><Link href="/start" className="mt-5 inline-flex rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950">Upload a movement</Link></div> : plans.map((plan) => { const sessions = Array.isArray(plan.plan?.sessions) ? plan.plan.sessions : []; const completion = (plan.completion ?? {}) as Record<string, boolean>; const completed = sessions.filter((item) => Boolean(item.id) && completion[item.id ?? ""]).length; return <article key={plan.id} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{plan.sport_id ?? "Movement"} · {plan.action_type.replaceAll("_", " ")}</p><h2 className="mt-2 text-2xl font-semibold text-white">{plan.primary_goal}</h2><p className="mt-2 text-sm text-violet-200">Cue: “{plan.coaching_cue ?? "Keep the focus simple"}”</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-slate-300">{plan.status.replaceAll("_", " ")}</span></div><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-950/55 p-4"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><p className="mt-2 text-sm text-slate-400">Completed</p><p className="text-xl font-semibold text-white">{completed}/{sessions.length}</p></div><div className="rounded-xl bg-slate-950/55 p-4"><CalendarCheck2 className="h-4 w-4 text-amber-300" /><p className="mt-2 text-sm text-slate-400">Reassessment</p><p className="text-sm font-semibold text-white">{plan.reassessment_due_at ? new Date(plan.reassessment_due_at).toLocaleDateString() : "Not scheduled"}</p></div><div className="flex items-center rounded-xl bg-slate-950/55 p-4"><Link href={`/report/${plan.session_id ?? ""}#practice-reassess`} className="text-sm font-semibold text-emerald-300">Open plan and check in →</Link></div></div></article>; })}</section></div></AthleteWorkspaceShell>;
}
