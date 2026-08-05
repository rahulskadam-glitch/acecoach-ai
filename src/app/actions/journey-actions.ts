"use server";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { supportedSports } from "@/lib/sports";
import { createAdminClient, requireUser } from "@/lib/supabase/server";

const JOURNEY_COOKIE = "acecoach_journey_token";
const SPORT_COOKIE = "acecoach_selected_sport";

function validSport(sportId: string) {
  if (!supportedSports.some((sport) => sport.id === sportId)) throw new Error("Choose a supported sport.");
  return sportId;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function selectJourneySport(sportId: string) {
  const selectedSport = validSport(sportId);
  const cookieStore = await cookies();
  let token = cookieStore.get(JOURNEY_COOKIE)?.value;
  if (!token || token.length < 32) token = randomBytes(32).toString("hex");
  cookieStore.set(JOURNEY_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  cookieStore.set(SPORT_COOKIE, selectedSport, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });

  try {
    const admin = createAdminClient();
    const hash = tokenHash(token);
    const { data: existing } = await admin.from("athlete_journeys").select("id").eq("anonymous_token_hash", hash).eq("status", "active").maybeSingle();
    if (existing) {
      await admin.from("athlete_journeys").update({ selected_sport_id: selectedSport, current_step: "auth", updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await admin.from("athlete_journeys").insert({ anonymous_token_hash: hash, selected_sport_id: selectedSport, current_step: "auth", status: "active", expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
    }
  } catch {
    // The local cookie keeps the journey usable before migration 022 is installed.
  }
  return { sportId: selectedSport };
}

export async function attachJourneyToUser() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const token = cookieStore.get(JOURNEY_COOKIE)?.value;
  const sportId = cookieStore.get(SPORT_COOKIE)?.value ?? "tennis";
  if (!token) return { sportId };
  try {
    const admin = createAdminClient();
    await admin.from("athlete_journeys").update({ user_id: user.id, current_step: "upload", updated_at: new Date().toISOString() }).eq("anonymous_token_hash", tokenHash(token)).eq("status", "active");
  } catch {
    // Authentication must still complete when the optional journey table is not installed.
  }
  return { sportId };
}

export async function saveJourneyIntake(payload: {
  sportId: string;
  ageBand: string;
  playingLevel: string;
  dominantSide: string;
  primaryGoal?: string;
  silhouettePreference?: string;
  heightCm?: number | null;
  serviceProcessing: boolean;
  guardianConsent?: boolean;
  actionType: string;
  cameraAngle?: string;
  shotSituation?: string;
  shotIntent?: string;
  specificQuestion?: string;
}) {
  const user = await requireUser();
  const admin = createAdminClient();
  const sportId = validSport(payload.sportId);
  const ageBands = new Set(["under_10", "10_12", "13_15", "16_18", "19_29", "30_39", "40_49", "50_59", "60_plus", "under_13", "13_17", "18_24", "25_34", "35_44", "45_54", "55_plus"]);
  const levels = new Set(["new", "beginner", "developing", "intermediate", "advanced", "competitive", "coach_professional"]);
  const dominantSides = new Set(["left", "right"]);
  const silhouettes = new Set(["player-matched", "neutral", "female", "male"]);
  const cameraAngles = new Set(["unknown", "side", "rear", "front", "diagonal"]);
  const shotSituations = new Set(["controlled_practice", "neutral_rally", "attacking", "defensive_on_run", "return_of_serve", "unknown"]);
  const shotIntents = new Set(["consistency", "depth", "heavy_topspin", "flatter_drive", "angle", "approach", "defensive_height", "unknown"]);
  const sport = supportedSports.find((item) => item.id === sportId);
  if (!ageBands.has(payload.ageBand)) throw new Error("Choose an age band.");
  if (["under_10", "10_12", "under_13"].includes(payload.ageBand) && !payload.guardianConsent) throw new Error("A parent or guardian must confirm this analysis for an athlete under 13.");
  if (!levels.has(payload.playingLevel)) throw new Error("Choose your playing level.");
  if (!dominantSides.has(payload.dominantSide)) throw new Error("Choose a dominant side.");
  if (!sport?.actions.some((action) => action.id === payload.actionType)) throw new Error("Choose a supported movement for this sport.");
  if (!cameraAngles.has(payload.cameraAngle ?? "unknown")) throw new Error("Choose a supported camera angle.");
  if (!shotSituations.has(payload.shotSituation ?? "unknown")) throw new Error("Choose a supported shot situation.");
  if (!shotIntents.has(payload.shotIntent ?? "unknown")) throw new Error("Choose a supported shot intention.");
  if (!payload.serviceProcessing) throw new Error("Analysis-processing consent is required.");
  const silhouette = silhouettes.has(payload.silhouettePreference ?? "") ? payload.silhouettePreference! : "player-matched";
  const profileGender = silhouette === "female" || silhouette === "male" || silhouette === "neutral" ? silhouette : "neutral";
  const goal = (payload.primaryGoal ?? "Improve technique").trim().slice(0, 180) || "Improve technique";
  const heightCm = payload.heightCm === null || payload.heightCm === undefined ? null : Number(payload.heightCm);
  if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 230)) {
    throw new Error("Enter a height between 80 and 230 cm, or leave it blank.");
  }

  const { data: verifiedIdentity, error: identityError } = await admin.auth.admin.getUserById(user.id);
  if (identityError || !verifiedIdentity.user) {
    throw new Error("Your sign-in session is out of date. Refresh the page and sign in again before saving your athlete profile.");
  }

  // Some OAuth or legacy accounts can authenticate before the profile trigger has
  // created their base row. Guarantee that parent row before writing profile_sports,
  // physical_profiles, or consents, all of which reference profiles.id.
  const metadata = user.user_metadata ?? {};
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  const lastName = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
  const country = typeof metadata.country === "string" ? metadata.country.trim() : "";
  const { error: ensureProfileError } = await admin.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    first_name: firstName,
    last_name: lastName,
    country,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (ensureProfileError) throw new Error(ensureProfileError.message);

  const { data: savedProfile, error: profileError } = await admin.from("profiles").update({
    age_band: payload.ageBand,
    playing_level: payload.playingLevel,
    dominant_hand: payload.dominantSide,
    primary_sport_id: sportId,
    gender: profileGender,
    goals: [goal],
    onboarding_status: "essentials_complete",
    updated_at: new Date().toISOString(),
  }).eq("id", user.id).select("id").maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!savedProfile) throw new Error("Your athlete profile could not be initialized. Please try again.");

  const { error: sportError } = await admin.from("profile_sports").upsert({
    profile_id: user.id,
    sport_id: sportId,
    playing_level: payload.playingLevel,
    dominant_side: payload.dominantSide,
    goals: [goal],
    is_primary: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "profile_id,sport_id" });
  if (sportError) throw new Error(sportError.message);

  if (heightCm !== null) {
    const { error: physicalError } = await admin.from("physical_profiles").upsert({
      profile_id: user.id,
      height_cm: heightCm,
      updated_at: new Date().toISOString(),
    }, { onConflict: "profile_id" });
    if (physicalError) throw new Error(physicalError.message);
  }

  const { error: consentError } = await admin.from("consents").upsert({
    profile_id: user.id,
    service_processing: true,
    consent_version: "2026-07-v6.0.0",
    granted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "profile_id" });
  if (consentError) throw new Error(consentError.message);

  const cookieStore = await cookies();
  const token = cookieStore.get(JOURNEY_COOKIE)?.value;
  if (token) {
    await admin.from("athlete_journeys").update({
      user_id: user.id,
      selected_sport_id: sportId,
      current_step: "upload",
      draft_intake: {
        actionType: payload.actionType,
        ageBand: payload.ageBand,
        playingLevel: payload.playingLevel,
        dominantSide: payload.dominantSide,
        primaryGoal: goal,
        silhouettePreference: silhouette,
        heightCm,
        cameraAngle: payload.cameraAngle ?? "unknown",
        shotSituation: payload.shotSituation ?? "unknown",
        shotIntent: payload.shotIntent ?? "unknown",
        specificQuestion: (payload.specificQuestion ?? "").trim().slice(0, 500),
      },
      updated_at: new Date().toISOString(),
    }).eq("anonymous_token_hash", tokenHash(token)).eq("status", "active");
  }
  revalidatePath("/start");
  revalidatePath("/profile");
  return { saved: true };
}

export async function connectJourneyAnalysis(sessionId: string, videoId: string) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const token = cookieStore.get(JOURNEY_COOKIE)?.value;
  if (!token) return;
  try {
    const admin = createAdminClient();
    await admin.from("athlete_journeys").update({ user_id: user.id, video_id: videoId, analysis_session_id: sessionId, current_step: "analyze", updated_at: new Date().toISOString() }).eq("anonymous_token_hash", tokenHash(token)).eq("status", "active");
  } catch {
    // Journey linkage is supplementary to the core analysis session.
  }
}
