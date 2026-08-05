"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getSport } from "@/lib/sports";
import { createAdminClient, requireUser } from "@/lib/supabase/server";
import type { AnalysisReport, EngineManifest } from "@/modules/analysis/types";

const ANALYSIS_API_URL = process.env.ANALYSIS_API_URL ?? "http://127.0.0.1:8000";
const ENGINE_VERSION = "movement-intelligence-v1.9.0";
const ANALYSIS_API_KEY = process.env.ANALYSIS_API_KEY;
const MAX_ANALYSIS_RESPONSE_BYTES = 15 * 1024 * 1024;
const CONTEXT_PERSISTENCE_DEBUG = process.env.CONTEXT_PERSISTENCE_DEBUG === "1";

type AnalysisApiResponse = {
  input_fingerprint: string;
  content_hash: string;
  overall_score: number | null;
  score_status: string;
  score_label: string;
  confidence: number;
  capture_quality: AnalysisReport["captureQuality"];
  quality_gate: AnalysisReport["qualityGate"];
  phase_scores: AnalysisReport["phaseScores"];
  metric_scores: AnalysisReport["metricScores"];
  strengths: AnalysisReport["strengths"];
  priorities: AnalysisReport["priorities"];
  drills: AnalysisReport["drills"];
  next_session: AnalysisReport["nextSession"];
  coach_summary: AnalysisReport["coachSummary"];
  performance_story: AnalysisReport["performanceStory"];
  visual_moments: AnalysisReport["visualMoments"];
  measurement_coverage: AnalysisReport["measurementCoverage"];
  practice_plan: AnalysisReport["practicePlan"];
  coaching_playbook: NonNullable<AnalysisReport["coachingPlaybook"]>;
  repetition_insights: NonNullable<AnalysisReport["repetitionInsights"]>;
  evidence: AnalysisReport["evidence"];
  safety_note: string;
  limitations: string[];
  engine_manifest: EngineManifest;
  frame_summary: NonNullable<AnalysisReport["frameSummary"]>;
  movement_timeline: NonNullable<AnalysisReport["movementTimeline"]>;
  repetitions: NonNullable<AnalysisReport["repetitions"]>;
  movement_classification: NonNullable<AnalysisReport["movementClassification"]>;
  coaching_areas: NonNullable<AnalysisReport["coachingAreas"]>;
  reference_comparison: NonNullable<AnalysisReport["referenceComparison"]>;
};



type AthleteContext = {
  ageBand: string | null;
  playingLevel: string | null;
  dominantSide: string;
  primaryGoal: string | null;
  serviceProcessing: boolean;
  heightCm: number | null;
};

type CaptureContextInput = {
  cameraAngle?: string;
  shotSituation?: string;
  shotIntent?: string;
  specificQuestion?: string;
};

