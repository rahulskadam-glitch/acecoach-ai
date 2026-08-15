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
  knowledgePolicyVersion?: string | null;
  knowledgeManifestHash?: string | null;
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

export type PersonalBaselineArea = {
  constructId: string;
  currentScore: number;
  typicalScore: number;
  highestReliableScore: number;
  differenceFromTypical: number;
  differenceFromHighest: number;
  priorSessionCount: number;
  priorRepetitionCount: number;
  typicalSpread: number;
};

export type PersonalBaselineComparison = {
  status: "available" | "collecting";
  reason: string;
  contextSignature: string | null;
  priorSessionCount: number;
  areas: PersonalBaselineArea[];
};

export function resolveMeasuredDistribution(
  constructScore: unknown,
  consistencyScore: unknown,
  captureScore: unknown,
  spreadDivisor: number,
) {
  if (
    typeof constructScore !== "number" || !Number.isFinite(constructScore)
    || typeof consistencyScore !== "number" || !Number.isFinite(consistencyScore)
    || typeof captureScore !== "number" || !Number.isFinite(captureScore)
    || !Number.isFinite(spreadDivisor) || spreadDivisor <= 0
  ) return null;
  return {
    medianScore: Math.max(0, Math.min(100, constructScore)),
    spread: Math.max(0, Math.min(100, (100 - consistencyScore) / spreadDivisor)),
    captureScore: Math.max(0, Math.min(100, captureScore)),
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export type PersonalBaselineRequirements = {
  minimumPriorSessions: number;
  minimumPriorRepetitions: number;
  minimumMeasurementConfidence: number;
  maximumCaptureScoreDifference: number;
};

export type LongitudinalRequirements = PersonalBaselineRequirements & {
  minimumHistorySessions: number;
  historyWindowSessions: number;
  meaningfulShiftPoints: number;
};

function isComparable(current: ConstructDistribution, previous: ConstructDistribution, requirements: PersonalBaselineRequirements) {
  return current.constructId === previous.constructId
    && current.contextSignature === previous.contextSignature
    && current.engineVersion === previous.engineVersion
    && current.runtimeSignature === previous.runtimeSignature
    && Boolean(current.knowledgePolicyVersion && current.knowledgeManifestHash)
    && current.knowledgePolicyVersion === previous.knowledgePolicyVersion
    && current.knowledgeManifestHash === previous.knowledgeManifestHash
    && Math.abs(current.captureScore - previous.captureScore) <= requirements.maximumCaptureScoreDifference
    && current.confidence >= requirements.minimumMeasurementConfidence
    && previous.confidence >= requirements.minimumMeasurementConfidence;
}

export function buildPersonalBaselineComparison(
  currentRows: ConstructDistribution[],
  history: ConstructDistribution[],
  requirements: PersonalBaselineRequirements,
): PersonalBaselineComparison {
  const { minimumPriorSessions, minimumPriorRepetitions } = requirements;
  const areas = currentRows.flatMap((current) => {
    const comparableHistory = history
      .filter((item) => item.sessionId !== current.sessionId && isComparable(current, item, requirements))
      .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt));
    const sessionIds = new Set(comparableHistory.map((item) => item.sessionId));
    const repetitionCount = comparableHistory.reduce((total, item) => total + item.sampleCount, 0);
    if (sessionIds.size < minimumPriorSessions || repetitionCount < minimumPriorRepetitions) return [];
    const typicalScore = median(comparableHistory.map((item) => item.medianScore));
    const highestReliableScore = Math.max(...comparableHistory.map((item) => item.medianScore));
    return [{
      constructId: current.constructId,
      currentScore: Number(current.medianScore.toFixed(2)),
      typicalScore: Number(typicalScore.toFixed(2)),
      highestReliableScore: Number(highestReliableScore.toFixed(2)),
      differenceFromTypical: Number((current.medianScore - typicalScore).toFixed(2)),
      differenceFromHighest: Number((current.medianScore - highestReliableScore).toFixed(2)),
      priorSessionCount: sessionIds.size,
      priorRepetitionCount: repetitionCount,
      typicalSpread: Number(median(comparableHistory.map((item) => item.spread)).toFixed(2)),
    }];
  });

  const priorSessionCount = Math.max(0, ...areas.map((area) => area.priorSessionCount));
  return {
    status: areas.length > 0 ? "available" : "collecting",
    reason: areas.length > 0
      ? "Compared only with this player's reliably measured, context-matched history."
      : `Collect at least ${minimumPriorSessions} earlier matching videos and ${minimumPriorRepetitions} repetitions before showing a personal distribution.`,
    contextSignature: currentRows[0]?.contextSignature ?? null,
    priorSessionCount,
    areas,
  };
}

export function reduceDevelopmentState(
  current: ConstructDistribution,
  history: ConstructDistribution[],
  existing: DevelopmentState | null,
  proposedCue: string | null,
  proposedSuccessMetric: string | null,
  requirements: LongitudinalRequirements,
): LongitudinalDecision {
  const comparableHistory = history
    .filter((item) => item.sessionId !== current.sessionId && isComparable(current, item, requirements))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .slice(0, requirements.historyWindowSessions);

  const stableExisting = existing && !["solved", "superseded"].includes(existing.status)
    ? existing
    : null;
  const activeCue = stableExisting?.activeCue ?? proposedCue;
  const successMetric = stableExisting?.successMetric ?? proposedSuccessMetric;
  const primaryConstructId = stableExisting?.primaryConstructId ?? current.constructId;
  const cueChangeReason = stableExisting ? "stable" : "initialized";

  if (comparableHistory.length < requirements.minimumHistorySessions) {
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
      reason: `Need at least ${requirements.minimumHistorySessions} earlier comparable sessions before making a learning claim.`,
    };
  }

  const baselineMedian = median(comparableHistory.map((item) => item.medianScore));
  const shift = Number((current.medianScore - baselineMedian).toFixed(2));
  const status: DevelopmentState["status"] = shift >= requirements.meaningfulShiftPoints
    ? "improving"
    : shift <= -requirements.meaningfulShiftPoints
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
