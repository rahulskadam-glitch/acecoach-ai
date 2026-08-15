import { NextResponse } from "next/server";

import { sendReminderEmail, type ReminderTriggerType } from "@/lib/notifications/email";
import {
  filterAlreadyNotified,
  findCheckinNudgeCandidates,
  findReassessmentDueCandidates,
  recordNotificationSent,
  type ReminderCandidate,
} from "@/lib/notifications/reminders";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runPass(
  supabase: ReturnType<typeof createAdminClient>,
  triggerType: ReminderTriggerType,
  candidates: ReminderCandidate[],
  now: Date,
) {
  const eligible = await filterAlreadyNotified(supabase, candidates, triggerType, now);
  let sent = 0;
  const skipped = candidates.length - eligible.length;
  let failed = 0;

  for (const candidate of eligible) {
    try {
      const result = await sendReminderEmail(triggerType, {
        userId: candidate.userId,
        to: candidate.email,
        firstName: candidate.firstName,
        primaryGoal: candidate.primaryGoal,
        sportId: candidate.sportId,
        actionType: candidate.actionType,
      });

      if (!result.ok) {
        failed += 1;
        continue;
      }

      await recordNotificationSent(supabase, candidate, triggerType, result.id);
      sent += 1;
    } catch {
      // A single bad address or transient error shouldn't abort the batch.
      failed += 1;
    }
  }

  return { sent, skipped, failed };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const [reassessmentCandidates, checkinCandidates] = await Promise.all([
    findReassessmentDueCandidates(supabase, now),
    findCheckinNudgeCandidates(supabase, now),
  ]);

  const [reassessmentResult, checkinResult] = await Promise.all([
    runPass(supabase, "reassessment_due", reassessmentCandidates, now),
    runPass(supabase, "checkin_nudge", checkinCandidates, now),
  ]);

  return NextResponse.json({
    ok: true,
    results: {
      reassessment_due: reassessmentResult,
      checkin_nudge: checkinResult,
    },
  });
}
