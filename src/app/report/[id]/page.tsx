import { notFound, redirect } from "next/navigation";

import {
  confirmMovementAndReanalyze,
  markAnalysisReviewed,
  markPracticePlanReady,
  updatePracticePlanProgress,
} from "@/app/actions/analysis-actions";
import { createCoachShare, revokeCoachShares, saveAnalysisFeedback, savePracticeCheckin } from "@/app/actions/experience-actions";
import V6PlayerReport from "@/features/report/components/V6PlayerReport";
import type { ExistingFeedback } from "@/components/analysis/ReportFeedback";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { createClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";
import { visualQaReport } from "@/features/visual-qa/report-fixture";
import {
  buildProgressComparison,
  type ComparableReport,
  type StoredPracticePlan,
} from "@/modules/analysis/progress";
import type { AnalysisReport as Report } from "@/modules/analysis/types";

type PageProps = { params: Promise<{ id: string }> };

type RawReport = Record<string, unknown> & {
  overall_score: number | null;
  score_status?: string | null;
  score_label?: string | null;
  confidence: number | string | null;
  capture_quality: unknown;
  quality_gate?: unknown;
  phase_scores: unknown;
  metric_scores: unknown;
  strengths: unknown;
  priorities: unknown;
  drills: unknown;
  next_session: unknown;
  coach_summary?: unknown;
  performance_story?: unknown;
  visual_moments?: unknown;
  measurement_coverage?: unknown;
  practice_plan?: unknown;
  coaching_playbook?: unknown;
  repetition_insights?: unknown;
  evidence: unknown;
  safety_note: string;
  limitations: unknown;
  engine_manifest?: unknown;
  frame_summary?: unknown;
  movement_timeline?: unknown;
  repetitions?: unknown;
  movement_classification?: unknown;
  coaching_areas?: unknown;
  reference_comparison?: unknown;
};

function mapReport(rawReport: RawReport): Report {
  return {
    overallScore: rawReport.overall_score,
    scoreStatus: rawReport.score_status ?? "legacy",
    scoreLabel: rawReport.score_label ?? "Criterion-based execution index",
    confidence: Number(rawReport.confidence),
    captureQuality: rawReport.capture_quality as Report["captureQuality"],
    qualityGate: (rawReport.quality_gate ?? {
      status: "legacy",
      capturePassed: true,
      movementConfirmed: true,
      repetitionDetected: true,
      canUseTechniqueScore: true,
      messages: [],
    }) as Report["qualityGate"],
    phaseScores: rawReport.phase_scores as Report["phaseScores"],
    metricScores: rawReport.metric_scores as Report["metricScores"],
    strengths: rawReport.strengths as Report["strengths"],
    priorities: rawReport.priorities as Report["priorities"],
    drills: rawReport.drills as Report["drills"],
    nextSession: rawReport.next_session as Report["nextSession"],
    coachSummary: (rawReport.coach_summary ?? {
      headline: "Analysis report",
      strongestQuality: "Review the measured strengths below.",
      mainPriority: "Review the first coaching priority.",
      whyItMatters: "Focus on one change at a time.",
      practiceFocus: [],
    }) as Report["coachSummary"],
    performanceStory: (rawReport.performance_story ?? {
      identity: "This report contains a measured movement baseline.",
      rootCauseHypothesis: "Review the first priority before changing secondary details.",
      transferRisk: "The priority may become more visible under faster or less predictable feeds.",
      nextMilestone: "Complete the prescribed drill and record a comparable reassessment.",
      coachPrinciple: "Change one constraint, preserve the strongest quality, then reassess.",
    }) as Report["performanceStory"],
    visualMoments: (rawReport.visual_moments ?? []) as Report["visualMoments"],
    measurementCoverage: (rawReport.measurement_coverage ?? {
      measured: [],
      estimated: [],
      unavailable: [],
    }) as Report["measurementCoverage"],
    practicePlan: (rawReport.practice_plan ?? {
      title: "Practice plan",
      primaryGoal: "Review the first coaching priority",
      cue: "One change at a time.",
      sessions: [],
    }) as Report["practicePlan"],
    coachingPlaybook: rawReport.coaching_playbook as Report["coachingPlaybook"],
    repetitionInsights: rawReport.repetition_insights as Report["repetitionInsights"],
    evidence: rawReport.evidence as Report["evidence"],
    safetyNote: rawReport.safety_note,
    limitations: rawReport.limitations as string[],
    engineManifest: rawReport.engine_manifest as Report["engineManifest"],
    frameSummary: rawReport.frame_summary as Report["frameSummary"],
    movementTimeline: rawReport.movement_timeline as Report["movementTimeline"],
    repetitions: (rawReport.repetitions ?? []) as Report["repetitions"],
    movementClassification: rawReport.movement_classification as Report["movementClassification"],
    coachingAreas: rawReport.coaching_areas as Report["coachingAreas"],
    referenceComparison: rawReport.reference_comparison as Report["referenceComparison"],
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  if (visualQaEnabled() && id === "visual-qa") {
    async function noOp() { "use server"; }
    async function noOpItem(_itemId: string, _completed: boolean) { "use server"; void _itemId; void _completed; }
    async function noOpForm(_formData: FormData) { "use server"; void _formData; }
    async function noOpCheckin(_itemId: string, _formData: FormData) { "use server"; void _itemId; void _formData; }
    async function noOpShare() { "use server"; return { url: "#", expiresAt: new Date().toISOString() }; }
    return <JourneyShell current="report" maxWidth="max-w-[1500px]"><V6PlayerReport sessionId={id} report={visualQaReport} sportId="tennis" actionType="two_handed_backhand" fileName="two-handed-backhand-practice.mp4" isReviewed={false} onMarkReviewed={noOp} onConfirmMovement={noOpForm} practicePlan={null} progressComparison={null} onTogglePractice={noOpItem} onReadyForReassessment={noOp} onPracticeCheckin={noOpCheckin} practiceCheckins={[]} feedback={null} onSubmitFeedback={noOpForm} onCreateShare={noOpShare} onRevokeShare={noOp} athleteContext={{ ageBand: "19_29", playingLevel: "intermediate", dominantSide: "right", gender: null, heightCm: 178 }} videoUrl="/file.svg" previewOnly /></JourneyShell>;
  }
  const user = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("analysis_sessions")
    .select("id, sport_id, action_type, analysis_action_type, status, current_stage, created_at, videos!inner(filename, storage_path), analysis_reports(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) notFound();
  if (session.status !== "completed") {
    redirect(`/analysis/${id}`);
  }
  const rawReport = (Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports) as RawReport | null;
  if (!rawReport) notFound();
  const video = Array.isArray(session.videos) ? session.videos[0] : session.videos;
  const report = mapReport(rawReport);
  const analysisAction = session.analysis_action_type
    ?? report.movementClassification?.analysisAction
    ?? session.action_type;

  const [
    { data: practiceRow },
    { data: previousSession },
    { data: feedbackRow },
    { data: checkinRows },
    { data: profileRow },
    { data: sportProfileRow },
    { data: physicalProfileRow },
  ] = await Promise.all([
    supabase
      .from("practice_plans")
      .select("id, session_id, primary_goal, coaching_cue, why_it_matters, plan, completion, status, reassessment_due_at")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("analysis_sessions")
      .select("id, created_at, confidence, score_status, engine_manifest, analysis_reports(overall_score, score_status, confidence, capture_quality, coaching_areas, engine_manifest)")
      .eq("user_id", user.id)
      .eq("sport_id", session.sport_id)
      .eq("analysis_action_type", analysisAction)
      .eq("status", "completed")
      .lt("created_at", session.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analysis_feedback")
      .select("movement_accuracy, coaching_clarity, drill_relevance, report_usefulness, visual_clarity, reference_helpfulness, priority_fit, issue_category, comment")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("practice_checkins")
      .select("id, plan_id, session_item_id, target_hits, attempts, effort, confidence_before, confidence_after, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("age_band, playing_level, dominant_hand, gender")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_sports")
      .select("playing_level, dominant_side")
      .eq("profile_id", user.id)
      .eq("sport_id", session.sport_id)
      .maybeSingle(),
    supabase
      .from("physical_profiles")
      .select("height_cm")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  const practicePlan: StoredPracticePlan | null = practiceRow
    ? {
        id: practiceRow.id,
        sessionId: practiceRow.session_id,
        primaryGoal: practiceRow.primary_goal,
        coachingCue: practiceRow.coaching_cue,
        whyItMatters: practiceRow.why_it_matters,
        plan: practiceRow.plan as StoredPracticePlan["plan"],
        completion: (practiceRow.completion ?? {}) as Record<string, boolean>,
        status: practiceRow.status as StoredPracticePlan["status"],
        reassessmentDueAt: practiceRow.reassessment_due_at,
      }
    : null;

  const feedback: ExistingFeedback = feedbackRow ? {
    movementAccuracy: feedbackRow.movement_accuracy,
    coachingClarity: feedbackRow.coaching_clarity,
    drillRelevance: feedbackRow.drill_relevance,
    reportUsefulness: feedbackRow.report_usefulness,
    visualClarity: feedbackRow.visual_clarity,
    referenceHelpfulness: feedbackRow.reference_helpfulness,
    priorityFit: feedbackRow.priority_fit,
    issueCategory: feedbackRow.issue_category,
    comment: feedbackRow.comment,
  } : null;
  const practiceCheckins = (checkinRows ?? []).filter((row: { plan_id?: string | null }) => !practicePlan || row.plan_id === practicePlan.id);

  let previous: ComparableReport | null = null;
  if (previousSession) {
    const previousRaw = Array.isArray(previousSession.analysis_reports)
      ? previousSession.analysis_reports[0]
      : previousSession.analysis_reports;
    if (previousRaw) {
      previous = {
        sessionId: previousSession.id,
        createdAt: previousSession.created_at,
        overallScore: typeof previousRaw.overall_score === "number" ? previousRaw.overall_score : null,
        scoreStatus: previousRaw.score_status ?? previousSession.score_status,
        confidence: Number(previousRaw.confidence ?? previousSession.confidence ?? 0),
        captureScore: Number(previousRaw.capture_quality?.score ?? 0),
        engineVersion: previousRaw.engine_manifest?.engineVersion ?? previousSession.engine_manifest?.engineVersion ?? null,
        runtimeSignature: previousRaw.engine_manifest?.runtimeSignature ?? previousSession.engine_manifest?.runtimeSignature ?? null,
        coachingAreas: (previousRaw.coaching_areas ?? []) as ComparableReport["coachingAreas"],
      };
    }
  }
  const progressComparison = buildProgressComparison(report, previous);
  const isReviewed = session.current_stage === "reviewed";

  const { data: signedVideo } = video?.storage_path
    ? await supabase.storage.from("videos").createSignedUrl(video.storage_path, 60 * 60)
    : { data: null };

  if (!signedVideo?.signedUrl) notFound();

  async function markReviewedAction() {
    "use server";
    await markAnalysisReviewed(id);
  }

  async function confirmMovementAction(formData: FormData) {
    "use server";
    const actionType = formData.get("actionType")?.toString().trim();
    if (!actionType) throw new Error("Choose a movement before reanalysis.");
    await confirmMovementAndReanalyze(id, actionType);
    redirect(`/analysis/${id}`);
  }

  async function togglePracticeAction(itemId: string, completed: boolean) {
    "use server";
    if (!practicePlan) throw new Error("Practice plan not found.");
    await updatePracticePlanProgress(practicePlan.id, itemId, completed);
  }

  async function readyForReassessmentAction() {
    "use server";
    if (!practicePlan) throw new Error("Practice plan not found.");
    await markPracticePlanReady(practicePlan.id);
  }

  async function feedbackAction(formData: FormData) {
    "use server";
    await saveAnalysisFeedback(id, formData);
  }

  async function practiceCheckinAction(itemId: string, formData: FormData) {
    "use server";
    if (!practicePlan) throw new Error("Practice plan not found.");
    await savePracticeCheckin(practicePlan.id, itemId, formData);
  }

  async function createShareAction() {
    "use server";
    return createCoachShare(id);
  }

  async function revokeShareAction() {
    "use server";
    await revokeCoachShares(id);
  }

  return (
    <JourneyShell current="report" maxWidth="max-w-[1500px]">
      <V6PlayerReport
          sessionId={id}
          report={report}
          sportId={session.sport_id}
          actionType={session.action_type}
          fileName={video?.filename ?? "Uploaded video"}
          isReviewed={isReviewed}
          onMarkReviewed={markReviewedAction}
          onConfirmMovement={confirmMovementAction}
          practicePlan={practicePlan}
          progressComparison={progressComparison}
          onTogglePractice={togglePracticeAction}
          onReadyForReassessment={readyForReassessmentAction}
          onPracticeCheckin={practiceCheckinAction}
          practiceCheckins={practiceCheckins}
          feedback={feedback}
          onSubmitFeedback={feedbackAction}
          onCreateShare={createShareAction}
          onRevokeShare={revokeShareAction}
          athleteContext={{
            ageBand: profileRow?.age_band ?? null,
            playingLevel: sportProfileRow?.playing_level ?? profileRow?.playing_level ?? null,
            dominantSide: sportProfileRow?.dominant_side ?? profileRow?.dominant_hand ?? null,
            gender: profileRow?.gender ?? null,
            heightCm: physicalProfileRow?.height_cm === null || physicalProfileRow?.height_cm === undefined
              ? null
              : Number(physicalProfileRow.height_cm),
          }}
          videoUrl={signedVideo.signedUrl}
        />
    </JourneyShell>
  );
}
