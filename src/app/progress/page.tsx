import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import ProgressAnalyticsDashboard, { type ProgressPoint } from "@/components/progress/ProgressAnalyticsDashboard";
import { createClient, requireUser } from "@/lib/supabase/server";

type AnalysisSessionRow = {
  id: string;
  sport_id: string | null;
  created_at: string;
  analysis_action_type?: string | null;
  action_type?: string | null;
  status?: string | null;
  analysis_reports?: Array<{
    score_status?: string | null;
    overall_score?: number | null;
    confidence?: number | null;
    capture_quality?: { score?: number | null } | null;
    repetition_insights?: { consistencyScore?: number | null } | null;
  }> | null;
};

type PracticePlanSummary = {
  completion?: Record<string, boolean> | null;
  plan?: {
    sessions?: Array<{ id?: string }> | null;
  } | null;
};

export default async function ProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: sessions }, { data: plans }] = await Promise.all([
    supabase.from("analysis_sessions").select("id, sport_id, created_at, analysis_action_type, action_type, status, analysis_reports(overall_score, score_status, confidence, capture_quality, repetition_insights)").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: true }).limit(60),
    supabase.from("practice_plans").select("completion, plan").eq("user_id", user.id),
  ]);
  const points: ProgressPoint[] = ((sessions ?? []) as AnalysisSessionRow[]).map((session) => {
    const raw = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
    const score = raw?.score_status === "provisional_criterion_index" && typeof raw.overall_score === "number" ? raw.overall_score : null;
    const consistency = typeof raw?.repetition_insights?.consistencyScore === "number" ? raw.repetition_insights.consistencyScore : null;
    const movement = session.analysis_action_type ?? session.action_type ?? "movement";
    return { sessionId: session.id, sportId: session.sport_id ?? "unknown", date: new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), score, consistency, confidence: Number(raw?.confidence ?? 0), capture: Number(raw?.capture_quality?.score ?? 0), movement };
  });
  let completedPractice = 0;
  let totalPractice = 0;
  for (const plan of (plans ?? []) as PracticePlanSummary[]) {
    const sessionsInPlan = Array.isArray(plan.plan?.sessions) ? plan.plan.sessions : [];
    totalPractice += sessionsInPlan.length;
    const completion = (plan.completion ?? {}) as Record<string, boolean>;
    completedPractice += sessionsInPlan.filter((item) => Boolean(item.id) && completion[item.id ?? ""]).length;
  }
  return <AthleteWorkspaceShell><ProgressAnalyticsDashboard points={points} completedPractice={completedPractice} totalPractice={totalPractice} /></AthleteWorkspaceShell>;
}
