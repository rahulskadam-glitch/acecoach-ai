import { notFound, redirect } from "next/navigation";

import { getAnalysisStatus } from "@/app/actions/analysis-actions";
import AnalysisProcessing from "@/features/analysis-session/presentation/AnalysisProcessing";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { getSport } from "@/lib/sports";
import { createClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (visualQaEnabled() && id === "visual-qa") {
    return <JourneyShell current="analyze"><AnalysisProcessing staticPreview sessionId={id} fileName="forehand-practice.mp4" sport={getSport("tennis")} initialStatus={{ sessionId: id, status: "processing", currentStage: "measuring_technique", progress: 0, movementConfirmationStatus: "confirmed", selectedAction: "forehand", detectedAction: "forehand", analysisAction: "forehand", confidence: 0.91, scoreStatus: null, errorMessage: null, updatedAt: new Date().toISOString() }} /></JourneyShell>;
  }
  const supabase = await createClient();
  const { data: session } = await supabase.from("analysis_sessions").select("id, sport_id, status, movement_confirmation_status, videos!inner(filename)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!session) notFound();
  if (session.status === "completed" && session.movement_confirmation_status !== "pending") redirect(`/report/${id}`);
  const video = Array.isArray(session.videos) ? session.videos[0] : session.videos;
  const status = await getAnalysisStatus(id);
  return <JourneyShell current="analyze"><AnalysisProcessing sessionId={id} fileName={video?.filename ?? "Uploaded video"} sport={getSport(session.sport_id)} initialStatus={status} /></JourneyShell>;
}
