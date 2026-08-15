import type { ReactNode } from "react";

import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { createClient } from "@/lib/supabase/server";

/** Keep account-linked information inside the workspace while remaining public when linked from the landing page. */
export default async function ContextualPageShell({ children, maxWidth = "max-w-6xl" }: { children: ReactNode; maxWidth?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user
    ? <AthleteWorkspaceShell maxWidth={maxWidth}>{children}</AthleteWorkspaceShell>
    : <JourneyShell current="coach" showProgress={false} maxWidth={maxWidth}>{children}</JourneyShell>;
}
