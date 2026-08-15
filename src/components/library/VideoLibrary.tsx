"use client";

import { AlertTriangle, BrainCircuit, CheckCircle2, Download, Film, LoaderCircle, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { analyzeVideo } from "@/app/actions/analysis-actions";
import AnalysisProgressOverlay from "@/components/analysis/AnalysisProgressOverlay";
import { deleteVideo, getVideoDownloadUrl } from "@/app/actions/video-actions";
import { getSport } from "@/lib/sports";

export type LibraryItem = {
  id: string;
  fileName: string;
  sportId: string;
  actionType: string;
  duration: number | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
  videoStatus: string;
  sessionId: string | null;
  analysisStatus: string | null;
  scoreStatus: string | null;
  currentStage: string | null;
  analysisAction: string | null;
  overallScore: number | null;
  headline: string | null;
};

function stateLabel(item: LibraryItem) {
  if (!item.sessionId) return "Ready to analyze";
  if (item.analysisStatus === "processing" || item.analysisStatus === "queued") return "Analysis in progress";
  if (item.analysisStatus === "failed") return "Analysis needs retry";
  if (item.scoreStatus === "pending_movement_confirmation") return "Confirm movement";
  if (item.scoreStatus?.startsWith("blocked_")) return "Capture review";
  return "Report ready";
}

export default function VideoLibrary({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.fileName} ${item.sportId} ${item.actionType} ${item.analysisAction ?? ""}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const ready = item.analysisStatus === "completed";
    const needsAttention = Boolean(item.sessionId) && !ready;
    const matchesStatus = statusFilter === "all" || (statusFilter === "ready" && ready) || (statusFilter === "unanalyzed" && !item.sessionId) || (statusFilter === "attention" && needsAttention);
    return matchesQuery && matchesStatus;
  }), [items, query, statusFilter]);

  function analyze(item: LibraryItem) {
    setActiveId(item.id);
    setError(null);
    startTransition(() => void analyzeVideo(item.id).then(({ sessionId }) => router.push(`/analysis/${sessionId}`)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to analyze video.")).finally(() => setActiveId(null)));
  }
  function download(item: LibraryItem) {
    setActiveId(item.id);
    setError(null);
    startTransition(() => void getVideoDownloadUrl(item.id).then(({ url }) => window.location.assign(url)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to download the original video.")).finally(() => setActiveId(null)));
  }
  function remove(item: LibraryItem) {
    if (!window.confirm(`Delete “${item.fileName}” and its reports?`)) return;
    setActiveId(item.id);
    setError(null);
    startTransition(() => void deleteVideo(item.id).then(() => router.refresh()).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to delete video.")).finally(() => setActiveId(null)));
  }

  const activeVideo = pending && activeId ? items.find((item) => item.id === activeId) ?? null : null;

  return (
    <>
      {activeVideo ? <AnalysisProgressOverlay fileName={activeVideo.fileName} /> : null}
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">My videos</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">Your tennis analysis library</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Open completed reports, continue an analysis, or manage uploaded clips.</p></div><Link href="/start" className="rounded-xl bg-[#071b2d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d2b42]">New analysis</Link></div>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_190px]"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="ready">Reports ready</option><option value="unanalyzed">Not analyzed</option><option value="attention">Needs attention</option></select></div>
      {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">No videos match these filters.</div> : filtered.map((item) => {
          const sport = getSport(item.sportId);
          const busy = pending && activeId === item.id;
          const reportReady = item.analysisStatus === "completed" && item.sessionId;
          const attention = Boolean(item.sessionId) && !reportReady;
          return <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-start gap-4"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${reportReady ? "bg-emerald-100 text-emerald-700" : attention ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-800"}`}>{reportReady ? <CheckCircle2 className="h-5 w-5" /> : attention ? <AlertTriangle className="h-5 w-5" /> : <Film className="h-5 w-5" />}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{item.fileName}</p><p className="mt-1 text-sm capitalize text-slate-600">{sport.name} · {(item.analysisAction ?? item.actionType).replaceAll("_", " ")}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()} · {item.duration ? `${item.duration.toFixed(1)} s` : "duration unknown"} · {item.fileSizeBytes ? `${(item.fileSizeBytes / 1024 / 1024).toFixed(1)} MB` : "size unknown"}</p>{item.headline ? <p className="mt-2 text-sm text-slate-700">{item.headline}</p> : null}</div></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{stateLabel(item)}</span>{item.overallScore !== null ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{item.overallScore}/100</span> : null}{reportReady ? <Link href={`/report/${item.sessionId}`} className="rounded-xl bg-[#071b2d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d2b42]">Open report</Link> : <button type="button" onClick={() => analyze(item)} disabled={busy} className="flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}{item.sessionId ? "Retry / continue" : "Analyze"}</button>}<button type="button" onClick={() => download(item)} disabled={busy} className="rounded-xl border border-blue-200 bg-white p-2.5 text-blue-800 hover:bg-blue-50" aria-label={`Download ${item.fileName}`}><Download className="h-4 w-4" /></button><button type="button" onClick={() => remove(item)} disabled={busy} className="rounded-xl border border-rose-200 bg-white p-2.5 text-rose-700 hover:bg-rose-50" aria-label={`Delete ${item.fileName}`}><Trash2 className="h-4 w-4" /></button></div></div></div>;
        })}
      </div>
    </section>
    </>
  );
}
