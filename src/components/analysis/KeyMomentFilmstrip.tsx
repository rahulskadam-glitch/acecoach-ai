/* eslint-disable @next/next/no-img-element */
"use client";

import { CheckCircle2, Clock3, ImageOff, LoaderCircle, Target, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AnalysisReport } from "@/modules/analysis/types";

type FilmstripMoment = {
  id: string;
  kind: "strength" | "priority" | "checkpoint";
  label: string;
  title: string;
  explanation: string;
  cue?: string;
  timestampSeconds: number;
  frameIndex?: number | null;
};

type ThumbnailState = Record<string, string | null>;

function iconFor(kind: FilmstripMoment["kind"]) {
  if (kind === "strength") return CheckCircle2;
  if (kind === "priority") return Target;
  return Zap;
}

function toneFor(kind: FilmstripMoment["kind"]) {
  if (kind === "strength") return "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-200";
  if (kind === "priority") return "border-amber-500/25 bg-amber-500/[0.05] text-amber-200";
  return "border-sky-500/25 bg-sky-500/[0.05] text-sky-200";
}

function buildMoments(report: AnalysisReport): FilmstripMoment[] {
  const direct = (report.visualMoments ?? [])
    .filter((item) => typeof item.timestampSeconds === "number")
    .map((item) => ({
      ...item,
      timestampSeconds: item.timestampSeconds as number,
    }));

  if (direct.length > 0) return direct.slice(0, 6);

  const strength = report.strengths
    .filter((item) => typeof item.timestampSeconds === "number")
    .slice(0, 2)
    .map((item, index) => ({
      id: `strength-${index}`,
      kind: "strength" as const,
      label: "Keep this",
      title: item.title,
      explanation: item.evidence,
      timestampSeconds: item.timestampSeconds as number,
      frameIndex: item.frameIndex,
    }));

  const priorities = report.priorities
    .filter((item) => typeof item.timestampSeconds === "number")
    .slice(0, 3)
    .map((item) => ({
      id: `priority-${item.rank}`,
      kind: "priority" as const,
      label: `Priority ${item.rank}`,
      title: item.title,
      explanation: item.finding,
      cue: item.cue,
      timestampSeconds: item.timestampSeconds as number,
      frameIndex: item.frameIndex,
    }));

  return [...strength, ...priorities].slice(0, 6);
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  const target = Math.max(0, Math.min(time, Number.isFinite(video.duration) ? video.duration : time));
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Timed out while generating frame preview.")), 5000);
    const onSeeked = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = target;
  });
}

export default function KeyMomentFilmstrip({ videoUrl, report }: { videoUrl: string; report: AnalysisReport }) {
  const moments = useMemo(() => buildMoments(report), [report]);
  const [thumbnails, setThumbnails] = useState<ThumbnailState>({});
  const [loading, setLoading] = useState(moments.length > 0);

  useEffect(() => {
    let cancelled = false;
    let previewVideo: HTMLVideoElement | null = null;
    async function generate() {
      if (moments.length === 0) {
        setLoading(false);
        return;
      }

      const video = document.createElement("video");
      previewVideo = video;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = videoUrl;

      try {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => reject(new Error("Timed out while loading video previews.")), 8000);
          video.onloadedmetadata = () => {
            window.clearTimeout(timer);
            resolve();
          };
          video.onerror = () => {
            window.clearTimeout(timer);
            reject(new Error("Unable to load preview video."));
          };
          video.load();
        });

        const next: ThumbnailState = {};
        for (const moment of moments) {
          if (cancelled) return;
          try {
            await seekVideo(video, moment.timestampSeconds);
            const canvas = document.createElement("canvas");
            const ratio = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 16 / 9;
            canvas.width = 480;
            canvas.height = Math.round(480 / ratio);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Canvas unavailable.");
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            next[moment.id] = canvas.toDataURL("image/jpeg", 0.78);
          } catch {
            next[moment.id] = null;
          }
        }
        if (!cancelled) setThumbnails(next);
      } catch {
        if (!cancelled) setThumbnails(Object.fromEntries(moments.map((moment) => [moment.id, null])));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void generate();
    return () => {
      cancelled = true;
      if (previewVideo) {
        previewVideo.pause();
        previewVideo.removeAttribute("src");
        previewVideo.load();
      }
    };
  }, [moments, videoUrl]);

  if (moments.length === 0) return null;

  function jump(time: number) {
    window.dispatchEvent(new CustomEvent("acecoach:seek-video", { detail: { time } }));
    document.getElementById("synchronized-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="visual-story" className="scroll-mt-24 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Your swing in pictures</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">The moments that explain the report</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Select any frame to jump directly to that moment in the annotated video. The report leads with visual proof before technical detail.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
          {loading ? "Building visual story" : `${moments.length} key moments`}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moments.map((moment) => {
          const Icon = iconFor(moment.kind);
          const thumbnail = thumbnails[moment.id];
          return (
            <button key={moment.id} type="button" onClick={() => jump(moment.timestampSeconds)} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/35 hover:shadow-lg hover:shadow-black/20">
              <div className="relative aspect-video overflow-hidden bg-slate-900">
                {thumbnail ? <img src={thumbnail} alt={`${moment.title} at ${moment.timestampSeconds.toFixed(2)} seconds`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-slate-600"><ImageOff className="h-8 w-8" /></div>}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent px-4 pb-3 pt-8 text-xs text-white">
                  <span>{moment.timestampSeconds.toFixed(2)} s</span>
                  {moment.frameIndex !== null && moment.frameIndex !== undefined ? <span>Frame {moment.frameIndex}</span> : null}
                </div>
              </div>
              <div className="p-4">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneFor(moment.kind)}`}><Icon className="h-3.5 w-3.5" />{moment.label}</div>
                <h3 className="mt-3 font-semibold text-white">{moment.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{moment.explanation}</p>
                {moment.cue ? <p className="mt-3 text-sm font-medium text-emerald-300">Cue: “{moment.cue}”</p> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
