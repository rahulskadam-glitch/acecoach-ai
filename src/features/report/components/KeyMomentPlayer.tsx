"use client";

import { Eye, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

export default function KeyMomentPlayer({
  videoUrl,
  timestamp,
  focus,
  cue,
}: {
  videoUrl: string;
  timestamp: number | null;
  focus: string;
  cue: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function moveToMoment(shouldPlay = false) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, (timestamp ?? 0) - 0.7);
    video.playbackRate = 0.5;
    if (shouldPlay) void video.play().catch(() => undefined);
  }

  useEffect(() => {
    function handleShowMoment() {
      moveToMoment(true);
    }
    window.addEventListener("acecoach:show-key-moment", handleShowMoment);
    return () => window.removeEventListener("acecoach:show-key-moment", handleShowMoment);
  });

  return (
    <section id="key-moment" className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <div className="bg-slate-950 p-4 sm:p-6">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={() => moveToMoment(false)}
              className="aspect-video h-full w-full object-contain"
            />
          </div>
          <button type="button" onClick={() => moveToMoment(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 hover:bg-slate-100">
            <RotateCcw className="h-4 w-4" />Replay this part slowly
          </button>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-800"><Eye className="h-4 w-4" />2 · Watch it</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Look for one thing only</h2>
          {timestamp !== null ? <p className="mt-3 text-sm font-medium text-blue-800">AceCoach noticed it around {timestamp.toFixed(2)} seconds.</p> : null}
          <p className="mt-5 text-lg font-semibold leading-7 text-slate-950">{focus}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">Ignore the other details for now. Replay the clip slowly and watch only this part of your movement.</p>
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">Say this to yourself</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">“{cue}”</p>
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Play className="h-4 w-4" />The clip starts just before the key moment at half speed.</div>
        </div>
      </div>
    </section>
  );
}
