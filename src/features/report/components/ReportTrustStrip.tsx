import { BadgeCheck, ShieldAlert, ShieldCheck, TestTube2 } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";

export default function ReportTrustStrip({ report }: { report: AnalysisReport }) {
  const scoreAllowed = report.qualityGate.canUseTechniqueScore;
  const movementReady = report.qualityGate.movementConfirmed;
  const captureReady = report.qualityGate.capturePassed;
  const items = [
    { label: "Original video", value: "Preserved", icon: ShieldCheck, ok: true },
    { label: "Movement", value: movementReady ? "Confirmed" : "Needs confirmation", icon: BadgeCheck, ok: movementReady },
    { label: "Capture", value: captureReady ? "Usable" : "Blocked", icon: ShieldAlert, ok: captureReady },
    { label: "Technique score", value: scoreAllowed ? "Available" : "Withheld", icon: TestTube2, ok: scoreAllowed },
  ];
  return <section aria-label="Analysis trust summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(({ label, value, icon: Icon, ok }) => <div key={label} className={`rounded-2xl border p-4 ${ok ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-amber-500/25 bg-amber-500/[0.07]"}`}><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${ok ? "text-emerald-300" : "text-amber-300"}`} /><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p></div><p className="mt-2 font-semibold text-white">{value}</p></div>)}</section>;
}
