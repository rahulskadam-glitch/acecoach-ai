import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import VideoLibrary from "@/components/library/VideoLibrary";
import { getUserVideoLibrary, requireUser } from "@/lib/supabase/server";

export default async function LibraryPage() {
  const user = await requireUser();
  const { items, error } = await getUserVideoLibrary(user.id);
  return (
    <AthleteWorkspaceShell>
      <div>{error ? <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-200">{error}</div> : null}<VideoLibrary items={items} /></div>
    </AthleteWorkspaceShell>
  );
}
