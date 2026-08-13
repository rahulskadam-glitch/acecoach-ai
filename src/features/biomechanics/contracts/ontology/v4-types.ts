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
  mechanism: string;
  observable_evidence: Array<{ metric_id: string; role: string; required: boolean }>;
  benchmark_strategy: Record<string, unknown>;
  causal_reasoning: Record<string, unknown>;
  coaching_ladder: Record<string, unknown>;
  visualization: Record<string, unknown>;
  evidence_policy: Record<string, unknown>;
  source_ids: string[];
}

export interface OntologyManifest {
  bundle_name: string;
  version: string;
  determinism_contract: string;
  counts: Record<string, number>;
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

export interface ResearchSource { source_id: string; type: string; authority_tier: "A"|"B"|"C"; title: string; url: string; supports: string[]; use_policy: string; }

export interface CoachingInsight { primary_correction: string; strengths: string[]; evidence_summary: string; why_it_matters: string; feel_cue: string; success_test: string; storyboard: string; confidence: ConfidenceVector; }


export type CausalRole = "ROOT_CAUSE" | "CONTRIBUTOR" | "COMPENSATION" | "SYMPTOM" | "UNKNOWN";

export interface StrokeEvent {
  eventId: string;
  bestTimeMs: number;
  intervalMs: [number, number];
  confidence: number;
  evidenceIds: string[];
}

export interface MetricSeries {
  metricId: string;
  measurementClass: "COURT_CALIBRATED_2D" | "BODY_NORMALIZED_2D" | "IMAGE_PLANE_2D" | "MONOCULAR_3D_ESTIMATE" | "EVENT_TIMING" | "RELATIVE_VELOCITY";
  samples: Array<{timeMs:number; value:number|null; confidence:number}>;
  summary: Record<string, number | string | null>;
  limitations: string[];
}

export interface CausalHypothesis {
  hypothesisId: string;
  archetype: string;
  thesis: string;
  rootEvent: string | null;
  causalRole: CausalRole;
  evidenceIds: string[];
  supportingReps: string[];
  counterexamples: string[];
  downstreamEffects: string[];
  falsificationConditions: string[];
  confidence: ConfidenceVector;
}

export interface VisualBeat {
  beatId: string;
  timeWindow: Record<string, number | string>;
  playbackRate?: number;
  overlays: Array<Record<string, unknown> | string>;
  caption: string;
  accessibilityText?: string;
}

export interface VisualStory {
  storyId: string;
  archetype: string;
  focusInsightId: string;
  beats: VisualBeat[];
  limitations?: string[];
}

export interface DeepCoachingInsight {
  insightId: string;
  role: "STRENGTH" | "PRIMARY_CORRECTION" | "SECONDARY_OBSERVATION" | "LIMITATION";
  archetype: string;
  thesis: string;
  rootEvent: string | null;
  evidenceIds: string[];
  comparisonBasis: Record<string, unknown>;
  causalChain: Array<{from:string; to:string; relationship:string; confidence:number}>;
  confidence: ConfidenceVector;
  falsificationConditions: string[];
  playerCoaching: {
    coachRead: string;
    keep?: string | null;
    change: string;
    why: string;
    feel: string;
    watch: string;
    train: string;
    success: string;
    languageProfileId?: string;
    surface?: "PLAYER_COACH" | "COACH_ANALYST";
  };
  visualStory: VisualStory;
}


export interface PlayerCoachMessage {
  coachRead: string;
  keep?: string | null;
  change: string;
  why: string;
  feel: string;
  watch: string;
  train: string;
  success: string;
  evidenceIds: string[];
  comparisonBasis?: Record<string, unknown> | string;
  languageProfileId: string;
  surface: "PLAYER_COACH" | "COACH_ANALYST";
}
