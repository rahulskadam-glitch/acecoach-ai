import { cookies } from "next/headers";

import { attachJourneyToUser } from "@/app/actions/journey-actions";
import StartExperience from "@/features/athlete-intake/presentation/StartExperience";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { getSport } from "@/lib/sports";
import { createClient, requireUser } from "@/lib/supabase/server";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const cookieStore = await cookies();
  const sport = getSport(params.sport ?? cookieStore.get("acecoach_selected_sport")?.value);
  await attachJourneyToUser().catch(() => null);
  const supabase = await createClient();
  const [{ data: profile }, { data: sportProfile }, { data: physicalProfile }] = await Promise.all([
    supabase.from("profiles").select("age_band, playing_level, dominant_hand, gender, goals").eq("id", user.id).maybeSingle(),
    supabase.from("profile_sports").select("playing_level, dominant_side, goals").eq("profile_id", user.id).eq("sport_id", sport.id).maybeSingle(),
    supabase.from("physical_profiles").select("height_cm").eq("profile_id", user.id).maybeSingle(),
  ]);
  const goals = Array.isArray(sportProfile?.goals) && sportProfile.goals.length ? sportProfile.goals : Array.isArray(profile?.goals) ? profile.goals : [];
  const initialProfile = {
    ageBand: profile?.age_band ?? "",
    playingLevel: sportProfile?.playing_level ?? profile?.playing_level ?? "",
    dominantSide: sportProfile?.dominant_side ?? profile?.dominant_hand ?? "right",
    primaryGoal: typeof goals[0] === "string" ? goals[0] : "",
    silhouettePreference: profile?.gender === "male" || profile?.gender === "female" ? profile.gender : "player-matched",
    heightCm: physicalProfile?.height_cm === null || physicalProfile?.height_cm === undefined ? null : Number(physicalProfile.height_cm),
  };
  return <JourneyShell current="upload"><StartExperience userId={user.id} sport={sport} initialProfile={initialProfile} /></JourneyShell>;
}
