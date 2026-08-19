import { notFound, redirect } from "next/navigation";

import { getAnalysisStatus } from "@/app/actions/analysis-actions";
import AnalysisProcessing from "@/features/analysis-session/presentation/AnalysisProcessing";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { getSport } from "@/lib/sports";
import { createAdminClient, createClient, requireUser, visualQaEnabled } from "@/lib/supabase/server";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (visualQaEnabled() && id === "visual-qa") {
    return (
      <JourneyShell current="analyze">
        <AnalysisProcessing
          staticPreview
          sessionId={id}
          fileName="forehand-practice.mp4"
          sport={getSport("tennis")}
          initialStatus={{
            sessionId: id,
            status: "processing",
            currentStage: "measuring_technique",
            progress: 0,
            movementConfirmationStatus: "confirmed",
            selectedAction: "forehand",
            detectedAction: "forehand",
            analysisAction: "forehand",
            confidence: 0.91,
            scoreStatus: null,
            errorMessage: null,
            updatedAt: new Date().toISOString(),
          }}
        />
      </JourneyShell>
    );
  }

  let session: {
    id: string;
    video_id?: string | null;
    sport_id: string;
    status: string;
    movement_confirmation_status: string | null;
    videos?: { filename?: string } | Array<{ filename?: string }> | null;
  } | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("analysis_sessions")
      .select("id, video_id, sport_id, status, movement_confirmation_status, videos(filename)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    session = data;
  } catch {
    const supabase = await createClient();
    const { data } = await supabase
      .from("analysis_sessions")
      .select("id, video_id, sport_id, status, movement_confirmation_status, videos(filename)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    session = data;
  }

  if (!session) notFound();
  if (session.status === "completed" && session.movement_confirmation_status !== "pending") {
    redirect(`/report/${id}`);
  }

  let videoFilename = "Uploaded video";
  if (Array.isArray(session.videos) && session.videos[0]?.filename) {
    videoFilename = session.videos[0].filename;
  } else if (session.videos && typeof session.videos === "object" && "filename" in session.videos && session.videos.filename) {
    videoFilename = session.videos.filename;
  } else if (session.video_id) {
    try {
      const admin = createAdminClient();
      const { data: videoRow } = await admin
        .from("videos")
        .select("filename")
        .eq("id", session.video_id)
        .maybeSingle();
      if (videoRow?.filename) videoFilename = videoRow.filename;
    } catch {
      // fallback to default filename
    }
  }

  const status = await getAnalysisStatus(id);
  return (
    <JourneyShell current="analyze">
      <AnalysisProcessing
        sessionId={id}
        fileName={videoFilename}
        sport={getSport(session.sport_id)}
        initialStatus={status}
      />
    </JourneyShell>
  );
}
