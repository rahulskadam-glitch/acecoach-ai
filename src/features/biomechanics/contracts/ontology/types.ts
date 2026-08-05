export type EvidenceStatus =
  | "MEASURED" | "ESTIMATED" | "INFERRED" | "NOT_VISIBLE"
  | "NOT_SUPPORTED_BY_VIEW" | "INSUFFICIENT_SAMPLE"
  | "ACCEPTABLE_VARIATION" | "CONTEXT_DEPENDENT"
  | "FAULT_SUSPECTED" | "FAULT_CONFIRMED"
  | "COACH_OVERRIDDEN" | "PLAYER_CORRECTED_LABEL";

export interface ConfidenceVector {
  detection: number;
  measurement: number;
  context: number;
  interpretation: number;
}

export interface FaultDefinition {
  fault_id: string;
  title: string;
  domain: string;
  phase_origin: string;
  phase_visible_effect: string;
  minimum_comparable_strokes: number;
  detection: string;
  context_gates: string[];
  exclusions: string[];
  supported_views: string[];
  measurement_class: string;
  performance_consequence: string;
  player_message: string;
  coach_message_template: string;
  overlay_markers: string[];
  drill_ids: string[];
  no_score_when: string[];
}

export interface OntologyManifest {
  bundle_name: string;
  version: string;
  determinism_contract: string;
  counts: Record<string, number>;
}

// --- v2.2.0 additions -------------------------------------------------

export type AgeBand =
  | "u10" | "10_to_12" | "13_to_15" | "16_to_17"
  | "18_to_34" | "35_to_54" | "55_plus" | "prefer_not_to_say";

export type ConsentStatus =
  | "not_required_adult_self_consent"
  | "guardian_consent_active"
  | "guardian_consent_missing_blocked";

export interface SessionContextSnapshot {
  age_band: AgeBand;
  player_level: string;
  dominant_hand: "right" | "left" | "unknown";
  adaptive_play?: string;
  coaching_relationship: string;
  guardian_linked_account?: boolean;
  session_goal?: string;
  camera_view: string;
  camera_frame_rate_fps?: number;
  preferred_language?: string;
  consent_status: ConsentStatus;
}

export type TrendStatus = "improving" | "steady" | "recurring" | "insufficient_history";
export type ReassessmentStatus =
  | "not_yet_reassessed" | "improved" | "unchanged" | "regressed" | "insufficient_comparable_evidence";

export interface ProgressSummary {
  trend_status: TrendStatus;
  compared_to_session_ids: string[];
  headline: string;
  reassessed_faults: Array<{ fault_id: string; reassessment_status: ReassessmentStatus }>;
}

export type ConfidenceBand = "high" | "medium" | "low_estimated" | "not_visible_or_unsupported";

export interface RenderStyle {
  min_score?: number;
  line_style?: string;
  opacity_multiplier?: number;
  badge?: string;
  behavior?: string;
}

/** Mirrors OntologyBundle.render_style_for_confidence in the Python loader — keep the two in sync. */
export function renderStyleForConfidence(
  visualGrammar: { confidence_rendering: Record<ConfidenceBand, RenderStyle> },
  score: number,
): RenderStyle {
  const r = visualGrammar.confidence_rendering;
  if (score >= (r.high.min_score ?? 0.85)) return r.high;
  if (score >= (r.medium.min_score ?? 0.65)) return r.medium;
  return r.low_estimated;
}

/** Mirrors OntologyBundle.is_minor_age_band — fail-closed: anything not an explicit adult band is a minor. */
export function isMinorAgeBand(ageBand: AgeBand): boolean {
  const adultBands: AgeBand[] = ["18_to_34", "35_to_54", "55_plus"];
  return !adultBands.includes(ageBand);
}

export interface AnalysisObservation {
  observation_id: string;
  session_id: string;
  stroke_id: string;
  fault_id: string;
  status: EvidenceStatus;
  evidence_frames: number[];
  observed_metrics: Record<string, number | string | null>;
  confidence: ConfidenceVector;
  limitations: string[];
  causal_role: "ROOT_CAUSE" | "CONTRIBUTOR" | "SYMPTOM" | "UNKNOWN";
}
