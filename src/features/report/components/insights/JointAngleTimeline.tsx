"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalysisReport, FrameMetric } from "@/modules/analysis/types";

type JointSeries = {
  id: string;
  label: string;
  dominant: (frame: FrameMetric) => number | null | undefined;
  opposite?: (frame: FrameMetric) => number | null | undefined;
};

const JOINT_SERIES: JointSeries[] = [
  { id: "elbow", label: "Elbow", dominant: (f) => f.dominantElbowAngle ?? f.elbowAngle, opposite: (f) => f.oppositeElbowAngle },
  { id: "knee", label: "Knee", dominant: (f) => f.dominantKneeAngle ?? f.kneeAngle, opposite: (f) => f.oppositeKneeAngle },
  { id: "shoulder", label: "Shoulder", dominant: (f) => f.dominantShoulderAngle ?? f.shoulderAngle, opposite: (f) => f.oppositeShoulderAngle },
  { id: "hip", label: "Hip", dominant: (f) => f.dominantHipAngle, opposite: (f) => f.oppositeHipAngle },
  { id: "trunk", label: "Trunk lean", dominant: (f) => f.trunkAngleDegrees },
  { id: "separation", label: "Shoulder–hip", dominant: (f) => f.shoulderPelvisSeparation },
];

const PHASE_FILLS = ["rgba(29,78,216,0.05)", "rgba(8,145,178,0.06)", "rgba(5,150,105,0.06)", "rgba(217,119,6,0.07)", "rgba(124,58,237,0.05)", "rgba(219,39,119,0.05)"];

/**
 * Time-series chart of joint-angle estimates across the stroke, with phase
 * boundaries shaded and click-to-seek into the video. Angles are the same
 * 2D pose estimates already stored per frame — nothing new is computed.
 */
export default function JointAngleTimeline({ report, currentTime, onSeek }: { report: AnalysisReport; currentTime?: number; onSeek?: (seconds: number) => void }) {
  const frames = useMemo(() => report.frameSummary?.frameMetrics ?? [], [report.frameSummary?.frameMetrics]);
  const availableSeries = useMemo(
    () => JOINT_SERIES.filter((series) => frames.some((frame) => typeof series.dominant(frame) === "number")),
    [frames],
  );
  const [selectedId, setSelectedId] = useState(availableSeries[0]?.id ?? "elbow");
  const series = availableSeries.find((item) => item.id === selectedId) ?? availableSeries[0];

  const data = useMemo(() => {
    if (!series) return [];
    return frames
      .map((frame) => ({
        time: Number(frame.timestampSeconds.toFixed(2)),
        dominant: typeof series.dominant(frame) === "number" ? Number((series.dominant(frame) as number).toFixed(1)) : null,
        opposite: series.opposite && typeof series.opposite(frame) === "number" ? Number((series.opposite(frame) as number).toFixed(1)) : null,
      }))
      .filter((point) => point.dominant !== null || point.opposite !== null);
  }, [frames, series]);

  const phaseBands = useMemo(() => {
    const timeline = (report.movementTimeline ?? []).slice().sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    const lastTime = frames.at(-1)?.timestampSeconds ?? 0;
    return timeline.map((event, index) => ({
      phase: event.phase.replaceAll("_", " ").replace("proxy", "").trim(),
      from: Number(event.timestampSeconds.toFixed(2)),
      to: Number((timeline[index + 1]?.timestampSeconds ?? lastTime).toFixed(2)),
    })).filter((band) => band.to > band.from);
  }, [frames, report.movementTimeline]);

  if (!series || data.length < 4) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Activity className="h-4 w-4 text-blue-800" />Joint angles through the stroke</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">2D camera-view angle estimates per frame. Click the chart to jump the video to that moment.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Joint selection">
          {availableSeries.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={item.id === series.id} onClick={() => setSelectedId(item.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${item.id === series.id ? "border-blue-900 bg-blue-950 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}>{item.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
            onClick={(state) => {
              const value = state?.activeLabel;
              if (onSeek && typeof value === "number") onSeek(value);
              else if (onSeek && typeof value === "string" && value !== "") onSeek(Number(value));
            }}
            style={onSeek ? { cursor: "pointer" } : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} unit="s" />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={38} unit="°" domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, color: "#0f172a", fontSize: 12 }}
              labelFormatter={(value) => `${value}s`}
              formatter={(value, name) => [`${value ?? "—"}°`, name === "dominant" ? `Hitting-side ${series.label.toLowerCase()}` : `Support-side ${series.label.toLowerCase()}`]}
            />
            {phaseBands.map((band, index) => (
              <ReferenceArea key={`${band.phase}-${band.from}`} x1={band.from} x2={band.to} fill={PHASE_FILLS[index % PHASE_FILLS.length]} strokeOpacity={0} label={{ value: band.phase, position: "insideTopLeft", fill: "#94a3b8", fontSize: 9 }} />
            ))}
            {typeof currentTime === "number" ? <ReferenceLine x={Number(currentTime.toFixed(2))} stroke="#173F6A" strokeWidth={1.5} label={{ value: "video", fill: "#173F6A", fontSize: 9, position: "insideBottomRight" }} /> : null}
            <Line type="monotone" dataKey="dominant" name="dominant" stroke="#1d4ed8" strokeWidth={2.25} dot={false} connectNulls isAnimationActive={false} />
            {series.opposite ? <Line type="monotone" dataKey="opposite" name="opposite" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[0.65rem] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-blue-700" />Hitting side</span>
        {series.opposite ? <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded border-t-2 border-dashed border-slate-400" />Support side</span> : null}
        <span className="ml-auto">Not force, load, or exact 3D rotation</span>
      </div>
    </div>
  );
}
