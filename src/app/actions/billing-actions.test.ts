import { describe, expect, it, vi } from "vitest";
import { checkoutPlanAction } from "./billing-actions";

// Mock server auth and supabase
vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user_test_123", email: "player@athlentra.com" }),
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { created_at: new Date().toISOString() } }),
        }),
      }),
    }),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Billing Actions", () => {
  it("activates 1st month free trial with 5 video analyses", async () => {
    const res = await checkoutPlanAction({
      planId: "free_trial",
      countryCode: "US",
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/start");
    expect(res.message).toContain("1st Month Free Trial");
    expect(res.message).toContain("5 video analyses");
  });

  it("handles single video pass checkout for US ($1.99)", async () => {
    const res = await checkoutPlanAction({
      planId: "single_video",
      countryCode: "US",
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/start");
    expect(res.message).toContain("$1.99");
  });

  it("handles single video pass checkout for India (₹199, no discount)", async () => {
    const res = await checkoutPlanAction({
      planId: "single_video",
      countryCode: "IN",
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/start");
    expect(res.message).toContain("₹199");
  });

  it("handles Pro Monthly checkout for US ($9.99/mo)", async () => {
    const res = await checkoutPlanAction({
      planId: "pro",
      countryCode: "US",
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/dashboard");
    expect(res.message).toContain("$9.99/mo");
  });

  it("handles Pro Monthly checkout for India (₹999/mo, no discount)", async () => {
    const res = await checkoutPlanAction({
      planId: "pro",
      countryCode: "IN",
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/dashboard");
    expect(res.message).toContain("₹999/mo");
  });
});
