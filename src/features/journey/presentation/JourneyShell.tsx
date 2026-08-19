import type { ReactNode } from "react";

import GlobalNavigationBar from "@/components/layout/GlobalNavigationBar";
import type { JourneyStep } from "../domain/athlete-journey";
import JourneyProgress from "./JourneyProgress";

const STEPPER_STEPS: readonly JourneyStep[] = ["sport", "auth", "upload", "analyze"];

export default function JourneyShell({
  current,
  children,
  showProgress,
  maxWidth = "max-w-6xl",
}: {
  current: JourneyStep;
  children: ReactNode;
  showProgress?: boolean;
  maxWidth?: string;
}) {
  const showStepper = showProgress ?? STEPPER_STEPS.includes(current);

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col">
      <GlobalNavigationBar maxWidth={maxWidth} />
      {showStepper && (
        <div className="border-b border-white/10 bg-[#09131e]/90 py-3 shadow-inner backdrop-blur-md">
          <div className={`mx-auto ${maxWidth} px-4 sm:px-8`}>
            <JourneyProgress current={current} />
          </div>
        </div>
      )}
      <main className={`mx-auto w-full ${maxWidth} flex-1 px-4 py-6 sm:px-8 sm:py-10 pb-[max(2rem,env(safe-area-inset-bottom))]`}>
        {children}
      </main>
    </div>
  );
}
