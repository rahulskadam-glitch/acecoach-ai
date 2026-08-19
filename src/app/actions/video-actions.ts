"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSport, supportedSports } from "@/lib/sports";
import { assertOwnedStoragePath, isOwnedStoragePath } from "@/lib/storage/ownership";
import { createAdminClient, createClient, requireUser } from "@/lib/supabase/server";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30.25;
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

function text(formData: FormData, key: string, maxLength = 200) {
  return (formData.get(key)?.toString().trim() ?? "").slice(0, maxLength);
}

function optionalInteger(formData: FormData, key: string, min: number, max: number) {
  const raw = text(formData, key, 20);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function optionalNumber(formData: FormData, key: string, min: number, max: number) {
  const raw = text(formData, key, 20);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return value;
}

function ageBand(age: number) {
  if (age < 13) return "under_13";
  if (age < 18) return "13_17";
  if (age < 25) return "18_24";
  if (age < 35) return "25_34";
  if (age < 45) return "35_44";
  if (age < 55) return "45_54";
  return "55_plus";
}

function normalizeDominantSide(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("left")) return "left";
  if (normalized.startsWith("right")) return "right";
  throw new Error("Choose a valid dominant side.");
}

function validSportId(value: string) {
  const match = supportedSports.find((sport) => sport.id === value);
  if (!match) throw new Error("Choose a supported sport.");
  return match.id;
}

function assertOwnedUploadPath(storagePath: string, userId: string, sportId: string) {
  const expectedPrefix = `${userId}/${sportId}/`;
  if (!storagePath.startsWith(expectedPrefix) || !isOwnedStoragePath(storagePath, userId) || storagePath.length > 500) {
    throw new Error("The uploaded video path is invalid.");
  }
}

function validatedCaptureContext(payload?: {
  cameraAngle?: string;
  shotSituation?: string;
  shotIntent?: string;
  specificQuestion?: string;
  courtSurface?: string;
  footworkStance?: string;
}) {
  const cameraAngles = new Set(["unknown", "side", "rear", "front", "diagonal"]);
  const shotSituations = new Set(["controlled_practice", "neutral_rally", "attacking", "defensive_on_run", "return_of_serve", "unknown"]);
  const shotIntents = new Set(["consistency", "depth", "heavy_topspin", "flatter_drive", "angle", "approach", "defensive_height", "unknown"]);
  const courtSurfaces = new Set(["hard_court", "clay", "grass", "indoor", "all_court", "unknown"]);
  const footworkStances = new Set(["open", "semi_open", "neutral_square", "closed", "auto_detect", "unknown"]);

  const cameraAngle = payload?.cameraAngle ?? "side";
  const shotSituation = payload?.shotSituation ?? "controlled_practice";
  const shotIntent = payload?.shotIntent ?? "consistency";
  const courtSurface = payload?.courtSurface ?? "hard_court";
  const footworkStance = payload?.footworkStance ?? "auto_detect";

  if (!cameraAngles.has(cameraAngle) || !shotSituations.has(shotSituation) || !shotIntents.has(shotIntent)) {
    throw new Error("The video context is invalid.");
  }
  return {
    cameraAngle,
    shotSituation,
    shotIntent,
    courtSurface: courtSurfaces.has(courtSurface) ? courtSurface : "hard_court",
    footworkStance: footworkStances.has(footworkStance) ? footworkStance : "auto_detect",
    specificQuestion: (payload?.specificQuestion ?? "").trim().slice(0, 500),
  };
}

