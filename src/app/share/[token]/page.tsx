import { createHash } from "node:crypto";
import { BadgeCheck, CalendarDays, Dumbbell, ShieldCheck, Target } from "lucide-react";
import { notFound } from "next/navigation";

import { getSport } from "@/lib/sports";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ token: string }> };

export default async function SharedCoachReportPage({ params }: PageProps) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,120}$/.test(token)) notFound();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();
  const { data: share } = await supabase
    .from("report_shares")
    .select("id, session_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!share) notFound();

  const { data: session } = await supabase
    .from("analysis_sessions")
    .select("sport_id, action_type, analysis_action_type, created_at, analysis_reports(coach_summary, priorities, drills, next_session, confidence, score_status, score_label, overall_score, coaching_playbook, repetition_insights, limitations)")
    .eq("id", share.session_id)
    .eq("status", "completed")
    .maybeSingle();
  if (!session) notFound();
  const report = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
  if (!report) notFound();

  await supabase.rpc("record_report_share_view_v30", { p_share_id: share.id });

  const sport = getSport(session.sport_id);
  const movement = (session.analysis_action_type ?? session.action_type).replaceAll("_", " ");
  const priorities = Array.isArray(report.priorities) ? report.priorities : [];
  const drills = Array.isArray(report.drills) ? report.drills : [];
  const coachSummary = report.coach_summary ?? {};
  const playbook = report.coaching_playbook ?? {};

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#020617_100%)] px-5 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-7 shadow-2xl shadow-black/25">
          <div className="flex items-center gap-3 text-emerald-300"><ShieldCheck className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-[0.2em]">Private coach summary</p></div>
          <h1 className="mt-4 text-4xl font-semibold capitalize">{sport.name} · {movement}</h1>
          <p className="mt-3 text-sm text-slate-400">Shared without raw video, athlete profile, or frame-level data. Link expires {new Date(share.expires_at).toLocaleString()}.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Coach verdict</p><h2 className="mt-3 text-2xl font-semibold">{coachSummary.headline ?? "Movement report"}</h2><p className="mt-4 text-sm leading-7 text-slate-300"><span className="font-semibold text-white">Keep:</span> {coachSummary.strongestQuality ?? "Review the strongest measured quality."}</p><p className="mt-2 text-sm leading-7 text-slate-300"><span className="font-semibold text-white">Fix first:</span> {coachSummary.mainPriority ?? priorities[0]?.title ?? "Build repeatability."}</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{report.score_label ?? "Execution index"}</p><p className="mt-2 text-5xl font-semibold">{typeof report.overall_score === "number" ? report.overall_score : "—"}</p><p className="mt-2 text-xs text-slate-500">Confidence {Math.round(Number(report.confidence ?? 0) * 100)}%</p></div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-sky-500/20 bg-sky-500/[0.05] p-6"><div className="flex items-center gap-3"><Target className="h-5 w-5 text-sky-300" /><h2 className="text-xl font-semibold">One change to coach</h2></div><p className="mt-4 text-2xl font-semibold text-white">{playbook.todayFocus ?? coachSummary.mainPriority}</p><p className="mt-3 text-sm leading-7 text-slate-300"><span className="font-semibold text-sky-200">Cue:</span> {playbook.feelCue ?? priorities[0]?.cue}</p><p className="mt-2 text-sm leading-7 text-slate-300"><span className="font-semibold text-sky-200">Pass when:</span> {playbook.successTest ?? drills[0]?.successMetric}</p></section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/[0.05] p-6"><h2 className="text-xl font-semibold">Priorities</h2><div className="mt-4 space-y-3">{priorities.slice(0, 3).map((priority: Record<string, unknown>, index: number) => <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="font-semibold text-white">{index + 1}. {String(priority.title ?? "Priority")}</p><p className="mt-2 text-sm leading-6 text-slate-400">{String(priority.finding ?? "")}</p><p className="mt-2 text-sm text-emerald-200">Cue: {String(priority.cue ?? "")}</p></div>)}</div></div>
          <div className="rounded-[1.75rem] border border-violet-500/20 bg-violet-500/[0.05] p-6"><div className="flex items-center gap-3"><Dumbbell className="h-5 w-5 text-violet-300" /><h2 className="text-xl font-semibold">Practice</h2></div><div className="mt-4 space-y-3">{drills.slice(0, 2).map((drill: Record<string, unknown>) => <div key={String(drill.id)} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="font-semibold text-white">{String(drill.name)}</p><p className="mt-2 text-sm text-slate-400">{String(drill.dosage)}</p><p className="mt-2 text-sm text-violet-200">Success: {String(drill.successMetric)}</p></div>)}</div></div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-6"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-emerald-300" /><h2 className="text-xl font-semibold">Next reassessment</h2></div><p className="mt-4 text-sm leading-7 text-slate-300">{report.next_session?.recordingPlan ?? "Repeat the same drill and camera setup to create a comparable reassessment."}</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><BadgeCheck className="h-4 w-4" />AceCoach research beta · interpretation should be reviewed alongside a qualified coach.</div></section>
      </div>
    </main>
  );
}
