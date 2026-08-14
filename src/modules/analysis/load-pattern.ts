export type PracticeLoadEntry = {
  id: string;
  sportId: string;
  actionType: string;
  attempts: number;
  effort: "easy" | "just_right" | "hard" | null;
  createdAt: string;
};

export type LoadPatternPolicy = {
  minimumPriorCheckins: number;
  minimumCurrentAttempts: number;
  volumeSpikeRatio: number;
};

export type LoadPatternFlag = {
  archetype: "LOAD_PATTERN_FLAG";
  sportId: string;
  actionType: string;
  currentAttempts: number;
  recentMedianAttempts: number;
  spikeRatio: number;
  message: string;
  clinicalBoundary: string;
};

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function detectRecordedLoadPattern(
  entries: PracticeLoadEntry[],
  policy: LoadPatternPolicy,
): LoadPatternFlag[] {
  const groups = new Map<string, PracticeLoadEntry[]>();
  for (const entry of entries) {
    if (!Number.isFinite(entry.attempts) || entry.attempts < 0) continue;
    const key = `${entry.sportId}:${entry.actionType}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const flags: LoadPatternFlag[] = [];
  for (const group of groups.values()) {
    const ordered = group.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const current = ordered[0];
    const history = ordered.slice(1, 1 + Math.max(policy.minimumPriorCheckins, 3));
    if (history.length < policy.minimumPriorCheckins || current.effort !== "hard" || current.attempts < policy.minimumCurrentAttempts) continue;
    const recentMedianAttempts = median(history.map((entry) => entry.attempts));
    if (recentMedianAttempts <= 0) continue;
    const spikeRatio = current.attempts / recentMedianAttempts;
    if (spikeRatio < policy.volumeSpikeRatio) continue;
    flags.push({
      archetype: "LOAD_PATTERN_FLAG",
      sportId: current.sportId,
      actionType: current.actionType,
      currentAttempts: current.attempts,
      recentMedianAttempts,
      spikeRatio: Number(spikeRatio.toFixed(2)),
      message: "Your logged attempts jumped above your recent pattern and this session felt hard. Consider an easier next block, and stop if you feel pain.",
      clinicalBoundary: "This is a practice-log pattern, not a medical assessment or injury prediction.",
    });
  }
  return flags;
}