function missingCaptureContextColumn(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || error?.code === "PGRST204" || (message.includes("capture_context") && message.includes("column"));
}

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const firstName = text(formData, "firstName", 80);
  const lastName = text(formData, "lastName", 80);
  const country = text(formData, "country", 120);
  const countryCode = text(formData, "countryCode", 8).toUpperCase();
  const age = optionalInteger(formData, "age", 5, 100);
  const primarySportId = validSportId(text(formData, "primarySportId", 40));
  const playingLevel = text(formData, "playingLevel", 60);
  const dominantSide = normalizeDominantSide(text(formData, "dominantSide", 30));
  const rawGender = text(formData, "gender", 20).toLowerCase();
  const gender = ["male", "female", "neutral"].includes(rawGender) ? rawGender : "neutral";
  const primaryGoal = text(formData, "primaryGoal", 180);
  const yearsPlaying = optionalInteger(formData, "yearsPlaying", 0, 90);
  const trainingSessions = optionalInteger(formData, "trainingSessions", 0, 21);
  const competitionLevel = text(formData, "competitionLevel", 80) || null;
  const heightCm = optionalNumber(formData, "heightCm", 80, 230);
  const weightKg = optionalNumber(formData, "weightKg", 20, 300);
  const mobilityConsiderations = text(formData, "mobilityConsiderations", 800) || null;
  const requestedServiceProcessing = formData.get("serviceProcessing") === "true";
  const derivedDataImprovement = formData.get("derivedDataImprovement") === "true";
  const requestedRawMediaTraining = formData.get("rawMediaTraining") === "true";

  if (!firstName || !lastName || !country || age === null || !playingLevel || !primaryGoal || heightCm === null) {
    throw new Error("Complete all required profile fields.");
  }

  if (!requestedServiceProcessing) {
    throw new Error("Service-processing consent is required to analyze videos.");
  }

  const { error } = await supabase.rpc("save_athlete_profile_v301", {
    p_profile_id: user.id,
    p_email: user.email ?? null,
    p_first_name: firstName,
    p_last_name: lastName,
    p_age: age,
    p_age_band: ageBand(age),
    p_country: country,
    p_country_code: countryCode || null,
    p_primary_sport_id: primarySportId,
    p_playing_level: playingLevel,
    p_dominant_side: dominantSide,
    p_goals: [primaryGoal],
    p_years_playing: yearsPlaying,
    p_training_sessions: trainingSessions,
    p_competition_level: competitionLevel,
    p_height_cm: heightCm,
    p_weight_kg: weightKg,
    p_mobility_considerations: mobilityConsiderations,
    p_service_processing: requestedServiceProcessing,
    p_derived_data_improvement: derivedDataImprovement,
    p_raw_media_training: requestedRawMediaTraining,
    p_consent_version: "2026-07-v5.0.0",
  });
  if (error) throw new Error(error.message);

  const { error: genderError } = await supabase.from("profiles").update({ gender }).eq("id", user.id);
  if (genderError) throw new Error(genderError.message);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/upload");

  return { saved: true };
}

