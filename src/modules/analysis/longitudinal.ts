export type ConstructDistribution = {
  sessionId: string;
  constructId: string;
  contextSignature: string;
  contextDimensions?: { shotSituation?: string; shotIntent?: string };
  sampleCount: number;
  medianScore: number;
  spread: number;
  successRate: number | null;
  confidence: number;
  captureScore: number;
  engineVersion: string;
  runtimeSignature: string | null;
  recordedAt: string;
};

export type CrossStrokeContract = {
  minimumDistinctActions: number;
  minimumSessionsPerAction: number;
  minimumConfidence: number;
  maximumCaptureScoreDifference: number;
  maximumLimiterMedianScore: number;
  eligibleActionsByConstruct: Record<string, string[]>;
};

export type StrokeConstructEvidence = {
  actionType: string;
  constructId: string;
  contextClass: string;
  sessionIds: string[];
  medianScore: number;
  confidence: number;
  captureScore: number;
  cue: string | null;
};

export type SharedRootInsight = {
  archetype: "SHARED_ROOT_CONSTRUCT";
  constructId: string;
  contextClass: string;
  actionTypes: string[];
  sessionIds: string[];
  confidence: number;
  sharedCue: string | null;
  strokeSpecificCues: Record<string, string | null>;
  reason: string;
};

export type DevelopmentState = {
  primaryConstructId: string;
  activeCue: string | null;
  successMetric: string | null;
  status: "active" | "improving" | "plateaued" | "regressed" | "solved" | "superseded";
};

export type LongitudinalDecision = {
  comparable: boolean;
  status: DevelopmentState["status"];
  archetype: "PROGRESS_SHIFT" | "REGRESSION_OR_PLATEAU" | null;
  primaryConstructId: string;
  activeCue: string | null;
  successMetric: string | null;
  cueChangeReason: "initialized" | "stable" | "superseded";
  baselineMedian: number | null;
  shift: number | null;
  comparisonSessionIds: string[];
  reason: string;
};

export function resolveMeasuredDistribution(
  constructScore: unknown,
  consistencyScore: unknown,
  captureScore: unknown,
) {
  if (
    typeof constructScore !== "number" || !Number.isFinite(constructScore)
    || typeof consistencyScore !== "number" || !Number.isFinite(consistencyScore)
    || typeof captureScore !== "number" || !Number.isFinite(captureScore)
  ) return null;
  return {
    medianScore: Math.max(0, Math.min(100, constructScore)),
    spread: Math.max(0, Math.min(100, (100 - consistencyScore) / 2)),
    captureScore: Math.max(0, Math.min(100, captureScore)),
  };
}

const MINIMUM_HISTORY_SESSIONS = 2;
const MEANINGFUL_SHIFT_POINTS = 4;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function isComparable(current: ConstructDistribution, previous: ConstructDistribution) {
  return current.constructId === previous.constructId
    && current.contextSignature === previous.contextSignature
    && current.engineVersion === previous.engineVersion
    && current.runtimeSignature === previous.runtimeSignature
    && Math.abs(current.captureScore - previous.captureScore) <= 15
    && current.confidence >= 0.55
    && previous.confidence >= 0.55;
}

