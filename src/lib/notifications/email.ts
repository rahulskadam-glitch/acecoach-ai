import { Resend } from "resend";

import { createUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

export type ReminderTriggerType = "reassessment_due" | "checkin_nudge";

export type ReminderEmailContext = {
  userId: string;
  to: string;
  firstName: string | null;
  primaryGoal: string | null;
  sportId: string;
  actionType: string;
};

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME ?? "Athlentra";
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function unsubscribeUrl(userId: string) {
  return `${appUrl()}/unsubscribe/${createUnsubscribeToken(userId)}`;
}

function greeting(firstName: string | null) {
  return firstName ? `Hey ${firstName},` : "Hey,";
}

function movementLabel(actionType: string) {
  return actionType.replaceAll("_", " ");
}

function emailShell(bodyHtml: string, unsubscribeHref: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0f172a;line-height:1.6;">
${bodyHtml}
<p style="margin-top:32px;font-size:12px;color:#64748b;">${appName()} · <a href="${unsubscribeHref}" style="color:#64748b;">Unsubscribe from reminder emails</a></p>
</div>`;
}

function reassessmentDueEmail(context: ReminderEmailContext) {
  const href = appUrl();
  const unsubscribeHref = unsubscribeUrl(context.userId);
  const focus = context.primaryGoal ?? `your ${movementLabel(context.actionType)}`;
  return {
    subject: "Your reassessment is ready",
    html: emailShell(
      `<p>${greeting(context.firstName)}</p>
<p>It's time to check your progress on <strong>${focus}</strong>. Record a fresh video and see how far you've come since your last analysis.</p>
<p><a href="${href}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;">Record your reassessment</a></p>`,
      unsubscribeHref,
    ),
    text: `${greeting(context.firstName)}\n\nIt's time to check your progress on ${focus}. Record a fresh video and see how far you've come since your last analysis.\n\n${href}\n\nUnsubscribe: ${unsubscribeHref}`,
  };
}

function checkinNudgeEmail(context: ReminderEmailContext) {
  const href = appUrl();
  const unsubscribeHref = unsubscribeUrl(context.userId);
  const focus = context.primaryGoal ?? `your ${movementLabel(context.actionType)}`;
  return {
    subject: "Your practice plan is waiting",
    html: emailShell(
      `<p>${greeting(context.firstName)}</p>
<p>You have an active practice plan for <strong>${focus}</strong> but haven't logged a session in a few days. A quick check-in keeps your progress on track.</p>
<p><a href="${href}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;">Log a practice session</a></p>`,
      unsubscribeHref,
    ),
    text: `${greeting(context.firstName)}\n\nYou have an active practice plan for ${focus} but haven't logged a session in a few days. A quick check-in keeps your progress on track.\n\n${href}\n\nUnsubscribe: ${unsubscribeHref}`,
  };
}

function templateFor(triggerType: ReminderTriggerType, context: ReminderEmailContext) {
  return triggerType === "reassessment_due" ? reassessmentDueEmail(context) : checkinNudgeEmail(context);
}

let client: Resend | null = null;
function resendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendReminderEmail(triggerType: ReminderTriggerType, context: ReminderEmailContext) {
  const from = process.env.REMINDER_EMAIL_FROM;
  if (!from) throw new Error("REMINDER_EMAIL_FROM is not configured.");

  const { subject, html, text } = templateFor(triggerType, context);
  const { data, error } = await resendClient().emails.send({
    from,
    to: context.to,
    subject,
    html,
    text,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data?.id ?? null };
}
