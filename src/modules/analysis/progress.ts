import type { AnalysisReport } from "./types";

export type StoredPracticePlan = {
  id: string;
  sessionId: string;
  primaryGoal: string;
  coachingCue: string | null;
  whyItMatters: string | null;
  plan: AnalysisReport["practicePlan"];
  completion: Record<string, boolean>;
  status: "active" | "ready_for_reassessment" | "completed" | "archived";
  reassessmentDueAt: string | null;
};

export type ComparableReport = {
  sessionId: string;
  createdAt: string;
  overallScore: number | null;
  scoreStatus: string;
  confidence: number;
  captureScore: number;
  engineVersion: string | null;
  runtimeSignature: string | null;
  coachingAreas: NonNullable<AnalysisReport["coachingAreas"]>;
};

export type ProgressComparison = {
  comparable: boolean;
  reason: string;
  previousDate: string;
  scoreDelta: number | null;
  strongestGain: { label: string; delta: number } | null;
  currentPriority: string | null;
  areaDeltas: Array<{ id: string; label: string; previous: number; current: number; delta: number }>;
};

export function buildProgressComparison(
  current: AnalysisReport,
  previous: ComparableReport | null,
): ProgressComparison | null {
  if (!previous) return null;

  const sameEngine = previous.engineVersion === (current.engineManifest?.engineVersion ?? null);
  const sameRuntime = previous.runtimeSignature === (current.engineManifest?.runtimeSignature ?? null);
  const captureDifference = Math.abs(previous.captureScore - Number(current.captureQuality.score ?? 0));
  const captureComparable = captureDifference <= 15;
  const reliableCurrent = current.qualityGate.canUseTechniqueScore;
  const reliablePrevious = previous.scoreStatus === "provisional_criterion_index";
  const comparable = sameEngine && sameRuntime && captureComparable && reliableCurrent && reliablePrevious;

  const previousAreas = new Map(previous.coachingAreas.map((area) => [area.id, area]));
  const areaDeltas = (current.coachingAreas ?? [])
    .map((area) => {
      const before = previousAreas.get(area.id);
      if (!before) return null;
      return {
        id: area.id,
        label: area.label,
        previous: before.score,
        current: area.score,
        delta: area.score - before.score,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.delta - a.delta);

  const scoreDelta = comparable && current.overallScore !== null && previous.overallScore !== null
    ? current.overallScore - previous.overallScore
    : null;

  const strongestGain = comparable && areaDeltas.length > 0 && areaDeltas[0].delta > 0
    ? { label: areaDeltas[0].label, delta: areaDeltas[0].delta }
    : null;

  return {
    comparable,
    reason: comparable
      ? "Same movement family, engine version, and reliability-gated scoring."
      : !sameEngine
        ? "Engine versions differ, so scores are shown as separate baselines."
        : !sameRuntime
          ? "Numeric runtimes differ, so the reports are not treated as directly comparable."
          : !captureComparable
            ? "Capture quality differs too much for a responsible score comparison."
            : "One of the recordings did not pass the reliability gate.",
    previousDate: previous.createdAt,
    scoreDelta,
    strongestGain,
    currentPriority: current.priorities[0]?.title ?? null,
    areaDeltas,
  };
}

export type PracticeCheckin = {
  id: string;
  plan_id: string;
  session_item_id: string;
  target_hits: number | null;
  attempts: number | null;
  effort: string | null;
  confidence_before: number | null;
  confidence_after: number | null;
  note: string | null;
  created_at: string;
};
