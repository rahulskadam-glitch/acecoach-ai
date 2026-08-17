import { MessageSquareHeart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import AthlentraMark from "@/components/design-system/AthlentraMark";
import MobileTabBar from "@/components/dashboard/MobileTabBar";
import type { JourneyStep } from "../domain/athlete-journey";
import JourneyProgress from "./JourneyProgress";

// The stepper communicates "where am I in this linear flow" — useful while
// actively moving through sport/auth/upload/analyze, meaningless once you've
// arrived at a destination you'll revisit (report/coach), where the primary
// app tab bar (Home/Analyze/Videos/Practice/Progress) is what's actually
// useful instead.
const STEPPER_STEPS: readonly JourneyStep[] = ["sport", "auth", "upload", "analyze"];
const TAB_BAR_STEPS: readonly JourneyStep[] = ["report", "coach"];

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
  // An explicit showProgress={false} also opts out of the tab bar — used by
  // unauthenticated demo/preview renders of report and coach, where the tab
  // bar's destinations (Library, Practice, Progress) aren't reachable yet.
  const showTabBar = TAB_BAR_STEPS.includes(current) && showProgress !== false;

  return (
    <main className="ath-app-canvas min-h-screen text-slate-950">
      <header className="sticky top-0 z-50 border-b border-[#dce5df]/80 bg-white/88 backdrop-blur-xl">
        <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-3 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6 sm:px-8`}>
          <AthlentraMark />
          {current !== "auth" ? <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/feedback" aria-label="Give feedback" className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-ath-navy hover:bg-ath-lime/15 sm:px-3">
              <MessageSquareHeart className="h-4 w-4" />
              <span className="hidden sm:inline">Give feedback</span>
            </Link>
            <Link href="/support" className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 md:inline">Help</Link>
            <Link href="/settings" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950">Account</Link>
          </div> : <div className="flex items-center gap-4 text-sm"><Link href="/privacy" className="text-slate-600 hover:text-slate-950">Privacy</Link><Link href="/terms" className="text-slate-600 hover:text-slate-950">Terms</Link></div>}
        </div>
        {showStepper ? (
          <div className={`mx-auto ${maxWidth} px-5 pb-4 sm:px-8`}>
            <JourneyProgress current={current} />
          </div>
        ) : null}
      </header>
      <div className={`mx-auto ${maxWidth} px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-14 ${showTabBar ? "pb-24 lg:pb-[max(2rem,env(safe-area-inset-bottom))]" : ""}`}>{children}</div>
      {showTabBar ? <MobileTabBar /> : null}
    </main>
  );
}
