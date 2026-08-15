import { redirect } from "next/navigation";

import AuthExperience from "@/features/authentication/presentation/AuthExperience";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { getSport } from "@/lib/sports";
import { getAvailableAuthProviders } from "@/lib/supabase/auth-providers";
import { getAuthenticatedUser } from "@/lib/supabase/server";

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/start";
  return value;
}

const PROVIDERS = [
  { id: "google" as const, label: "Google", monogram: "G" },
  { id: "apple" as const, label: "Apple", monogram: "A" },
  { id: "azure" as const, label: "Microsoft", monogram: "M" },
  { id: "facebook" as const, label: "Facebook", monogram: "f" },
];

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ sport?: string; next?: string; message?: string; error?: string; mode?: string }> }) {
  const params = await searchParams;
  const sport = getSport(params.sport);
  const next = safeNext(params.next);
  const { user } = await getAuthenticatedUser();
  if (user) redirect(`${next}${next.includes("?") ? "&" : "?"}sport=${encodeURIComponent(sport.id)}`);
  const available = new Set(await getAvailableAuthProviders());
  const providers = PROVIDERS.filter((provider) => available.has(provider.id));
  return <JourneyShell current="auth" showProgress={false}><AuthExperience sportName={sport.name} sportId={sport.id} next={next} providers={providers} initialMode={params.mode === "signup" ? "signup" : "signin"} message={params.message ?? params.error ?? null} /></JourneyShell>;
}
