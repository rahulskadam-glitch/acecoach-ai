import { BadgeCheck, CheckCircle2, Route, ShieldCheck } from "lucide-react";

import AthlentraMark from "@/components/design-system/AthlentraMark";
import { APP_RELEASE_NAME, APP_VERSION, VISUAL_BENCHMARK_FEATURES } from "@/lib/config/version";

export default function VersionPage() {
  return (
    <main className="min-h-screen bg-[#f3f6f2] px-5 py-12 text-slate-950 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-200 p-7 sm:p-9"><AthlentraMark /><div className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-800"><BadgeCheck className="h-5 w-5" />Installed build verification</div><h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em]">Athlentra Tennis v{APP_VERSION}</h1><p className="mt-2 text-xl text-slate-600">{APP_RELEASE_NAME}</p></div>
        <div className="p-7 sm:p-9">
          <div className="grid gap-4 md:grid-cols-2"><div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-950"><Route className="h-5 w-5" /><span className="font-semibold">Six-step athlete journey: ACTIVE</span></div><div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><ShieldCheck className="h-5 w-5" /><span className="font-semibold">Report-grounded coaching: ACTIVE</span></div></div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Active route</p><p className="mt-2 font-mono text-sm text-slate-800">/ → /auth → /start → /analysis/[id] → /report/[id] → /coach/[id]</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">{VISUAL_BENCHMARK_FEATURES.map((feature) => <div key={feature} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><span className="text-sm leading-6 text-slate-700">{feature}</span></div>)}</div>
          <p className="mt-7 text-sm leading-6 text-slate-500">This page must show version 6.0.0. A different version means the development server is running from another project folder.</p>
        </div>
      </section>
    </main>
  );
}
