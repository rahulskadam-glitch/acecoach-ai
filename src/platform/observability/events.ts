export const PRODUCT_EVENTS = [
  "upload_started",
  "upload_retried",
  "upload_completed",
  "upload_failed",
  "video_downloaded",
  "analysis_started",
  "analysis_failed",
  "movement_confirmed",
  "movement_corrected",
  "report_opened",
  "evidence_frame_opened",
  "drill_started",
  "drill_completed",
  "reassessment_recorded",
  "support_request_created",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

export type ProductEvent = {
  name: ProductEventName;
  appVersion: string;
  journeyStage: string;
  sessionId?: string;
  videoId?: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};
