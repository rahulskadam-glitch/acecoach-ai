"use client";

import { AlertTriangle, ArrowRight, Check, Circle, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  confirmMovementAndReanalyze,
  getAnalysisStatus,
  getContextPersistenceStatus,
  runAnalysisSession,
} from "@/app/actions/analysis-actions";
import type { SportDefinition } from "@/lib/sports";

type Status = Awaited<ReturnType<typeof getAnalysisStatus>>;
type ContextPersistenceStatus = Awaited<ReturnType<typeof getContextPersistenceStatus>>;
const SHOW_CONTEXT_PANEL = process.env.NEXT_PUBLIC_CONTEXT_PERSISTENCE_DEBUG === "1";

const STAGES = [
  { id: "quality", label: "Checking video quality", detail: "Confirming that the athlete and movement can be measured reliably." },
  { id: "movement", label: "Confirming the movement", detail: "Comparing your selected movement with the detected pattern." },
  { id: "measure", label: "Measuring the technique", detail: "Reviewing preparation, balance, swing organization, finish, and recovery." },
  { id: "report", label: "Building your coaching report", detail: "Prioritizing one correction and linking it to practice." },
] as const;

function stageIndex(status: Status) {
  if (status.status === "completed") return 4;
  if (status.currentStage === "measuring_technique") return 2;
  if (status.currentStage === "checking_video_quality") return 0;
  if (status.status === "processing") return 1;
  return 0;
}

