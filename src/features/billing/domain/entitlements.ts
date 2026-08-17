export type PlanEntitlement = {
  id: "free" | "single" | "pro";
  name: string;
  badge?: string;
  /** Single numeric source of truth for this plan's video-analysis cap — every display string below derives from it. */
  videoLimit: number;
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

const FREE_VIDEO_LIMIT = 5;
const PRO_VIDEO_LIMIT = 10;

export const PLAN_ENTITLEMENTS: PlanEntitlement[] = [
  {
    id: "free",
    name: "Free Trial",
    badge: "1st Month Free",
    videoLimit: FREE_VIDEO_LIMIT,
    audience: `Try out your first ${FREE_VIDEO_LIMIT} stroke audits`,
    analysesPerMonth: `Up to ${FREE_VIDEO_LIMIT} videos (first month)`,
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
    videoLimit: 1,
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
    videoLimit: PRO_VIDEO_LIMIT,
    audience: "Dedicated players building elite technique",
    analysesPerMonth: `Up to ${PRO_VIDEO_LIMIT} 60fps video analyses / month`,
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
