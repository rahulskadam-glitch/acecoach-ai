import { AlertTriangle, ArrowRight, BadgeCheck, Film, LoaderCircle } from "lucide-react";
import Link from "next/link";

import { getSport } from "@/lib/sports";

export type DashboardSession = {
  id: string;
  sportId: string;
  selectedAction: string;
  analysisAction: string;
  scoreStatus: string;
  overallScore: number | null;
  scoreLabel: string;
  confidence: number;
  status: string;
  currentStage: string;
  createdAt: string;
  fileName: string;
  headline: string | null;
};

function statusCopy(session: DashboardSession) {
  if (session.status === "processing" || session.status === "queued") return "Analysis in progress";
  if (session.status === "failed") return "Analysis needs attention";
  if (session.scoreStatus === "pending_movement_confirmation") return "Movement confirmation required";
  if (session.scoreStatus.startsWith("blocked_")) return "Recording quality review";
  if (session.scoreStatus === "insufficient_repetitions_for_score") return "More repetitions needed";
  return "Report ready";
}

export default function DashboardContent({ sessions, error }: { sessions: DashboardSession[]; error?: string | null }) {
  if (error) {
    return <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">{error}</div>;
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Athlete workspace</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Recent analysis sessions</h2>
          <p className="mt-2 text-sm text-slate-400">Open a report to review synchronized video, priorities, and the next practice plan.</p>
        </div>
        <Link href="/upload" className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Analyze another video</Link>
      </div>

      <div className="mt-7 space-y-4">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-8 text-center">
            <Film className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3 font-medium text-white">No analysis sessions yet</p>
            <p className="mt-2 text-sm text-slate-400">Upload a short, well-framed video with complete repetitions to create your first coaching report.</p>
          </div>
        ) : sessions.map((session) => {
          const sport = getSport(session.sportId);
          const actionLabel = session.analysisAction.replaceAll("_", " ");
          const requiresAttention = session.scoreStatus !== "provisional_criterion_index" || session.status !== "completed";
          return (
            <Link key={session.id} href={`/report/${session.id}`} className="group block rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-5 transition hover:border-emerald-500/30 hover:bg-slate-950">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${requiresAttention ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {session.status === "processing" || session.status === "queued" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : requiresAttention ? <AlertTriangle className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold capitalize text-white">{sport.name} · {actionLabel}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{session.fileName}</p>
                    <p className="mt-2 text-sm text-slate-300">{session.headline ?? statusCopy(session)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6 lg:justify-end">
                  <div className="text-left lg:text-right">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{session.overallScore !== null ? session.scoreLabel : statusCopy(session)}</p>
                    <p className={`mt-1 text-2xl font-semibold ${session.overallScore !== null ? "text-emerald-300" : "text-amber-200"}`}>{session.overallScore !== null ? `${session.overallScore}/100` : "Review"}</p>
                    <p className="mt-1 text-xs text-slate-600">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
