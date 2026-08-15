import { CheckCircle2, ShieldCheck } from "lucide-react";

import { PLAN_ENTITLEMENTS } from "@/features/billing";
import ContextualPageShell from "@/components/layout/ContextualPageShell";

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
    <ContextualPageShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">Plans and usage</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Clear limits before you upload</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Review what each plan includes. Payment remains disabled until renewal, cancellation, export, and historical access are production-ready.</p></header>
        <section className="grid gap-5 xl:grid-cols-3">
          {PLAN_ENTITLEMENTS.map((plan) => <article key={plan.id} className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm p-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">{plan.name}</p><h2 className="mt-3 text-2xl font-semibold text-slate-950">{plan.audience}</h2><div className="mt-6 space-y-3">{rows.map((row) => <div key={row.label} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" /><div><p className="text-xs uppercase tracking-[0.12em] text-slate-500">{row.label}</p><p className="mt-1 text-sm text-slate-800">{String(plan[row.key])}</p></div></div>)}</div><div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-slate-700"><strong className="text-violet-900">Renewal:</strong> {plan.renewal}<br /><strong className="text-violet-900">After cancellation:</strong> {plan.historicalAccess}</div></article>)}
        </section>
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-blue-800" /><div><p className="font-semibold text-slate-950">Payments are not active yet</p><p className="mt-2 text-sm leading-7 text-slate-700">You will see the price, renewal terms, cancellation controls, and access policy before any paid plan becomes available.</p></div></div></section>
      </div>
    </ContextualPageShell>
  );
}
