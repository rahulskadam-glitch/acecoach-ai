import { AlertTriangle, BadgeCheck, FlaskConical, ShieldQuestion } from "lucide-react";

import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";

const levels = [
  { label: "Validated", icon: BadgeCheck, description: "A capability with documented test evidence and a declared use boundary." },
  { label: "Beta", icon: FlaskConical, description: "Useful for guided testing, but not yet independently validated for broad claims." },
  { label: "Proxy", icon: ShieldQuestion, description: "A visible 2D signal used as a coaching indicator—not a direct force, loading, or 3D measurement." },
  { label: "Unavailable", icon: AlertTriangle, description: "The video cannot support the measurement. AceCoach should withhold it instead of guessing." },
];

export default function MethodologyPage() {
  return <AthleteWorkspaceShell><div className="space-y-6"><WorkspacePageHeader eyebrow="Methodology and validation" title="Know what AceCoach measured—and what it did not" description="Every important result should identify its evidence, confidence, camera dependence, engine version, and limitation." /><section className="grid gap-4 md:grid-cols-2">{levels.map(({ label, icon: Icon, description }) => <article key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><Icon className="h-5 w-5 text-emerald-300" /><h2 className="mt-4 text-xl font-semibold text-white">{label}</h2><p className="mt-2 text-sm leading-7 text-slate-300">{description}</p></article>)}</section><section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6"><h2 className="text-2xl font-semibold text-white">Scientific boundaries</h2><ul className="mt-4 grid gap-3 text-sm leading-7 text-slate-300 md:grid-cols-2"><li className="rounded-xl bg-slate-950/55 p-4">No injury diagnosis or treatment recommendation.</li><li className="rounded-xl bg-slate-950/55 p-4">No force, joint loading, or muscle activation from ordinary monocular video.</li><li className="rounded-xl bg-slate-950/55 p-4">No exact ball contact unless object tracking passes its confidence gate.</li><li className="rounded-xl bg-slate-950/55 p-4">No age percentile or professional-equivalence claim without validated reference data.</li><li className="rounded-xl bg-slate-950/55 p-4">The human motion twins are coaching visualizations, not laboratory motion capture.</li><li className="rounded-xl bg-slate-950/55 p-4">The language model may explain structured findings but may not invent measurements.</li></ul></section></div></AthleteWorkspaceShell>;
}
