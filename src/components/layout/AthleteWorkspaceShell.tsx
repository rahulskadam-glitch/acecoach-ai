import type { ReactNode } from "react";

import GlobalNavigationBar from "@/components/layout/GlobalNavigationBar";

export default function AthleteWorkspaceShell({
  children,
  maxWidth = "max-w-7xl",
  backHref,
  backLabel,
}: {
  children: ReactNode;
  maxWidth?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex flex-col">
      <GlobalNavigationBar backHref={backHref} backLabel={backLabel} maxWidth={maxWidth} />
      <main className={`mx-auto w-full ${maxWidth} flex-1 px-4 py-6 sm:px-6 lg:px-8`}>
        {children}
      </main>
    </div>
  );
}
