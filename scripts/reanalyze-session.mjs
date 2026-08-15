import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const sessionId = process.argv[2];
const confirmedAction = process.argv[3] ?? "two_handed_backhand";
const engineVersion = "movement-intelligence-v1.13.0";

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId ?? "")) {
  throw new Error("Usage: node --env-file=.env.local scripts/reanalyze-session.mjs <session-uuid> [confirmed-action]");
}
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANALYSIS_API_KEY"]) {
  if (!process.env[key]) throw new Error(`${key} is required.`);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: session, error: sessionError } = await supabase
  .from("analysis_sessions")
  .select("id,user_id,video_id,sport_id,action_type,engine_manifest")
  .eq("id", sessionId)
  .single();
if (sessionError || !session) throw new Error(sessionError?.message ?? "Analysis session not found.");

const { data: video, error: videoError } = await supabase
  .from("videos")
  .select("id,user_id,filename,storage_path,sport_id,action_type,content_hash")
  .eq("id", session.video_id)
  .eq("user_id", session.user_id)
  .single();
if (videoError || !video) throw new Error(videoError?.message ?? "Video not found.");

const [{ data: profile }, { data: sportProfile }, { data: consent }, { data: physical }] = await Promise.all([
  supabase.from("profiles").select("age_band,playing_level,dominant_hand,goals").eq("id", session.user_id).maybeSingle(),
  supabase.from("profile_sports").select("playing_level,dominant_side,goals").eq("profile_id", session.user_id).eq("sport_id", session.sport_id).maybeSingle(),
  supabase.from("consents").select("service_processing").eq("profile_id", session.user_id).maybeSingle(),
  supabase.from("physical_profiles").select("height_cm").eq("profile_id", session.user_id).maybeSingle(),
]);
if (consent?.service_processing !== true) throw new Error("Analysis consent is not active for this athlete.");

const rawContext = session.engine_manifest?.intakeContext ?? {};
const captureContext = {
  cameraAngle: typeof rawContext.cameraAngle === "string" ? rawContext.cameraAngle : "unknown",
  shotSituation: typeof rawContext.shotSituation === "string" ? rawContext.shotSituation : "unknown",
  shotIntent: typeof rawContext.shotIntent === "string" ? rawContext.shotIntent : "unknown",
  specificQuestion: typeof rawContext.specificQuestion === "string" ? rawContext.specificQuestion.slice(0, 500) : "",
};
const goals = Array.isArray(sportProfile?.goals) && sportProfile.goals.length > 0 ? sportProfile.goals : Array.isArray(profile?.goals) ? profile.goals : [];
const athleteContext = {
  ageBand: profile?.age_band ?? null,
  playingLevel: sportProfile?.playing_level ?? profile?.playing_level ?? null,
  dominantSide: sportProfile?.dominant_side ?? profile?.dominant_hand ?? "right",
  primaryGoal: typeof goals[0] === "string" ? goals[0] : null,
  heightCm: physical?.height_cm === null || physical?.height_cm === undefined ? null : Number(physical.height_cm),
};
const contextFingerprint = crypto.createHash("sha256").update(JSON.stringify({
  engineVersion,
  sportId: session.sport_id,
  selectedAction: video.action_type,
  ageBand: athleteContext.ageBand ?? "",
  playingLevel: athleteContext.playingLevel ?? "",
  dominantSide: athleteContext.dominantSide,
  primaryGoal: athleteContext.primaryGoal ?? "",
  heightCm: athleteContext.heightCm ?? "",
  cameraAngle: captureContext.cameraAngle,
  shotSituation: captureContext.shotSituation,
  shotIntent: captureContext.shotIntent,
  athleteQuestion: captureContext.specificQuestion,
})).digest("hex");

const expectedPrefix = `${session.user_id}/${session.sport_id}/`;
if (video.user_id !== session.user_id || !video.storage_path.startsWith(expectedPrefix) || video.storage_path.includes("..") || video.storage_path.includes("\\")) {
  throw new Error("The video storage path failed its ownership check.");
}
const { data: signedVideo, error: signedError } = await supabase.storage.from("videos").createSignedUrl(video.storage_path, 15 * 60);
if (signedError || !signedVideo?.signedUrl) throw new Error(signedError?.message ?? "Unable to sign the video URL.");

const { data: validatedOutcomes, error: outcomeError } = await supabase
  .from("analysis_rep_outcomes")
  .select("repetition_index,outcome_source,validation_status,execution_result,depth_zone,direction,placement_zone,net_clearance_cm,bounce_x_normalized,bounce_y_normalized,model_version")
  .eq("analysis_session_id", session.id)
  .eq("user_id", session.user_id)
  .in("validation_status", ["coach_verified", "sensor_verified", "tracker_verified"])
  .not("execution_result", "is", null)
  .order("repetition_index", { ascending: true })
  .limit(12);
