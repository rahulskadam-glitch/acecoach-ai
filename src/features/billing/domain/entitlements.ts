export type PlanEntitlement = {
  id: "free" | "player" | "coach";
  name: string;
  audience: string;
  analysesPerMonth: string;
  maxVideoDuration: string;
  reportDepth: string;
  motionTwins: string;
  practiceHistory: string;
  coachSharing: string;
  export: string;
  support: string;
  renewal: string;
  historicalAccess: string;
};

export const PLAN_ENTITLEMENTS: PlanEntitlement[] = [
  {
    id: "free",
    name: "Free",
    audience: "Try the core athlete journey",
    analysesPerMonth: "2",
    maxVideoDuration: "30 seconds",
    reportDepth: "Player report",
    motionTwins: "Category + best-in-class preview",
    practiceHistory: "Current plan",
    coachSharing: "1 active secure link",
    export: "Original video + summary",
    support: "Self-service",
    renewal: "No charge",
    historicalAccess: "Your original videos and completed summaries remain exportable",
  },
  {
    id: "player",
    name: "Player",
    audience: "Athletes building a repeatable improvement loop",
    analysesPerMonth: "20",
    maxVideoDuration: "30 seconds",
    reportDepth: "Player + advanced analysis",
    motionTwins: "Full synchronized comparison",
    practiceHistory: "Full history and reassessments",
    coachSharing: "Unlimited active links",
    export: "Original video + complete report",
    support: "Priority email",
    renewal: "Reminder before renewal",
    historicalAccess: "Completed reports remain readable after cancellation; export remains available",
  },
  {
    id: "coach",
    name: "Coach",
    audience: "Coaches managing multiple athletes",
    analysesPerMonth: "Team allowance",
    maxVideoDuration: "30 seconds",
    reportDepth: "Athlete, coach, and evidence views",
    motionTwins: "Full synchronized comparison",
    practiceHistory: "Athlete roster history",
    coachSharing: "Coach workspace and annotations",
    export: "Original video + coach report",
    support: "Priority support",
    renewal: "Reminder before renewal",
    historicalAccess: "Athlete-owned media remains with the athlete; coach access follows authorization",
  },
];
