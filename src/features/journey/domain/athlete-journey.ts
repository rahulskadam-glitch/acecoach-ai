export const JOURNEY_STEPS = ["sport", "auth", "upload", "analyze", "report", "coach"] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export type AthleteJourney = {
  version: "athlete-journey-v1";
  journeyId: string | null;
  userId: string | null;
  selectedSport: string | null;
  currentStep: JourneyStep;
  completedSteps: JourneyStep[];
  videoId: string | null;
  analysisSessionId: string | null;
  reportId: string | null;
  conversationId: string | null;
  draftIntake: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export const JOURNEY_STORAGE_KEY = "acecoach-athlete-journey-v1";
