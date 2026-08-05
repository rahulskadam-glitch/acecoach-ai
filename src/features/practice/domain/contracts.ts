export type SuccessCriterion = {
  metricId: string;
  description: string;
  target: number | string;
  attemptsRequired: number | null;
};

export type PracticeDrillContract = {
  id: string;
  sportId: string;
  movement: string;
  findingId: string;
  name: string;
  difficulty: "foundation" | "development" | "performance";
  equipment: string[];
  instructions: string[];
  sets: number;
  repetitions: number;
  restSeconds: number;
  cue: string;
  commonError: string;
  successCriterion: SuccessCriterion;
  progression: string;
  regression: string;
  safetyNote: string;
};

export type ReassessmentPlanContract = {
  sourceSessionId: string;
  targetMetricId: string;
  dueAt: string;
  captureInstructions: string[];
  comparabilityRequirements: string[];
};
