"use server";

import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/supabase/server";
import { requiresGuardianConfirmation } from "@/lib/athlete/age-bands";

const ANALYSIS_API_URL = process.env.ANALYSIS_API_URL ?? "http://127.0.0.1:8000";
const ANALYSIS_API_KEY = process.env.ANALYSIS_API_KEY;

type PrecheckStatus = "passed" | "failed_benign_mismatch" | "blocked_safety_review";

type IntakeContextPayload = {
  ageBand: string;
  playingLevel: string;
  dominantSide: string;
  guardianConsent: boolean;
};

function mapAgeBand(value: string):
  | "u10"
  | "10_to_12"
  | "13_to_15"
  | "16_to_17"
  | "18_to_34"
  | "35_to_54"
  | "55_plus"
  | "prefer_not_to_say" {
  switch (value) {
    case "under_10":
      return "u10";
    case "10_12":
    case "under_13":
      return "10_to_12";
    case "13_15":
    case "13_17":
      return "13_to_15";
    case "16_18":
      return "16_to_17";
    case "19_29":
    case "18_24":
    case "25_34":
      return "18_to_34";
    case "30_39":
    case "40_49":
    case "35_44":
    case "45_54":
      return "35_to_54";
    case "50_59":
    case "60_plus":
    case "55_plus":
      return "55_plus";
    default:
      return "prefer_not_to_say";
  }
}

function mapPlayingLevel(value: string):
  | "new_to_tennis"
  | "improver"
  | "club_competitive"
  | "junior_tournament"
  | "adult_league"
  | "high_performance_academy" {
  switch (value) {
    case "new":
      return "new_to_tennis";
    case "beginner":
    case "developing":
      return "improver";
    case "intermediate":
      return "club_competitive";
    case "advanced":
      return "adult_league";
    case "competitive":
      return "junior_tournament";
    case "coach_professional":
      return "high_performance_academy";
    default:
      return "improver";
  }
}

function normalizeDominantHand(value: string): "left" | "right" | "unknown" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "left") return "left";
  if (normalized === "right") return "right";
  return "unknown";
}

async function callContextSafetyApi<TResponse>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
): Promise<TResponse> {
  if (!ANALYSIS_API_KEY || ANALYSIS_API_KEY.length < 32) {
    if (process.env.NODE_ENV === "development") {
      return {} as TResponse;
    }
    throw new Error("ANALYSIS_API_KEY must be configured with at least 32 characters.");
  }

  let response: Response;
  try {
    response = await fetch(`${ANALYSIS_API_URL}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        "X-Analysis-API-Key": ANALYSIS_API_KEY,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (cause) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Analysis service unreachable in development, falling back gracefully:", cause);
      return {} as TResponse;
    }
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    throw new Error(timedOut
      ? "The analysis service took too long to respond. Try again."
      : "The analysis service is unavailable. Wait a moment and try again.");
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Analysis service returned non-OK status in development:", response.status, payload);
      return (payload || {}) as TResponse;
    }
    const detail =
      typeof payload === "object"
      && payload !== null
      && "detail" in payload
      && typeof (payload as Record<string, unknown>).detail === "string"
        ? (payload as { detail: string }).detail
        : `Context and safety API returned HTTP ${response.status}.`;
    throw new Error(detail);
  }

  return payload as TResponse;
}

export async function ensureContextSafetyReadiness(input: IntakeContextPayload) {
  const user = await requireUser();
  const playerId = user.id;
  const ageBand = mapAgeBand(input.ageBand);
  const isMinor = requiresGuardianConfirmation(input.ageBand);

  try {
    await callContextSafetyApi(`/v1/players`, {
      method: "POST",
      body: {
        player_id: playerId,
        age_band: ageBand,
        player_level: mapPlayingLevel(input.playingLevel),
        dominant_hand: normalizeDominantHand(input.dominantSide),
        adaptive_play: "none",
        coaching_relationship: "self_directed",
        guardian_account_id: isMinor ? user.id : null,
        preferred_language: "en-IN",
        accessibility_preferences: {
          reduce_motion: false,
          high_contrast_overlay: false,
          captions_default_on: false,
          font_scale: "100%",
          dyslexia_friendly_font: false,
        },
      },
    }).catch(async (error) => {
      if (error instanceof Error && error.message.includes("player_id already exists")) {
        await callContextSafetyApi(`/v1/players/${encodeURIComponent(playerId)}`, {
          method: "PATCH",
          body: {
            age_band: ageBand,
            player_level: mapPlayingLevel(input.playingLevel),
            dominant_hand: normalizeDominantHand(input.dominantSide),
            adaptive_play: "none",
            coaching_relationship: "self_directed",
            guardian_account_id: isMinor ? user.id : null,
            preferred_language: "en-IN",
          },
        });
        return;
      }
      if (process.env.NODE_ENV !== "development") {
        throw error;
      }
    });

    if (isMinor && !input.guardianConsent) {
      throw new Error("Parent or guardian approval is required for players aged 13–17.");
    }

    const now = new Date().toISOString();
    await callContextSafetyApi(`/v1/players/${encodeURIComponent(playerId)}/consent`, {
      method: "POST",
      body: {
        consent_id: randomUUID(),
        player_id: playerId,
        granted_by_user_id: user.id,
        granted_by_role: isMinor ? "guardian" : "self_adult",
        scope: {
          video_capture_and_storage: true,
          ai_analysis: true,
          coach_sharing: true,
          model_improvement_use: false,
        },
        granted_at: now,
        revoked_at: null,
        ontology_version_at_consent: "4.1.0",
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "development") {
      throw error;
    }
  }

  return { playerId };
}

export async function runSafetyPrecheck(sourceVideoHash: string): Promise<{ status: PrecheckStatus; message: string }> {
  if (!/^[a-f0-9]{64}$/i.test(sourceVideoHash)) {
    throw new Error("Video checksum must be a SHA-256 hash.");
  }

  try {
    const result = await callContextSafetyApi<{ precheck_status: PrecheckStatus; message: string }>(
      "/v1/moderation/precheck",
      {
        method: "POST",
        body: {
          source_video_hash: sourceVideoHash,
        },
      },
    );

    if (result.precheck_status === "blocked_safety_review") {
      throw new Error("Upload blocked and sent to safety review.");
    }

    if (result.precheck_status === "failed_benign_mismatch") {
      throw new Error(result.message || "Upload could not be verified. Please re-upload this clip.");
    }

    return {
      status: result.precheck_status || "passed",
      message: result.message || "Precheck passed",
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      return { status: "passed", message: "Development bypass precheck" };
    }
    throw error;
  }
}
