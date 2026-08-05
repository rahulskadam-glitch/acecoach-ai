import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";
import SupportRequestForm from "@/features/support/presentation/SupportRequestForm";
import { createClient, requireUser } from "@/lib/supabase/server";

type SupportRequestRow = {
  id: string;
  category: string;
  status: string;
  created_at: string;
};

export default async function SupportPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("support_requests").select("id, category, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const requests = (data ?? []) as SupportRequestRow[];
  return <AthleteWorkspaceShell><div className="space-y-6"><WorkspacePageHeader eyebrow="Support and diagnostics" title="Get help without losing the session context" description="Attach safe diagnostic references to upload, processing, playback, movement, practice, account, or pricing issues." /><SupportRequestForm /><section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold text-white">Recent requests</h2><div className="mt-4 space-y-3">{requests.length === 0 ? <p className="text-sm text-slate-400">No support requests yet.</p> : requests.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/55 p-4"><div><p className="font-medium capitalize text-white">{item.category}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold capitalize text-emerald-200">{item.status}</span></div>)}</div></section></div></AthleteWorkspaceShell>;
}
