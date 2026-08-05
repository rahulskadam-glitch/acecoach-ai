import type { ExistingFeedback } from "@/components/analysis/ReportFeedback";
import type { AthleteReferenceContext } from "@/lib/reference/registry";
import type { PracticeCheckin, ProgressComparison, StoredPracticePlan } from "@/modules/analysis/progress";
import type { AnalysisReport } from "@/modules/analysis/types";

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
};
