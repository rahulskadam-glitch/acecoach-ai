import { notFound, redirect } from "next/navigation";

import { CoachingConversation, type CoachingContextSummary, type CoachingMessage } from "@/features/coaching-conversation";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { isCoachingSchemaUnavailable, reportBackedCoachingMessages } from "@/lib/coaching-storage";
import { getSport } from "@/lib/sports";
import { createAdminClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";

function text(value: unknown, fallback: string) { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function first(value: unknown) { return Array.isArray(value) && value[0] && typeof value[0] === "object" ? value[0] as Record<string, unknown> : null; }

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (visualQaEnabled() && id === "visual-qa") {
    const context: CoachingContextSummary = { sportName: "Tennis", movementName: "Forehand", mainPriority: "Start the shoulder turn earlier", whyItMatters: "Earlier preparation creates more time for a balanced, controlled swing.", cue: "Turn before the ball arrives", successTarget: "Begin the shoulder turn before the forward swing in eight of ten repetitions.", primaryTimestamp: 2.4, drillName: "Early-turn shadow swings", drillDosage: "2 sets of 8 controlled repetitions" };
    return <JourneyShell current="coach" maxWidth="max-w-[1400px]"><CoachingConversation sessionId={id} context={context} initialMessages={[]} /></JourneyShell>;
  }
  const admin = createAdminClient();
  const { data: session } = await admin.from("analysis_sessions").select("id, sport_id, action_type, analysis_action_type, status, analysis_reports(coach_summary, priorities, drills, next_session, coaching_playbook, movement_classification)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!session) notFound();
  if (session.status !== "completed") redirect(`/analysis/${id}`);
  const raw = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
  if (!raw) notFound();
  const coach = (raw.coach_summary ?? {}) as Record<string, unknown>;
  const priority = first(raw.priorities);
  const drill = first(raw.drills);
  const next = (raw.next_session ?? {}) as Record<string, unknown>;
  const playbook = (raw.coaching_playbook ?? {}) as Record<string, unknown>;
  const movement = (raw.movement_classification ?? {}) as Record<string, unknown>;
  const sport = getSport(session.sport_id);
  const context: CoachingContextSummary = {
    sportName: sport.name,
    movementName: text(movement.analysisActionLabel, sport.actions.find((item) => item.id === (session.analysis_action_type ?? session.action_type))?.label ?? "Movement"),
    mainPriority: text(coach.mainPriority, text(priority?.title, "Focus on one reliable movement change.")),
    whyItMatters: text(coach.whyItMatters, text(priority?.impact, "This supports more repeatable technique.")),
    cue: text(playbook.feelCue, text(priority?.cue, "Make one clear change at a time.")),
    successTarget: Array.isArray(next.successCriteria) && typeof next.successCriteria[0] === "string" ? next.successCriteria[0] : text(drill?.successMetric, "Repeat the movement with stable balance."),
    primaryTimestamp: typeof priority?.timestampSeconds === "number" ? priority.timestampSeconds : null,
    drillName: drill ? text(drill.name, "Practice drill") : null,
    drillDosage: drill ? text(drill.dosage, "A small number of high-quality repetitions") : null,
  };
  const conversationResult = await admin.from("coaching_conversations").select("id").eq("analysis_session_id", id).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (conversationResult.error && !isCoachingSchemaUnavailable(conversationResult.error)) {
    throw new Error(conversationResult.error.message);
  }
  const conversation = conversationResult.data;
  let messages: CoachingMessage[] = reportBackedCoachingMessages(raw.coaching_playbook);
  if (conversation) {
    const { data, error } = await admin.from("coaching_messages").select("id, role, message, structured_references, moderation_status, created_at").eq("conversation_id", conversation.id).eq("user_id", user.id).order("created_at", { ascending: true });
    if (error && !isCoachingSchemaUnavailable(error)) throw new Error(error.message);
    const tableMessages: CoachingMessage[] = (data ?? []).map((item) => ({ id: item.id, role: item.role as "user" | "assistant", message: item.message, references: Array.isArray(item.structured_references) ? item.structured_references : [], moderationStatus: item.moderation_status, createdAt: item.created_at }));
    messages = [...messages, ...tableMessages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  return <JourneyShell current="coach" maxWidth="max-w-[1400px]"><CoachingConversation sessionId={id} context={context} initialMessages={messages} /></JourneyShell>;
}
