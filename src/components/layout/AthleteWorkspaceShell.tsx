import type { ReactNode } from "react";

import Sidebar from "@/components/dashboard/Sidebar";

export default function AthleteWorkspaceShell({ children, maxWidth = "max-w-7xl" }: { children: ReactNode; maxWidth?: string }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#020617_100%)] px-4 py-4 text-white sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className={`mx-auto grid ${maxWidth} gap-6 lg:grid-cols-[270px_minmax(0,1fr)]`}>
        <Sidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
