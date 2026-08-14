import { saveProductFeedback } from "@/app/actions/experience-actions";
import ProductFeedbackForm from "@/components/feedback/ProductFeedbackForm";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { requireUser } from "@/lib/supabase/server";

const stages = new Set(["capture", "processing", "report", "practice", "progress", "coach", "pricing"]);

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const initialStage = params.stage && stages.has(params.stage) ? params.stage : "report";
  async function save(formData: FormData) { "use server"; await saveProductFeedback(formData); }
  return (
    <JourneyShell current="coach" showProgress={false}>
      <div className="mx-auto max-w-4xl space-y-6"><header className="rounded-3xl border border-violet-200 bg-violet-50 p-6 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-800">Player feedback</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Help make your next session better</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Rate the experience, tell us what was useful, or point out what needs work. Feedback is reviewed by people and never changes coaching rules automatically.</p></header><ProductFeedbackForm action={save} initialStage={initialStage} /></div>
    </JourneyShell>
  );
}
