"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AnalysisReport, FrameMetric } from "@/modules/analysis/types";

const CONNECTIONS: Array<[string, string]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

function nearestFrame(frames: FrameMetric[], time: number) {
  if (frames.length === 0) return undefined;
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].timestampSeconds < time) low = mid + 1;
    else high = mid;
  }
  const current = frames[low];
  const previous = frames[Math.max(0, low - 1)];
  return Math.abs(previous.timestampSeconds - time) <= Math.abs(current.timestampSeconds - time) ? previous : current;
}

function contentRect(video: HTMLVideoElement) {
  const elementWidth = video.clientWidth;
  const elementHeight = video.clientHeight;
  if (!video.videoWidth || !video.videoHeight) return { x: 0, y: 0, width: elementWidth, height: elementHeight };
  const videoRatio = video.videoWidth / video.videoHeight;
  const elementRatio = elementWidth / elementHeight;
  if (elementRatio > videoRatio) {
    const width = elementHeight * videoRatio;
    return { x: (elementWidth - width) / 2, y: 0, width, height: elementHeight };
  }
  const height = elementWidth / videoRatio;
  return { x: 0, y: (elementHeight - height) / 2, width: elementWidth, height };
}

function formatMetric(value: number | null | undefined, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : "—";
}

export default function AnnotatedPlayback({
  videoUrl,
  report,
}: {
  videoUrl: string;
  report: AnalysisReport;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const frames = useMemo(() => report.frameSummary?.frameMetrics ?? [], [report.frameSummary?.frameMetrics]);
  const fps = report.frameSummary?.fps ?? 30;
  const duration = report.frameSummary?.durationSeconds ?? 0;
  const dominantSide = report.frameSummary?.dominantSide?.toLowerCase().startsWith("left") ? "left" : "right";
  const analysisAction = report.frameSummary?.analysisAction ?? report.movementClassification?.analysisAction ?? "";
  const currentFrame = useMemo(() => nearestFrame(frames, currentTime), [frames, currentTime]);
  const currentPhase = useMemo(() => {
    const timeline = report.movementTimeline ?? [];
    return [...timeline].reverse().find((item) => item.timestampSeconds <= currentTime) ?? timeline[0];
  }, [currentTime, report.movementTimeline]);
  const currentRepetition = useMemo(
    () => (report.repetitions ?? []).find((item) => currentTime >= item.startSeconds && currentTime <= item.endSeconds),
    [currentTime, report.repetitions],
  );
  const currentFinding = useMemo(() => {
    const candidates = report.priorities
      .filter((item) => item.timestampSeconds !== null && item.timestampSeconds !== undefined)
      .map((item) => ({ item, delta: Math.abs((item.timestampSeconds ?? 0) - currentTime) }))
      .sort((a, b) => a.delta - b.delta);
    return candidates[0]?.delta <= 0.55 ? candidates[0].item : undefined;
  }, [currentTime, report.priorities]);

  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.clientWidth;
    const height = video.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!currentFrame?.keyLandmarks) return;

    const rect = contentRect(video);
    const toCanvas = (point: { x: number; y: number }) => ({
      x: rect.x + point.x * rect.width,
      y: rect.y + point.y * rect.height,
    });

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "rgba(52, 211, 153, 0.9)";
    for (const [startName, endName] of CONNECTIONS) {
      const start = currentFrame.keyLandmarks[startName];
      const end = currentFrame.keyLandmarks[endName];
      if (!start || !end) continue;
      const startPoint = toCanvas(start);
      const endPoint = toCanvas(end);
      context.beginPath();
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(endPoint.x, endPoint.y);
      context.stroke();
    }

    const currentIndex = frames.findIndex((item) => item.frameIndex === currentFrame.frameIndex);
    const trailFrames = frames.slice(Math.max(0, currentIndex - 12), currentIndex + 1);
    const drawTrail = (landmarkName: string, strokeStyle: string) => {
      const trail = trailFrames
        .map((frame) => frame.keyLandmarks?.[landmarkName])
        .filter((item): item is { x: number; y: number; visibility: number } => Boolean(item && item.visibility >= 0.35));
      if (trail.length <= 1) return;
      context.strokeStyle = strokeStyle;
      context.lineWidth = 2;
      context.beginPath();
      trail.forEach((point, index) => {
        const mapped = toCanvas(point);
        if (index === 0) context.moveTo(mapped.x, mapped.y);
        else context.lineTo(mapped.x, mapped.y);
      });
      context.stroke();
    };

    drawTrail(`${dominantSide}_wrist`, "rgba(56, 189, 248, 0.78)");
    if (analysisAction === "two_handed_backhand") {
      const supportSide = dominantSide === "right" ? "left" : "right";
      drawTrail(`${supportSide}_wrist`, "rgba(167, 139, 250, 0.72)");
    }

    context.fillStyle = "rgba(255, 255, 255, 0.96)";
    for (const landmark of Object.values(currentFrame.keyLandmarks)) {
      if (landmark.visibility < 0.35) continue;
      const point = toCanvas(landmark);
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }

    if (currentFrame.centerOfMass) {
      const com = toCanvas(currentFrame.centerOfMass);
      context.fillStyle = "rgba(167, 139, 250, 0.95)";
      context.beginPath();
      context.arc(com.x, com.y, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.font = "12px sans-serif";
      context.fillText("COM proxy", com.x + 10, com.y - 8);
    }
  }, [analysisAction, currentFrame, dominantSide, frames]);

  useEffect(() => {
    drawOverlay();
    window.addEventListener("resize", drawOverlay);
    return () => window.removeEventListener("resize", drawOverlay);
  }, [drawOverlay]);

  function seek(time: number) {
    const video = videoRef.current;
    if (!video) return;
    const videoDuration = Number.isFinite(video.duration) ? video.duration : duration;
    const next = Math.max(0, Math.min(videoDuration, time));
    video.currentTime = next;
    setCurrentTime(next);
  }

  function stepFrame(direction: -1 | 1) {
    seek(currentTime + direction / fps);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        return;
      }
    }
    else video.pause();
  }

  function setRate(rate: number) {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }

  useEffect(() => {
    function handleSeek(event: Event) {
      const custom = event as CustomEvent<{ time?: number }>;
      if (typeof custom.detail?.time === "number") seek(custom.detail.time);
    }
    window.addEventListener("acecoach:seek-video", handleSeek);
    return () => window.removeEventListener("acecoach:seek-video", handleSeek);
  });

  return (
    <section id="synchronized-video" className="scroll-mt-6 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">Synchronized video coaching</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">See the movement, phase, and coaching cue together</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            The white-and-green overlay shows body landmarks, the blue trail follows the declared dominant hand, a violet trail appears for two-handed backhands, and the purple marker is a centre-of-mass proxy.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          Frame {currentFrame?.frameIndex ?? 0} · {currentTime.toFixed(2)} s
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="block max-h-[650px] w-full object-contain"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = playbackRate;
                drawOverlay();
              }}
            />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
            <div className="absolute left-4 top-4 max-w-sm rounded-xl bg-slate-950/85 px-3 py-2 text-xs text-white backdrop-blur">
              <p className="font-semibold capitalize text-emerald-300">
                {currentPhase?.phase.replaceAll("_", " ") ?? "Outside detected stroke"}
                {currentRepetition ? ` · repetition ${currentRepetition.index + 1}` : ""}
              </p>
              <p className="mt-1 text-slate-300">{currentPhase?.coachingFocus ?? "Use the repetition markers below to jump to a complete stroke."}</p>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.01)}
            step={1 / Math.max(fps, 1)}
            value={Math.min(currentTime, duration)}
            onChange={(event) => seek(Number(event.target.value))}
            className="mt-4 w-full accent-emerald-400"
            aria-label="Video timeline"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => seek(0)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10" aria-label="Restart"><RotateCcw className="h-4 w-4" /></button>
            <button type="button" onClick={() => stepFrame(-1)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10" aria-label="Previous frame"><SkipBack className="h-4 w-4" /></button>
            <button type="button" onClick={() => void togglePlayback()} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => stepFrame(1)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10" aria-label="Next frame"><SkipForward className="h-4 w-4" /></button>
            {[0.25, 0.5, 1].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setRate(rate)}
                className={`rounded-xl border px-3 py-2 text-xs ${playbackRate === rate ? "border-sky-400/50 bg-sky-400/15 text-sky-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {rate}×
              </button>
            ))}
          </div>

          {(report.repetitions ?? []).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {(report.repetitions ?? []).map((repetition) => (
                <button
                  key={repetition.index}
                  type="button"
                  onClick={() => seek(repetition.startSeconds)}
                  className={`rounded-xl border px-3 py-2 text-xs ${currentRepetition?.index === repetition.index ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/5"}`}
                >
                  Rep {repetition.index + 1} · {repetition.durationSeconds.toFixed(2)} s
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Coach focus at this moment</p>
            <p className="mt-3 font-medium text-white">{currentFinding?.title ?? currentPhase?.phase.replaceAll("_", " ") ?? "Movement context"}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{currentFinding?.finding ?? currentPhase?.coachingFocus ?? "No frame-specific coaching note at this time."}</p>
            {currentFinding?.cue ? <p className="mt-3 text-sm text-emerald-200"><span className="font-semibold">Cue:</span> {currentFinding.cue}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"><p className="text-xs text-slate-500">Elbow angle</p><p className="mt-1 text-lg font-semibold text-white">{formatMetric(currentFrame?.elbowAngle, "°")}</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"><p className="text-xs text-slate-500">Knee angle</p><p className="mt-1 text-lg font-semibold text-white">{formatMetric(currentFrame?.dominantKneeAngle ?? currentFrame?.kneeAngle, "°")}</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"><p className="text-xs text-slate-500">Motion signal</p><p className="mt-1 text-lg font-semibold text-white">{formatMetric(currentFrame?.motionEnergy, "")}</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"><p className="text-xs text-slate-500">Pose confidence</p><p className="mt-1 text-lg font-semibold text-white">{currentFrame ? `${Math.round(currentFrame.visibility * 100)}%` : "—"}</p></div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-white">Key phases</p>
            <div className="mt-3 space-y-2">
              {(report.movementTimeline ?? []).map((event) => (
                <button
                  key={`${event.phase}-${event.frameIndex}`}
                  type="button"
                  onClick={() => seek(event.timestampSeconds)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${currentPhase?.frameIndex === event.frameIndex ? "border-sky-400/40 bg-sky-400/10 text-sky-100" : "border-white/10 bg-white/[0.025] text-slate-300 hover:bg-white/5"}`}
                >
                  <span className="capitalize">{event.phase.replaceAll("_", " ")}</span>
                  <span className="text-xs text-slate-500">{event.timestampSeconds.toFixed(2)} s</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
