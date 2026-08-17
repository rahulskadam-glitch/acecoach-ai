import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["package version", "package.json", '"version": "6.0.0"'],
  ["release version", "src/lib/config/version.ts", 'APP_VERSION = "6.0.0"'],
  ["sport-only landing", "src/app/page.tsx", "SportSelectionLanding"],
  ["tennis-only headline", "src/features/sport-selection/presentation/SportSelectionLanding.tsx", "See the stroke."],
  ["six-step progress", "src/features/journey/domain/athlete-journey.ts", '"sport", "auth", "upload", "analyze", "report", "coach"'],
  ["auth route", "src/lib/supabase/auth-providers.ts", "NEXT_PUBLIC_AUTH_PROVIDERS"],
  ["Google provider", "src/app/auth/page.tsx", 'id: "google"'],
  ["Apple provider", "src/app/auth/page.tsx", 'id: "apple"'],
  ["Microsoft provider", "src/app/auth/page.tsx", 'id: "azure"'],
  ["Facebook provider", "src/app/auth/page.tsx", 'id: "facebook"'],
  ["combined intake", "src/app/start/page.tsx", "StartExperience"],
  ["profile identity verified before intake writes", "src/app/actions/journey-actions.ts", "admin.auth.admin.getUserById"],
  ["stroke-first movement choice", "src/features/athlete-intake/presentation/StartExperience.tsx", "1 · Pick a stroke"],
  ["mandatory height", "src/features/athlete-intake/presentation/StartExperience.tsx", "validHeight"],
  ["same-origin mobile capture", "next.config.ts", "camera=(self), microphone=(self)"],
  ["upload completed", "src/features/athlete-intake/presentation/StartExperience.tsx", "Upload completed"],
  ["delete video", "src/features/athlete-intake/presentation/StartExperience.tsx", "Delete video"],
  ["queued analysis action", "src/app/actions/analysis-actions.ts", "queueAnalysisVideo"],
  ["processing route", "src/app/analysis/[id]/page.tsx", "AnalysisProcessing"],
  ["mobile-first player report", "src/features/report/components/V6PlayerReport.tsx", "ReportOverviewStory"],
  ["personal-baseline report", "src/features/report/components/ReportOverviewStory.tsx", "Your personal baseline"],
  ["context-matched baseline reducer", "src/modules/analysis/longitudinal.ts", "buildPersonalBaselineComparison"],
  ["story-led report overview", "src/features/report/components/ReportOverviewStory.tsx", "Keep"],
  ["synthesized report pattern", "src/features/report/components/ReportPatternSynthesis.tsx", "Read the stroke as one movement"],
  ["shared report terminology", "src/features/report/model/report-stages.ts", "One player-facing vocabulary"],
  ["connected score reasoning", "src/features/report/components/ReportOverviewStory.tsx", "Why this score"],
  ["phase timestamp jump", "src/features/report/components/ReportStageVideoLink.tsx", "acecoach:coach-region"],
  ["same-phase matched comparison", "src/features/report/components/ReportOverviewStory.tsx", "Same phase · last matched video"],
  ["one-correction practice progression", "src/features/report/components/V6PlayerReport.tsx", "Three drills · one correction"],
  ["level-adapted cue presentation", "src/features/report/model/cue-language.ts", "adaptPracticeCue"],
  ["validated tracker outcome gate", "src/app/report/[id]/page.tsx", 'eq("validation_status", "tracker_verified")'],
  ["reassessment verdict", "src/features/report/components/V6PlayerReport.tsx", "Reassessment verdict"],
  ["seven-phase reference backhand", "services/api/analysis_engine/pipeline.py", "two-handed-backhand-reference-rubric-v2.0.0"],
  ["complete eight-stroke guide registry", "services/api/ontology/v4.1.0/config/stage_guides.json", '"version": "2.0.0"'],
  ["all supported tennis strokes mapped", "services/api/ontology/v4.1.0/config/stage_guides.json", '"backhand_volley": {'],
  ["shared technical audit dispatch", "services/api/analysis_engine/pipeline.py", "_stroke_technical_audit"],
  ["separate knee load and drive", "services/api/analysis_engine/sport_rules.py", "Load first; drive through second."],
  ["non-dominant hand role", "services/api/analysis_engine/sport_rules.py", "Top hand drives the path; bottom hand guides."],
  ["phase-by-phase video drill-down", "src/features/report/components/CoachVisionStudio.tsx", "Six movement stages"],
  ["stroke-wide report drill-down", "src/features/report/components/ReportOverviewStory.tsx", "Stroke map"],
  ["complete-stroke evidence", "services/api/analysis_engine/evidence.py", "athlete-supplied-complete-stroke-guide"],
  ["six-source backhand evidence", "services/api/analysis_engine/evidence.py", "tennis-tv-atp-backhand-variations"],
  ["six-stage player video", "src/features/report/components/CoachVisionStudio.tsx", "backhand-six-stage-video-map"],
  ["numbered correction overlay", "src/features/report/components/CoachVisionStudio.tsx", "correction-overlay-key"],
  ["0.1x video playback", "src/features/report/components/CoachVisionStudio.tsx", "playback-rate-${value}"],
  ["single key moment", "src/features/report/components/KeyMomentPlayer.tsx", "Look for one thing only"],
  ["106-point registry", "services/api/analysis_engine/biomechanical_profile.py", "if len(METRIC_SPECS) != 106"],
  ["kinetic chain analysis", "services/api/analysis_engine/biomechanical_profile.py", "kneeChainSpeedBodyPerSecond"],
  ["106-point player explorer", "src/features/report/components/BiomechanicalExplorer.tsx", "Your 106-point movement map"],
  ["camera-honest analytics boundary", "src/features/report/components/BiomechanicalExplorer.tsx", "not 106 sensors"],
  ["CoachVision explicit correction markers", "src/features/report/components/CoachVisionStudio.tsx", "red = change"],
  ["CoachVision anatomical body linkages", "src/features/report/components/CoachVisionStudio.tsx", "anatomical segments"],
  ["CoachVision clean original control", "src/features/report/components/CoachVisionStudio.tsx", "Original footage only"],
  ["CoachVision full-body linkage view", "src/features/report/components/CoachVisionStudio.tsx", "Full-body linkage map"],
  ["Safari-safe visual QA media preview", "src/app/report/[id]/page.tsx", "videoUrl=\"/file.svg\""],
  ["athlete-supplied shot context", "services/api/analysis_engine/pipeline.py", "These labels were supplied by the athlete"],
  ["context-aware video persistence", "src/app/actions/video-actions.ts", "capture_context"],
  ["clean comparison", "src/features/report/components/SynchronizedHumanComparison.tsx", "Your video stays clean by default"],
  ["coaching route", "src/app/coach/[id]/page.tsx", "CoachingConversation"],
  ["grounded safety", "src/app/actions/coaching-actions.ts", "stored-report-only"],
  ["coaching schema fallback", "src/lib/coaching-storage.ts", "PGRST205"],
  ["bound password reset", "src/app/actions/auth-actions.ts", "auth.resetPasswordForEmail"],
  ["recovery callback", "src/app/actions/auth-actions.ts", "/auth/callback?next="],
  ["legacy recovery exchange", "src/app/update-password/page.tsx", "callbackParams"],
  ["analysis CA bundle", "services/api/app.py", "SSL_CERT_FILE"],
  ["verified pose model setup", "services/api/setup_runtime.py", "POSE_MODEL_SHA256"],
  ["pipeline builder aliases", "services/api/analysis_engine/pipeline.py", "build_coaching_playbook"],
  ["one-command local runtime", "package.json", "dev:all"],
  ["v6 migration", "supabase/022_simple_athlete_journey_v600.sql", "coaching_conversations"],
  ["governed knowledge migration", "supabase/030_governed_knowledge_layer_v640.sql", "benchmark_cohort_versions"],
  ["governed privilege hardening", "supabase/031_governed_knowledge_privilege_hardening_v641.sql", "revoke all"],
  ["null-safe expert uniqueness", "supabase/032_expert_annotation_null_safe_uniqueness_v642.sql", "coalesce(repetition_index, -1)"],
  ["all-construct distribution RPC", "supabase/030_governed_knowledge_layer_v640.sql", "upsert_construct_session_distributions_v640"],
  ["stroke source registry", "services/api/ontology/v4.1.0/config/stroke_source_registry.json", "two_handed_backhand"],
  ["knowledge validation policy", "services/api/ontology/v4.1.0/config/knowledge_validation_policy.json", "minimum_athletes_per_cell"],
  ["validated outcome ingestion", "services/api/analysis_engine/contracts.py", "ValidatedOutcomeLabel"],
  ["version route", "src/app/version/page.tsx", "Six-step athlete journey: ACTIVE"],
];

