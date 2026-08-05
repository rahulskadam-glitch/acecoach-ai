import type { SportId } from "@/lib/sports";

export type AiTask = "coaching_report" | "coach_chat" | "frame_review" | "practice_plan" | "technique_analysis";

export type AiRequest = {
  task: AiTask;
  input: unknown;
  userId: string;
  sportId: SportId;
  actionType?: string;
  preferredProvider?: string;
  quality?: "quick" | "standard" | "advanced";
};

export type AiResponse<T = unknown> = {
  provider: string;
  model: string;
  sportId: SportId;
  output: T;
  latencyMs: number;
  estimatedCostUsd?: number;
  traceId?: string;
};

export interface AiProvider {
  readonly id: string;
  supports(task: AiTask, sportId: SportId): boolean;
  generate<T = unknown>(request: AiRequest): Promise<AiResponse<T>>;
}
