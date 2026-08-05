"use client";

import { BrainCircuit, CheckCircle2, Download, Film, LoaderCircle, Trash2 } from "lucide-react";

import type { UploadedVideo } from "./VideoUploader";

type UploadHistoryProps = {
  uploads: UploadedVideo[];
  deletingId?: string | null;
  analyzingId?: string | null;
  onAnalyze?: (video: UploadedVideo) => Promise<void>;
  onDownload?: (video: UploadedVideo) => Promise<void>;
  onDelete?: (video: UploadedVideo) => Promise<void>;
};

export default function UploadHistory({
  uploads,
  deletingId = null,
  analyzingId = null,
  onAnalyze,
  onDownload,
  onDelete,
}: UploadHistoryProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Upload history</p><h2 className="mt-2 text-2xl font-semibold text-white">Recent sessions</h2></div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">{uploads.length} {uploads.length === 1 ? "file" : "files"}</div>
      </div>

      <div className="mt-8 space-y-4">
        {uploads.length === 0 ? <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-slate-950/50 p-8 text-center text-sm text-slate-400">No videos uploaded yet.</div> : null}
        {uploads.map((upload) => {
          const isCompleted = upload.status === "Completed";
          const isDeleting = deletingId === upload.id;
          const isAnalyzing = analyzingId === upload.id;
          return (
            <div key={upload.id} className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 md:w-32">
                  {upload.previewUrl ? <video src={upload.previewUrl} muted playsInline className="h-full w-full object-cover" /> : <div className="flex flex-col items-center text-slate-500"><Film className="h-8 w-8" /><span className="mt-2 text-xs">Video</span></div>}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{upload.fileName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {upload.sportName} · {upload.actionLabel} ·{" "}
                        {upload.size > 0 ? `${(upload.size / (1024 * 1024)).toFixed(1)} MB` : "size unavailable"}
                        {upload.durationSeconds ? ` · ${upload.durationSeconds.toFixed(1)} s` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${isCompleted ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}{upload.status}
                      </div>
                      {isCompleted && onAnalyze ? <button type="button" disabled={isAnalyzing || isDeleting} onClick={() => void onAnalyze(upload)} className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50">{isAnalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}{isAnalyzing ? "Analyzing..." : "Analyze"}</button> : null}
                      {isCompleted && onDownload ? <button type="button" disabled={isDeleting || isAnalyzing} onClick={() => void onDownload(upload)} className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sm text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Download original</button> : null}
                      {isCompleted && onDelete ? <button type="button" disabled={isDeleting || isAnalyzing} onClick={() => void onDelete(upload)} className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-sm text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{isDeleting ? "Deleting..." : "Delete"}</button> : null}
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${upload.progress}%` }} /></div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span className="flex items-center gap-2">{isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}{upload.uploadedAt}</span><span>{upload.progress}% uploaded</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
