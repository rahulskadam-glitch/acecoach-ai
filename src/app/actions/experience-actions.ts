"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createAdminClient, requireUser } from "@/lib/supabase/server";

function clampRating(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  const text = value?.toString().trim() ?? "";
  return text ? text.slice(0, maxLength) : null;
}

export async function saveAnalysisFeedback(sessionId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const movementAccuracy = formData.get("movementAccuracy")?.toString();
  if (!movementAccuracy || !["accurate", "incorrect", "unsure"].includes(movementAccuracy)) {
    throw new Error("Choose whether the detected movement was accurate.");
  }

  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) throw new Error(sessionError?.message ?? "Analysis session not found.");

  const { error } = await supabase.from("analysis_feedback").upsert(
    {
      user_id: user.id,
      session_id: sessionId,
      movement_accuracy: movementAccuracy,
      coaching_clarity: clampRating(formData.get("coachingClarity")),
      drill_relevance: clampRating(formData.get("drillRelevance")),
      report_usefulness: clampRating(formData.get("reportUsefulness")),
      visual_clarity: clampRating(formData.get("visualClarity")),
      reference_helpfulness: clampRating(formData.get("referenceHelpfulness")),
      priority_fit: clampRating(formData.get("priorityFit")),
      issue_category: cleanText(formData.get("issueCategory"), 80),
      comment: cleanText(formData.get("comment"), 2000),
    },
    { onConflict: "user_id,session_id" },
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/analysis/${sessionId}`);
}

export async function savePracticeCheckin(planId: string, sessionItemId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: plan, error: planError } = await supabase
    .from("practice_plans")
    .select("id, session_id, plan")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) throw new Error(planError?.message ?? "Practice plan not found.");
  const sessions = Array.isArray(plan.plan?.sessions) ? plan.plan.sessions : [];
  if (!sessions.some((item: { id?: string }) => item.id === sessionItemId)) {
    throw new Error("Practice session not found.");
  }

  const attempts = Number(formData.get("attempts") ?? 0);
  const targetHits = Number(formData.get("targetHits") ?? 0);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 500 || !Number.isInteger(targetHits) || targetHits < 0 || targetHits > attempts) {
    throw new Error("Enter a valid number of successful attempts.");
  }
  if (formData.get("discomfort") === "yes") {
    throw new Error("Stop this session if you have pain or unusual discomfort. Speak with a qualified medical professional before continuing.");
  }

  const effort = formData.get("effort")?.toString() ?? null;
  if (effort && !["easy", "just_right", "hard"].includes(effort)) throw new Error("Invalid effort rating.");

  const { error } = await supabase.from("practice_checkins").insert({
    user_id: user.id,
    plan_id: planId,
    session_item_id: sessionItemId,
    target_hits: targetHits,
    attempts,
    effort,
    confidence_before: clampRating(formData.get("confidenceBefore")),
    confidence_after: clampRating(formData.get("confidenceAfter")),
    note: cleanText(formData.get("note"), 1000),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/analysis/${plan.session_id}`);
  revalidatePath("/dashboard");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCoachShare(sessionId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("analysis_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) throw new Error(sessionError?.message ?? "Analysis session not found.");
  if (session.status !== "completed") throw new Error("Only completed reports can be shared.");

  const { error: revokeError } = await supabase
    .from("report_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .is("revoked_at", null);
  if (revokeError) throw new Error(revokeError.message);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("report_shares").insert({
    user_id: user.id,
    session_id: sessionId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return { url: `${baseUrl}/share/${token}`, expiresAt };
}

export async function revokeCoachShares(sessionId: string) {
  const user = await requireUser();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("report_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
  revalidatePath(`/analysis/${sessionId}`);
}
export async function saveProductFeedback(formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();
  const stage = cleanText(formData.get("stage"), 40);
  const category = cleanText(formData.get("category"), 60);
  const rating = clampRating(formData.get("rating"));
  const comment = cleanText(formData.get("comment"), 2000);
  const allowedStages = new Set(["capture", "processing", "report", "practice", "progress", "coach", "pricing"]);
  const allowedCategories = new Set(["reliability", "ease_of_use", "insight_clarity", "visuals", "drills", "speed", "missing_feature", "value", "other"]);
  if (!stage || !allowedStages.has(stage)) throw new Error("Choose a valid journey stage.");
  if (!category || !allowedCategories.has(category)) throw new Error("Choose a valid feedback category.");
  if (rating === null) throw new Error("Choose a usefulness rating.");
  if (!comment) throw new Error("Describe the feedback before submitting.");
  const { error } = await supabase.from("product_feedback").insert({
    user_id: user.id,
    stage,
    category,
    rating,
    comment,
    app_version: "3.2.0",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/feedback");
}
