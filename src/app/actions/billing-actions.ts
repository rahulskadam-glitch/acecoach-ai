"use server";

import { revalidatePath } from "next/cache";
import { COUNTRY_PRICING, type CountryCode } from "@/features/billing/domain/currencies";
import { createClient, requireUser } from "@/lib/supabase/server";

export type BillingPlanId = "free_trial" | "single_video" | "pro_monthly";

export type UserBillingState = {
  planId: BillingPlanId;
  planName: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  freeVideosUsed: number;
  freeVideosLimit: number;
  singleVideoCredits: number;
  isUnlimited: boolean;
  countryCode: CountryCode;
  currencySymbol: string;
  activeSince: string;
};

const DEFAULT_FREE_LIMIT = 5;

export async function getUserBillingState(): Promise<UserBillingState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", user.id)
    .maybeSingle();

  // Count videos analyzed by user
  const { count: videoCount } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const trialEnd = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days trial
  const isTrial = Date.now() < trialEnd.getTime();
  const usedVideos = videoCount ?? 0;

  return {
    planId: "free_trial",
    planName: isTrial ? "Starter Free Trial" : "Free Athlete",
    isTrial,
    trialEndsAt: trialEnd.toISOString(),
    freeVideosUsed: usedVideos,
    freeVideosLimit: DEFAULT_FREE_LIMIT,
    singleVideoCredits: 0,
    isUnlimited: false,
    countryCode: "US",
    currencySymbol: "$",
    activeSince: createdAt.toISOString(),
  };
}

export async function checkoutPlanAction(payload: {
  planId: "free_trial" | "single_video" | "pro";
  countryCode: CountryCode;
}): Promise<{ success: boolean; message: string; redirectUrl: string }> {
  const user = await requireUser();
  const pricing = COUNTRY_PRICING[payload.countryCode] || COUNTRY_PRICING.US;

  if (payload.planId === "free_trial") {
    revalidatePath("/pricing");
    revalidatePath("/start");
    return {
      success: true,
      message: `Your 1st Month Free Trial (up to ${DEFAULT_FREE_LIMIT} video analyses) is active!`,
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
    message: `Pro Athlete (${formattedPrice}/mo) activated! Up to 10 video audits/month unlocked.`,
    redirectUrl: "/dashboard",
  };
}
