import { AlertTriangle, BadgeCheck, FlaskConical, ShieldQuestion } from "lucide-react";

import JourneyShell from "@/features/journey/presentation/JourneyShell";

const levels = [
  { label: "Validated", icon: BadgeCheck, description: "A capability with documented test evidence and a declared use boundary." },
  { label: "Beta", icon: FlaskConical, description: "Useful for guided testing, but not yet independently validated for broad claims." },
  { label: "Proxy", icon: ShieldQuestion, description: "A visible 2D signal used as a coaching indicator—not a direct force, loading, or 3D measurement." },
  { label: "Unavailable", icon: AlertTriangle, description: "The video cannot support the measurement. AceCoach withholds it instead of guessing." },
];

const boundaries = [
  "No injury diagnosis or treatment recommendation.",
  "No force, joint loading, or muscle activation from ordinary monocular video.",
  "No exact ball contact unless object tracking passes its confidence gate.",
  "No age percentile or professional-equivalence claim without validated reference data.",
  "Human motion twins are coaching visualizations, not laboratory motion capture.",
  "Language models may explain structured findings but may not invent measurements.",
];

export default function MethodologyPage() {
  return <JourneyShell current="coach" showProgress={false}>
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">How analysis works</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Know what AceCoach measured—and what it did not</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Reports explain what is visible, how confident the result is, how the camera affects it, and what could not be measured.</p></header>
      <section className="grid gap-4 md:grid-cols-2">{levels.map(({ label, icon: Icon, description }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-blue-800" /><h2 className="mt-4 text-xl font-semibold text-slate-950">{label}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></article>)}</section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-semibold text-slate-950">Scientific boundaries</h2><ul className="mt-4 grid gap-3 text-sm leading-7 text-slate-700 md:grid-cols-2">{boundaries.map((boundary) => <li key={boundary} className="rounded-xl bg-slate-50 p-4">{boundary}</li>)}</ul></section>
    </div>
  </JourneyShell>;
}
