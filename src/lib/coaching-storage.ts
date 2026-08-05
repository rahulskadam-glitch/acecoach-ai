import "server-only";

import { randomUUID } from "node:crypto";

import type { CoachingMessage, CoachingReference } from "@/features/coaching-conversation";
import type { createAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminClient>;

const FALLBACK_STORAGE_KEY = "acecoachConversationV1";
const MAX_STORED_MESSAGES = 60;
const REFERENCE_TYPES = new Set<CoachingReference["type"]>([
  "finding",
  "phase",
  "timestamp",
  "drill",
  "limitation",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReference(value: unknown): CoachingReference | null {
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.label !== "string") return null;
  if (!REFERENCE_TYPES.has(value.type as CoachingReference["type"])) return null;
  const reference: CoachingReference = {
    type: value.type as CoachingReference["type"],
    label: value.label,
  };
  if (typeof value.value === "string" || typeof value.value === "number" || value.value === null) {
    reference.value = value.value;
  }
  return reference;
}

function parseMessage(value: unknown): CoachingMessage | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || (value.role !== "user" && value.role !== "assistant")) return null;
  if (typeof value.message !== "string" || typeof value.createdAt !== "string") return null;
  return {
    id: value.id,
    role: value.role,
    message: value.message,
    references: Array.isArray(value.references)
      ? value.references.map(parseReference).filter((item): item is CoachingReference => item !== null)
      : [],
    createdAt: value.createdAt,
    moderationStatus: typeof value.moderationStatus === "string" ? value.moderationStatus : null,
  };
}

export function isCoachingSchemaUnavailable(error: unknown) {
  if (!isRecord(error)) return false;
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  return code === "PGRST205"
    || (message.includes("schema cache")
      && (message.includes("coaching_conversations") || message.includes("coaching_messages")));
}

export function reportBackedCoachingMessages(playbook: unknown): CoachingMessage[] {
  if (!isRecord(playbook)) return [];
  const envelope = playbook[FALLBACK_STORAGE_KEY];
  if (!isRecord(envelope) || !Array.isArray(envelope.messages)) return [];
  return envelope.messages
    .map(parseMessage)
    .filter((item): item is CoachingMessage => item !== null)
    .slice(-MAX_STORED_MESSAGES);
}

async function loadReport(admin: AdminClient, sessionId: string, userId: string) {
  const { data, error } = await admin
    .from("analysis_reports")
    .select("id, coaching_playbook")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "The report is not available for coaching persistence.");
  return {
    id: data.id as string,
    playbook: isRecord(data.coaching_playbook) ? data.coaching_playbook : {},
  };
}

async function saveMessages(
  admin: AdminClient,
  report: Awaited<ReturnType<typeof loadReport>>,
  userId: string,
  messages: CoachingMessage[],
) {
  const coachingPlaybook = {
    ...report.playbook,
    [FALLBACK_STORAGE_KEY]: {
      version: 1,
      messages: messages.slice(-MAX_STORED_MESSAGES),
      updatedAt: new Date().toISOString(),
    },
  };
  const { data, error } = await admin
    .from("analysis_reports")
    .update({ coaching_playbook: coachingPlaybook })
    .eq("id", report.id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Unable to save the coaching conversation.");
}

export async function appendReportBackedCoachingExchange(
  admin: AdminClient,
  sessionId: string,
  userId: string,
  question: string,
  answer: string,
  references: CoachingReference[],
) {
  const report = await loadReport(admin, sessionId, userId);
  const existing = reportBackedCoachingMessages(report.playbook);
  const now = Date.now();
  const userMessage: CoachingMessage = {
    id: randomUUID(),
    role: "user",
    message: question,
    references: [],
    createdAt: new Date(now).toISOString(),
    moderationStatus: "accepted",
  };
  const assistantMessage: CoachingMessage = {
    id: randomUUID(),
    role: "assistant",
    message: answer,
    references,
    createdAt: new Date(now + 1).toISOString(),
    moderationStatus: "accepted",
  };
  await saveMessages(admin, report, userId, [...existing, userMessage, assistantMessage]);
  return { userMessage, assistantMessage };
}

export async function flagReportBackedCoachingMessage(
  admin: AdminClient,
  sessionId: string,
  userId: string,
  messageId: string,
) {
  const report = await loadReport(admin, sessionId, userId);
  const existing = reportBackedCoachingMessages(report.playbook);
  const next = existing.map((message) => message.id === messageId
    ? { ...message, moderationStatus: "flagged" }
    : message);
  if (!next.some((message) => message.id === messageId)) {
    throw new Error("Coaching message not found.");
  }
  await saveMessages(admin, report, userId, next);
}
