export type SocialProviderId = "google" | "apple" | "azure" | "facebook";

type AuthSettings = { external?: Partial<Record<SocialProviderId, boolean>> };

export function configuredProviderIds(value: string | undefined): SocialProviderId[] {
  const aliases: Record<string, SocialProviderId> = { microsoft: "azure" };
  const supported = new Set<SocialProviderId>(["google", "apple", "azure", "facebook"]);
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .map((item) => aliases[item] ?? item)
        .filter((item): item is SocialProviderId => supported.has(item as SocialProviderId))
    )
  );
}

export function availableProviderIds(configured: SocialProviderId[], settings: AuthSettings | null): SocialProviderId[] {
  if (!settings?.external) return [];
  return configured.filter((provider) => settings.external?.[provider] === true);
}

export async function getAvailableAuthProviders(): Promise<SocialProviderId[]> {
  const configured = configuredProviderIds(process.env.NEXT_PUBLIC_AUTH_PROVIDERS);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || configured.length === 0) return configured;

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    }).catch(() => null);

    if (!response || !response.ok) {
      return configured;
    }
    const settings = (await response.json().catch(() => null)) as AuthSettings | null;
    return availableProviderIds(configured, settings);
  } catch {
    return configured;
  }
}