type SafetyPrecheckInput = {
  sourceVideoHash: string;
  precheckStatus: "passed" | "failed_benign_mismatch" | "blocked_safety_review";
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAnalysisApiResponse(value: unknown): asserts value is AnalysisApiResponse {
  if (!isRecord(value)) throw new Error("Analysis service returned an invalid response.");
  const requiredStrings = ["input_fingerprint", "content_hash", "score_status", "score_label", "safety_note"] as const;
  for (const key of requiredStrings) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new Error(`Analysis service response is missing ${key}.`);
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(String(value.content_hash))) {
    throw new Error("Analysis service returned an invalid video content hash.");
  }
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    throw new Error("Analysis service returned an invalid confidence value.");
  }
  if (value.overall_score !== null && (typeof value.overall_score !== "number" || value.overall_score < 0 || value.overall_score > 100)) {
    throw new Error("Analysis service returned an invalid score.");
  }
  const requiredObjects = [
    "capture_quality", "quality_gate", "next_session", "coach_summary", "performance_story",
    "measurement_coverage", "practice_plan", "coaching_playbook", "repetition_insights",
    "engine_manifest", "frame_summary", "movement_classification", "reference_comparison",
  ] as const;
  for (const key of requiredObjects) {
    if (!isRecord(value[key])) throw new Error(`Analysis service response is missing ${key}.`);
  }
  const requiredArrays = [
    "phase_scores", "metric_scores", "strengths", "priorities", "drills", "visual_moments",
    "evidence", "limitations", "movement_timeline", "repetitions", "coaching_areas",
  ] as const;
  for (const key of requiredArrays) {
    if (!Array.isArray(value[key])) throw new Error(`Analysis service response is missing ${key}.`);
  }
  const arrayLimits: Record<string, number> = {
    phase_scores: 20,
    metric_scores: 60,
    strengths: 12,
    priorities: 12,
    drills: 20,
    visual_moments: 40,
    evidence: 100,
    limitations: 100,
    movement_timeline: 100,
    repetitions: 30,
    coaching_areas: 40,
  };
  for (const [key, limit] of Object.entries(arrayLimits)) {
    if ((value[key] as unknown[]).length > limit) {
      throw new Error(`Analysis service response contains too many ${key}.`);
    }
  }
  const manifest = value.engine_manifest as Record<string, unknown>;
  if (manifest.engineVersion !== ENGINE_VERSION) {
    throw new Error(`Analysis service version mismatch. Expected ${ENGINE_VERSION}.`);
  }
  const frameSummary = value.frame_summary as Record<string, unknown>;
  const biomechanicalProfile = frameSummary.biomechanicalProfile;
  if (!isRecord(biomechanicalProfile)) {
    throw new Error("Analysis service response is missing the 106-point biomechanical profile.");
  }
  if (
    biomechanicalProfile.metricCount !== 106
    || !Array.isArray(biomechanicalProfile.metrics)
    || biomechanicalProfile.metrics.length !== 106
    || !Array.isArray(biomechanicalProfile.phases)
    || biomechanicalProfile.phases.length !== 6
    || !Array.isArray(biomechanicalProfile.linkages)
    || biomechanicalProfile.linkages.length !== 6
  ) {
    throw new Error("Analysis service returned an incomplete 106-point biomechanical profile.");
  }
  const movement = value.movement_classification as Record<string, unknown>;
  if (typeof movement.analysisAction !== "string" || typeof movement.detectedAction !== "string") {
    throw new Error("Analysis service returned an invalid movement classification.");
  }
  const gate = value.quality_gate as Record<string, unknown>;
  if (typeof gate.movementConfirmed !== "boolean" || typeof gate.canUseTechniqueScore !== "boolean") {
    throw new Error("Analysis service returned an invalid reliability gate.");
  }
  const plan = value.practice_plan as Record<string, unknown>;
  if (!Array.isArray(plan.sessions)) throw new Error("Analysis service returned an invalid practice plan.");
}

function athleteContextFingerprint(
  sportId: string,
  selectedAction: string,
  context: AthleteContext,
  captureContext?: Record<string, unknown> | null,
) {
  const payload = JSON.stringify({
    engineVersion: ENGINE_VERSION,
    sportId,
    selectedAction,
    ageBand: context.ageBand ?? "",
    playingLevel: context.playingLevel ?? "",
    dominantSide: context.dominantSide,
    primaryGoal: context.primaryGoal ?? "",
    heightCm: context.heightCm ?? "",
    cameraAngle: captureContextValue(captureContext, "cameraAngle", 32) ?? "",
    shotSituation: captureContextValue(captureContext, "shotSituation", 64) ?? "",
    shotIntent: captureContextValue(captureContext, "shotIntent", 64) ?? "",
    athleteQuestion: captureContextValue(captureContext, "specificQuestion", 500) ?? "",
  });
  return createHash("sha256").update(payload).digest("hex");
}

function captureContextValue(
  captureContext: Record<string, unknown> | null | undefined,
  key: string,
  maxLength: number,
) {
  const raw = captureContext?.[key];
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().slice(0, maxLength);
  return cleaned || null;
}

function normalizeCaptureContext(input?: CaptureContextInput | Record<string, unknown> | null) {
  const cameraAngle = captureContextValue(input, "cameraAngle", 32) ?? "unknown";
  const shotSituation = captureContextValue(input, "shotSituation", 64) ?? "unknown";
  const shotIntent = captureContextValue(input, "shotIntent", 64) ?? "unknown";
  if (!["unknown", "side", "rear", "front", "diagonal"].includes(cameraAngle)) throw new Error("Choose a supported camera angle.");
  if (!["controlled_practice", "neutral_rally", "attacking", "defensive_on_run", "return_of_serve", "unknown"].includes(shotSituation)) throw new Error("Choose a supported shot situation.");
  if (!["consistency", "depth", "heavy_topspin", "flatter_drive", "angle", "approach", "defensive_height", "unknown"].includes(shotIntent)) throw new Error("Choose a supported shot intention.");
  return {
    cameraAngle,
    shotSituation,
    shotIntent,
    specificQuestion: captureContextValue(input, "specificQuestion", 500) ?? "",
  };
}

