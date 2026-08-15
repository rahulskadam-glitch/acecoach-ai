import type { ReactNode } from "react";

import Sidebar from "@/components/dashboard/Sidebar";

export default function AthleteWorkspaceShell({ children, maxWidth = "max-w-7xl" }: { children: ReactNode; maxWidth?: string }) {
  return (
    <main className="ath-app-canvas min-h-screen px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-slate-950 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className={`mx-auto grid ${maxWidth} gap-6 lg:grid-cols-[248px_minmax(0,1fr)]`}>
        <Sidebar />
        <div className="min-w-0 pb-20 lg:pb-0">{children}</div>
      </div>
    </main>
  );
}
