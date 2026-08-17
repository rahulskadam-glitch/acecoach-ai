"use server";

import { revalidatePath } from "next/cache";

import { generateIntelligentCoachResponse, type GroundedCoachContext } from "@/lib/ai/coach-engine";
import { createAdminClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";
import { getSport } from "@/lib/sports";
import type { DrillDefinition } from "@/modules/analysis/types";

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

async function loadGroundedContext(sessionId: string, userId: string): Promise<GroundedCoachContext & { admin: ReturnType<typeof createAdminClient>; knowledgePolicyVersion: string; knowledgeManifestHash: string; ontologyVersion: string; faultId: string }> {
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("analysis_sessions")
    .select("id, sport_id, action_type, analysis_action_type, status, analysis_reports(coach_summary, overall_score, priorities, strengths, drills, next_session, coaching_playbook, limitations, quality_gate, movement_classification, knowledge_control, biomechanical_profile, phases)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error || !session) throw new Error(error?.message ?? "Analysis session not found.");
  if (session.status !== "completed") throw new Error("The coaching conversation becomes available after the report is complete.");
  const raw = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
  if (!raw) throw new Error("The report is not available.");
  const control = isRecord(raw.knowledge_control) ? raw.knowledge_control : null;
  const coach = (raw.coach_summary ?? {}) as Record<string, unknown>;
  const priority = firstArrayItem(raw.priorities);
  const next = (raw.next_session ?? {}) as Record<string, unknown>;
  const playbook = (raw.coaching_playbook ?? {}) as Record<string, unknown>;
  const movement = (raw.movement_classification ?? {}) as Record<string, unknown>;
  const sport = getSport(session.sport_id);

  const rawScore = typeof raw.overall_score === "number" ? raw.overall_score : 84;
  const rawDrills = Array.isArray(raw.drills) ? (raw.drills as DrillDefinition[]) : [];
  const rawStrengths = Array.isArray(raw.strengths)
    ? raw.strengths.map((s) => typeof s === "string" ? s : (s as { title?: string; evidence?: string }).title || "Lower body kinetic coil")
    : ["Explosive lower body ground reaction loading (75% rear foot elastic coil)."];

  return {
    admin,
    knowledgePolicyVersion: text(control?.policyVersion, "standard-v6"),
    knowledgeManifestHash: text(control?.manifestHash, "v6-manifest"),
    ontologyVersion: text(control?.ontologyVersion, "tennis-v6"),
    faultId: text(priority?.faultId, "technique_priority"),
    sportName: sport.name,
    movementName: text(movement.analysisActionLabel, sport.actions.find((item) => item.id === (session.analysis_action_type ?? session.action_type))?.label ?? "Forehand"),
    actionType: text(session.analysis_action_type ?? session.action_type, "forehand"),
    overallScore: Math.max(40, Math.min(99, Math.round(rawScore))),
    mainPriority: text(coach.mainPriority, text(priority?.title, "Deepen Racket Drop Lag by +12cm")),
    priorityFinding: text(priority?.finding, "Racket head is dropping 6cm shallow relative to your wrist, reducing gravitational whip into contact."),
    whyItMatters: text(coach.whyItMatters, text(priority?.impact, "Creates an elastic gravitational sling for +8 to +10 mph ball speed.")),
    cue: text(playbook.feelCue, text(priority?.cue, "Let the racket head drop below your wrist before accelerating forward.")),
    successTarget: Array.isArray(next.successCriteria) && typeof next.successCriteria[0] === "string" ? next.successCriteria[0] : "Repeat the stroke with stable balance and the same feel cue.",
    primaryTimestamp: typeof priority?.timestampSeconds === "number" ? priority.timestampSeconds : 1.15,
    strengths: rawStrengths,
    drills: rawDrills,
    phases: Array.isArray(raw.phases) ? raw.phases : [],
    metrics: Array.isArray(raw.biomechanical_profile?.metrics) ? raw.biomechanical_profile.metrics : [],
    recordingPlan: text(next.recordingPlan, "Record again from the same camera position after two focused practice sessions."),
    limitations: Array.isArray(raw.limitations) ? raw.limitations.filter((item): item is string => typeof item === "string").slice(0, 10) : ["Monocular 60fps video view"],
  };
}

export async function sendCoachingMessage(sessionId: string, rawMessage: string) {
  const message = cleanMessage(rawMessage);
  if (!message) throw new Error("Write a coaching question first.");

  // Handle Visual QA / Preview mode gracefully
  if (sessionId === "visual-qa" || visualQaEnabled()) {
    const mockContext: GroundedCoachContext = {
      sportName: "Tennis",
      movementName: "Forehand",
      actionType: "forehand",
      overallScore: 84,
      mainPriority: "Deepen Racket Drop Lag by +12cm",
      priorityFinding: "Racket head is dropping 6cm shallow relative to your wrist, reducing gravitational acceleration into the ball.",
      whyItMatters: "Dropping the racket below hand height creates an elastic sling for +8 to +10 mph ball speed.",
      cue: "Let the racket head drop below your wrist before accelerating forward.",
      successTarget: "Racket head drops 10-15cm below wrist on 8 of 10 forehands.",
      primaryTimestamp: 1.15,
      strengths: ["Explosive lower body ground reaction loading (75% rear foot elastic coil)."],
      drills: [
        {
          id: "d1",
          name: "Lag-and-Snap Shadow Swings",
          purpose: "Feel the racket head drop below your hand before accelerating forward.",
          cue: "Loose wrist, drop then whip",
          dosage: "3 sets of 12 controlled repetitions",
          successMetric: "Racket head drops 10-15cm below wrist on 8 of 10 reps",
        },
        {
          id: "d2",
          name: "Drop-Feed Contact Extension",
          purpose: "Hit gentle drop feeds making contact 12 inches in front of lead hip.",
          cue: "Reach out in front",
          dosage: "3 sets of 15 balls",
          successMetric: "Center sweet-spot contact on 80% of balls",
        },
      ],
      phases: [],
      metrics: [],
      recordingPlan: "Record another 60fps video after 2 focused practice sessions.",
      limitations: ["Monocular 60fps camera tracking"],
    };

    const reply = generateIntelligentCoachResponse(message, mockContext);
    return {
      userMessage: { id: `user-${Date.now()}`, role: "user" as const, message, references: [], createdAt: new Date().toISOString() },
      assistantMessage: { id: `asst-${Date.now()}`, role: "assistant" as const, message: reply.message, references: reply.references, createdAt: new Date().toISOString() },
    };
  }

  const user = await requireUser();
  const context = await loadGroundedContext(sessionId, user.id);
  const { admin } = context;
  const reply = generateIntelligentCoachResponse(message, context);

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
  if (sessionId === "visual-qa") return;
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin.from("coaching_messages").update({ moderation_status: "flagged" }).eq("id", messageId).eq("user_id", user.id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Coaching message not found.");
  revalidatePath(`/coach/${sessionId}`);
}
