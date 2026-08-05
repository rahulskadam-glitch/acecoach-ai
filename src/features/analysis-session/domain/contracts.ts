import type { EngineManifest } from "@/platform/jobs";

export type MeasurementType = "image-plane-measured" | "normalized-proxy" | "estimated-proxy" | "inferred-coaching" | "unsupported";

export type BiomechanicalMeasurement = {
  id: string;
  name: string;
  value: number | null;
  unit: string | null;
  confidence: number;
  sourceFrames: number[];
  measurementType: MeasurementType;
  cameraDependency: string;
  limitations: string[];
  evidenceIds: string[];
  engineVersion: string;
};

export type ReliabilityGate = {
  outcome: "pass" | "soft-block" | "hard-block";
  reasons: string[];
  scoreAllowed: boolean;
  movementConfirmationRequired: boolean;
};

export type AnalysisSessionContract = {
  id: string;
  userId: string;
  videoId: string;
  selectedMovement: string;
  detectedMovement: string | null;
  confirmedMovement: string | null;
  confidence: number;
  reliability: ReliabilityGate;
  engineManifest: EngineManifest;
  measurements: BiomechanicalMeasurement[];
};