export function reduceDevelopmentState(
  current: ConstructDistribution,
  history: ConstructDistribution[],
  existing: DevelopmentState | null,
  proposedCue: string | null,
  proposedSuccessMetric: string | null,
): LongitudinalDecision {
  const comparableHistory = history
    .filter((item) => item.sessionId !== current.sessionId && isComparable(current, item))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .slice(0, 3);

  const stableExisting = existing && !["solved", "superseded"].includes(existing.status)
    ? existing
    : null;
  const activeCue = stableExisting?.activeCue ?? proposedCue;
  const successMetric = stableExisting?.successMetric ?? proposedSuccessMetric;
  const primaryConstructId = stableExisting?.primaryConstructId ?? current.constructId;
  const cueChangeReason = stableExisting ? "stable" : "initialized";

  if (comparableHistory.length < MINIMUM_HISTORY_SESSIONS) {
    return {
      comparable: false,
      status: stableExisting?.status ?? "active",
      archetype: null,
      primaryConstructId,
      activeCue,
      successMetric,
      cueChangeReason,
      baselineMedian: null,
      shift: null,
      comparisonSessionIds: comparableHistory.map((item) => item.sessionId),
      reason: "Need at least two earlier comparable sessions before making a learning claim.",
    };
  }

  const baselineMedian = median(comparableHistory.map((item) => item.medianScore));
  const shift = Number((current.medianScore - baselineMedian).toFixed(2));
  const status: DevelopmentState["status"] = shift >= MEANINGFUL_SHIFT_POINTS
    ? "improving"
    : shift <= -MEANINGFUL_SHIFT_POINTS
      ? "regressed"
      : "plateaued";

  return {
    comparable: true,
    status,
    archetype: status === "improving" ? "PROGRESS_SHIFT" : "REGRESSION_OR_PLATEAU",
    primaryConstructId,
    activeCue,
    successMetric,
    cueChangeReason,
    baselineMedian,
    shift,
    comparisonSessionIds: comparableHistory.map((item) => item.sessionId),
    reason: status === "improving"
      ? "The recent construct distribution shifted beyond the meaningful-change threshold."
      : status === "regressed"
        ? "The recent construct distribution shifted backward; no cause is inferred from the trend alone."
        : "The distribution remains inside the meaningful-change band, so the current cue stays stable.",
  };
}

export function reduceSharedRootConstruct(
  evidence: StrokeConstructEvidence[],
  contract: CrossStrokeContract,
): SharedRootInsight | null {
  const groups = new Map<string, StrokeConstructEvidence[]>();
  for (const item of evidence) {
    if (!contract.eligibleActionsByConstruct[item.constructId]?.includes(item.actionType)) continue;
    if (item.sessionIds.length < contract.minimumSessionsPerAction) continue;
    if (item.confidence < contract.minimumConfidence) continue;
    if (item.medianScore > contract.maximumLimiterMedianScore) continue;
    const key = `${item.constructId}::${item.contextClass}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const candidates = [...groups.values()].filter((items) => {
    const actions = new Set(items.map((item) => item.actionType));
    const captures = items.map((item) => item.captureScore);
    return actions.size >= contract.minimumDistinctActions
      && Math.max(...captures) - Math.min(...captures) <= contract.maximumCaptureScoreDifference;
  });
  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    const actionDifference = new Set(right.map((item) => item.actionType)).size - new Set(left.map((item) => item.actionType)).size;
    if (actionDifference !== 0) return actionDifference;
    const leftMedian = median(left.map((item) => item.medianScore));
    const rightMedian = median(right.map((item) => item.medianScore));
    return leftMedian - rightMedian;
  });
  const selected = candidates[0];
  const actions = [...new Set(selected.map((item) => item.actionType))].sort();
  const cues = selected.map((item) => item.cue?.trim() || null);
  const sharedCue = cues.every((cue) => cue !== null && cue === cues[0]) ? cues[0] : null;
  const strokeSpecificCues = Object.fromEntries(selected.map((item) => [item.actionType, item.cue]));

  return {
    archetype: "SHARED_ROOT_CONSTRUCT",
    constructId: selected[0].constructId,
    contextClass: selected[0].contextClass,
    actionTypes: actions,
    sessionIds: [...new Set(selected.flatMap((item) => item.sessionIds))].sort(),
    confidence: Math.min(...selected.map((item) => item.confidence)),
    sharedCue,
    strokeSpecificCues,
    reason: `Independent multi-session evidence links ${selected[0].constructId.replaceAll("_", " ")} across ${actions.length} strokes in the same context class.`,
  };
}
