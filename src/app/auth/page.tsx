import { redirect } from "next/navigation";

import AuthExperience from "@/features/authentication/presentation/AuthExperience";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { getSport } from "@/lib/sports";
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

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ sport?: string; next?: string; message?: string; error?: string }> }) {
  const params = await searchParams;
  const sport = getSport(params.sport);
  const next = safeNext(params.next);
  const { user } = await getAuthenticatedUser();
  if (user) redirect(`${next}?sport=${encodeURIComponent(sport.id)}`);
  const enabled = new Set((process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  const providers = PROVIDERS.filter((provider) => enabled.has(provider.id) || (provider.id === "azure" && enabled.has("microsoft")));
  return <JourneyShell current="auth"><AuthExperience sportName={sport.name} sportId={sport.id} next={next} providers={providers} message={params.message ?? params.error ?? null} /></JourneyShell>;
}
