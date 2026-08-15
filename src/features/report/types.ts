import type { ExistingFeedback } from "@/components/analysis/ReportFeedback";
import type { AthleteReferenceContext } from "@/lib/reference/registry";
import type { PersonalBaselineComparison } from "@/modules/analysis/longitudinal";
import type { PracticeCheckin, ProgressComparison, StoredPracticePlan } from "@/modules/analysis/progress";
import type { AnalysisReport } from "@/modules/analysis/types";

export type ValidatedBallOutcome = {
  repetitionIndex: number;
  outcomeSource: "validated_ball_tracker";
  validationStatus: "tracker_verified";
  executionResult: string | null;
  depthZone: string | null;
  direction: string | null;
  placementZone: string | null;
  netClearanceCm: number | null;
  modelVersion: string | null;
};

export type PlayerReportProps = {
  report: AnalysisReport;
  sportId: string;
  actionType: string;
  fileName: string;
  isReviewed: boolean;
  onMarkReviewed: () => Promise<void>;
  onConfirmMovement: (formData: FormData) => Promise<void>;
  practicePlan: StoredPracticePlan | null;
  progressComparison: ProgressComparison | null;
  personalBaselineComparison: PersonalBaselineComparison | null;
  strokeHistory?: Array<{ sessionId: string; recordedAt: string; score: number | null }>;
  previousRecording?: { videoUrl: string; recordedAt: string; score: number | null; contactSeconds: number } | null;
  onTogglePractice: (itemId: string, completed: boolean) => Promise<void>;
  onReadyForReassessment: () => Promise<void>;
  onPracticeCheckin: (itemId: string, formData: FormData) => Promise<void>;
  practiceCheckins: PracticeCheckin[];
  feedback: ExistingFeedback;
  onSubmitFeedback: (formData: FormData) => Promise<void>;
  onCreateShare: () => Promise<{ url: string; expiresAt: string }>;
  onRevokeShare: () => Promise<void>;
  athleteContext?: AthleteReferenceContext;
  videoUrl: string;
  validatedBallOutcomes?: ValidatedBallOutcome[];
};
