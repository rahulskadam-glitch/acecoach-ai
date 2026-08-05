"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalysisReport } from "@/modules/analysis/types";

export default function MotionChart({ report }: { report: AnalysisReport }) {
  const frames = report.frameSummary?.frameMetrics ?? [];
  const data = frames.map((frame) => ({
    time: Number(frame.timestampSeconds.toFixed(2)),
    motion: Number((frame.motionEnergy ?? frame.wristSpeedNormalizedPerSecond ?? 0).toFixed(4)),
    com: Number((frame.comSpeedImageBodyScaledPerSecond ?? frame.comSpeedNormalizedPerSecond ?? 0).toFixed(4)),
    visibility: Number((frame.visibility * 100).toFixed(1)),
  }));

  if (data.length < 2) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Movement signature</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">How the stroke builds and releases speed</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            The green line is a smoothed whole-chain motion signal built from the hitting wrist, elbow, shoulder, and support hand. The violet line is a camera-dependent, shoulder-scaled body-centre image-motion proxy. Neither line is racket speed, ball speed, force, or laboratory centre-of-mass velocity.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          Every frame processed · display stride {report.frameSummary?.displayFrameStride ?? 1}
        </div>
      </div>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} unit="s" />
            <YAxis yAxisId="motion" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <YAxis yAxisId="visibility" orientation="right" domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                background: "rgba(2,6,23,0.96)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                color: "white",
              }}
              labelFormatter={(value) => `${value} seconds`}
            />
            {(report.movementTimeline ?? []).map((event) => (
              <ReferenceLine
                key={`${event.phase}-${event.frameIndex}`}
                x={Number(event.timestampSeconds.toFixed(2))}
                stroke="rgba(56,189,248,0.45)"
                strokeDasharray="4 4"
                label={{ value: event.phase.replaceAll("_", " "), fill: "#7dd3fc", fontSize: 9, position: "insideTopRight" }}
              />
            ))}
            <Line yAxisId="motion" type="monotone" dataKey="motion" name="Whole-chain motion" stroke="#34d399" dot={false} strokeWidth={2.5} isAnimationActive={false} />
            <Line yAxisId="motion" type="monotone" dataKey="com" name="Body-centre image-motion proxy" stroke="#a78bfa" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
