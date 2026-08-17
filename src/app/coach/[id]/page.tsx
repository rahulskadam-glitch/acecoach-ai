import { notFound, redirect } from "next/navigation";

import { CoachingConversation, type CoachingContextSummary, type CoachingMessage } from "@/features/coaching-conversation";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { getSport } from "@/lib/sports";
import { createAdminClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";

function text(value: unknown, fallback: string) { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function first(value: unknown) { return Array.isArray(value) && value[0] && typeof value[0] === "object" ? value[0] as Record<string, unknown> : null; }

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Handle Visual QA / Preview mode instantly
  if (id === "visual-qa" || visualQaEnabled()) {
    const context: CoachingContextSummary = {
      sportName: "Tennis",
      movementName: "Forehand",
      mainPriority: "Deepen Racket Drop Lag by +12cm",
      whyItMatters: "Dropping the racket head below your wrist creates an elastic sling for +8 to +10 mph ball speed.",
      cue: "Let the racket head drop below your wrist before accelerating forward",
      successTarget: "Racket head drops 10-15cm below wrist on 8 out of 10 forehands.",
      primaryTimestamp: 1.15,
      drillName: "Lag-and-Snap Shadow Swings",
      drillDosage: "3 sets of 12 controlled repetitions",
    };
    return (
      <JourneyShell current="coach" maxWidth="max-w-[1400px]">
        <CoachingConversation sessionId={id} context={context} initialMessages={[]} />
      </JourneyShell>
    );
  }

  const user = await requireUser();
  const admin = createAdminClient();
  const { data: session } = await admin.from("analysis_sessions").select("id, sport_id, action_type, analysis_action_type, status, analysis_reports(coach_summary, priorities, drills, next_session, coaching_playbook, movement_classification, knowledge_control)").eq("id", id).eq("user_id", user.id).maybeSingle();
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
  if (conversationResult.error) {
    throw new Error(conversationResult.error.message);
  }
  const conversation = conversationResult.data;
  let messages: CoachingMessage[] = [];
  if (conversation) {
    const { data, error } = await admin.from("coaching_messages").select("id, role, message, structured_references, moderation_status, created_at").eq("conversation_id", conversation.id).eq("user_id", user.id).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const tableMessages: CoachingMessage[] = (data ?? []).map((item) => ({ id: item.id, role: item.role as "user" | "assistant", message: item.message, references: Array.isArray(item.structured_references) ? item.structured_references : [], moderationStatus: item.moderation_status, createdAt: item.created_at }));
    messages = [...messages, ...tableMessages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  return <JourneyShell current="coach" maxWidth="max-w-[1400px]"><CoachingConversation sessionId={id} context={context} initialMessages={messages} /></JourneyShell>;
}
