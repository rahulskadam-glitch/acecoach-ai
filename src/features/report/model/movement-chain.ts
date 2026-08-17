import type { AnalysisReport } from "@/modules/analysis/types";

type MovementChainItem = NonNullable<AnalysisReport["ontologyReasoning"]>["movementChain"][number];
export type MovementChainEvidence = NonNullable<MovementChainItem["evidence"]>[number];

const LEGACY_CHAPTER_AREAS: Record<string, string[]> = {
  // Current chapter ids (Ready Position / Unit Turn / Backswing / Forward
  // Swing & Contact / Follow-Through / Recovery).
  ready: ["backlift_preparation"],
  unit_turn: ["footwork_base"],
  backswing: ["lower_body_loading"],
  forward_swing_contact: ["hand_swing_path", "body_position", "contact_spacing"],
  follow_through: ["lower_body_extension"],
  recovery: ["ending_position"],
  // Pre-2026-08-15 chapter ids, kept so older stored reports still resolve
  // their evidence areas correctly.
  setup: ["backlift_preparation"],
  movement_spacing: ["footwork_base"],
  weight_transfer: ["lower_body_loading", "lower_body_extension"],
  swing_connection: ["hand_swing_path"],
  contact_stability: ["body_position", "contact_spacing"],
  finish_recovery: ["ending_position"],
};

// Every stored chapter id (current and pre-2026-08-15) collapses onto one of
// these 6 canonical ids, so the displayed list is always exactly Ready
// Position / Unit Turn / Backswing / Forward Swing & Contact / Follow-Through
// / Recovery — never a legacy id split across two cards or missing a stage.
export const CANONICAL_CHAPTER_ORDER = ["ready", "unit_turn", "backswing", "forward_swing_contact", "follow_through", "recovery"] as const;

export const CANONICAL_CHAPTER_LABEL: Record<(typeof CANONICAL_CHAPTER_ORDER)[number], string> = {
  ready: "Ready Position",
  unit_turn: "Unit Turn",
  backswing: "Backswing",
  forward_swing_contact: "Forward Swing & Contact",
  follow_through: "Follow-Through",
  recovery: "Recovery",
};

export const CANONICAL_CHAPTER_ID: Record<string, (typeof CANONICAL_CHAPTER_ORDER)[number]> = {
  ready: "ready",
  unit_turn: "unit_turn",
  backswing: "backswing",
  forward_swing_contact: "forward_swing_contact",
  follow_through: "follow_through",
  recovery: "recovery",
  setup: "ready",
  movement_spacing: "unit_turn",
  weight_transfer: "backswing",
  swing_connection: "forward_swing_contact",
  contact_stability: "forward_swing_contact",
  finish_recovery: "recovery",
};

export const MOVEMENT_CHAIN_STRENGTH_SCORE = 82;
const STATUS_SEVERITY: Record<MovementChainItem["status"], number> = {
  priority: 3,
  developing: 2,
  strength: 1,
  not_assessed: 0,
};

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

/** Combines a legacy report's chapters that share a canonical id (e.g. pre-2026-08-15 "swing_connection" + "contact_stability" both becoming "forward_swing_contact"). */
function mergeChapterGroup(canonicalId: (typeof CANONICAL_CHAPTER_ORDER)[number], group: MovementChainItem[]): MovementChainItem {
  const label = CANONICAL_CHAPTER_LABEL[canonicalId];
  if (group.length === 1) return { ...group[0], id: canonicalId, label };
  const mostSevere = group.reduce((worst, item) => STATUS_SEVERITY[item.status] > STATUS_SEVERITY[worst.status] ? item : worst);
  const scored = group.filter((item): item is MovementChainItem & { score: number } => item.score !== null);
  const score = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : null;
  return {
    ...mostSevere,
    id: canonicalId,
    label,
    score,
    faultId: group.find((item) => item.faultId)?.faultId ?? null,
    evidence: group.flatMap((item) => item.evidence ?? []),
  };
}

/** Reconstructs a chapter for reports that never separately scored it (e.g. pre-2026-08-15 reports had no distinct "follow_through" chapter) from the same underlying measured areas. */
function synthesizeChapter(report: AnalysisReport, canonicalId: (typeof CANONICAL_CHAPTER_ORDER)[number], strengthMinimumScore: number): MovementChainItem {
  const areaIds = new Set(LEGACY_CHAPTER_AREAS[canonicalId] ?? []);
  const areas = (report.coachingAreas ?? []).filter((area) => areaIds.has(area.id));
  const scored = areas.filter((area): area is typeof area & { score: number } => typeof area.score === "number");
  const score = scored.length ? Math.round(scored.reduce((sum, area) => sum + area.score, 0) / scored.length) : null;
  const status: MovementChainItem["status"] = score === null ? "not_assessed" : score >= strengthMinimumScore ? "strength" : "developing";
  return {
    id: canonicalId,
    label: CANONICAL_CHAPTER_LABEL[canonicalId],
    status,
    score,
    faultId: null,
    summary: status === "strength"
      ? "The measured evidence for this area is working well."
      : status === "developing"
        ? "This measured area is below the current strength band and should be developed next."
        : "The camera did not show enough of this stage for a dependable coaching call.",
    evidence: areas.map((area) => ({
      areaId: area.id,
      label: area.label,
      score: area.score,
      confidence: area.confidence ?? null,
      measurementBasis: area.measurementBasis ?? null,
      observation: area.observation,
    })),
  };
}

export function normalizedMovementChain(report: AnalysisReport): MovementChainItem[] {
  const strengthMinimumScore = report.ontologyReasoning?.assessmentPolicy?.strengthMinimumScore ?? MOVEMENT_CHAIN_STRENGTH_SCORE;
  const stored = (report.ontologyReasoning?.movementChain ?? []).map((item) => normalizeMovementChainItem(item, strengthMinimumScore));

  const groups = new Map<(typeof CANONICAL_CHAPTER_ORDER)[number], MovementChainItem[]>();
  for (const item of stored) {
    const canonicalId = CANONICAL_CHAPTER_ID[item.id] ?? null;
    if (!canonicalId) continue;
    const group = groups.get(canonicalId) ?? [];
    group.push(item);
    groups.set(canonicalId, group);
  }

  let canonical = CANONICAL_CHAPTER_ORDER.map((canonicalId) => {
    const group = groups.get(canonicalId);
    return group?.length ? mergeChapterGroup(canonicalId, group) : synthesizeChapter(report, canonicalId, strengthMinimumScore);
  });

  if (!canonical.some((item) => item.status === "priority")) {
    const measured = canonical.filter((item) => item.score !== null && item.score < strengthMinimumScore);
    if (measured.length) {
      const firstFocus = measured.reduce((lowest, item) => (item.score ?? Infinity) < (lowest.score ?? Infinity) ? item : lowest);
      canonical = canonical.map((item) => item.id === firstFocus.id ? { ...item, status: "priority" as const, summary: "This is the clearest place to start." } : item);
    }
  }

  return canonical.map((item) => ({
    ...item,
    summary: item.status === "not_assessed"
      ? "The camera did not show enough of this stage for a dependable coaching call."
      : item.summary,
    evidence: item.evidence?.length ? item.evidence : movementChainEvidence(report, item),
  }));
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
