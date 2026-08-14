import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import ProgressAnalyticsDashboard, { type DevelopmentTrend, type ProgressPoint, type SharedRootSummary } from "@/components/progress/ProgressAnalyticsDashboard";
import { createAdminClient, createClient, requireUser } from "@/lib/supabase/server";
import { detectRecordedLoadPattern, type PracticeLoadEntry } from "@/modules/analysis/load-pattern";

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

type DevelopmentStateRow = {
  sport_id: string;
  action_type: string;
  context_signature: string;
  primary_construct_id: string;
  active_cue: string | null;
  status: string;
  evidence_summary: Record<string, unknown> | null;
};

type ConstructDistributionRow = {
  analysis_session_id: string;
  sport_id: string;
  action_type: string;
  construct_id: string;
  context_signature: string;
  median_score: number;
  spread: number;
  recorded_at: string;
};

type SharedRootRow = {
  sport_id: string;
  construct_id: string;
  context_class: string;
  action_types: string[];
  confidence: number;
  shared_cue: string | null;
  stroke_specific_cues: Record<string, string | null> | null;
  evidence_summary: Record<string, unknown> | null;
};

type PracticeCheckinRow = {
  id: string;
  attempts: number | null;
  effort: PracticeLoadEntry["effort"];
  created_at: string;
  practice_plans: { sport_id?: string | null; action_type?: string | null } | Array<{ sport_id?: string | null; action_type?: string | null }> | null;
};

export default async function ProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [sessionsResult, plansResult, developmentStatesResult, distributionsResult, sharedRootsResult, checkinsResult, postprocessingResult] = await Promise.all([
    supabase.from("analysis_sessions").select("id, sport_id, created_at, analysis_action_type, action_type, status, analysis_reports(overall_score, score_status, confidence, capture_quality, repetition_insights)").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: true }).limit(60),
    supabase.from("practice_plans").select("completion, plan").eq("user_id", user.id),
    supabase.from("player_development_state").select("sport_id, action_type, context_signature, primary_construct_id, active_cue, status, evidence_summary, updated_at").eq("user_id", user.id).not("status", "in", "(solved,superseded)").order("updated_at", { ascending: false }),
    supabase.from("construct_session_distributions").select("analysis_session_id, sport_id, action_type, construct_id, context_signature, median_score, spread, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }).limit(120),
    supabase.from("shared_root_insights").select("sport_id, construct_id, context_class, action_types, confidence, shared_cue, stroke_specific_cues, evidence_summary").eq("user_id", user.id).eq("active", true).order("updated_at", { ascending: false }),
    supabase.from("practice_checkins").select("id, attempts, effort, created_at, practice_plans(sport_id, action_type)").eq("user_id", user.id).not("attempts", "is", null).order("created_at", { ascending: false }).limit(120),
    admin.from("analysis_postprocessing_jobs").select("session_id").eq("user_id", user.id).eq("status", "failed").order("updated_at", { ascending: false }).limit(5),
  ]);
  const sessions = sessionsResult.data;
  const plans = plansResult.data;
  const developmentStates = developmentStatesResult.data;
  const distributions = distributionsResult.data;
  const sharedRootRows = sharedRootsResult.data;
  const checkinRows = checkinsResult.data;
  const dataWarnings = [
    ["analysis history", sessionsResult.error],
    ["practice completion", plansResult.error],
    ["development state", developmentStatesResult.error],
    ["trend distributions", distributionsResult.error],
    ["shared movement roots", sharedRootsResult.error],
    ["practice load", checkinsResult.error],
    ["development processing status", postprocessingResult.error],
  ].flatMap(([label, error]) => error ? [`Could not load ${label}.`] : []);
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
  const developmentTrends: DevelopmentTrend[] = ((developmentStates ?? []) as DevelopmentStateRow[]).map((state) => {
    const evidence = state.evidence_summary && typeof state.evidence_summary === "object" && !Array.isArray(state.evidence_summary)
      ? state.evidence_summary as Record<string, unknown>
      : {};
    const trendPoints = ((distributions ?? []) as ConstructDistributionRow[])
      .filter((item) => item.sport_id === state.sport_id && item.action_type === state.action_type && item.construct_id === state.primary_construct_id && item.context_signature === state.context_signature)
      .map((item) => {
        const median = Number(item.median_score);
        const spread = Number(item.spread);
        return { sessionId: item.analysis_session_id, date: new Date(item.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), median, lower: Math.max(0, median - spread), upper: Math.min(100, median + spread) };
      });
    return {
      sportId: state.sport_id,
      movement: state.action_type,
      constructId: state.primary_construct_id,
      status: state.status as DevelopmentTrend["status"],
      activeCue: state.active_cue,
      reason: typeof evidence.reason === "string" ? evidence.reason : null,
      shift: typeof evidence.shift === "number" ? evidence.shift : null,
      points: trendPoints,
    };
  });
  const sharedRoots: SharedRootSummary[] = ((sharedRootRows ?? []) as SharedRootRow[]).map((row) => ({
    sportId: row.sport_id,
    constructId: row.construct_id,
    contextClass: row.context_class,
    actionTypes: row.action_types,
    confidence: Number(row.confidence),
    sharedCue: row.shared_cue,
    strokeSpecificCues: row.stroke_specific_cues ?? {},
    reason: typeof row.evidence_summary?.reason === "string" ? row.evidence_summary.reason : "Independent evidence links this movement skill across multiple strokes.",
  }));
  const loadEntries: PracticeLoadEntry[] = ((checkinRows ?? []) as PracticeCheckinRow[]).flatMap((row) => {
    const plan = Array.isArray(row.practice_plans) ? row.practice_plans[0] : row.practice_plans;
    if (row.attempts === null || !plan?.action_type) return [];
    return [{ id: row.id, sportId: plan.sport_id ?? "unknown", actionType: plan.action_type, attempts: row.attempts, effort: row.effort, createdAt: row.created_at }];
  });
  const loadFlags = detectRecordedLoadPattern(loadEntries, { minimumPriorCheckins: 2, minimumCurrentAttempts: 40, volumeSpikeRatio: 1.5 });
  const failedPostprocessing = (postprocessingResult.data ?? []).map((job) => ({ sessionId: job.session_id, message: "The report is safe, but its development-history update did not complete." }));
  return <AthleteWorkspaceShell><ProgressAnalyticsDashboard points={points} developmentTrends={developmentTrends} sharedRoots={sharedRoots} loadFlags={loadFlags} completedPractice={completedPractice} totalPractice={totalPractice} dataWarnings={dataWarnings} failedPostprocessing={failedPostprocessing} /></AthleteWorkspaceShell>;
}
