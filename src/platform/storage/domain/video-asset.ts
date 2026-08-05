export type VideoLifecycleStatus =
  | "selected"
  | "validating"
  | "uploading"
  | "paused"
  | "retrying"
  | "uploaded"
  | "registering"
  | "queued"
  | "processing"
  | "awaiting-confirmation"
  | "completed"
  | "failed"
  | "cancelled"
  | "deleted";

export type CaptureAssessment = {
  outcome: "pass" | "warning" | "fail";
  score: number | null;
  warnings: string[];
  blockers: string[];
  assessedAt: string;
};

export type VideoAsset = {
  id: string;
  ownerId: string;
  originalFileName: string;
  storagePath: string;
  sportId: string;
  actionType: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  checksumSha256: string | null;
  lifecycleStatus: VideoLifecycleStatus;
  captureAssessment: CaptureAssessment | null;
  createdAt: string;
  updatedAt: string;
};
