import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";
import PlayerProfileForm from "@/components/profile/PlayerProfileForm";
import { createClient, requireUser } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: profile },
    { data: sportProfile },
    { data: physicalProfile },
    { data: consent },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, age, country, country_code, primary_sport_id, playing_level, dominant_hand, gender, goals, years_playing, training_sessions_per_week, competition_level")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_sports")
      .select("sport_id, playing_level, dominant_side, goals, years_playing, competition_level")
      .eq("profile_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
    supabase
      .from("physical_profiles")
      .select("height_cm, weight_kg, mobility_considerations")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("consents")
      .select("service_processing, derived_data_improvement, raw_media_training")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  const goals = Array.isArray(sportProfile?.goals) && sportProfile.goals.length > 0
    ? sportProfile.goals
    : Array.isArray(profile?.goals)
      ? profile.goals
      : [];

  const initialProfile = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    age: profile?.age ?? null,
    country: profile?.country ?? "",
    countryCode: profile?.country_code ?? "",
    primarySportId: sportProfile?.sport_id ?? profile?.primary_sport_id ?? "tennis",
    playingLevel: sportProfile?.playing_level ?? profile?.playing_level ?? "Beginner",
    dominantSide: sportProfile?.dominant_side ?? profile?.dominant_hand ?? "right",
    gender: profile?.gender ?? "neutral",
    primaryGoal: typeof goals[0] === "string" ? goals[0] : "",
    yearsPlaying: sportProfile?.years_playing ?? profile?.years_playing ?? null,
    trainingSessions: profile?.training_sessions_per_week ?? null,
    competitionLevel: sportProfile?.competition_level ?? profile?.competition_level ?? "",
    heightCm: physicalProfile?.height_cm === null || physicalProfile?.height_cm === undefined
      ? null
      : Number(physicalProfile.height_cm),
    weightKg: physicalProfile?.weight_kg === null || physicalProfile?.weight_kg === undefined
      ? null
      : Number(physicalProfile.weight_kg),
    mobilityConsiderations: physicalProfile?.mobility_considerations ?? "",
    serviceProcessing: consent?.service_processing === true,
    derivedDataImprovement: consent?.derived_data_improvement === true,
    rawMediaTraining: consent?.raw_media_training === true,
  };

  return (
    <AthleteWorkspaceShell>
      <section className="space-y-6">
        <WorkspacePageHeader eyebrow="Progressive athlete profile" title="Tell us only what materially improves your coaching" description="Essential athlete context is versioned with each analysis. Optional physical and model-improvement details can be added gradually and are never required for access." />
        <PlayerProfileForm initialProfile={initialProfile} />
      </section>
    </AthleteWorkspaceShell>
  );
}
