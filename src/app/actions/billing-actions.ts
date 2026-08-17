"use server";

import { revalidatePath } from "next/cache";
import { COUNTRY_PRICING, type CountryCode } from "@/features/billing/domain/currencies";
import { PLAN_ENTITLEMENTS } from "@/features/billing/domain/entitlements";
import { requireUser } from "@/lib/supabase/server";

const FREE_VIDEO_LIMIT = PLAN_ENTITLEMENTS.find((plan) => plan.id === "free")!.videoLimit;
const PRO_VIDEO_LIMIT = PLAN_ENTITLEMENTS.find((plan) => plan.id === "pro")!.videoLimit;

export async function checkoutPlanAction(payload: {
  planId: "free_trial" | "single_video" | "pro";
  countryCode: CountryCode;
}): Promise<{ success: boolean; message: string; redirectUrl: string }> {
  await requireUser();
  const pricing = COUNTRY_PRICING[payload.countryCode] || COUNTRY_PRICING.US;

  if (payload.planId === "free_trial") {
    revalidatePath("/pricing");
    revalidatePath("/start");
    return {
      success: true,
      message: `Your 1st Month Free Trial (up to ${FREE_VIDEO_LIMIT} video analyses) is active!`,
      redirectUrl: "/start",
    };
  }

  if (payload.planId === "single_video") {
    const formattedPrice = pricing.singleVideo.formatted;
    revalidatePath("/pricing");
    revalidatePath("/start");
    return {
      success: true,
      message: `Single Video Pass (${formattedPrice}) activated! Ready for your stroke analysis.`,
      redirectUrl: "/start",
    };
  }

  const formattedPrice = pricing.proMonthly.formatted;
  revalidatePath("/pricing");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Pro Athlete (${formattedPrice}/mo) activated! Up to ${PRO_VIDEO_LIMIT} video audits/month unlocked.`,
    redirectUrl: "/dashboard",
  };
}
