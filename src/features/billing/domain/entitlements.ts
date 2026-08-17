export type PlanEntitlement = {
  id: "free" | "single" | "pro";
  name: string;
  badge?: string;
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
    name: "Free Trial",
    badge: "1st Month Free",
    audience: "Try out your first 5 stroke audits",
    analysesPerMonth: "Up to 5 videos (first month)",
    maxVideoDuration: "30 seconds",
    reportDepth: "Essential 3D Skeleton & Joint Tracking",
    motionTwins: "Category + best-in-class preview",
    practiceHistory: "Current trial plan",
    coachSharing: "1 active secure link",
    export: "Original video + summary",
    support: "Self-service",
    renewal: "No charge (First 30 days free)",
    historicalAccess: "Completed reports remain exportable forever",
  },
  {
    id: "single",
    name: "Single Video Pass",
    badge: "Pay-As-You-Go",
    audience: "Instant single audit without commitment",
    analysesPerMonth: "1 full analysis per purchase",
    maxVideoDuration: "30 seconds",
    reportDepth: "Full 3D Kinematic Telemetry & Report",
    motionTwins: "Tour Motion Twin Comparison",
    practiceHistory: "Saved to account history",
    coachSharing: "Shareable link + PDF export",
    export: "Original video + complete report",
    support: "Standard email support",
    renewal: "One-time purchase (no subscription)",
    historicalAccess: "Report remains readable in your library forever",
  },
  {
    id: "pro",
    name: "Pro Athlete",
    badge: "Most Popular",
    audience: "Dedicated players building elite technique",
    analysesPerMonth: "Up to 10 60fps video analyses / month",
    maxVideoDuration: "30 seconds",
    reportDepth: "Tour-Grade 9-Tile Telemetry & Power Leaks",
    motionTwins: "Full synchronized Tour motion twins",
    practiceHistory: "Longitudinal progress trends & history",
    coachSharing: "Unlimited share links & WhatsApp exports",
    export: "Original video + complete report",
    support: "Priority email & AI Coach Concierge",
    renewal: "Cancel anytime in 1 tap",
    historicalAccess: "Unlimited access to all historical sessions",
  },
];
