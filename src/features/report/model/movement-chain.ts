import type { AnalysisReport } from "@/modules/analysis/types";

type MovementChainItem = NonNullable<AnalysisReport["ontologyReasoning"]>["movementChain"][number];
export type MovementChainEvidence = NonNullable<MovementChainItem["evidence"]>[number];

const LEGACY_CHAPTER_AREAS: Record<string, string[]> = {
  setup: ["backlift_preparation"],
  movement_spacing: ["footwork_base", "contact_spacing"],
  weight_transfer: ["lower_body_loading", "lower_body_extension"],
  swing_connection: ["hand_swing_path"],
  contact_stability: ["body_position"],
  finish_recovery: ["ending_position"],
};

export const MOVEMENT_CHAIN_STRENGTH_SCORE = 82;

const FOUR_STAGE_GROUPS = [
  { id: "preparation", label: "Preparation", sourceIds: ["setup"] },
  { id: "load_and_swing", label: "Load & swing", sourceIds: ["movement_spacing", "weight_transfer", "swing_connection"] },
  { id: "contact", label: "Contact", sourceIds: ["contact_stability"] },
  { id: "finish_and_recovery", label: "Finish & recovery", sourceIds: ["finish_recovery"] },
] as const;

/** Repairs legacy reports whose stored assessment state contradicts their measured score. */
export function normalizeMovementChainItem(item: MovementChainItem, strengthMinimumScore = MOVEMENT_CHAIN_STRENGTH_SCORE): MovementChainItem {
  if (item.status !== "not_assessed" || item.score === null) return item;
  const strength = item.score >= strengthMinimumScore;
  return {
    ...item,
    status: strength ? "strength" : "developing",
    summary: strength
      ? "The measured evidence for this area is working well."
      : "This measured area is below the current strength band and should be developed next.",
  };
}

export function normalizedMovementChain(report: AnalysisReport): MovementChainItem[] {
  const strengthMinimumScore = report.ontologyReasoning?.assessmentPolicy?.strengthMinimumScore ?? MOVEMENT_CHAIN_STRENGTH_SCORE;
  let normalized = (report.ontologyReasoning?.movementChain ?? []).map((item) => normalizeMovementChainItem(item, strengthMinimumScore));
  if (!normalized.some((item) => item.status === "priority")) {
    const measured = normalized.filter((item) => item.score !== null && item.score < strengthMinimumScore);
    if (measured.length) {
      const firstFocus = measured.reduce((lowest, item) => (item.score ?? Infinity) < (lowest.score ?? Infinity) ? item : lowest);
      normalized = normalized.map((item) => item.id === firstFocus.id ? { ...item, status: "priority" as const, summary: "This is the clearest place to start." } : item);
    }
  }

  return FOUR_STAGE_GROUPS.flatMap((group) => {
    const sources = normalized.filter((item) => group.sourceIds.includes(item.id as never));
    if (!sources.length) return [];
    const scores = sources.flatMap((item) => typeof item.score === "number" ? [item.score] : []);
    const status = sources.some((item) => item.status === "priority") ? "priority"
      : sources.some((item) => item.status === "developing") ? "developing"
      : sources.every((item) => item.status === "strength") ? "strength"
      : "not_assessed";
    const evidence = sources.flatMap((item) => movementChainEvidence(report, item));
    const fault = sources.find((item) => item.faultId || item.assessmentBasis === "EVIDENCE_GATED_FAULT");
    return [{
      ...sources[0],
      id: group.id,
      label: group.label,
      score: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null,
      status,
      summary: status === "not_assessed"
        ? "The camera did not show enough of this stage for a dependable coaching call."
        : sources.map((item) => item.summary).filter(Boolean).join(" "),
      evidence,
      faultId: fault?.faultId ?? null,
      assessmentBasis: fault?.assessmentBasis ?? sources[0].assessmentBasis,
    } as MovementChainItem];
  });
}

/** Uses persisted engine evidence first; reconstructs older reports only from their persisted measured areas. */
export function movementChainEvidence(report: AnalysisReport, item: MovementChainItem): MovementChainEvidence[] {
  if (item.evidence?.length) return item.evidence;
  const areaIds = new Set(LEGACY_CHAPTER_AREAS[item.id] ?? []);
  return (report.coachingAreas ?? []).filter((area) => areaIds.has(area.id)).map((area) => ({
    areaId: area.id,
    label: area.label,
    score: area.score,
    confidence: area.confidence ?? null,
    measurementBasis: area.measurementBasis ?? null,
    observation: area.observation,
  }));
}
