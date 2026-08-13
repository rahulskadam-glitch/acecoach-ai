import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const envCandidates = [
  path.resolve(projectRoot, "../secrets/.env.local"),
  path.resolve(projectRoot, "secrets/.env.local"),
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate)) ?? envCandidates[0];

function fail(message) {
  throw new Error(message);
}

function loadEnv(file) {
  if (!fs.existsSync(file)) fail(`Missing ${file}`);
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          line.slice(separator + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

const env = loadEnv(envPath);
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (!env[key]) fail(`${key} is not configured in .env.local`);
}
if (env.ANALYSIS_API_KEY && env.ANALYSIS_API_KEY.length < 32) fail("ANALYSIS_API_KEY must contain at least 32 characters.");

const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const allowedHosts = new Set((env.VIDEO_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
if (env.ALLOW_UNLISTED_VIDEO_HOSTS !== "true" && !allowedHosts.has(supabaseUrl.hostname.toLowerCase())) {
  fail(`VIDEO_ALLOWED_HOSTS must include ${supabaseUrl.hostname}`);
}

const schemaResponse = await fetch(`${supabaseUrl.origin}/rest/v1/`, {
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: "application/openapi+json",
  },
  signal: AbortSignal.timeout(15_000),
});
if (!schemaResponse.ok) fail(`Supabase schema check returned HTTP ${schemaResponse.status}.`);
const schema = await schemaResponse.json();
const requiredColumns = {
  profiles: ["id", "age_band", "playing_level", "dominant_hand", "gender", "goals", "primary_sport_id", "onboarding_status", "updated_at"],
  profile_sports: ["profile_id", "sport_id", "playing_level", "dominant_side", "goals", "is_primary", "updated_at"],
  consents: ["profile_id", "service_processing", "consent_version", "granted_at", "updated_at"],
  videos: ["id", "user_id", "filename", "storage_path", "sport_id", "action_type", "sha256_checksum", "content_hash", "status"],
  analysis_sessions: ["id", "user_id", "video_id", "status", "progress", "current_stage", "engine_version", "athlete_context_fingerprint", "movement_confirmation_status", "score_status"],
  analysis_reports: ["session_id", "user_id", "video_id", "score_status", "quality_gate", "engine_manifest", "frame_summary", "movement_classification", "coaching_playbook", "repetition_insights"],
  practice_plans: ["id", "user_id", "session_id", "plan", "completion", "status"],
};

const missing = [];
for (const [table, columns] of Object.entries(requiredColumns)) {
  const properties = schema.definitions?.[table]?.properties ?? {};
  if (!schema.definitions?.[table]) {
    missing.push(`${table} table`);
    continue;
  }
  for (const column of columns) {
    if (!(column in properties)) missing.push(`${table}.${column}`);
  }
}
if (!("/rpc/upsert_active_practice_plan_v30" in (schema.paths ?? {}))) {
  missing.push("upsert_active_practice_plan_v30 RPC");
}
if (missing.length) fail(`Connected Supabase schema is missing: ${missing.join(", ")}`);

const coachingTables = ["coaching_conversations", "coaching_messages"];
const coachingSchemaReady = coachingTables.every((table) => schema.definitions?.[table]);
if (!coachingSchemaReady) {
  const fallbackSource = fs.readFileSync(path.join(projectRoot, "src/lib/coaching-storage.ts"), "utf8");
  if (!fallbackSource.includes("acecoachConversationV1") || !fallbackSource.includes("PGRST205")) {
    fail("Coaching tables are absent and the report-backed compatibility store is not configured.");
  }
}

const analysisUrl = new URL(env.ANALYSIS_API_URL || "http://127.0.0.1:8000");
const healthResponse = await fetch(new URL("/health", analysisUrl), {
  signal: AbortSignal.timeout(15_000),
});
if (!healthResponse.ok) fail(`Analysis health check returned HTTP ${healthResponse.status}.`);
const health = await healthResponse.json();
if (health.status !== "ok" || health.service !== "analysis-api") {
  fail("Analysis health response did not identify a ready analysis-api service.");
}
if (health.engine_version !== "movement-intelligence-v1.11.0") {
  fail(`Analysis engine mismatch: expected movement-intelligence-v1.11.0, received ${health.engine_version ?? "missing"}.`);
}
if (health.ontology_version !== "4.1.0" || !health.ontology_manifest_hash || health.ontology_manifest_hash === "unavailable") {
  fail(`Analysis ontology is not ready: expected v4.1.0 with a loaded manifest, received ${health.ontology_version ?? "missing"}.`);
}

console.log(`PASS Supabase core schema (${Object.keys(requiredColumns).length} tables)`);
console.log(`PASS coaching persistence (${coachingSchemaReady ? "dedicated tables" : "report-backed compatibility mode"})`);
console.log(`PASS video storage allowlist (${supabaseUrl.hostname})`);
console.log(`PASS analysis service ${health.version ?? "unknown"} · ${health.engine_version} · ontology ${health.ontology_version} (${analysisUrl.origin})`);
console.log("\nAceCoach runtime is ready for upload, analysis, and report persistence.");
