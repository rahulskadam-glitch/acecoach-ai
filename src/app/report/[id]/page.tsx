import { notFound, redirect } from "next/navigation";

import {
  confirmMovementAndReanalyze,
  markAnalysisReviewed,
  markPracticePlanReady,
  updatePracticePlanProgress,
} from "@/app/actions/analysis-actions";
import { createCoachShare, revokeCoachShares, saveAnalysisFeedback, savePracticeCheckin } from "@/app/actions/experience-actions";
import V6PlayerReport from "@/features/report/components/V6PlayerReport";
import type { ValidatedBallOutcome } from "@/features/report/types";
import type { ExistingFeedback } from "@/components/analysis/ReportFeedback";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { createAdminClient, createClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";
import { visualQaReport } from "@/features/visual-qa/report-fixture";
import {
  buildProgressComparison,
  reportComparisonContext,
  type ComparableReport,
  type StoredPracticePlan,
} from "@/modules/analysis/progress";
import {
  buildPersonalBaselineComparison,
  type ConstructDistribution,
} from "@/modules/analysis/longitudinal";
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
  knowledge_control?: unknown;
  knowledge_policy_version?: string | null;
  knowledge_manifest_hash?: string | null;
};

type DistributionRow = {
  analysis_session_id: string;
  construct_id: string;
  context_signature: string;
  context_dimensions: ConstructDistribution["contextDimensions"] | null;
  sample_count: number | string;
  median_score: number | string;
  spread: number | string;
  success_rate: number | string | null;
  confidence: number | string;
  capture_score: number | string;
  engine_version: string;
  runtime_signature: string | null;
  knowledge_policy_version: string | null;
  knowledge_manifest_hash: string | null;
  recorded_at: string;
};

type PreviousReportRow = {
  overall_score: number | null;
  score_status: string | null;
  confidence: number | string | null;
  capture_quality: { score?: number | string | null } | null;
  coaching_areas: unknown;
  engine_manifest: { engineVersion?: string; runtimeSignature?: string } | null;
  knowledge_control: Report["knowledgeControl"] | null;
  knowledge_policy_version: string | null;
  knowledge_manifest_hash: string | null;
  coach_summary: unknown;
  frame_summary: Report["frameSummary"] | null;
};

type PreviousSessionRow = {
  id: string;
  created_at: string;
  confidence: number | string | null;
  score_status: string;
  engine_manifest: { engineVersion?: string; runtimeSignature?: string } | null;
  analysis_reports: PreviousReportRow | PreviousReportRow[] | null;
  videos?: { filename: string; storage_path: string } | Array<{ filename: string; storage_path: string }> | null;
};

type TrackerOutcomeRow = {
  repetition_index: number | string;
  execution_result: string | null;
  depth_zone: string | null;
  direction: string | null;
  placement_zone: string | null;
  net_clearance_cm: number | string | null;
  model_version: string | null;
};

