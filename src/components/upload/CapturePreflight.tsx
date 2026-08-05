"use client";

import { AlertTriangle, CheckCircle2, Film, RotateCcw, UploadCloud } from "lucide-react";

export type CaptureCandidate = {
  id: string;
  file: File;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  warnings: string[];
  blockers: string[];
};

export default function CapturePreflight({ candidates, uploading, onCancel, onConfirm }: { candidates: CaptureCandidate[]; uploading: boolean; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const blockers = candidates.flatMap((candidate) => candidate.blockers);
  const ready = candidates.length > 0 && blockers.length === 0;
  return (
    <section className="rounded-[1.75rem] border border-sky-500/25 bg-sky-500/[0.06] p-6">
      <div className="flex items-start gap-3"><Film className="mt-1 h-5 w-5 text-sky-300" /><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Capture preflight</p><h3 className="mt-2 text-2xl font-semibold text-white">Check the clip before spending analysis time</h3><p className="mt-2 text-sm leading-6 text-slate-400">This prevents common failures reported in sports-analysis apps: incompatible formats, long clips, poor orientation, and unclear setup.</p></div></div>
      <div className="mt-5 space-y-3">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium text-white">{candidate.file.name}</p><span className="text-xs text-slate-400">{candidate.durationSeconds?.toFixed(1) ?? "?"} s · {candidate.width && candidate.height ? `${candidate.width}×${candidate.height}` : "resolution unknown"} · {(candidate.file.size / 1024 / 1024).toFixed(1)} MB</span></div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {candidate.blockers.map((item) => <p key={item} className="flex gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{item}</p>)}
              {candidate.warnings.map((item) => <p key={item} className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{item}</p>)}
              {candidate.blockers.length === 0 && candidate.warnings.length === 0 ? <p className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />Metadata checks passed. The server will still assess athlete visibility, clipping, lighting, and pose coverage.</p> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void onConfirm()} disabled={!ready || uploading} className="flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud className="h-4 w-4" />{uploading ? "Uploading..." : "Confirm and upload"}</button><button type="button" onClick={onCancel} disabled={uploading} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"><RotateCcw className="h-4 w-4" />Choose another clip</button></div>
    </section>
  );
}