if (outcomeError) throw new Error(outcomeError.message);

const response = await fetch(`${process.env.ANALYSIS_API_URL ?? "http://127.0.0.1:8000"}/analysis`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Analysis-API-Key": process.env.ANALYSIS_API_KEY },
  body: JSON.stringify({
    user_id: session.user_id,
    video_id: video.id,
    video_url: signedVideo.signedUrl,
    video_name: video.filename,
    sport_id: session.sport_id,
    action_type: video.action_type,
    confirmed_action_type: confirmedAction,
    expected_content_hash: video.content_hash,
    age_band: athleteContext.ageBand,
    playing_level: athleteContext.playingLevel,
    dominant_side: athleteContext.dominantSide,
    primary_goal: athleteContext.primaryGoal,
    height_cm: athleteContext.heightCm,
    camera_angle: captureContext.cameraAngle,
    shot_situation: captureContext.shotSituation,
    shot_intent: captureContext.shotIntent,
    athlete_question: captureContext.specificQuestion || null,
    validated_outcomes: validatedOutcomes ?? [],
  }),
});
if (!response.ok) {
  const detail = await response.text();
  throw new Error(`Analysis service returned ${response.status}: ${detail.slice(0, 500)}`);
}
const result = await response.json();
if (result.engine_manifest?.engineVersion !== engineVersion) {
  throw new Error(`Engine mismatch: expected ${engineVersion}, received ${result.engine_manifest?.engineVersion ?? "unknown"}.`);
}
if (result.frame_summary?.biomechanicalProfile?.metricCount !== 106) throw new Error("The regenerated report is missing the 106-point profile.");
if (
  result.knowledge_control?.status !== "CONTROLLED"
  || result.knowledge_control?.failClosed !== true
  || result.knowledge_control?.manifestHash !== result.engine_manifest?.ontologyManifestHash
  || result.knowledge_control?.domains?.records?.authorized !== true
  || result.knowledge_control?.domains?.report?.authorized !== true
) throw new Error("The regenerated report is missing a valid knowledge-control authorization trace.");

const manifest = { ...result.engine_manifest, intakeContext: captureContext };
const confirmationStatus = "confirmed";
const { error: reportError } = await supabase.from("analysis_reports").upsert({
  session_id: session.id,
  user_id: session.user_id,
  video_id: video.id,
  sport_id: session.sport_id,
  action_type: video.action_type,
  analysis_action_type: result.movement_classification.analysisAction,
  confirmed_action_type: confirmedAction,
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
  report_version: result.engine_manifest.reportVersion,
  engine_manifest: manifest,
  frame_summary: result.frame_summary,
  movement_timeline: result.movement_timeline,
  repetitions: result.repetitions,
  detected_action_type: result.movement_classification.detectedAction,
  movement_classification: result.movement_classification,
  coaching_areas: result.coaching_areas,
  reference_comparison: result.reference_comparison,
  input_fingerprint: result.input_fingerprint,
  athlete_context_fingerprint: contextFingerprint,
  knowledge_control: result.knowledge_control,
  knowledge_policy_version: result.knowledge_control.policyVersion,
  knowledge_manifest_hash: result.knowledge_control.manifestHash,
}, { onConflict: "session_id" });
if (reportError) throw new Error(reportError.message);

