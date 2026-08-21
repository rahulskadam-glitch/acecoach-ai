import { createHash } from "node:crypto";

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
  status: "emerging" | "active" | "improving" | "plateaued" | "regressed" | "retention_regressed" | "solved" | "uncertain" | "superseded";
  confidence: number | null;
  evidenceSummary: Record<string, unknown> | null;
};

export type CueHistoryEntry = {
  changeReason: "initialized" | "stable" | "solved" | "disproven" | "superseded" | "coach_override";
};

export type LongitudinalDecision = {
  comparable: boolean;
  status: DevelopmentState["status"];
  archetype: "PROGRESS_SHIFT" | "REGRESSION_OR_PLATEAU" | "RETENTION_FAILURE" | null;
  primaryConstructId: string;
  activeCue: string | null;
  successMetric: string | null;
  cueChangeReason: "initialized" | "stable" | "solved" | "disproven" | "superseded";
  baselineMedian: number | null;
  shift: number | null;
  comparisonSessionIds: string[];
  reason: string;
  confidence: number | null;
  isRetentionFailure: boolean;
  evidenceSummary: Record<string, unknown>;
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

function narrowedOrDefault(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

/** Recomputes the {cameraAngle, shotSituation, shotIntent} triple a stored engine_manifest
 * used, so a read path (e.g. the report page) can derive the same longitudinalContextSignature
 * the write path computed, without depending on the full capture-context normalizer. */
export function captureContextSignatureInputFromManifest(engineManifest: unknown): {
  cameraAngle: string;
  shotSituation: string;
  shotIntent: string;
} {
  const intake = engineManifest && typeof engineManifest === "object" && "intakeContext" in engineManifest
    ? (engineManifest as { intakeContext?: unknown }).intakeContext
    : null;
  const record = intake && typeof intake === "object" ? intake as Record<string, unknown> : {};
  return {
    cameraAngle: narrowedOrDefault(record.cameraAngle, ["unknown", "side", "rear", "front", "diagonal"], "side"),
    shotSituation: narrowedOrDefault(record.shotSituation, ["controlled_practice", "neutral_rally", "attacking", "defensive_on_run", "return_of_serve", "unknown"], "controlled_practice"),
    shotIntent: narrowedOrDefault(record.shotIntent, ["consistency", "depth", "heavy_topspin", "flatter_drive", "angle", "approach", "defensive_height", "unknown"], "consistency"),
  };
}

export function longitudinalContextSignature(
  sportId: string,
  actionType: string,
  captureContext: { cameraAngle: string; shotSituation: string; shotIntent: string },
) {
  return createHash("sha256").update(JSON.stringify({
    sportId,
    actionType,
    cameraAngle: captureContext.cameraAngle,
    shotSituation: captureContext.shotSituation,
    shotIntent: captureContext.shotIntent,
  })).digest("hex");
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
  minimumStatusConfidence: number;
  sustainedStableSessionsForSolved: number;
  retentionWindowSessions: number;
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

function recentCueHistoryAllStable(cueHistory: CueHistoryEntry[], count: number): boolean {
  if (count <= 0) return true;
  if (cueHistory.length < count) return false;
  return cueHistory.slice(0, count).every((entry) => entry.changeReason === "stable");
}

export function reduceDevelopmentState(
  current: ConstructDistribution,
  history: ConstructDistribution[],
  existing: DevelopmentState | null,
  proposedCue: string | null,
  proposedSuccessMetric: string | null,
  requirements: LongitudinalRequirements,
  cueHistory: CueHistoryEntry[] = [],
): LongitudinalDecision {
  const comparableHistory = history
    .filter((item) => item.sessionId !== current.sessionId && isComparable(current, item, requirements))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .slice(0, requirements.historyWindowSessions);

  // "solved" keeps the cue locked through its retention window; "superseded" (retention
  // held) and "retention_regressed" (retention failed) both release the belief so the next
  // session can propose a fresh construct/cue instead of clinging to a disproven one.
  const stableExisting = existing && !["superseded", "retention_regressed"].includes(existing.status)
    ? existing
    : null;
  const activeCue = stableExisting?.activeCue ?? proposedCue;
  const successMetric = stableExisting?.successMetric ?? proposedSuccessMetric;
  const primaryConstructId = stableExisting?.primaryConstructId ?? current.constructId;

  if (comparableHistory.length < requirements.minimumHistorySessions) {
    return {
      comparable: false,
      status: stableExisting?.status ?? "emerging",
      archetype: null,
      primaryConstructId,
      activeCue,
      successMetric,
      cueChangeReason: stableExisting ? "stable" : "initialized",
      baselineMedian: null,
      shift: null,
      comparisonSessionIds: comparableHistory.map((item) => item.sessionId),
      reason: `Need at least ${requirements.minimumHistorySessions} earlier comparable sessions before making a learning claim.`,
      confidence: stableExisting?.confidence ?? null,
      isRetentionFailure: false,
      evidenceSummary: {},
    };
  }

  const baselineMedian = median(comparableHistory.map((item) => item.medianScore));
  const shift = Number((current.medianScore - baselineMedian).toFixed(2));
  const trendStatus: "improving" | "regressed" | "plateaued" = shift >= requirements.meaningfulShiftPoints
    ? "improving"
    : shift <= -requirements.meaningfulShiftPoints
      ? "regressed"
      : "plateaued";
  const confidence = Number(Math.min(current.confidence, ...comparableHistory.map((item) => item.confidence)).toFixed(2));

  const base = {
    primaryConstructId,
    activeCue,
    successMetric,
    baselineMedian,
    shift,
    comparisonSessionIds: comparableHistory.map((item) => item.sessionId),
    confidence,
  };

  // A belief already marked "solved" is in its retention window: every further comparable
  // session either confirms the win held (counting down to "superseded") or catches a relapse
  // ("retention_regressed") — it does not get re-evaluated as a fresh trend read.
  if (stableExisting?.status === "solved") {
    if (trendStatus === "regressed") {
      return {
        ...base,
        comparable: true,
        status: "retention_regressed",
        archetype: "RETENTION_FAILURE",
        cueChangeReason: "disproven",
        isRetentionFailure: true,
        reason: "This cue was marked solved, but the distribution regressed in the same context — the fix did not retain.",
        evidenceSummary: { archetype: "RETENTION_FAILURE", baselineMedian, shift, comparisonSessionIds: base.comparisonSessionIds, confidence, reason: "retention_failed" },
      };
    }
    const priorRemaining = typeof stableExisting.evidenceSummary?.retentionChecksRemaining === "number"
      ? stableExisting.evidenceSummary.retentionChecksRemaining
      : requirements.retentionWindowSessions;
    const retentionChecksRemaining = priorRemaining - 1;
    if (retentionChecksRemaining <= 0) {
      return {
        ...base,
        comparable: true,
        status: "superseded",
        archetype: "PROGRESS_SHIFT",
        cueChangeReason: "superseded",
        isRetentionFailure: false,
        reason: "The improvement held through the full retention window — this focus is durably solved.",
        evidenceSummary: { archetype: "PROGRESS_SHIFT", baselineMedian, shift, comparisonSessionIds: base.comparisonSessionIds, confidence, reason: "retention_confirmed" },
      };
    }
    return {
      ...base,
      comparable: true,
      status: "solved",
      archetype: "PROGRESS_SHIFT",
      cueChangeReason: "stable",
      isRetentionFailure: false,
      reason: `Improvement is holding; ${retentionChecksRemaining} more comparable ${retentionChecksRemaining === 1 ? "session" : "sessions"} to confirm retention.`,
      evidenceSummary: { archetype: "PROGRESS_SHIFT", baselineMedian, shift, comparisonSessionIds: base.comparisonSessionIds, confidence, retentionChecksRemaining, reason: "retention_monitoring" },
    };
  }

  if (confidence < requirements.minimumStatusConfidence) {
    return {
      ...base,
      comparable: true,
      status: "uncertain",
      archetype: null,
      cueChangeReason: stableExisting ? "stable" : "initialized",
      isRetentionFailure: false,
      reason: "Comparable evidence exists but measurement confidence is too low to make a reliable trend claim.",
      evidenceSummary: { archetype: null, baselineMedian, shift, comparisonSessionIds: base.comparisonSessionIds, confidence, reason: "low_confidence" },
    };
  }

  if (
    trendStatus === "improving"
    && stableExisting?.status === "improving"
    && recentCueHistoryAllStable(cueHistory, requirements.sustainedStableSessionsForSolved - 1)
  ) {
    return {
      ...base,
      comparable: true,
      status: "solved",
      archetype: "PROGRESS_SHIFT",
      cueChangeReason: "solved",
      isRetentionFailure: false,
      reason: "Improvement has been sustained across enough comparable sessions with a stable cue — this focus is now solved, pending retention confirmation.",
      evidenceSummary: { archetype: "PROGRESS_SHIFT", baselineMedian, shift, comparisonSessionIds: base.comparisonSessionIds, confidence, retentionChecksRemaining: requirements.retentionWindowSessions, reason: "solved_pending_retention" },
    };
  }

  return {
    ...base,
    comparable: true,
    status: trendStatus,
    archetype: trendStatus === "improving" ? "PROGRESS_SHIFT" : "REGRESSION_OR_PLATEAU",
    cueChangeReason: stableExisting ? "stable" : "initialized",
    isRetentionFailure: false,
    reason: trendStatus === "improving"
      ? "The recent construct distribution shifted beyond the meaningful-change threshold."
      : trendStatus === "regressed"
        ? "The recent construct distribution shifted backward; no cause is inferred from the trend alone."
        : "The distribution remains inside the meaningful-change band, so the current cue stays stable.",
    evidenceSummary: { archetype: trendStatus === "improving" ? "PROGRESS_SHIFT" : "REGRESSION_OR_PLATEAU", baselineMedian, shift, comparisonSessionIds: base.comparisonSessionIds, confidence, reason: trendStatus },
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