export default function AnalysisProcessing({ sessionId, fileName, sport, initialStatus, staticPreview = false }: { sessionId: string; fileName: string; sport: SportDefinition; initialStatus: Status; staticPreview?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [starting, setStarting] = useState(initialStatus.status === "queued" || initialStatus.status === "failed");
  const [error, setError] = useState<string | null>(null);
  const [contextInfo, setContextInfo] = useState<ContextPersistenceStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const startedRef = useRef(false);
  const activeIndex = stageIndex(status);
  const selectedLabel = useMemo(() => sport.actions.find((item) => item.id === status.selectedAction)?.label ?? status.selectedAction?.replaceAll("_", " ") ?? "your selection", [sport.actions, status.selectedAction]);
  const detectedLabel = useMemo(() => sport.actions.find((item) => item.id === status.detectedAction)?.label ?? status.detectedAction?.replaceAll("_", " ") ?? "another movement", [sport.actions, status.detectedAction]);
  const needsConfirmation = status.status === "completed" && status.movementConfirmationStatus === "pending";

  const refresh = useCallback(async () => {
    try {
      const next = await getAnalysisStatus(sessionId);
      setStatus(next);
      if (next.status === "completed" && next.movementConfirmationStatus !== "pending") {
        router.replace(`/report/${sessionId}`);
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh the analysis status.");
    }
  }, [router, sessionId]);

  const refreshContextInfo = useCallback(async () => {
    if (!SHOW_CONTEXT_PANEL || staticPreview) {
      return;
    }
    try {
      const next = await getContextPersistenceStatus(sessionId);
      setContextInfo(next);
    } catch {
      setContextInfo(null);
    }
  }, [sessionId, staticPreview]);

  useEffect(() => {
    if (staticPreview || startedRef.current || !(initialStatus.status === "queued" || initialStatus.status === "failed")) return;
    startedRef.current = true;
    setStarting(true);
    void runAnalysisSession(sessionId)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Analysis failed."))
      .finally(() => { setStarting(false); void refresh(); });
  }, [initialStatus.status, refresh, sessionId, staticPreview]);

  useEffect(() => {
    if (staticPreview || status.status === "completed" || status.status === "failed") return;
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [refresh, staticPreview, status.status]);

  useEffect(() => {
    if (!SHOW_CONTEXT_PANEL || staticPreview) {
      return;
    }
    // Defer the first refresh so this effect only establishes the external
    // polling subscription; state updates happen from timer callbacks.
    const initialTimer = window.setTimeout(() => void refreshContextInfo(), 0);
    const timer = window.setInterval(() => void refreshContextInfo(), 5000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refreshContextInfo, staticPreview]);

  async function confirmMovement(actionType: string | null) {
    if (!actionType) return;
    setConfirming(true);
    setError(null);
    try {
      await confirmMovementAndReanalyze(sessionId, actionType);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm the movement.");
    } finally {
      setConfirming(false);
    }
  }

  async function retry() {
    setStarting(true);
    setError(null);
    try {
      await runAnalysisSession(sessionId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restart the analysis.");
    } finally {
      setStarting(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-amber-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><AlertTriangle className="h-6 w-6" /></div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">Movement confirmation needed</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">You selected {selectedLabel}.<br />AceCoach detected {detectedLabel}.</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">Confidence: {status.confidence >= 0.8 ? "High" : status.confidence >= 0.6 ? "Moderate" : "Low"}. We will not continue movement-specific coaching until you confirm what is in the video.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => confirmMovement(status.detectedAction)} disabled={confirming || !status.detectedAction} className="min-h-12 rounded-xl bg-[#173F6A] px-5 font-semibold text-white hover:bg-[#103554] disabled:opacity-50">Use {detectedLabel}</button>
            <button type="button" onClick={() => confirmMovement(status.selectedAction)} disabled={confirming || !status.selectedAction} className="min-h-12 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">Keep {selectedLabel}</button>
          </div>
          <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-800">Choose a different movement</summary><div className="mt-4 grid gap-2 sm:grid-cols-2">{sport.actions.map((action) => <button key={action.id} type="button" onClick={() => confirmMovement(action.id)} disabled={confirming} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-blue-300">{action.label}</button>)}</div></details>
          {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
        </div>
      </div>
    );
  }

  const failed = status.status === "failed";
  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">{failed ? <AlertTriangle className="h-8 w-8 text-rose-700" /> : <LoaderCircle className="h-8 w-8 animate-spin" />}</div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">{sport.name} · {fileName}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">{failed ? "We could not complete the analysis" : "AceCoach is reviewing your movement"}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">{failed ? "Your original video is safe. Review the reason below, then retry or upload a better clip." : "You may leave this page and return. The stages below reflect the last confirmed server state—not a fabricated countdown."}</p>
      </div>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ol className="space-y-2">
          {STAGES.map((item, index) => {
            const complete = index < activeIndex || status.status === "completed";
            const active = !failed && index === activeIndex;
            return <li key={item.id} className={`flex gap-4 rounded-2xl p-4 ${active ? "bg-blue-50" : "bg-white"}`}><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${complete ? "border-emerald-700 bg-emerald-700 text-white" : active ? "border-blue-700 bg-white text-blue-800" : "border-slate-200 bg-white text-slate-400"}`}>{complete ? <Check className="h-4 w-4" /> : active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Circle className="h-3 w-3" />}</span><div><p className={`font-semibold ${complete || active ? "text-slate-950" : "text-slate-500"}`}>{item.label}</p><p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p></div></li>;
          })}
        </ol>
        {status.errorMessage ? <div className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${failed ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{status.errorMessage}</div> : null}
        {error ? <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-700" />Your original video is preserved independently of the report.</div>
          {failed ? <div className="flex gap-3"><a href={`/start?sport=${sport.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Upload another video</a><button type="button" onClick={retry} disabled={starting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173F6A] px-4 text-sm font-semibold text-white hover:bg-[#103554] disabled:opacity-50"><RefreshCw className="h-4 w-4" />Retry analysis</button></div> : <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh status<ArrowRight className="h-4 w-4" /></button>}
        </div>
      </section>

      {SHOW_CONTEXT_PANEL ? (
        <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-800">Rollout verification</p>
          <h2 className="mt-2 text-lg font-semibold text-indigo-950">Context persistence status</h2>
          <div className="mt-3 space-y-2 text-sm text-indigo-900">
            <p>Session: {sessionId}</p>
            <p>Outcome: {contextInfo?.contextPersistence ?? "unavailable"}</p>
            <p>Session context row: {contextInfo?.hasSessionContext ? "present" : "missing"}</p>
            <p>Moderation row: {contextInfo?.hasModerationLog ? "present" : "missing"}</p>
            <p>Moderation precheck: {contextInfo?.moderationPrecheckStatus ?? "n/a"}</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshContextInfo()}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            Refresh verification
            <RefreshCw className="h-4 w-4" />
          </button>
        </section>
      ) : null}
    </div>
  );
}
