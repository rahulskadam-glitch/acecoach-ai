import PlayerProfileForm from "@/components/profile/PlayerProfileForm";
import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
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
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">Athlete profile</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Coaching that fits your game</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Essential context is versioned with each analysis. Optional details can be added gradually and are never required for access.</p></header>
        <PlayerProfileForm initialProfile={initialProfile} />
      </section>
    </AthleteWorkspaceShell>
  );
}
