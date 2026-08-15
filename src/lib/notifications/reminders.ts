import { createAdminClient } from "@/lib/supabase/server";
import type { ReminderTriggerType } from "@/lib/notifications/email";

type SupabaseClient = ReturnType<typeof createAdminClient>;

const CANDIDATE_LIMIT = 200;
export const CHECKIN_STALE_DAYS = 4;
export const NOTIFICATION_COOLDOWN_DAYS = 7;

export type ReminderCandidate = {
  userId: string;
  subjectId: string;
  email: string;
  firstName: string | null;
  sportId: string;
  actionType: string;
  primaryGoal: string | null;
};

type PlanRow = {
  id: string;
  user_id: string;
  sport_id: string;
  action_type: string;
  primary_goal: string | null;
  created_at: string;
  reassessment_due_at?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  reminder_emails_enabled: boolean;
};

// PostgREST can't embed profiles through practice_plans.user_id (both point
// at auth.users but there's no declared FK from profiles to practice_plans),
// so candidates and profiles are fetched separately and joined here.
async function attachProfiles(supabase: SupabaseClient, plans: PlanRow[]): Promise<ReminderCandidate[]> {
  if (plans.length === 0) return [];
  const userIds = [...new Set(plans.map((plan) => plan.user_id))];
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, reminder_emails_enabled")
    .in("id", userIds)
    .eq("reminder_emails_enabled", true);
  if (error) throw new Error(error.message);

  const profileById = new Map((profiles ?? []).map((profile: ProfileRow) => [profile.id, profile]));
  const candidates: ReminderCandidate[] = [];
  for (const plan of plans) {
    const profile = profileById.get(plan.user_id);
    if (!profile?.email) continue;
    candidates.push({
      userId: plan.user_id,
      subjectId: plan.id,
      email: profile.email,
      firstName: profile.first_name,
      sportId: plan.sport_id,
      actionType: plan.action_type,
      primaryGoal: plan.primary_goal,
    });
  }
  return candidates;
}

export async function findReassessmentDueCandidates(supabase: SupabaseClient, now: Date) {
  const { data, error } = await supabase
    .from("practice_plans")
    .select("id, user_id, sport_id, action_type, primary_goal, created_at, reassessment_due_at")
    .eq("status", "active")
    .not("reassessment_due_at", "is", null)
    .lt("reassessment_due_at", now.toISOString())
    .order("reassessment_due_at", { ascending: true })
    .limit(CANDIDATE_LIMIT);
  if (error) throw new Error(error.message);
  return attachProfiles(supabase, (data ?? []) as PlanRow[]);
}

export async function findCheckinNudgeCandidates(supabase: SupabaseClient, now: Date) {
  const { data: plans, error } = await supabase
    .from("practice_plans")
    .select("id, user_id, sport_id, action_type, primary_goal, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(CANDIDATE_LIMIT);
  if (error) throw new Error(error.message);

  const activePlans = (plans ?? []) as PlanRow[];
  if (activePlans.length === 0) return [];

  const { data: checkins, error: checkinError } = await supabase
    .from("practice_checkins")
    .select("plan_id, created_at")
    .in("plan_id", activePlans.map((plan) => plan.id))
    .order("created_at", { ascending: false });
  if (checkinError) throw new Error(checkinError.message);

  const latestCheckinByPlan = new Map<string, string>();
  for (const row of (checkins ?? []) as { plan_id: string; created_at: string }[]) {
    if (!latestCheckinByPlan.has(row.plan_id)) latestCheckinByPlan.set(row.plan_id, row.created_at);
  }

  const stalePlans = activePlans.filter((plan) => {
    const lastActivity = latestCheckinByPlan.get(plan.id) ?? plan.created_at;
    return isCheckinStale(lastActivity, now);
  });

  return attachProfiles(supabase, stalePlans);
}

// Exported for boundary-condition unit tests independent of the DB.
export function isCheckinStale(lastActivityIso: string, now: Date) {
  const staleCutoff = new Date(now.getTime() - CHECKIN_STALE_DAYS * 24 * 60 * 60 * 1000);
  return new Date(lastActivityIso) < staleCutoff;
}

export function cooldownCutoff(now: Date) {
  return new Date(now.getTime() - NOTIFICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

export async function filterAlreadyNotified(
  supabase: SupabaseClient,
  candidates: ReminderCandidate[],
  triggerType: ReminderTriggerType,
  now: Date,
) {
  if (candidates.length === 0) return [];
  const { data, error } = await supabase
    .from("notification_log")
    .select("user_id")
    .eq("trigger_type", triggerType)
    .in("user_id", [...new Set(candidates.map((candidate) => candidate.userId))])
    .gt("sent_at", cooldownCutoff(now).toISOString());
  if (error) throw new Error(error.message);

  const notified = new Set((data ?? []).map((row: { user_id: string }) => row.user_id));
  return candidates.filter((candidate) => !notified.has(candidate.userId));
}

export async function recordNotificationSent(
  supabase: SupabaseClient,
  candidate: ReminderCandidate,
  triggerType: ReminderTriggerType,
  providerMessageId: string | null,
) {
  const { error } = await supabase.from("notification_log").insert({
    user_id: candidate.userId,
    trigger_type: triggerType,
    subject_id: candidate.subjectId,
    provider_message_id: providerMessageId,
  });
  if (error) throw new Error(error.message);
}
