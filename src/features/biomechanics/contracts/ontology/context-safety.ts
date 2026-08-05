import type {
  AgeBand,
  ConsentStatus,
  ReassessmentStatus,
  TrendStatus,
} from "./types";

export interface PlayerAccessibilityPreferences {
  reduce_motion?: boolean;
  high_contrast_overlay?: boolean;
  captions_default_on?: boolean;
  font_scale?: "100%" | "125%" | "150%" | "200%";
  dyslexia_friendly_font?: boolean;
}

export interface PlayerProfilePayload {
  player_id: string;
  age_band: AgeBand;
  player_level:
    | "new_to_tennis"
    | "improver"
    | "club_competitive"
    | "junior_tournament"
    | "adult_league"
    | "high_performance_academy";
  dominant_hand: "right" | "left" | "unknown";
  backhand_style_declared?: "one_handed" | "two_handed" | "slice_primary" | "not_sure_let_engine_infer";
  adaptive_play?: "none" | "wheelchair_tennis" | "visual_impairment_adapted" | "other_adaptive";
  coaching_relationship: "self_directed" | "linked_to_coach" | "linked_to_academy";
  guardian_account_id?: string | null;
  preferred_language: string;
  accessibility_preferences?: PlayerAccessibilityPreferences;
}

export interface ConsentPayload {
  consent_id: string;
  player_id: string;
  granted_by_user_id: string;
  granted_by_role: "self_adult" | "guardian";
  scope: {
    video_capture_and_storage: boolean;
    ai_analysis: boolean;
    coach_sharing: boolean;
    model_improvement_use: boolean;
  };
  granted_at: string;
  revoked_at?: string | null;
  ontology_version_at_consent: string;
}

export interface ModerationPrecheckResult {
  precheck_status: "passed" | "failed_benign_mismatch" | "blocked_safety_review";
  message: string;
}

export interface ProgressTrend {
  fault_id: string;
  trend_status: TrendStatus;
  headline: string;
  reassessment_status?: ReassessmentStatus;
}

export interface ProgressSummaryResponse {
  trends: ProgressTrend[];
  consent_status?: ConsentStatus;
}

export interface ContextSafetyClientOptions {
  baseUrl: string;
  apiKey: string;
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Analysis-API-Key": apiKey,
  };
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ContextSafety request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
}

export function createContextSafetyClient(options: ContextSafetyClientOptions) {
  const { baseUrl, apiKey } = options;

  return {
    createPlayer(payload: PlayerProfilePayload) {
      return requestJson<PlayerProfilePayload>(`${baseUrl}/v1/players`, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify(payload),
      });
    },

    recordConsent(playerId: string, payload: ConsentPayload) {
      return requestJson<ConsentPayload>(`${baseUrl}/v1/players/${encodeURIComponent(playerId)}/consent`, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify(payload),
      });
    },

    moderationPrecheck(sourceVideoHash: string) {
      return requestJson<ModerationPrecheckResult>(`${baseUrl}/v1/moderation/precheck`, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({ source_video_hash: sourceVideoHash }),
      });
    },

    getProgress(playerId: string, faultId?: string) {
      const url = new URL(`${baseUrl}/v1/players/${encodeURIComponent(playerId)}/progress`);
      if (faultId) {
        url.searchParams.set("fault_id", faultId);
      }
      return requestJson<ProgressSummaryResponse>(url.toString(), {
        method: "GET",
        headers: buildHeaders(apiKey),
      });
    },
  };
}
