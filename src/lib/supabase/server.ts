import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function visualQaEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ACECOACH_VISUAL_QA === "true";
}

function createFallbackClient() {
  const emptyQueryBuilder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return Promise.resolve({ data: [], error: null });
    },
    single() {
      return Promise.resolve({ data: null, error: null });
    },
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from() {
      return emptyQueryBuilder;
    },
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return createFallbackClient() as ReturnType<typeof createServerClient>;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Cookie writes can fail in some server contexts.
        }
      },
    },
  });
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Server analysis writes require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
}

export async function requireUser() {
  const { user, error } = await getAuthenticatedUser();

  if (error || !user) {
    redirect("/auth");
  }

  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  return { profile: data, error };
}

export async function getUserVideos(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id, filename, storage_path, stroke_type, status, duration, file_size_bytes, mime_type, created_at, sport_id, action_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { videos: data ?? [], error };
}

type DashboardSessionRow = {
  id: string;
  sport_id?: string | null;
  action_type?: string | null;
  analysis_action_type?: string | null;
  detected_action_type?: string | null;
  score_status?: string | null;
  confidence?: number | null;
  status?: string | null;
  current_stage?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  videos?: Array<{ filename?: string | null }> | null;
  analysis_reports?: unknown;
  video_id?: string | null;
};

type DashboardVideoRow = {
  id: string;
  filename: string;
  storage_path?: string | null;
  status?: string | null;
  duration?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  created_at?: string | null;
  sport_id?: string | null;
  action_type?: string | null;
};

type PracticePlanRow = {
  id: string;
  session_id?: string | null;
  sport_id?: string | null;
  action_type?: string | null;
  primary_goal?: string | null;
  coaching_cue?: string | null;
  plan?: { sessions?: Array<{ id?: string }> | null } | null;
  completion?: Record<string, boolean> | null;
  status?: string | null;
  reassessment_due_at?: string | null;
  created_at?: string | null;
};

