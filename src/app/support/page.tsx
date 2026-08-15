import { Clock3, MessageCircleQuestion } from "lucide-react";

import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import SupportRequestForm from "@/features/support/presentation/SupportRequestForm";
import { createClient, requireUser } from "@/lib/supabase/server";

type SupportRequestRow = { id: string; category: string; status: string; created_at: string };

const CATEGORY_LABELS: Record<string, string> = {
  upload: "Uploading a video", processing: "Analysis taking too long", movement: "Movement identified incorrectly",
  report: "Report or video playback", practice: "Practice or progress", billing: "Plans or payments",
  account: "Account or privacy", other: "Something else",
};

const STATUS_LABELS: Record<string, string> = { received: "Received", open: "Being reviewed", resolved: "Resolved", closed: "Closed" };

export default async function SupportPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("support_requests").select("id, category, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const requests = (data ?? []) as SupportRequestRow[];

  return (
    <AthleteWorkspaceShell>
      <div className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">Help</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">How can we help?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Tell us what went wrong or what you need. You do not need to find reference numbers or describe how the app works behind the scenes.</p>
        </header>

        <SupportRequestForm />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="recent-help-requests">
          <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-blue-700" /><h2 id="recent-help-requests" className="text-xl font-semibold text-slate-950">Your recent messages</h2></div>
          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><MessageCircleQuestion className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm text-slate-600">You have not contacted support yet.</p></div>
            ) : requests.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div><p className="font-medium text-slate-950">{CATEGORY_LABELS[item.category] ?? "Support request"}</p><p className="mt-1 text-xs text-slate-500">Sent {new Date(item.created_at).toLocaleString()}</p></div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{STATUS_LABELS[item.status] ?? "Received"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AthleteWorkspaceShell>
  );
}
