import { CheckCircle2, CircleHelp, FlaskConical, XCircle } from "lucide-react";

import type { MeasurementCoverage as Coverage } from "@/modules/analysis/types";

export default function MeasurementCoverage({ coverage }: { coverage: Coverage }) {
  const groups = [
    { id: "measured", title: "Measured from this clip", icon: CheckCircle2, tone: "text-emerald-300", border: "border-emerald-500/20" },
    { id: "estimated", title: "Estimated proxy", icon: CircleHelp, tone: "text-amber-300", border: "border-amber-500/20" },
    { id: "unavailable", title: "Not measured yet", icon: XCircle, tone: "text-slate-400", border: "border-white/10" },
  ] as const;

  return (
    <details className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="flex items-center gap-3"><FlaskConical className="h-5 w-5 text-sky-300" /><div><h2 className="text-xl font-semibold text-white">What the engine actually measured</h2><p className="mt-1 text-sm text-slate-400">Open the scientific measurement boundary.</p></div></div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Coach detail</span>
      </summary>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.id} className={`rounded-2xl border ${group.border} bg-slate-950/55 p-5`}>
              <div className={`flex items-center gap-2 ${group.tone}`}><Icon className="h-4 w-4" /><p className="text-sm font-semibold">{group.title}</p></div>
              <div className="mt-4 space-y-3">
                {coverage[group.id].map((item) => (
                  <div key={item.label}><p className="text-sm font-medium text-white">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
