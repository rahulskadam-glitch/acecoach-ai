"use server";

import { revalidatePath } from "next/cache";

import type { CoachingReference } from "@/features/coaching-conversation";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadGroundedContext(sessionId: string, userId: string) {
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("analysis_sessions")
    .select("id, sport_id, action_type, analysis_action_type, status, analysis_reports(coach_summary, priorities, drills, next_session, coaching_playbook, limitations, quality_gate, movement_classification, knowledge_control)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error || !session) throw new Error(error?.message ?? "Analysis session not found.");
  if (session.status !== "completed") throw new Error("The coaching conversation becomes available after the report is complete.");
  const raw = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
  if (!raw) throw new Error("The report is not available.");
  const control = isRecord(raw.knowledge_control) ? raw.knowledge_control : null;
  const domains = control && isRecord(control.domains) ? control.domains : null;
  const recommendation = domains && isRecord(domains.recommendations) ? domains.recommendations : null;
  if (control?.status !== "CONTROLLED" || recommendation?.authorized !== true || recommendation.decision !== "ontology_fault_links") {
    throw new Error("No knowledge-authorized technical correction is available for this report.");
  }
  const coach = (raw.coach_summary ?? {}) as Record<string, unknown>;
  const priority = firstArrayItem(raw.priorities);
  const drill = firstArrayItem(raw.drills);
  if (!priority || typeof priority.faultId !== "string" || !drill || typeof drill.ontologyVersion !== "string") {
    throw new Error("The report does not contain a fully traced coaching recommendation.");
  }
  const next = (raw.next_session ?? {}) as Record<string, unknown>;
  const playbook = (raw.coaching_playbook ?? {}) as Record<string, unknown>;
  const movement = (raw.movement_classification ?? {}) as Record<string, unknown>;
  const sport = getSport(session.sport_id);
  return {
    admin,
    knowledgePolicyVersion: text(control.policyVersion, "unknown"),
    knowledgeManifestHash: text(control.manifestHash, "unknown"),
    ontologyVersion: text(control.ontologyVersion, "unknown"),
    faultId: text(priority.faultId, "unknown"),
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
    return { message: "Stop the session if you have pain, dizziness, numbness, swelling, or unusual discomfort. Athlentra cannot diagnose an injury or prescribe treatment. Please speak with a qualified medical professional before continuing. I can still explain the non-medical technique finding in your report.", references: [{ type: "limitation", label: "Health signal — training advice paused" }] };
  }
  if (/force|exact speed|ball speed|racket face|percentile|professional equivalence|3d/.test(lower)) {
    return { message: context.limitations[0] ?? "That measurement is not available in this report.", references: [{ type: "limitation", label: "Report measurement boundary" }] };
  }
  if (/show|exact moment|where|frame|timestamp/.test(lower)) {
    if (context.primaryTimestamp !== null) {
      references.push({ type: "timestamp", label: "Primary correction", value: context.primaryTimestamp });
      return { message: `The report links this finding to ${context.primaryTimestamp.toFixed(2)} seconds. The stored priority is: ${context.mainPriority}`, references };
    }
    return { message: `The report did not produce a reliable single timestamp for this correction. Review the relevant phase in Watch and Compare. The verified priority is: ${context.mainPriority}`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
  }
  if (/why|matter|important|benefit/.test(lower)) {
    return { message: context.whyItMatters, references: [{ type: "finding", label: "Why it matters", value: context.whyItMatters }] };
  }
  if (/practi[cs]e|drill|session|repetition|rep|train/.test(lower)) {
    if (context.drillName) {
      return { message: `${context.drillName}: ${context.drillPurpose} ${context.drillDosage}. Cue: “${context.drillCue}”`, references: [{ type: "drill", label: context.drillName, value: context.drillDosage }] };
    }
    return { message: `Use the report cue: “${context.cue}”. Success is: ${context.successTarget}`, references: [{ type: "finding", label: "Coaching cue", value: context.cue }] };
  }
  if (/mistake|avoid|wrong/.test(lower)) {
    return { message: `Focus on the stored priority: ${context.mainPriority}. Use the stored cue: “${context.cue}”`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
  }
  if (/level|beginner|advanced|appropriate/.test(lower)) {
    return { message: `This report's authorized focus is: ${context.mainPriority}. Cue: “${context.cue}”`, references: [{ type: "finding", label: "Report target", value: context.mainPriority }] };
  }
  if (/professional|pro player|elite|compare|comparison|difference/.test(lower)) {
    return { message: "No released professional or elite comparison is available in this report. " + context.mainPriority, references: [{ type: "finding", label: "Authorized report finding", value: context.mainPriority }] };
  }
  if (/record|reassess|again|when/.test(lower)) {
    return { message: context.recordingPlan, references: [{ type: "phase", label: "Reassessment plan", value: context.recordingPlan }] };
  }
  if (/simple|explain|priority|first|summary/.test(lower)) {
    return { message: `Your first priority is: ${context.mainPriority} Why: ${context.whyItMatters} Remember one cue: “${context.cue}” Success looks like: ${context.successTarget}`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
  }
  return { message: `Report priority: ${context.mainPriority} Cue: “${context.cue}” Why: ${context.whyItMatters}`, references: [{ type: "finding", label: "Primary correction", value: context.mainPriority }] };
}

export async function sendCoachingMessage(sessionId: string, rawMessage: string) {
  const user = await requireUser();
  const message = cleanMessage(rawMessage);
  if (!message) throw new Error("Write a coaching question first.");
  const context = await loadGroundedContext(sessionId, user.id);
  const { admin } = context;
  const reply = buildReply(message, context);
  const conversationResult = await admin.from("coaching_conversations").select("id").eq("analysis_session_id", sessionId).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (conversationResult.error) throw new Error(conversationResult.error.message);
  let conversation = conversationResult.data;
  if (!conversation) {
    const { data, error } = await admin.from("coaching_conversations").insert({ user_id: user.id, analysis_session_id: sessionId, status: "active", coaching_context_version: `knowledge-controlled:${context.knowledgePolicyVersion}:${context.knowledgeManifestHash}` }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Unable to create the coaching conversation.");
    conversation = data;
  }
  const messageManifest = { mode: "knowledge-controlled-stored-report", policyVersion: context.knowledgePolicyVersion, manifestHash: context.knowledgeManifestHash, ontologyVersion: context.ontologyVersion, faultId: context.faultId };
  const { data: userMessage, error: userError } = await admin.from("coaching_messages").insert({ conversation_id: conversation.id, user_id: user.id, role: "user", message, structured_references: [], model_manifest: messageManifest, moderation_status: "accepted" }).select("id, created_at").single();
  if (userError || !userMessage) throw new Error(userError?.message ?? "Unable to save your question.");
  const { data: assistant, error: assistantError } = await admin.from("coaching_messages").insert({ conversation_id: conversation.id, user_id: user.id, role: "assistant", message: reply.message, structured_references: reply.references, model_manifest: messageManifest, moderation_status: "accepted" }).select("id, created_at").single();
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
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Coaching message not found.");
  revalidatePath(`/coach/${sessionId}`);
}
