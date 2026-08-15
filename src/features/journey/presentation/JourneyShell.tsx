import Link from "next/link";
import type { ReactNode } from "react";

import AthlentraMark from "@/components/design-system/AthlentraMark";
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
    <main className="ath-app-canvas min-h-screen text-slate-950">
      <header className="sticky top-0 z-50 border-b border-[#dce5df]/80 bg-white/88 backdrop-blur-xl">
        <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-3 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6 sm:px-8`}>
          <AthlentraMark />
          {current !== "auth" ? <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/feedback" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 sm:inline">Give feedback</Link>
            <Link href="/support" className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 md:inline">Help</Link>
            <Link href="/settings" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950">Account</Link>
          </div> : <div className="flex items-center gap-4 text-sm"><Link href="/privacy" className="text-slate-600 hover:text-slate-950">Privacy</Link><Link href="/terms" className="text-slate-600 hover:text-slate-950">Terms</Link></div>}
        </div>
        {showProgress ? (
          <div className={`mx-auto ${maxWidth} px-5 pb-4 sm:px-8`}>
            <JourneyProgress current={current} />
          </div>
        ) : null}
      </header>
      <div className={`mx-auto ${maxWidth} px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-14`}>{children}</div>
    </main>
  );
}
