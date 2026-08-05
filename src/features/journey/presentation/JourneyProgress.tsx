import { Check } from "lucide-react";

import { JOURNEY_STEPS, type JourneyStep } from "../domain/athlete-journey";

const LABELS: Record<JourneyStep, string> = {
  sport: "Sport",
  auth: "Sign in",
  upload: "Upload",
  analyze: "Analyze",
  report: "Report",
  coach: "Coach",
};

export default function JourneyProgress({ current }: { current: JourneyStep }) {
  const currentIndex = JOURNEY_STEPS.indexOf(current);
  return (
    <nav aria-label="Analysis journey" className="max-w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 text-xs font-medium text-slate-500 sm:gap-3">
        {JOURNEY_STEPS.map((step, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[0.7rem] ${complete ? "border-blue-700 bg-blue-700 text-white" : active ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-400"}`} aria-current={active ? "step" : undefined}>
                {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span className={active ? "text-slate-950" : undefined}>{LABELS[step]}</span>
              {index < JOURNEY_STEPS.length - 1 ? <span className="h-px w-5 bg-slate-200 sm:w-8" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
