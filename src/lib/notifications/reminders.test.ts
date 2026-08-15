import { describe, expect, it } from "vitest";

import { CHECKIN_STALE_DAYS, NOTIFICATION_COOLDOWN_DAYS, cooldownCutoff, isCheckinStale } from "@/lib/notifications/reminders";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isCheckinStale", () => {
  const now = new Date("2026-08-15T13:00:00.000Z");

  it("treats activity older than the stale window as stale", () => {
    const lastActivity = new Date(now.getTime() - (CHECKIN_STALE_DAYS * DAY_MS + 1)).toISOString();
    expect(isCheckinStale(lastActivity, now)).toBe(true);
  });

  it("treats activity exactly at the stale boundary as not yet stale", () => {
    const lastActivity = new Date(now.getTime() - CHECKIN_STALE_DAYS * DAY_MS).toISOString();
    expect(isCheckinStale(lastActivity, now)).toBe(false);
  });

  it("treats recent activity as not stale", () => {
    const lastActivity = new Date(now.getTime() - DAY_MS).toISOString();
    expect(isCheckinStale(lastActivity, now)).toBe(false);
  });
});

describe("cooldownCutoff", () => {
  it("computes a cutoff N days before now", () => {
    const now = new Date("2026-08-15T13:00:00.000Z");
    const cutoff = cooldownCutoff(now);
    expect(now.getTime() - cutoff.getTime()).toBe(NOTIFICATION_COOLDOWN_DAYS * DAY_MS);
  });
});