function captureContextFromManifest(value: unknown) {
  if (!isRecord(value) || !isRecord(value.intakeContext)) return normalizeCaptureContext();
  return normalizeCaptureContext(value.intakeContext);
}

type SupabaseClient = ReturnType<typeof createAdminClient>;
type User = Awaited<ReturnType<typeof requireUser>>;

type VideoRow = {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  sport_id: string | null;
  action_type: string | null;
  content_hash: string | null;
};


function assertOwnedVideoPath(video: VideoRow, userId: string) {
  const sportId = video.sport_id ?? "tennis";
  const expectedPrefix = `${userId}/${sportId}/`;
  if (
    video.user_id !== userId
    || !video.storage_path.startsWith(expectedPrefix)
    || video.storage_path.includes("..")
    || video.storage_path.includes("\\")
  ) {
    throw new Error("The video storage path failed its ownership check.");
  }
}

async function callAnalysisApi(payload: Record<string, unknown>): Promise<AnalysisApiResponse> {
  if (!ANALYSIS_API_KEY || ANALYSIS_API_KEY.length < 32) {
    throw new Error("ANALYSIS_API_KEY must be configured as a secret of at least 32 characters in both services.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    const response = await fetch(`${ANALYSIS_API_URL}/analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ANALYSIS_API_KEY ? { "X-Analysis-API-Key": ANALYSIS_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(detail?.detail ?? `Analysis service returned HTTP ${response.status}.`);
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_ANALYSIS_RESPONSE_BYTES) {
      throw new Error("Analysis service response exceeded the safe size limit.");
    }
    const responseText = await response.text();
    if (Buffer.byteLength(responseText, "utf8") > MAX_ANALYSIS_RESPONSE_BYTES) {
      throw new Error("Analysis service response exceeded the safe size limit.");
    }
    let body: unknown;
    try {
      body = JSON.parse(responseText);
    } catch {
      throw new Error("Analysis service returned malformed JSON.");
    }
    validateAnalysisApiResponse(body);
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Analysis timed out. Try a shorter clip with the full body clearly visible.");
    }
    if (error instanceof TypeError) {
      throw new Error(
        `The analysis service is not reachable at ${ANALYSIS_API_URL}. Start the Python analysis API before analyzing a video.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadAthleteContext(supabase: SupabaseClient, userId: string, sportId: string): Promise<AthleteContext> {
  const [{ data: profile }, { data: sportProfile }, { data: consent }, { data: physicalProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("age_band, playing_level, dominant_hand, goals")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("profile_sports")
      .select("playing_level, dominant_side, goals")
      .eq("profile_id", userId)
      .eq("sport_id", sportId)
      .maybeSingle(),
    supabase
      .from("consents")
      .select("service_processing")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("physical_profiles")
      .select("height_cm")
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  const goals = Array.isArray(sportProfile?.goals) && sportProfile.goals.length > 0
    ? sportProfile.goals
    : Array.isArray(profile?.goals)
      ? profile.goals
      : [];

  return {
    ageBand: profile?.age_band ?? null,
    playingLevel: sportProfile?.playing_level ?? profile?.playing_level ?? null,
    dominantSide: sportProfile?.dominant_side ?? profile?.dominant_hand ?? "right",
    primaryGoal: typeof goals[0] === "string" ? goals[0] : null,
    serviceProcessing: consent?.service_processing === true,
    heightCm: physicalProfile?.height_cm === null || physicalProfile?.height_cm === undefined
      ? null
      : Number(physicalProfile.height_cm),
  };
}

function requireAnalysisConsent(context: AthleteContext) {
  if (!context.serviceProcessing) {
    throw new Error("Complete your coaching profile and approve service-processing consent before analyzing a video.");
  }
}

function isMinorAgeBand(ageBand: string | null) {
  if (!ageBand) return false;
  return ["under_10", "10_12", "under_13", "13_15", "13_17", "16_18"].includes(ageBand);
}

function mapConsentStatus(context: AthleteContext):
  | "not_required_adult_self_consent"
  | "guardian_consent_active"
  | "guardian_consent_missing_blocked" {
  if (!context.serviceProcessing) return "guardian_consent_missing_blocked";
  return isMinorAgeBand(context.ageBand) ? "guardian_consent_active" : "not_required_adult_self_consent";
}

async function persistV220Context(
  supabase: SupabaseClient,
  input: {
    sessionId: string;
    playerId: string;
    actionType: string;
    captureContext: ReturnType<typeof normalizeCaptureContext>;
    athleteContext: AthleteContext;
    sourceVideoHash?: string;
    precheckStatus?: SafetyPrecheckInput["precheckStatus"];
    precheckMessage?: string;
  },
) {
  const { error: sessionContextError } = await supabase
    .from("session_context")
    .upsert(
      {
        analysis_session_id: input.sessionId,
        player_id: input.playerId,
        session_goal: input.athleteContext.primaryGoal ?? "improve_technique",
        specific_stroke_focus: [input.actionType],
        camera_device_class: "unknown",
        camera_view: input.captureContext.cameraAngle,
        camera_stability: "unknown",
        court_surface: "unknown",
        self_reported_state: [input.captureContext.shotSituation, input.captureContext.shotIntent],
        consent_status: mapConsentStatus(input.athleteContext),
      },
      { onConflict: "analysis_session_id" },
    );

  if (sessionContextError) {
    throw new Error(sessionContextError.message);
  }

  if (!input.sourceVideoHash || !input.precheckStatus) {
    return;
  }

  const { error: moderationError } = await supabase
    .from("content_moderation_log")
    .insert({
      analysis_session_id: input.sessionId,
      source_video_hash: input.sourceVideoHash,
      scene_classifier_result: "intake_precheck",
      scene_classifier_confidence: 1,
      trust_and_safety_flag: input.precheckMessage ?? null,
      precheck_status: input.precheckStatus,
    });

  if (moderationError) {
    throw new Error(moderationError.message);
  }
}

function reportContextPersistence(
  sessionId: string,
  outcome: "persisted" | "skipped",
  reason: string,
) {
  if (!CONTEXT_PERSISTENCE_DEBUG) {
    return;
  }
  console.info("[analysis][context-persistence]", {
    sessionId,
    outcome,
    reason,
  });
}

async function executeAnalysis({
  supabase,
  user,
  video,
  sessionId,
  confirmedAction,
  athleteContext: suppliedAthleteContext,
  contextFingerprint: suppliedContextFingerprint,
  captureContext: suppliedCaptureContext,
}: {
  supabase: SupabaseClient;
  user: User;
  video: VideoRow;
  sessionId: string;
  confirmedAction?: string;
  athleteContext?: AthleteContext;
  contextFingerprint?: string;
  captureContext?: CaptureContextInput | Record<string, unknown> | null;
}) {
  assertOwnedVideoPath(video, user.id);
  const sportId = video.sport_id ?? "tennis";
  const selectedAction = video.action_type ?? "forehand";
  const { data: previousSession, error: previousSessionError } = await supabase
    .from("analysis_sessions")
    .select("status, current_stage, confirmed_action_type, movement_confirmation_status, athlete_context_fingerprint, score_status, analysis_reports(id)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (previousSessionError || !previousSession) {
    throw new Error(previousSessionError?.message ?? "Analysis session not found.");
  }
  const priorReports = Array.isArray(previousSession.analysis_reports)
    ? previousSession.analysis_reports
    : previousSession.analysis_reports
      ? [previousSession.analysis_reports]
      : [];
  const hadCompletedReport = previousSession.status === "completed" && priorReports.length > 0;
  const athleteContext = suppliedAthleteContext ?? await loadAthleteContext(supabase, user.id, sportId);
  const captureContext = normalizeCaptureContext(suppliedCaptureContext);
  requireAnalysisConsent(athleteContext);
  const contextFingerprint = suppliedContextFingerprint ?? athleteContextFingerprint(sportId, selectedAction, athleteContext, captureContext);

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("videos")
    .createSignedUrl(video.storage_path, 15 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(signedUrlError?.message ?? "Unable to create a secure video URL for analysis.");
  }

  const { data: claimedSession, error: processingError } = await supabase
    .from("analysis_sessions")
    .update({
      status: "processing",
      progress: 10,
      current_stage: "checking_video_quality",
      error_message: null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .in("status", ["queued", "failed", "completed"])
    .select("id")
    .maybeSingle();

  if (processingError) throw new Error(processingError.message);
  if (!claimedSession) {
    throw new Error("This analysis is already running. Wait for it to finish before trying again.");
  }

  try {
    await supabase
      .from("analysis_sessions")
      .update({ current_stage: "measuring_technique", progress: 45, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    const result = await callAnalysisApi({
      user_id: user.id,
      video_id: video.id,
      video_url: signedUrlData.signedUrl,
      video_name: video.filename,
      sport_id: sportId,
      action_type: selectedAction,
      confirmed_action_type: confirmedAction ?? null,
      expected_content_hash: video.content_hash ?? null,
      age_band: athleteContext.ageBand,
      playing_level: athleteContext.playingLevel,
      dominant_side: athleteContext.dominantSide,
      primary_goal: athleteContext.primaryGoal,
      height_cm: athleteContext.heightCm,
      camera_angle: captureContext.cameraAngle,
      shot_situation: captureContext.shotSituation,
      shot_intent: captureContext.shotIntent,
      athlete_question: captureContext.specificQuestion || null,
    });

    const manifest = result.engine_manifest;
    const analysisAction = result.movement_classification.analysisAction ?? selectedAction;
    const confirmationStatus = confirmedAction
      ? "confirmed"
      : result.quality_gate.movementConfirmed
        ? "supported"
        : "pending";

    const { error: reportError } = await supabase.from("analysis_reports").upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        video_id: video.id,
        sport_id: sportId,
        action_type: selectedAction,
        analysis_action_type: analysisAction,
        confirmed_action_type: confirmedAction ?? null,
        movement_confirmation_status: confirmationStatus,
        overall_score: result.overall_score,
        score_status: result.score_status,
        score_label: result.score_label,
        confidence: result.confidence,
        capture_quality: result.capture_quality,
        quality_gate: result.quality_gate,
        phase_scores: result.phase_scores,
        metric_scores: result.metric_scores,
        strengths: result.strengths,
        priorities: result.priorities,
        drills: result.drills,
        next_session: result.next_session,
        coach_summary: result.coach_summary,
        performance_story: result.performance_story,
        visual_moments: result.visual_moments,
        measurement_coverage: result.measurement_coverage,
        practice_plan: result.practice_plan,
        coaching_playbook: result.coaching_playbook,
        repetition_insights: result.repetition_insights,
        evidence: result.evidence,
        safety_note: result.safety_note,
        limitations: result.limitations,
        report_version: manifest.reportVersion,
        engine_manifest: { ...manifest, intakeContext: captureContext },
        frame_summary: result.frame_summary,
        movement_timeline: result.movement_timeline,
        repetitions: result.repetitions,
        detected_action_type: result.movement_classification.detectedAction,
        movement_classification: result.movement_classification,
        coaching_areas: result.coaching_areas,
        reference_comparison: result.reference_comparison,
        input_fingerprint: result.input_fingerprint,
        athlete_context_fingerprint: contextFingerprint,
      },
      { onConflict: "session_id" },
    );

    if (reportError) throw new Error(reportError.message);

    if (result.quality_gate.movementConfirmed && result.practice_plan.sessions.length > 0) {
      const completion = Object.fromEntries(
        result.practice_plan.sessions.map((item) => [item.id, false]),
      );
      const reassessmentDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: planError } = await supabase.rpc("upsert_active_practice_plan_v30", {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_sport_id: sportId,
        p_action_type: analysisAction,
        p_primary_goal: result.practice_plan.primaryGoal,
        p_coaching_cue: result.practice_plan.cue,
        p_why_it_matters: result.coach_summary.whyItMatters,
        p_plan: result.practice_plan,
        p_completion: completion,
        p_reassessment_due_at: reassessmentDue,
      });
      if (planError) throw new Error(planError.message);
    }

    const { error: completeError } = await supabase
      .from("analysis_sessions")
      .update({
        status: "completed",
        progress: 100,
        current_stage: "report_ready",
        confidence: result.confidence,
        engine_version: ENGINE_VERSION,
        input_fingerprint: result.input_fingerprint,
        athlete_context_fingerprint: contextFingerprint,
        pose_model_version: manifest.poseModelVersion,
        biomechanics_version: manifest.biomechanicsVersion,
        scoring_version: manifest.scoringVersion,
        knowledge_version: manifest.knowledgeVersion,
        report_version: manifest.reportVersion,
        engine_manifest: { ...manifest, intakeContext: captureContext },
        detected_action_type: result.movement_classification.detectedAction,
        analysis_action_type: analysisAction,
        confirmed_action_type: confirmedAction ?? null,
        movement_confirmation_status: confirmationStatus,
        movement_confidence: result.movement_classification.confidence,
        movement_classification: result.movement_classification,
        score_status: result.score_status,
        quality_gate: result.quality_gate,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (completeError) throw new Error(completeError.message);

    const { error: videoUpdateError } = await supabase
      .from("videos")
      .update({ content_hash: result.content_hash, status: "analyzed" })
      .eq("id", video.id)
      .eq("user_id", user.id);

    if (videoUpdateError) throw new Error(videoUpdateError.message);

    revalidatePath("/upload");
    revalidatePath("/dashboard");
    revalidatePath(`/analysis/${sessionId}`);
    revalidatePath(`/report/${sessionId}`);

    return { sessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await supabase
      .from("analysis_sessions")
      .update(hadCompletedReport
        ? {
            status: "completed",
            progress: 100,
            current_stage: previousSession.current_stage ?? "report_ready",
            error_message: `Reanalysis failed; the previous completed report was preserved. ${message}`,
            score_status: previousSession.score_status ?? "legacy",
            confirmed_action_type: previousSession.confirmed_action_type,
            movement_confirmation_status: previousSession.movement_confirmation_status,
            athlete_context_fingerprint: previousSession.athlete_context_fingerprint,
            updated_at: new Date().toISOString(),
          }
        : {
            status: "failed",
            current_stage: "failed",
            error_message: message,
            score_status: "failed",
            updated_at: new Date().toISOString(),
          })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    throw error;
  }
}

export async function queueAnalysisVideo(
  videoId: string,
  suppliedCaptureContext?: CaptureContextInput,
  safetyPrecheck?: SafetyPrecheckInput,
) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, user_id, filename, storage_path, sport_id, action_type, content_hash")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .single();

  if (videoError || !video) throw new Error(videoError?.message ?? "Video not found.");

  const sportId = video.sport_id ?? "tennis";
  const actionType = video.action_type ?? "forehand";
  const captureContext = normalizeCaptureContext(suppliedCaptureContext);
  const context = await loadAthleteContext(supabase, user.id, sportId);
  requireAnalysisConsent(context);
  const contextFingerprint = athleteContextFingerprint(sportId, actionType, context, captureContext);

  const { data: existingRows, error: existingError } = await supabase
    .from("analysis_sessions")
    .select("id, status, updated_at")
    .eq("video_id", videoId)
    .eq("user_id", user.id)
    .eq("engine_version", ENGINE_VERSION)
    .eq("athlete_context_fingerprint", contextFingerprint)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) throw new Error(existingError.message);
  const existing = existingRows?.[0] ?? null;
  const existingUpdatedAt = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
  const queuedIsStale = existing?.status === "queued" && Date.now() - existingUpdatedAt > 2 * 60 * 1000;
  const processingIsStale = existing?.status === "processing" && Date.now() - existingUpdatedAt > 12 * 60 * 1000;

  if (existing?.status === "completed" || (existing?.status === "processing" && !processingIsStale) || (existing?.status === "queued" && !queuedIsStale)) {
    return { sessionId: existing.id, status: existing.status, contextPersistence: "skipped_existing" as const };
  }

  if (existing?.status === "failed" || queuedIsStale || processingIsStale) {
    const { error: resetError } = await supabase
      .from("analysis_sessions")
      .update({
        status: "queued",
        progress: 0,
        current_stage: "queued",
        error_message: null,
        score_status: "pending",
        engine_manifest: { intakeContext: captureContext },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (resetError) throw new Error(resetError.message);
    let contextPersistence: "persisted" | "skipped" = "persisted";
    try {
      await persistV220Context(supabase, {
        sessionId: existing.id,
        playerId: user.id,
        actionType,
        captureContext,
        athleteContext: context,
        sourceVideoHash: safetyPrecheck?.sourceVideoHash,
        precheckStatus: safetyPrecheck?.precheckStatus,
        precheckMessage: safetyPrecheck?.message,
      });
      reportContextPersistence(existing.id, "persisted", "queued_session_reset");
    } catch (error) {
      contextPersistence = "skipped";
      reportContextPersistence(existing.id, "skipped", "queued_session_reset_write_failed");
      console.warn("[analysis] context persistence skipped", error);
    }
    return { sessionId: existing.id, status: "queued" as const, contextPersistence };
  }

  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .insert({
      user_id: user.id,
      video_id: videoId,
      sport_id: sportId,
      action_type: actionType,
      status: "queued",
      progress: 0,
      current_stage: "queued",
      engine_version: ENGINE_VERSION,
      analysis_mode: "monocular_pose_review_led_research_beta",
      confidence: 0,
      error_message: null,
      movement_confirmation_status: "pending",
      score_status: "pending",
      athlete_context_fingerprint: contextFingerprint,
      engine_manifest: { intakeContext: captureContext },
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    if (sessionError?.code === "23505") {
      const { data: raced } = await supabase
        .from("analysis_sessions")
        .select("id, status")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .eq("engine_version", ENGINE_VERSION)
        .eq("athlete_context_fingerprint", contextFingerprint)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (raced) return { sessionId: raced.id, status: raced.status };
    }
    throw new Error(sessionError?.message ?? "Unable to create analysis session.");
  }

  let contextPersistence: "persisted" | "skipped" = "persisted";
  try {
    await persistV220Context(supabase, {
      sessionId: session.id,
      playerId: user.id,
      actionType,
      captureContext,
      athleteContext: context,
      sourceVideoHash: safetyPrecheck?.sourceVideoHash,
      precheckStatus: safetyPrecheck?.precheckStatus,
      precheckMessage: safetyPrecheck?.message,
    });
    reportContextPersistence(session.id, "persisted", "new_queued_session");
  } catch (error) {
    contextPersistence = "skipped";
    reportContextPersistence(session.id, "skipped", "new_queued_session_write_failed");
    console.warn("[analysis] context persistence skipped", error);
  }

  revalidatePath(`/analysis/${session.id}`);
  return { sessionId: session.id, status: "queued" as const, contextPersistence };
}

export async function runAnalysisSession(sessionId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .select("id, video_id, sport_id, status, updated_at, confirmed_action_type, engine_manifest")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (sessionError || !session) throw new Error(sessionError?.message ?? "Analysis session not found.");
  if (session.status === "completed") return { sessionId, status: "completed" as const };
  if (session.status === "processing") {
    const updatedAt = session.updated_at ? new Date(session.updated_at).getTime() : Date.now();
    if (Date.now() - updatedAt < 12 * 60 * 1000) return { sessionId, status: "processing" as const };
    await supabase.from("analysis_sessions").update({ status: "queued", current_stage: "queued", progress: 0, error_message: "The previous worker stopped responding. AceCoach restarted the analysis safely.", updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", user.id);
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, user_id, filename, storage_path, sport_id, action_type, content_hash")
    .eq("id", session.video_id)
    .eq("user_id", user.id)
    .single();
  if (videoError || !video) throw new Error(videoError?.message ?? "Video not found.");
  const sportId = video.sport_id ?? session.sport_id ?? "tennis";
  const context = await loadAthleteContext(supabase, user.id, sportId);
  const captureContext = captureContextFromManifest(session.engine_manifest);
  requireAnalysisConsent(context);
  const contextFingerprint = athleteContextFingerprint(sportId, video.action_type ?? "forehand", context, captureContext);
  return executeAnalysis({
    supabase,
    user,
    video: video as VideoRow,
    sessionId,
    confirmedAction: session.confirmed_action_type ?? undefined,
    athleteContext: context,
    contextFingerprint,
    captureContext,
  });
}

export async function getAnalysisStatus(sessionId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("analysis_sessions")
    .select("id, status, current_stage, progress, error_message, action_type, detected_action_type, analysis_action_type, movement_confirmation_status, confidence, score_status, updated_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Analysis session not found.");
  return {
    sessionId: data.id,
    status: data.status,
    currentStage: data.current_stage,
    progress: Number(data.progress ?? 0),
    errorMessage: data.error_message,
    selectedAction: data.action_type,
    detectedAction: data.detected_action_type,
    analysisAction: data.analysis_action_type,
    movementConfirmationStatus: data.movement_confirmation_status,
    confidence: Number(data.confidence ?? 0),
    scoreStatus: data.score_status,
    updatedAt: data.updated_at,
  };
}

export async function getContextPersistenceStatus(sessionId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Analysis session not found.");
  }

  const { data: contextRows, error: contextError } = await supabase
    .from("session_context")
    .select("analysis_session_id, created_at")
    .eq("analysis_session_id", sessionId)
    .limit(1);

  const { data: moderationRows, error: moderationError } = await supabase
    .from("content_moderation_log")
    .select("id, precheck_status, created_at")
    .eq("analysis_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);

  const tablesMissing = [contextError, moderationError].some((error) =>
    Boolean(error?.message?.includes("relation") && error?.message?.includes("does not exist")),
  );

  if (tablesMissing) {
    return {
      sessionId,
      contextPersistence: "skipped_tables_missing" as const,
      hasSessionContext: false,
      hasModerationLog: false,
      moderationPrecheckStatus: null,
    };
  }

  if (contextError) {
    throw new Error(contextError.message);
  }
  if (moderationError) {
    throw new Error(moderationError.message);
  }

  const latestModeration = moderationRows?.[0] ?? null;
  return {
    sessionId,
    contextPersistence: (contextRows?.length ?? 0) > 0 ? "persisted" as const : "not_found" as const,
    hasSessionContext: (contextRows?.length ?? 0) > 0,
    hasModerationLog: (moderationRows?.length ?? 0) > 0,
    moderationPrecheckStatus: latestModeration?.precheck_status ?? null,
  };
}

export async function analyzeVideo(videoId: string) {
  const queued = await queueAnalysisVideo(videoId);
  if (queued.status === "completed") return { sessionId: queued.sessionId };
  return runAnalysisSession(queued.sessionId);
}

export async function confirmMovementAndReanalyze(sessionId: string, actionType: string) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .select("id, video_id, sport_id, engine_manifest")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Analysis session not found.");
  }

  if (session.sport_id !== "tennis") {
    throw new Error("Movement confirmation is not available until this sport pack is validated.");
  }
  const sport = getSport(session.sport_id);
  const permitted = new Set([
    ...sport.actions.map((item) => item.id),
    "backhand",
    "two_handed_backhand",
    "forehand_volley",
    "backhand_volley",
    "overhead",
  ]);
  if (!permitted.has(actionType)) throw new Error("Unsupported movement selection.");

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, user_id, filename, storage_path, sport_id, action_type, content_hash")
    .eq("id", session.video_id)
    .eq("user_id", user.id)
    .single();

  if (videoError || !video) throw new Error(videoError?.message ?? "Video not found.");
  const sportId = video.sport_id ?? session.sport_id ?? "tennis";
  const selectedAction = video.action_type ?? "forehand";
  const context = await loadAthleteContext(supabase, user.id, sportId);
  const captureContext = captureContextFromManifest(session.engine_manifest);
  requireAnalysisConsent(context);
  const contextFingerprint = athleteContextFingerprint(sportId, selectedAction, context, captureContext);

  return executeAnalysis({
    supabase,
    user,
    video: video as VideoRow,
    sessionId,
    confirmedAction: actionType,
    athleteContext: context,
    contextFingerprint,
    captureContext,
  });
}

export async function markAnalysisReviewed(sessionId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .select("id, video_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Analysis session not found.");
  }

  const { error: reviewError } = await supabase
    .from("analysis_sessions")
    .update({ current_stage: "reviewed", updated_at: new Date().toISOString() })
    .eq("id", session.id)
    .eq("user_id", user.id);

  if (reviewError) throw new Error(reviewError.message);

  const { error: videoStatusError } = await supabase
    .from("videos")
    .update({ status: "reviewed" })
    .eq("id", session.video_id)
    .eq("user_id", user.id);

  if (videoStatusError) throw new Error(videoStatusError.message);

  revalidatePath("/upload");
  revalidatePath("/dashboard");
  revalidatePath(`/analysis/${sessionId}`);
    revalidatePath(`/report/${sessionId}`);
}


export async function updatePracticePlanProgress(
  planId: string,
  itemId: string,
  completed: boolean,
) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: plan, error: planError } = await supabase
    .from("practice_plans")
    .select("id, session_id, completion, plan")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message ?? "Practice plan not found.");
  }

  const sessions = Array.isArray(plan.plan?.sessions) ? plan.plan.sessions : [];
  if (!sessions.some((item: { id?: string }) => item.id === itemId)) {
    throw new Error("Practice-plan item not found.");
  }

  const nextCompletion = {
    ...(plan.completion ?? {}),
    [itemId]: completed,
  };
  const completedCount = sessions.filter(
    (item: { id?: string }) => item.id && nextCompletion[item.id] === true,
  ).length;
  const nextStatus = completedCount === sessions.length
    ? "ready_for_reassessment"
    : "active";

  const { error: updateError } = await supabase
    .from("practice_plans")
    .update({ completion: nextCompletion, status: nextStatus })
    .eq("id", planId)
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/analysis/${plan.session_id}`);
  revalidatePath("/dashboard");
}

export async function markPracticePlanReady(planId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: plan, error: planError } = await supabase
    .from("practice_plans")
    .select("id, session_id")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message ?? "Practice plan not found.");
  }

  const { error: updateError } = await supabase
    .from("practice_plans")
    .update({ status: "ready_for_reassessment" })
    .eq("id", planId)
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/analysis/${plan.session_id}`);
  revalidatePath("/dashboard");
}
