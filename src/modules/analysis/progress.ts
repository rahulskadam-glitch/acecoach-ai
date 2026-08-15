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
  knowledgePolicyVersion: string | null;
  knowledgeManifestHash: string | null;
  contextSignature: string | null;
  coachingAreas: NonNullable<AnalysisReport["coachingAreas"]>;
  movementChain: NonNullable<AnalysisReport["ontologyReasoning"]>["movementChain"];
};

export type ProgressComparison = {
  comparable: boolean;
  reason: string;
  previousDate: string;
  scoreDelta: number | null;
  strongestGain: { label: string; delta: number } | null;
  currentPriority: string | null;
  verdictPolicy: {
    improvedScoreDelta: number;
    unchangedLowerScoreDelta: number;
  } | null;
  areaDeltas: Array<{ id: string; label: string; previous: number; current: number; delta: number }>;
  phaseDeltas: Array<{ id: string; label: string; previous: number; current: number; delta: number }>;
};

export type ReassessmentVerdict = {
  status: "improved" | "unchanged" | "needs_comparable";
  title: "Improved" | "Unchanged" | "Needs another comparable recording";
  detail: string;
};

function contextValue(value: unknown) {
  return typeof value === "string" && value.trim() && value !== "unknown"
    ? value.trim().toLowerCase()
    : null;
}

export function reportComparisonContext(report: AnalysisReport) {
  const context = report.frameSummary?.analysisContext;
  const camera = contextValue(context?.cameraAngle);
  const situation = contextValue(context?.shotSituation);
  const intent = contextValue(context?.shotIntent);
  return camera && situation && intent ? `${camera}:${situation}:${intent}` : null;
}

export function buildProgressComparison(
  current: AnalysisReport,
  previous: ComparableReport | null,
): ProgressComparison | null {
  if (!previous) return null;

  const control = current.knowledgeControl;
  const policy = control?.contracts?.comparisons;
  const sameEngine = policy ? (!policy.requireSameEngine
    || previous.engineVersion === (current.engineManifest?.engineVersion ?? null)) : false;
  const sameRuntime = policy ? (!policy.requireSameRuntime
    || previous.runtimeSignature === (current.engineManifest?.runtimeSignature ?? null)) : false;
  const sameKnowledgePolicy = policy && control
    ? (!policy.requireSameKnowledgePolicy || previous.knowledgePolicyVersion === control.policyVersion)
      && (!policy.requireSameManifestHash || previous.knowledgeManifestHash === control.manifestHash)
    : false;
  const currentContextSignature = reportComparisonContext(current);
  const sameContext = policy ? (!policy.requireSameContext || (
    previous.contextSignature !== null
    && currentContextSignature !== null
    && previous.contextSignature === currentContextSignature
  )) : false;
  const captureDifference = Math.abs(previous.captureScore - Number(current.captureQuality.score ?? 0));
  const captureComparable = policy ? captureDifference <= policy.maximumCaptureScoreDifference : false;
  const reliableCurrent = current.qualityGate.canUseTechniqueScore;
  const reliablePrevious = previous.scoreStatus === "provisional_criterion_index";
  const comparable = Boolean(policy)
    && sameKnowledgePolicy && sameEngine && sameRuntime && sameContext
    && captureComparable && reliableCurrent && reliablePrevious;

  const previousAreas = new Map((previous.coachingAreas ?? []).map((area) => [area.id, area]));
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

  const previousPhases = new Map((previous.movementChain ?? []).map((phase) => [phase.id, phase]));
  const phaseDeltas = (current.ontologyReasoning?.movementChain ?? [])
    .map((phase) => {
      const before = previousPhases.get(phase.id);
      if (typeof phase.score !== "number" || typeof before?.score !== "number") return null;
      return {
        id: phase.id,
        label: phase.label,
        previous: before.score,
        current: phase.score,
        delta: phase.score - before.score,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

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
      : !policy
        ? "The knowledge layer did not authorize a comparison contract for this report."
        : !sameKnowledgePolicy
        ? "Knowledge policy or ontology evidence versions differ, so the reports remain separate baselines."
        : !sameEngine
        ? "Engine versions differ, so scores are shown as separate baselines."
        : !sameRuntime
          ? "Numeric runtimes differ, so the reports are not treated as directly comparable."
          : !sameContext
            ? "Camera view, shot situation, or shot intention differs from the earlier recording."
          : !captureComparable
            ? "Capture quality differs too much for a responsible score comparison."
            : "One of the recordings did not pass the reliability gate.",
    previousDate: previous.createdAt,
    scoreDelta,
    strongestGain,
    currentPriority: current.priorities[0]?.title ?? null,
    verdictPolicy: policy ? {
      improvedScoreDelta: policy.improvedScoreDelta,
      unchangedLowerScoreDelta: policy.unchangedLowerScoreDelta,
    } : null,
    areaDeltas,
    phaseDeltas,
  };
}

export function buildReassessmentVerdict(
  comparison: ProgressComparison | null,
): ReassessmentVerdict | null {
  if (!comparison) return null;
  if (!comparison.comparable || comparison.scoreDelta === null || !comparison.verdictPolicy) {
    return {
      status: "needs_comparable",
      title: "Needs another comparable recording",
      detail: "Use the same stroke, camera view, shot situation and intention so the change can be judged responsibly.",
    };
  }
  if (comparison.scoreDelta >= comparison.verdictPolicy.improvedScoreDelta) {
    return {
      status: "improved",
      title: "Improved",
      detail: "The matched reassessment shows a meaningful positive shift. Keep the same correction for the next practice block.",
    };
  }
  if (comparison.scoreDelta > comparison.verdictPolicy.unchangedLowerScoreDelta) {
    return {
      status: "unchanged",
      title: "Unchanged",
      detail: "The difference is too small to call a reliable change. Keep the correction and reassess under the same conditions.",
    };
  }
  return {
    status: "needs_comparable",
    title: "Needs another comparable recording",
    detail: "This matched recording moved lower. Repeat the same recording once more before changing the correction.",
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
