import Link from "next/link";
import type { ReactNode } from "react";

import AceCoachMark from "@/components/design-system/AceCoachMark";
import type { JourneyStep } from "../domain/athlete-journey";
import JourneyProgress from "./JourneyProgress";

export default function JourneyShell({
  current,
  children,
  showProgress = true,
  maxWidth = "max-w-6xl",
}: {
  current: JourneyStep;
  children: ReactNode;
  showProgress?: boolean;
  maxWidth?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F6F8FB] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-6 px-5 py-4 sm:px-8`}>
          <AceCoachMark />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/feedback" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 sm:inline">Give feedback</Link>
            <Link href="/support" className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 md:inline">Help</Link>
            <Link href="/settings" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950">Account</Link>
          </div>
        </div>
        {showProgress ? (
          <div className={`mx-auto ${maxWidth} px-5 pb-4 sm:px-8`}>
            <JourneyProgress current={current} />
          </div>
        ) : null}
      </header>
      <div className={`mx-auto ${maxWidth} px-5 py-10 sm:px-8 sm:py-14`}>{children}</div>
    </main>
  );
}
