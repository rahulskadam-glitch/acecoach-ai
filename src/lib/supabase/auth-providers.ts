export type SocialProviderId = "google" | "apple" | "azure" | "facebook";

type AuthSettings = { external?: Partial<Record<SocialProviderId, boolean>> };

export function configuredProviderIds(value: string | undefined): SocialProviderId[] {
  const aliases: Record<string, SocialProviderId> = { microsoft: "azure" };
  const supported = new Set<SocialProviderId>(["google", "apple", "azure", "facebook"]);
  return Array.from(new Set((value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).map((item) => aliases[item] ?? item).filter((item): item is SocialProviderId => supported.has(item as SocialProviderId))));
}

export function availableProviderIds(configured: SocialProviderId[], settings: AuthSettings | null) {
  if (!settings?.external) return [];
  return configured.filter((provider) => settings.external?.[provider] === true);
}

export async function getAvailableAuthProviders(): Promise<SocialProviderId[]> {
  const configured = configuredProviderIds(process.env.NEXT_PUBLIC_AUTH_PROVIDERS);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || configured.length === 0) return [];

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return [];
    return availableProviderIds(configured, await response.json() as AuthSettings);
  } catch {
    // Fail closed: email remains available, while broken provider buttons stay hidden.
    return [];
  }
}