export async function getUserDashboardStats(userId: string) {
  const supabase = await createClient();

  const [
    { data: videos = [], error: videoError },
    { data: sessions = [], error: sessionError },
    { data: practicePlans = [], error: practiceError },
  ] = await Promise.all([
    supabase
      .from("videos")
      .select("id, filename, created_at, status, sport_id, action_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("analysis_sessions")
      .select(`
        id,
        sport_id,
        action_type,
        analysis_action_type,
        detected_action_type,
        score_status,
        confidence,
        status,
        current_stage,
        created_at,
        completed_at,
        videos(filename),
        analysis_reports(overall_score, score_label, coach_summary, knowledge_control, knowledge_policy_version, knowledge_manifest_hash)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("practice_plans")
      .select("id, session_id, sport_id, action_type, primary_goal, coaching_cue, plan, completion, status, reassessment_due_at, created_at, knowledge_policy_version, knowledge_manifest_hash")
      .eq("user_id", userId)
      .not("knowledge_policy_version", "is", null)
      .not("knowledge_manifest_hash", "is", null)
      .in("status", ["active", "ready_for_reassessment"])
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const safeVideos = (videos ?? []) as DashboardVideoRow[];
  const safeSessions = (sessions ?? []) as DashboardSessionRow[];
  const completedSessions = safeSessions.filter((session: DashboardSessionRow) => session.status === "completed");
  const latestPlan = ((practicePlans ?? []) as PracticePlanRow[])[0] ?? null;
  const planSessions = Array.isArray(latestPlan?.plan?.sessions) ? latestPlan.plan.sessions : [];
  const planCompletion = (latestPlan?.completion ?? {}) as Record<string, boolean>;
  const completedPlanItems = planSessions.filter(
    (item: { id?: string }) => item.id && planCompletion[item.id] === true,
  ).length;

  const scored = completedSessions
    .map((session: DashboardSessionRow) => {
      const report = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
      const controlled = (report as { knowledge_control?: { status?: string } } | null)?.knowledge_control?.status === "CONTROLLED";
      return controlled && session.score_status === "provisional_criterion_index" && typeof (report as { overall_score?: number } | null)?.overall_score === "number"
        ? (report as { overall_score?: number }).overall_score
        : null;
    })
    .filter((value): value is number => value !== null);

  return {
    videos: safeVideos,
    videoCount: safeVideos.length,
    analysisCount: completedSessions.length,
    averageScore: scored.length > 0 ? Math.round(scored.reduce((sum: number, score: number) => sum + score, 0) / scored.length) : null,
    latestUpload: safeVideos[0] ?? null,
    improvementFocus: latestPlan ? {
      id: latestPlan.id,
      sessionId: latestPlan.session_id,
      sportId: latestPlan.sport_id,
      actionType: latestPlan.action_type,
      primaryGoal: latestPlan.primary_goal,
      coachingCue: latestPlan.coaching_cue,
      status: latestPlan.status,
      completedItems: completedPlanItems,
      totalItems: planSessions.length,
      reassessmentDueAt: latestPlan.reassessment_due_at,
    } : null,
    recentSessions: safeSessions.map((session: DashboardSessionRow) => {
      const report = Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports;
      const controlled = report?.knowledge_control?.status === "CONTROLLED";
      const video = Array.isArray(session.videos) ? session.videos[0] : session.videos;
      return {
        id: session.id,
        sportId: session.sport_id,
        selectedAction: session.action_type,
        analysisAction: session.analysis_action_type ?? session.detected_action_type ?? session.action_type,
        scoreStatus: session.score_status,
        overallScore: controlled && typeof report?.overall_score === "number" ? report.overall_score : null,
        scoreLabel: controlled ? report?.score_label ?? "Execution index" : "Reanalysis required",
        confidence: Number(session.confidence ?? 0),
        status: session.status,
        currentStage: session.current_stage,
        createdAt: session.created_at,
        fileName: video?.filename ?? "Uploaded video",
        headline: controlled && typeof report?.coach_summary?.headline === "string" ? report.coach_summary.headline : null,
      };
    }),
    error: videoError?.message ?? sessionError?.message ?? practiceError?.message ?? null,
  };
}

export async function getUserVideoLibrary(userId: string) {
  const supabase = await createClient();
  const [{ data: videos = [], error: videoError }, { data: sessions = [], error: sessionError }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, filename, storage_path, status, duration, file_size_bytes, mime_type, created_at, sport_id, action_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("analysis_sessions")
      .select("id, video_id, status, score_status, current_stage, analysis_action_type, created_at, analysis_reports(overall_score, coach_summary, knowledge_control, knowledge_policy_version, knowledge_manifest_hash)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const safeLibrarySessions = (sessions ?? []) as DashboardSessionRow[];
  const latestByVideo = new Map<string, DashboardSessionRow>();
  for (const session of safeLibrarySessions) {
    const videoId = session.video_id ?? null;
    if (videoId && !latestByVideo.has(videoId)) latestByVideo.set(videoId, session);
  }

  return {
    items: (videos ?? []).map((video: DashboardVideoRow) => {
      const session = latestByVideo.get(video.id) ?? null;
      const report = session ? (Array.isArray(session.analysis_reports) ? session.analysis_reports[0] : session.analysis_reports) : null;
      const controlled = report?.knowledge_control?.status === "CONTROLLED";
      return {
        id: video.id,
        fileName: video.filename,
        sportId: video.sport_id ?? "tennis",
        actionType: video.action_type ?? "unknown",
        duration: video.duration ? Number(video.duration) : null,
        fileSizeBytes: video.file_size_bytes ? Number(video.file_size_bytes) : null,
        mimeType: video.mime_type ?? null,
        createdAt: video.created_at,
        videoStatus: video.status,
        sessionId: session?.id ?? null,
        analysisStatus: session?.status ?? null,
        scoreStatus: session?.score_status ?? null,
        currentStage: session?.current_stage ?? null,
        analysisAction: session?.analysis_action_type ?? null,
        overallScore: controlled && typeof report?.overall_score === "number" ? report.overall_score : null,
        headline: controlled && typeof report?.coach_summary?.headline === "string" ? report.coach_summary.headline : null,
      };
    }),
    error: videoError?.message ?? sessionError?.message ?? null,
  };
}
