import type { VideoLifecycleStatus } from "@/platform/storage";

const transitions: Record<VideoLifecycleStatus, VideoLifecycleStatus[]> = {
  selected: ["validating", "cancelled"],
  validating: ["uploading", "failed", "cancelled"],
  uploading: ["paused", "retrying", "uploaded", "failed", "cancelled"],
  paused: ["uploading", "cancelled"],
  retrying: ["uploading", "failed", "cancelled"],
  uploaded: ["registering", "deleted"],
  registering: ["queued", "completed", "failed"],
  queued: ["processing", "cancelled"],
  processing: ["awaiting-confirmation", "completed", "failed", "cancelled"],
  "awaiting-confirmation": ["processing", "completed", "cancelled"],
  completed: ["processing", "deleted"],
  failed: ["retrying", "cancelled", "deleted"],
  cancelled: ["selected", "deleted"],
  deleted: [],
};

export function canTransitionUpload(from: VideoLifecycleStatus, to: VideoLifecycleStatus) {
  return transitions[from].includes(to);
}

export function assertUploadTransition(from: VideoLifecycleStatus, to: VideoLifecycleStatus) {
  if (!canTransitionUpload(from, to)) throw new Error(`Invalid upload transition: ${from} → ${to}`);
}

export type PendingUploadRecord = {
  localId: string;
  fileName: string;
  fileSize: number;
  sportId: string;
  actionType: string;
  storagePath: string;
  status: VideoLifecycleStatus;
  attempt: number;
  updatedAt: string;
};

export const PENDING_UPLOAD_STORAGE_KEY = "acecoach:v5:pending-uploads";

export function readPendingUploads(storage: Pick<Storage, "getItem">): PendingUploadRecord[] {
  try {
    const parsed = JSON.parse(storage.getItem(PENDING_UPLOAD_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is PendingUploadRecord => Boolean(item && typeof item === "object" && "localId" in item && "fileName" in item)) : [];
  } catch {
    return [];
  }
}

export function writePendingUploads(storage: Pick<Storage, "setItem">, records: PendingUploadRecord[]) {
  storage.setItem(PENDING_UPLOAD_STORAGE_KEY, JSON.stringify(records.slice(0, 20)));
}
