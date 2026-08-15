import { describe, expect, it } from "vitest";

import { availableProviderIds, configuredProviderIds } from "./auth-providers";

describe("authentication provider availability", () => {
  it("normalizes and deduplicates the configured allowlist", () => {
    expect(configuredProviderIds("google, apple, microsoft, google, unknown")).toEqual(["google", "apple", "azure"]);
  });

  it("shows only providers enabled in live Supabase settings", () => {
    expect(availableProviderIds(["google", "apple"], { external: { google: true, apple: false } })).toEqual(["google"]);
  });

  it("fails closed when live settings cannot be read", () => {
    expect(availableProviderIds(["google", "apple"], null)).toEqual([]);
  });
});