export async function resetCoachingProfile() {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("reset_coaching_profile_v301", {
    p_profile_id: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/upload");
}

export async function recordVideoMetadata(payload: {
  fileName: string;
  storagePath: string;
  strokeType: string;
  sportId?: string | null;
  actionType?: string | null;
  duration?: number | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  checksumSha256?: string | null;
  captureContext?: {
    cameraAngle?: string;
    shotSituation?: string;
    shotIntent?: string;
    courtSurface?: string;
    footworkStance?: string;
    specificQuestion?: string;
  };
}) {
  const user = await requireUser();
  const supabase = await createClient();

  const sportId = validSportId(payload.sportId ?? "tennis");
  const sport = getSport(sportId);
  const actionType = payload.actionType ?? sport.actions[0].id;
  if (!sport.actions.some((action) => action.id === actionType)) {
    throw new Error("Choose a movement supported by the selected sport.");
  }

  const fileName = payload.fileName.trim().slice(0, 255);
  if (!fileName) throw new Error("The video filename is required.");
  assertOwnedUploadPath(payload.storagePath, user.id, sportId);

  if (
    payload.fileSizeBytes !== null
    && payload.fileSizeBytes !== undefined
    && (!Number.isInteger(payload.fileSizeBytes) || payload.fileSizeBytes <= 0 || payload.fileSizeBytes > MAX_VIDEO_BYTES)
  ) {
    throw new Error("The video file size is invalid.");
  }

  if (
    payload.duration !== null
    && payload.duration !== undefined
    && (!Number.isFinite(payload.duration) || payload.duration < 1.5 || payload.duration > MAX_VIDEO_SECONDS)
  ) {
    throw new Error("The video must contain 1.5 to 30 seconds of footage.");
  }

  const checksumSha256 = (payload.checksumSha256 ?? "").trim().toLowerCase();
  if (checksumSha256 && !/^[a-f0-9]{64}$/.test(checksumSha256)) throw new Error("The video checksum is invalid.");

  const mimeType = (payload.mimeType ?? "video/mp4").toLowerCase();
  if (!ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported video format.");
  }

  const captureContext = validatedCaptureContext(payload.captureContext);

  if (checksumSha256) {
    const { data: duplicate } = await supabase.from("videos").select("id, sport_id, action_type, storage_path, file_size_bytes, mime_type, duration").eq("user_id", user.id).eq("sha256_checksum", checksumSha256).maybeSingle();
    if (duplicate) {
      const { error: contextError } = await supabase.from("videos").update({ 
        capture_context: captureContext,
        action_type: actionType,
        stroke_type: payload.strokeType.slice(0, 80),
        sport_id: sportId,
      }).eq("id", duplicate.id).eq("user_id", user.id);
      if (contextError && !missingCaptureContextColumn(contextError)) throw new Error(contextError.message);
      return { ...duplicate, action_type: actionType, capture_context: captureContext };
    }
  }

  let { data, error } = await supabase
    .from("videos")
    .insert({
      user_id: user.id,
      filename: fileName,
      storage_path: payload.storagePath,
      stroke_type: payload.strokeType.slice(0, 80),
      sport_id: sportId,
      action_type: actionType,
      duration: payload.duration ?? null,
      file_size_bytes: payload.fileSizeBytes ?? null,
      mime_type: mimeType,
      sha256_checksum: checksumSha256 || null,
      capture_context: captureContext,
      status: "uploaded",
    })
    .select("id, sport_id, action_type, storage_path, file_size_bytes, mime_type, duration, capture_context")
    .single();

  if (missingCaptureContextColumn(error)) {
    const fallback = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        filename: fileName,
        storage_path: payload.storagePath,
        stroke_type: payload.strokeType.slice(0, 80),
        sport_id: sportId,
        action_type: actionType,
        duration: payload.duration ?? null,
        file_size_bytes: payload.fileSizeBytes ?? null,
        mime_type: mimeType,
        sha256_checksum: checksumSha256 || null,
        status: "uploaded",
      })
      .select("id, sport_id, action_type, storage_path, file_size_bytes, mime_type, duration")
      .single();
    data = fallback.data ? { ...fallback.data, capture_context: captureContext } : null;
    error = fallback.error;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save video metadata.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/upload");
  revalidatePath("/library");

  return data;
}

export async function updateVideoCaptureContext(
  videoId: string,
  payload: {
    cameraAngle?: string;
    shotSituation?: string;
    shotIntent?: string;
    courtSurface?: string;
    footworkStance?: string;
    specificQuestion?: string;
  },
) {
  const user = await requireUser();
  const supabase = await createClient();
  const captureContext = validatedCaptureContext(payload);
  const { error } = await supabase
    .from("videos")
    .update({ capture_context: captureContext })
    .eq("id", videoId)
    .eq("user_id", user.id);
  if (error && !missingCaptureContextColumn(error)) throw new Error(error.message);
  return { updated: !error };
}

export async function getVideoDownloadUrl(videoId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: video, error: lookupError } = await supabase
    .from("videos")
    .select("id, filename, storage_path")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .single();
  if (lookupError || !video) throw new Error(lookupError?.message ?? "Video not found.");
  assertOwnedStoragePath(video.storage_path, user.id, "The stored video path failed its ownership check.");
  const { data, error } = await supabase.storage.from("videos").createSignedUrl(video.storage_path, 60, { download: video.filename });
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Unable to prepare the video download.");
  return { url: data.signedUrl, fileName: video.filename, expiresInSeconds: 60 };
}

export async function deleteVideo(videoId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: video, error: lookupError } = await supabase
    .from("videos")
    .select("id, storage_path")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .single();

  if (lookupError || !video) {
    throw new Error(lookupError?.message ?? "Video not found.");
  }

  assertOwnedStoragePath(video.storage_path, user.id, "The stored video path failed its ownership check.");

  const { error: storageError } = await supabase.storage.from("videos").remove([video.storage_path]);
  if (storageError) throw new Error(storageError.message);

  const { error: databaseError } = await supabase
    .from("videos")
    .delete()
    .eq("id", videoId)
    .eq("user_id", user.id);

  if (databaseError) throw new Error(databaseError.message);

  revalidatePath("/upload");
  revalidatePath("/dashboard");
  revalidatePath("/library");
}

export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/auth");
}
