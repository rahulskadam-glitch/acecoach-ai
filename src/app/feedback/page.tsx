import { saveProductFeedback } from "@/app/actions/experience-actions";
import ProductFeedbackForm from "@/components/feedback/ProductFeedbackForm";
import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";
import { requireUser } from "@/lib/supabase/server";

export default async function FeedbackPage() {
  await requireUser();
  async function save(formData: FormData) { "use server"; await saveProductFeedback(formData); }
  return (
    <AthleteWorkspaceShell>
      <div className="space-y-6"><WorkspacePageHeader eyebrow="Build with athletes" title="Feedback becomes a governed product input" description="AceCoach groups feedback by journey stage and issue type, reviews it against evidence and telemetry, and ships changes only through versioned releases and deterministic tests." /><ProductFeedbackForm action={save} /></div>
    </AthleteWorkspaceShell>
  );
}