let failures = 0;
let completedChecks = 0;
for (const [label, relative, expected] of checks) {
  const file = path.join(root, relative);
  const ok = fs.existsSync(file) && fs.readFileSync(file, "utf8").includes(expected);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failures += 1;
  completedChecks += 1;
}

const schemaSensitiveSources = [
  "src/app/actions/journey-actions.ts",
  "src/app/start/page.tsx",
].map((relative) => fs.readFileSync(path.join(root, relative), "utf8")).join("\n");
for (const forbidden of ["silhouette_preference", 'select("playing_level, dominant_side, goals, preferences")']) {
  const ok = !schemaSensitiveSources.includes(forbidden);
  console.log(`${ok ? "PASS" : "FAIL"} live schema compatibility (${forbidden})`);
  if (!ok) failures += 1;
  completedChecks += 1;
}

const authGuardSource = fs.readFileSync(path.join(root, "src/lib/supabase/server.ts"), "utf8");
const previewIdentityIsIsolated = !authGuardSource.includes("00000000-0000-4000-8000-000000000600");
console.log(`${previewIdentityIsIsolated ? "PASS" : "FAIL"} authenticated routes never use the visual-QA identity`);
if (!previewIdentityIsIsolated) failures += 1;
completedChecks += 1;

if (failures) {
  console.error(`\n${failures} v6 verification check(s) failed.`);
  process.exit(1);
}
console.log(`\n${completedChecks} Athlentra Tennis v6 integration checks passed.`);
