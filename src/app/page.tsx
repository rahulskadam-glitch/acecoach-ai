import SportSelectionLanding from "@/features/sport-selection/presentation/SportSelectionLanding";
import { supportedSports } from "@/lib/sports";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const { user } = await getAuthenticatedUser();
  return <SportSelectionLanding sports={supportedSports} authenticated={Boolean(user)} />;
}
