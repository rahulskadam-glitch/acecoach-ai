export type CoachingReference = {
  type: "finding" | "phase" | "timestamp" | "drill" | "limitation";
  label: string;
  value?: string | number | null;
};

export type CoachingMessage = {
  id: string;
  role: "user" | "assistant";
  message: string;
  references: CoachingReference[];
  createdAt: string;
  moderationStatus?: string | null;
};

export type CoachingContextSummary = {
  sportName: string;
  movementName: string;
  mainPriority: string;
  whyItMatters: string;
  cue: string;
  successTarget: string;
  primaryTimestamp: number | null;
  drillName: string | null;
  drillDosage: string | null;
};
