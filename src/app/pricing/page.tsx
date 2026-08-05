import { CheckCircle2, ShieldCheck } from "lucide-react";

import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";
import { PLAN_ENTITLEMENTS } from "@/features/billing";

const rows: Array<{ key: keyof (typeof PLAN_ENTITLEMENTS)[number]; label: string }> = [
  { key: "analysesPerMonth", label: "Analyses" },
  { key: "maxVideoDuration", label: "Maximum clip" },
  { key: "reportDepth", label: "Report depth" },
  { key: "motionTwins", label: "Motion twins" },
  { key: "practiceHistory", label: "Practice and progress" },
  { key: "coachSharing", label: "Coach sharing" },
  { key: "export", label: "Export" },
  { key: "support", label: "Support" },
];

export default function PricingPage() {
  return (
    <AthleteWorkspaceShell>
      <div className="space-y-6">
        <WorkspacePageHeader eyebrow="Pricing trust" title="Clear limits before you upload" description="AceCoach does not hide core usage rules behind the analysis screen. Payment collection remains disabled until cancellation, renewal, export, and historical-access flows are production-ready." />
        <section className="grid gap-5 xl:grid-cols-3">
          {PLAN_ENTITLEMENTS.map((plan) => <article key={plan.id} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">{plan.name}</p><h2 className="mt-3 text-2xl font-semibold text-white">{plan.audience}</h2><div className="mt-6 space-y-3">{rows.map((row) => <div key={row.label} className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/55 p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">{row.label}</p><p className="mt-1 text-sm text-slate-200">{String(plan[row.key])}</p></div></div>)}</div><div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] p-4 text-sm leading-6 text-slate-300"><strong className="text-violet-100">Renewal:</strong> {plan.renewal}<br /><strong className="text-violet-100">After cancellation:</strong> {plan.historicalAccess}</div></article>)}
        </section>
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-300" /><div><p className="font-semibold text-white">Commercial trust gate</p><p className="mt-2 text-sm leading-7 text-slate-300">No surprise auto-renewal, no watermark-removal trap, no inaccessible historical report without a clear policy, and no payment launch until export and cancellation are tested end to end.</p></div></div></section>
      </div>
    </AthleteWorkspaceShell>
  );
}
