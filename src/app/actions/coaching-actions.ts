"use server";

import { revalidatePath } from "next/cache";

import type { CoachingReference } from "@/features/coaching-conversation";
import {
  appendReportBackedCoachingExchange,
  flagReportBackedCoachingMessage,
  isCoachingSchemaUnavailable,
} from "@/lib/coaching-storage";
import { createAdminClient, requireUser } from "@/lib/supabase/server";
import { getSport } from "@/lib/sports";

function cleanMessage(value: string) {
  return value.normalize("NFKC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 1200);
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstArrayItem(value: unknown) {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null ? value[0] as Record<string, unknown> : null;
}

async function loadGroundedContext(sessionId: string, userId: string) {
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("analysis_sessions")
    .select("id, sport_id, action_type, analysis_action_type, status, analysis_reports(coach_summary, priorities, drills, next_session, coaching_playbook, limitations, quality_gate, movement_classification)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error || !session) throw new Error(error?.message ?? "Analysis session not found.");
  if (session.status !== "completed") throw new Error("The coaching conversation becomes available after the report is complete.");
  const raw = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
  if (!raw) throw new Error("The report is not available.");
  const coach = (raw.coach_summary ?? {}) as Record<string, unknown>;
  const priority = firstArrayItem(raw.priorities);
  const drill = firstArrayItem(raw.drills);
  const next = (raw.next_session ?? {}) as Record<string, unknown>;
  const playbook = (raw.coaching_playbook ?? {}) as Record<string, unknown>;
  const movement = (raw.movement_classification ?? {}) as Record<string, unknown>;
  const sport = getSport(session.sport_id);
  return {
    admin,
    sportName: sport.name,
    movementName: text(movement.analysisActionLabel, sport.actions.find((item) => item.id === (session.analysis_action_type ?? session.action_type))?.label ?? "movement"),
    mainPriority: text(coach.mainPriority, text(priority?.title, "Focus on one reliable movement change.")),
    whyItMatters: text(coach.whyItMatters, text(priority?.impact, "This change supports more repeatable movement.")),
    cue: text(playbook.feelCue, text(priority?.cue, "Make one clear change at a time.")),
    successTarget: Array.isArray(next.successCriteria) && typeof next.successCriteria[0] === "string" ? next.successCriteria[0] : text(drill?.successMetric, "Repeat the movement with stable balance and the same cue."),
    primaryTimestamp: typeof priority?.timestampSeconds === "number" ? priority.timestampSeconds : null,
    drillName: drill ? text(drill.name, "Practice drill") : null,
    drillPurpose: drill ? text(drill.purpose, "Practise the primary correction in a controlled setting.") : null,
    drillDosage: drill ? text(drill.dosage, "Complete a small number of high-quality repetitions.") : null,
    drillCue: drill ? text(drill.cue, text(playbook.feelCue, "Use the report cue.")) : null,
    recordingPlan: text(next.recordingPlan, "Record again from the same camera position after two focused practice sessions."),
    limitations: Array.isArray(raw.limitations) ? raw.limitations.filter((item): item is string => typeof item === "string").slice(0, 10) : [],
  };
}

function buildReply(message: string, context: Awaited<ReturnType<typeof loadGroundedContext>>): { message: string; references: CoachingReference[] } {
  const lower = message.toLowerCase();
  const references: CoachingReference[] = [];
  if (/pain|injur|hurt|medical|diagnos|joint load|muscle activation|sore|ache|swollen|numb|tingl|dizz|concuss|exhaust|sharp|burning/.test(lower)) {
    return { message: "Stop the session if you have pain, dizziness, numbness, swelling, or unusual discomfort. AceCoach cannot diagnose an injury or prescribe treatment. Please speak with a qualified medical professional before continuing. I can still explain the non-medical technique finding in your report.", references: [{ type: "limitation", label: "Health signal — training advice paused" }] };
  }
  if (/force|exact speed|ball speed|racket face|percentile|professional equivalence|3d/.test(lower)) {
    return { message: "AceCoach cannot determine that reliably from this video. This report uses monocular video and clearly labelled movement proxies; it does not measure force, exact ball speed, precise 3D motion, or professional equivalence.", references: [{ type: "limitation", label: "Unsupported measurement" }] };
  }
  if (/show|exact moment|where|frame|timestamp/.test(lower)) {
    if (context.primaryTimestamp !== null) {
      references.push({ type: "timestamp", label: "Primary correction", value: context.primaryTimestamp });
      return { message: `The clearest evidence appears around ${context.primaryTimestamp.toFixed(2)} seconds. Open the report at that moment and compare the preparation, body position, and movement path with the next-target reference. The point to notice is: ${context.mainPriority}`, references };
    }
    return { message: `The report did not produce a reliable single timestamp for this correction. Review the relevant phase in Watch and Compare. The verified priority is: ${context.mainPriority}`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
  }
  if (/why|matter|important|benefit/.test(lower)) {
    return { message: `${context.whyItMatters} Keep the change small and preserve the strongest parts of your current movement rather than rebuilding everything at once.`, references: [{ type: "finding", label: "Why it matters", value: context.whyItMatters }] };
  }
  if (/practi[cs]e|drill|session|repetition|rep|train/.test(lower)) {
    if (context.drillName) {
      return { message: `Start with ${context.drillName}. ${context.drillPurpose} Do ${context.drillDosage}. Use one cue only: “${context.drillCue}” Stop the set when the movement becomes rushed or inconsistent.`, references: [{ type: "drill", label: context.drillName, value: context.drillDosage }] };
    }
    return { message: `Practise the correction slowly first, using the cue “${context.cue}”. Keep the volume modest and prioritize clean repetitions.`, references: [{ type: "finding", label: "Coaching cue", value: context.cue }] };
  }
  if (/mistake|avoid|wrong/.test(lower)) {
    return { message: `The main mistake to avoid is trying to fix several details at once. Focus on: ${context.mainPriority} Use “${context.cue}” and stop the repetition if you lose balance or rush the movement.`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
  }
  if (/level|beginner|advanced|appropriate/.test(lower)) {
    return { message: `The next-target reference is intended as a development step, not a demand to copy an elite athlete. For your current report, the appropriate focus remains: ${context.mainPriority} The best-in-class view is an organizing principle, not a universal body position.`, references: [{ type: "finding", label: "Level-appropriate target", value: context.mainPriority }] };
  }
  if (/professional|pro player|elite|compare|comparison|difference/.test(lower)) {
    const moment = context.primaryTimestamp !== null ? ` Look around ${context.primaryTimestamp.toFixed(2)} seconds in your video.` : "";
    return { message: `Do not try to copy a professional player's exact body position. The useful difference for you is simpler: ${context.mainPriority}${moment} Use the cue “${context.cue}”. The reference shows a movement principle, not a professional-equivalence score.`, references: [{ type: "finding", label: "Level-appropriate difference", value: context.mainPriority }] };
  }
  if (/record|reassess|again|when/.test(lower)) {
    return { message: `${context.recordingPlan} Keep the sport, movement, handedness, camera angle, and capture quality as similar as possible so the sessions are comparable.`, references: [{ type: "phase", label: "Reassessment plan", value: context.recordingPlan }] };
  }
  if (/simple|explain|priority|first|summary/.test(lower)) {
    return { message: `Your first priority is: ${context.mainPriority} Why: ${context.whyItMatters} Remember one cue: “${context.cue}” Success looks like: ${context.successTarget}`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
  }
  return { message: `Based on this report, keep the conversation anchored to one change: ${context.mainPriority} Use the cue “${context.cue}”. ${context.whyItMatters} Ask me to show the exact moment, explain why it matters, or explain your current practice session.`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
}

export async function sendCoachingMessage(sessionId: string, rawMessage: string) {
  const user = await requireUser();
  const message = cleanMessage(rawMessage);
  if (!message) throw new Error("Write a coaching question first.");
  const context = await loadGroundedContext(sessionId, user.id);
  const { admin } = context;
  const reply = buildReply(message, context);
  const persistToReport = async () => {
    const result = await appendReportBackedCoachingExchange(admin, sessionId, user.id, message, reply.message, reply.references);
    revalidatePath(`/coach/${sessionId}`);
    return result;
  };
  const conversationResult = await admin.from("coaching_conversations").select("id").eq("analysis_session_id", sessionId).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (isCoachingSchemaUnavailable(conversationResult.error)) return persistToReport();
  if (conversationResult.error) throw new Error(conversationResult.error.message);
  let conversation = conversationResult.data;
  if (!conversation) {
    const { data, error } = await admin.from("coaching_conversations").insert({ user_id: user.id, analysis_session_id: sessionId, status: "active", coaching_context_version: "report-grounded-v1" }).select("id").single();
    if (isCoachingSchemaUnavailable(error)) return persistToReport();
    if (error || !data) throw new Error(error?.message ?? "Unable to create the coaching conversation.");
    conversation = data;
  }
  const { data: userMessage, error: userError } = await admin.from("coaching_messages").insert({ conversation_id: conversation.id, user_id: user.id, role: "user", message, structured_references: [], model_manifest: { mode: "deterministic-grounded-fallback", version: "v6.0.0" }, moderation_status: "accepted" }).select("id, created_at").single();
  if (isCoachingSchemaUnavailable(userError)) return persistToReport();
  if (userError || !userMessage) throw new Error(userError?.message ?? "Unable to save your question.");
  const { data: assistant, error: assistantError } = await admin.from("coaching_messages").insert({ conversation_id: conversation.id, user_id: user.id, role: "assistant", message: reply.message, structured_references: reply.references, model_manifest: { mode: "deterministic-grounded-fallback", version: "v6.0.0", source: "stored-report-only" }, moderation_status: "accepted" }).select("id, created_at").single();
  if (isCoachingSchemaUnavailable(assistantError)) return persistToReport();
  if (assistantError || !assistant) throw new Error(assistantError?.message ?? "Unable to save the coaching response.");
  await admin.from("coaching_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id).eq("user_id", user.id);
  revalidatePath(`/coach/${sessionId}`);
  return {
    userMessage: { id: userMessage.id, role: "user" as const, message, references: [], createdAt: userMessage.created_at },
    assistantMessage: { id: assistant.id, role: "assistant" as const, message: reply.message, references: reply.references, createdAt: assistant.created_at },
  };
}

export async function flagCoachingMessage(sessionId: string, messageId: string) {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin.from("coaching_messages").update({ moderation_status: "flagged" }).eq("id", messageId).eq("user_id", user.id).select("id").maybeSingle();
  if (isCoachingSchemaUnavailable(error) || (!error && !data)) {
    await flagReportBackedCoachingMessage(admin, sessionId, user.id, messageId);
    revalidatePath(`/coach/${sessionId}`);
    return;
  }
  if (error) throw new Error(error.message);
  revalidatePath(`/coach/${sessionId}`);
}