const reasoning = result.ontology_reasoning ?? result.coach_summary?.ontologyReasoning;
const movementChain = Array.isArray(reasoning?.movementChain) ? reasoning.movementChain : [];
const minimumConfidence = Number(reasoning?.knowledgeLayerStatus?.personalBaseline?.minimumMeasurementConfidence);
const spreadDivisor = Number(result.knowledge_control?.contracts?.longitudinal?.distributionSpreadDivisor);
const consistencyScore = result.repetition_insights?.consistencyScore;
const captureScore = result.capture_quality?.score;
if (movementChain.length > 0 && Number.isFinite(consistencyScore) && Number.isFinite(captureScore) && Number.isFinite(minimumConfidence) && Number.isFinite(spreadDivisor) && spreadDivisor > 0) {
  const observations = movementChain.flatMap((item) => {
    if (!Number.isFinite(item.score) || item.assessmentBasis === "INSUFFICIENT_MEASUREMENT_CONFIDENCE") return [];
    const evidence = Array.isArray(item.evidence) ? item.evidence : [];
    const evidenceConfidences = evidence.map((entry) => entry.confidence).filter(Number.isFinite);
    const confidence = evidenceConfidences.length > 0 ? Math.min(...evidenceConfidences) : result.confidence;
    if (confidence < minimumConfidence || typeof item.id !== "string") return [];
    return [{
      constructId: item.id,
      medianScore: Math.max(0, Math.min(100, item.score)),
      confidence,
      evidenceIds: evidence.flatMap((entry) => typeof entry.areaId === "string" ? [`area:${entry.areaId}`] : []),
    }];
  });
  if (observations.length > 0) {
    const contextSignature = crypto.createHash("sha256").update(JSON.stringify({
      sportId: session.sport_id,
      actionType: result.movement_classification.analysisAction,
      cameraAngle: captureContext.cameraAngle,
      shotSituation: captureContext.shotSituation,
      shotIntent: captureContext.shotIntent,
    })).digest("hex");
    const { error: distributionError } = await supabase.rpc("upsert_construct_session_distributions_v650", {
      p_user_id: session.user_id,
      p_session_id: session.id,
      p_sport_id: session.sport_id,
      p_action_type: result.movement_classification.analysisAction,
      p_context_signature: contextSignature,
      p_context_dimensions: { shotSituation: captureContext.shotSituation, shotIntent: captureContext.shotIntent },
      p_sample_count: result.repetitions.length,
      p_spread: Math.max(0, Math.min(100, (100 - consistencyScore) / spreadDivisor)),
      p_capture_score: captureScore,
      p_engine_version: engineVersion,
      p_runtime_signature: result.engine_manifest.runtimeSignature ?? null,
      p_observations: observations,
      p_knowledge_policy_version: result.knowledge_control.policyVersion,
      p_knowledge_manifest_hash: result.knowledge_control.manifestHash,
    });
    if (distributionError) throw new Error(distributionError.message);
  }
}

const now = new Date().toISOString();
const { error: completeError } = await supabase.from("analysis_sessions").update({
  status: "completed",
  progress: 100,
  current_stage: "report_ready",
  error_message: null,
  confidence: result.confidence,
  engine_version: engineVersion,
  input_fingerprint: result.input_fingerprint,
  athlete_context_fingerprint: contextFingerprint,
  pose_model_version: result.engine_manifest.poseModelVersion,
  biomechanics_version: result.engine_manifest.biomechanicsVersion,
  scoring_version: result.engine_manifest.scoringVersion,
  knowledge_version: result.engine_manifest.knowledgeVersion,
  report_version: result.engine_manifest.reportVersion,
  engine_manifest: manifest,
  detected_action_type: result.movement_classification.detectedAction,
  analysis_action_type: result.movement_classification.analysisAction,
  confirmed_action_type: confirmedAction,
  movement_confirmation_status: confirmationStatus,
  movement_confidence: result.movement_classification.confidence,
  movement_classification: result.movement_classification,
  score_status: result.score_status,
  quality_gate: result.quality_gate,
  completed_at: now,
  updated_at: now,
}).eq("id", session.id).eq("user_id", session.user_id);
if (completeError) throw new Error(completeError.message);

await supabase.from("videos").update({ content_hash: result.content_hash, status: "analyzed" }).eq("id", video.id).eq("user_id", session.user_id);

if (result.quality_gate?.movementConfirmed && Array.isArray(result.practice_plan?.sessions) && result.practice_plan.sessions.length > 0) {
  const completion = Object.fromEntries(result.practice_plan.sessions.map((item) => [item.id, false]));
  const reassessmentDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: planError } = await supabase.rpc("upsert_active_practice_plan_v650", {
    p_user_id: session.user_id,
    p_session_id: session.id,
    p_sport_id: session.sport_id,
    p_action_type: result.movement_classification.analysisAction,
    p_primary_goal: result.practice_plan.primaryGoal,
    p_coaching_cue: result.practice_plan.cue,
    p_why_it_matters: result.coach_summary.whyItMatters,
    p_plan: result.practice_plan,
    p_completion: completion,
    p_reassessment_due_at: reassessmentDue,
    p_knowledge_policy_version: result.knowledge_control.policyVersion,
    p_knowledge_manifest_hash: result.knowledge_control.manifestHash,
  });
  if (planError) throw new Error(planError.message);
}

console.log(JSON.stringify({
  sessionId: session.id,
  engineVersion: result.engine_manifest.engineVersion,
  reportVersion: result.engine_manifest.reportVersion,
  score: result.overall_score,
  headline: result.coach_summary?.headline,
  mainPriority: result.coach_summary?.mainPriority,
  reasoningStatus: result.ontology_reasoning?.status,
  priorities: result.priorities?.map((item) => item.title),
  drills: result.drills?.map((item) => item.name),
  knowledgeLayerStatus: result.ontology_reasoning?.knowledgeLayerStatus,
}, null, 2));
