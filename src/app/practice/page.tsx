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
  const { data } = await supabase.from("practice_plans").select("id, session_id, sport_id, action_type, primary_goal, coaching_cue, completion, plan, status, reassessment_due_at, created_at, knowledge_policy_version, knowledge_manifest_hash").eq("user_id", user.id).not("knowledge_policy_version", "is", null).not("knowledge_manifest_hash", "is", null).order("created_at", { ascending: false }).limit(20);
  const plans = (data ?? []) as PracticePlanRow[];
  return <AthleteWorkspaceShell><div className="space-y-6"><WorkspacePageHeader eyebrow="Guided practice" title="Turn one correction into repeatable movement" description="Your practice plan stays connected to the analysis, coaching cue, and next reassessment." /><section className="space-y-4">{plans.length === 0 ? <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"><Target className="mx-auto h-7 w-7 text-blue-800" /><h2 className="mt-4 text-xl font-semibold text-slate-950">No active practice plan</h2><p className="mt-2 text-sm text-slate-600">Analyze a stroke and open its report to create your first plan.</p><Link href="/start" className="mt-5 inline-flex rounded-xl bg-[#1b4332] px-4 py-3 text-sm font-semibold text-white">Start an analysis</Link></div> : plans.map((plan) => { const sessions = Array.isArray(plan.plan?.sessions) ? plan.plan.sessions : []; const completion = (plan.completion ?? {}) as Record<string, boolean>; const completed = sessions.filter((item) => Boolean(item.id) && completion[item.id ?? ""]).length; return <article key={plan.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-800">Tennis · {plan.action_type.replaceAll("_", " ")}</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">{plan.primary_goal}</h2><p className="mt-2 text-sm text-violet-800">Cue: “{plan.coaching_cue ?? "Keep the focus simple"}”</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">{plan.status.replaceAll("_", " ")}</span></div><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><CheckCircle2 className="h-4 w-4 text-emerald-700" /><p className="mt-2 text-sm text-slate-600">Completed</p><p className="text-xl font-semibold text-slate-950">{completed}/{sessions.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><CalendarCheck2 className="h-4 w-4 text-amber-700" /><p className="mt-2 text-sm text-slate-600">Reassessment</p><p className="text-sm font-semibold text-slate-950">{plan.reassessment_due_at ? new Date(plan.reassessment_due_at).toLocaleDateString() : "Not scheduled"}</p></div><div className="flex items-center rounded-xl bg-blue-50 p-4"><Link href={`/report/${plan.session_id ?? ""}#practice-reassess`} className="text-sm font-semibold text-blue-900">Open plan and check in →</Link></div></div></article>; })}</section></div></AthleteWorkspaceShell>;
}
