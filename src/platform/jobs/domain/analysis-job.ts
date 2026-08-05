export const ANALYSIS_JOB_STAGES = [
  "created",
  "claimed",
  "downloading",
  "validating",
  "decoding",
  "tracking-athlete",
  "detecting-equipment",
  "classifying-movement",
  "detecting-repetitions",
  "segmenting-phases",
  "calculating-biomechanics",
  "generating-coaching",
  "building-report",
  "awaiting-confirmation",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AnalysisJobStage = (typeof ANALYSIS_JOB_STAGES)[number];

export type EngineManifest = {
  analysisEngine: string;
  poseModel: string;
  movementClassifier: string;
  sportRules: string;
  coachingLanguage: string;
  motionTwin: string;
};

export type AnalysisJob = {
  id: string;
  sessionId: string;
  videoId: string;
  idempotencyKey: string;
  stage: AnalysisJobStage;
  attempt: number;
  heartbeatAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  engineManifest: EngineManifest;
};