function mapReport(rawReport: RawReport): Report {
  const coachSummary = (rawReport.coach_summary ?? {}) as Record<string, unknown>;
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
    nextGenerationStory: coachSummary.nextGenerationStory as Report["nextGenerationStory"],
    ontologyReasoning: coachSummary.ontologyReasoning as Report["ontologyReasoning"],
    knowledgeControl: rawReport.knowledge_control as Report["knowledgeControl"],
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
    return <JourneyShell current="report" maxWidth="max-w-[1500px]"><V6PlayerReport sessionId={id} report={visualQaReport} sportId="tennis" actionType="two_handed_backhand" fileName="two-handed-backhand-practice.mp4" isReviewed={false} onMarkReviewed={noOp} onConfirmMovement={noOpForm} practicePlan={null} progressComparison={null} personalBaselineComparison={null} onTogglePractice={noOpItem} onReadyForReassessment={noOp} onPracticeCheckin={noOpCheckin} practiceCheckins={[]} feedback={null} onSubmitFeedback={noOpForm} onCreateShare={noOpShare} onRevokeShare={noOp} athleteContext={{ ageBand: "19_29", playingLevel: "intermediate", dominantSide: "right", gender: null, heightCm: 178 }} videoUrl="/file.svg" validatedBallOutcomes={[]} previewOnly /></JourneyShell>;
  }
  const user = await requireUser();
  let supabase = await createClient();

  type SessionRow = {
    id: string;
    video_id?: string | null;
    sport_id: string;
    action_type: string;
    analysis_action_type?: string | null;
    status: string;
    current_stage: string;
    created_at: string;
    videos?: { filename?: string; storage_path?: string } | Array<{ filename?: string; storage_path?: string }> | null;
    analysis_reports?: RawReport | RawReport[] | null;
  };

  let session: SessionRow | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("analysis_sessions")
      .select("id, video_id, sport_id, action_type, analysis_action_type, status, current_stage, created_at, videos(filename, storage_path), analysis_reports(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      session = data as SessionRow;
      supabase = admin as unknown as typeof supabase;
    }
  } catch {
    // fallback to user supabase client
  }

  if (!session) {
    const { data } = await supabase
      .from("analysis_sessions")
      .select("id, video_id, sport_id, action_type, analysis_action_type, status, current_stage, created_at, videos(filename, storage_path), analysis_reports(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    session = data as SessionRow | null;
  }

  if (!session) notFound();
  if (session.status !== "completed") {
    redirect(`/analysis/${id}`);
  }
  const rawReport = (Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports) as RawReport | null;
  if (!rawReport) notFound();
  
  let video = Array.isArray(session.videos) ? session.videos[0] : session.videos;
  if (!video && session.video_id) {
    try {
      const admin = createAdminClient();
      const { data: videoRow } = await admin
        .from("videos")
        .select("filename, storage_path")
        .eq("id", session.video_id)
        .maybeSingle();
      if (videoRow) video = videoRow;
    } catch {
      // fallback
    }
  }

  const report = mapReport(rawReport);
  const analysisAction = (typeof session.analysis_action_type === "string" ? session.analysis_action_type : null)
    ?? report.movementClassification?.analysisAction
    ?? (typeof session.action_type === "string" ? session.action_type : "forehand");

  const [
    { data: practiceRow },
    { data: previousSessions },
    { data: feedbackRow },
    { data: checkinRows },
    { data: profileRow },
    { data: sportProfileRow },
    { data: physicalProfileRow },
    { data: distributionRows },
    { data: trackerOutcomeRows, error: trackerOutcomeError },
  ] = await Promise.all([
    supabase
      .from("practice_plans")
      .select("id, session_id, primary_goal, coaching_cue, why_it_matters, plan, completion, status, reassessment_due_at")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("analysis_sessions")
      .select("id, created_at, confidence, score_status, engine_manifest, videos(filename, storage_path), analysis_reports(overall_score, score_status, confidence, capture_quality, coaching_areas, engine_manifest, coach_summary, frame_summary, knowledge_control, knowledge_policy_version, knowledge_manifest_hash)")
      .eq("user_id", user.id)
      .eq("sport_id", session.sport_id)
      .eq("analysis_action_type", analysisAction)
      .eq("status", "completed")
      .lt("created_at", session.created_at)
      .order("created_at", { ascending: false })
      .limit(12),
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
    supabase
      .from("construct_session_distributions")
      .select("analysis_session_id, construct_id, context_signature, context_dimensions, sample_count, median_score, spread, success_rate, confidence, capture_score, engine_version, runtime_signature, knowledge_policy_version, knowledge_manifest_hash, recorded_at")
      .eq("user_id", user.id)
      .eq("sport_id", session.sport_id)
      .eq("action_type", analysisAction)
      .order("recorded_at", { ascending: false })
      .limit(240),
    supabase
      .from("analysis_rep_outcomes")
      .select("repetition_index, outcome_source, validation_status, execution_result, depth_zone, direction, placement_zone, net_clearance_cm, model_version")
      .eq("analysis_session_id", id)
      .eq("user_id", user.id)
      .eq("outcome_source", "validated_ball_tracker")
      .eq("validation_status", "tracker_verified")
      .order("repetition_index", { ascending: true }),
  ]);

  if (trackerOutcomeError) throw new Error(trackerOutcomeError.message);

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

  const previousCandidates: ComparableReport[] = ((previousSessions ?? []) as PreviousSessionRow[]).flatMap((previousSession) => {
    const previousRaw = Array.isArray(previousSession.analysis_reports)
      ? previousSession.analysis_reports[0]
      : previousSession.analysis_reports;
    if (!previousRaw) return [];
    if (
      previousRaw.knowledge_control?.status !== "CONTROLLED"
      || previousRaw.knowledge_policy_version !== report.knowledgeControl?.policyVersion
      || previousRaw.knowledge_manifest_hash !== report.knowledgeControl?.manifestHash
    ) return [];
    const previousCoachSummary = (previousRaw.coach_summary ?? {}) as Record<string, unknown>;
    const previousOntology = (previousCoachSummary.ontologyReasoning ?? {}) as Record<string, unknown>;
    return [{
        sessionId: previousSession.id,
        createdAt: previousSession.created_at,
        overallScore: typeof previousRaw.overall_score === "number" ? previousRaw.overall_score : null,
        scoreStatus: previousRaw.score_status ?? previousSession.score_status,
        confidence: Number(previousRaw.confidence ?? previousSession.confidence ?? 0),
        captureScore: Number(previousRaw.capture_quality?.score ?? 0),
        engineVersion: previousRaw.engine_manifest?.engineVersion ?? previousSession.engine_manifest?.engineVersion ?? null,
        runtimeSignature: previousRaw.engine_manifest?.runtimeSignature ?? previousSession.engine_manifest?.runtimeSignature ?? null,
        knowledgePolicyVersion: previousRaw.knowledge_policy_version,
        knowledgeManifestHash: previousRaw.knowledge_manifest_hash,
        contextSignature: reportComparisonContext({ frameSummary: previousRaw.frame_summary } as Report),
        coachingAreas: (previousRaw.coaching_areas ?? []) as ComparableReport["coachingAreas"],
        movementChain: (Array.isArray(previousOntology.movementChain) ? previousOntology.movementChain : []) as ComparableReport["movementChain"],
      }];
  });
  const candidateComparisons = previousCandidates
    .map((candidate) => buildProgressComparison(report, candidate))
    .filter((comparison): comparison is NonNullable<typeof comparison> => comparison !== null);
  const progressComparison = candidateComparisons.find((comparison) => comparison.comparable)
    ?? candidateComparisons[0]
    ?? null;
  const validatedBallOutcomes: ValidatedBallOutcome[] = ((trackerOutcomeRows ?? []) as TrackerOutcomeRow[]).map((row) => ({
    repetitionIndex: Number(row.repetition_index),
    outcomeSource: "validated_ball_tracker",
    validationStatus: "tracker_verified",
    executionResult: row.execution_result,
    depthZone: row.depth_zone,
    direction: row.direction,
    placementZone: row.placement_zone,
    netClearanceCm: row.net_clearance_cm === null ? null : Number(row.net_clearance_cm),
    modelVersion: row.model_version,
  }));
  const distributions: ConstructDistribution[] = (distributionRows ?? []).map((row: DistributionRow) => ({
    sessionId: row.analysis_session_id,
    constructId: row.construct_id,
    contextSignature: row.context_signature,
    contextDimensions: row.context_dimensions ?? undefined,
    sampleCount: Number(row.sample_count),
    medianScore: Number(row.median_score),
    spread: Number(row.spread),
    successRate: row.success_rate === null ? null : Number(row.success_rate),
    confidence: Number(row.confidence),
    captureScore: Number(row.capture_score),
    engineVersion: row.engine_version,
    runtimeSignature: row.runtime_signature,
    knowledgePolicyVersion: row.knowledge_policy_version,
    knowledgeManifestHash: row.knowledge_manifest_hash,
    recordedAt: row.recorded_at,
  }));
  const controlledDistributions = distributions.filter((item) => (
    item.knowledgePolicyVersion === report.knowledgeControl?.policyVersion
    && item.knowledgeManifestHash === report.knowledgeControl?.manifestHash
  ));
  const currentDistributions = controlledDistributions.filter((item) => item.sessionId === id);
  const personalBaselinePolicy = report.ontologyReasoning?.knowledgeLayerStatus?.personalBaseline;
  const personalBaselineComparison = currentDistributions.length > 0 && personalBaselinePolicy
    ? buildPersonalBaselineComparison(currentDistributions, controlledDistributions, {
        minimumPriorSessions: personalBaselinePolicy.minimumPriorContextMatchedSessions,
        minimumPriorRepetitions: personalBaselinePolicy.minimumTotalRepetitions,
        minimumMeasurementConfidence: personalBaselinePolicy.minimumMeasurementConfidence,
        maximumCaptureScoreDifference: personalBaselinePolicy.maximumCaptureScoreDifference,
      })
    : null;
  const isReviewed = session.current_stage === "reviewed";

  const { data: signedVideo } = video?.storage_path
    ? await supabase.storage.from("videos").createSignedUrl(video.storage_path, 60 * 60).catch(() => ({ data: null }))
    : { data: null };

  const finalVideoUrl = signedVideo?.signedUrl ?? "/file.svg";
  const strokeHistory = [
    ...previousCandidates.map((item) => ({ sessionId: item.sessionId, recordedAt: item.createdAt, score: item.overallScore })),
    { sessionId: id, recordedAt: session.created_at, score: report.overallScore },
  ].sort((left, right) => (Date.parse(left.recordedAt) || 0) - (Date.parse(right.recordedAt) || 0));
  const matchedPreviousSession = ((previousSessions ?? []) as PreviousSessionRow[]).find((item) => item.created_at === progressComparison?.previousDate) ?? null;
  const matchedPreviousVideo = matchedPreviousSession
    ? (Array.isArray(matchedPreviousSession.videos) ? matchedPreviousSession.videos[0] : matchedPreviousSession.videos)
    : null;
  const { data: signedPreviousVideo } = matchedPreviousVideo?.storage_path
    ? await supabase.storage.from("videos").createSignedUrl(matchedPreviousVideo.storage_path, 60 * 60)
    : { data: null };
  const matchedPreviousReport = matchedPreviousSession
    ? (Array.isArray(matchedPreviousSession.analysis_reports) ? matchedPreviousSession.analysis_reports[0] : matchedPreviousSession.analysis_reports)
    : null;
  const previousContact = matchedPreviousReport?.frame_summary?.frameMetrics?.find((frame) => frame.phase === "contact")?.timestampSeconds
    ?? matchedPreviousReport?.frame_summary?.frameMetrics?.find((frame) => typeof frame.timestampSeconds === "number")?.timestampSeconds
    ?? 0;
  const previousRecording = signedPreviousVideo?.signedUrl && matchedPreviousSession
    ? { videoUrl: signedPreviousVideo.signedUrl, recordedAt: matchedPreviousSession.created_at, score: matchedPreviousReport?.overall_score ?? null, contactSeconds: previousContact }
    : null;


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
          actionType={analysisAction ?? session.action_type ?? "forehand"}
          fileName={video?.filename ?? "Uploaded video"}
          isReviewed={isReviewed}
          onMarkReviewed={markReviewedAction}
          onConfirmMovement={confirmMovementAction}
          practicePlan={practicePlan}
          progressComparison={progressComparison}
          personalBaselineComparison={personalBaselineComparison}
          strokeHistory={strokeHistory}
          previousRecording={previousRecording}
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
          videoUrl={finalVideoUrl}
          validatedBallOutcomes={validatedBallOutcomes}
        />
    </JourneyShell>
  );
}
