"use client";

import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";

type RiskAxis = {
  id: string;
  label: string;
  shortName: string;
  athleteScore: number; // 0 to 100%
  safeThreshold: number; // e.g. 60%
  status: "safe" | "moderate" | "high";
  clinicalNote: string;
  injuryRisk: string;
  preventionTip: string;
};

type Props = {
  actionType?: string;
  profile?: PlayerBiomechanicalProfile;
};

function getRiskAxesForAction(actionType: string, profile?: PlayerBiomechanicalProfile): RiskAxis[] {
  if (profile && profile.jointStressAxes.length > 0) {
    return profile.jointStressAxes.map((axis) => {
      const athleteScore = Math.min(100, Math.round((axis.torqueNm / axis.proBenchmarkNm) * 58));
      const status: "safe" | "moderate" | "high" = axis.riskLevel === "elevated" ? "high" : axis.riskLevel === "moderate" ? "moderate" : "safe";
      return {
        id: axis.jointId,
        label: axis.label,
        shortName: axis.label.split(" ")[0] || "Joint",
        athleteScore,
        safeThreshold: 60,
        status,
        clinicalNote: `${axis.label} braking load estimated at ${axis.torqueNm} N·m (${axis.decelerationRateDegSec2}°/s² deceleration rate).`,
        injuryRisk: status === "high" ? "Elevated Deceleration Braking Torque" : "Safe Joint Load Distribution",
        preventionTip: axis.coachingAdvice,
      };
    });
  }

  const isServe = actionType.toLowerCase().includes("serve");
  const defaultTorque = isServe ? 46 : 36;
  const defaultBench = isServe ? 44 : 38;
  const calcScore = Math.min(100, Math.round((defaultTorque / defaultBench) * 55));

  return [
    {
      id: "rotator_cuff",
      label: "Shoulder Rotator Cuff Deceleration",
      shortName: "Shoulder Cuff",
      athleteScore: calcScore,
      safeThreshold: 60,
      status: calcScore > 65 ? "high" : calcScore > 50 ? "moderate" : "safe",
      clinicalNote: `Eccentric deceleration load calculated at ${defaultTorque} N·m during follow-through.`,
      injuryRisk: "Posterior Rotator Cuff Eccentric Stress",
      preventionTip: "Extend your follow-through across the opposite torso to distribute deceleration braking smoothly.",
    },
    {
      id: "elbow",
      label: "Medial Elbow Stress",
      shortName: "Elbow Valgus",
      athleteScore: Math.round(calcScore * 0.75),
      safeThreshold: 55,
      status: "safe",
      clinicalNote: `Elbow braking torque estimated at ${Math.round(defaultTorque * 0.72)} N·m.`,
      injuryRisk: "Medial Epicondyle Load",
      preventionTip: "Avoid abrupt wrist slapping at contact; let the forearm pronate freely.",
    },
    {
      id: "lumbar_spine",
      label: "Lumbar Spine Rotation",
      shortName: "Lower Back",
      athleteScore: Math.round(calcScore * 0.65),
      safeThreshold: 55,
      status: "safe",
      clinicalNote: `Lumbar rotation torque estimated at ${Math.round(defaultTorque * 0.85)} N·m.`,
      injuryRisk: "Spinal Facet Compression",
      preventionTip: "Engage core abdominal bracing during the unit turn.",
    },
    {
      id: "lead_knee",
      label: "Lead Knee Ground Impact",
      shortName: "Landing Knee",
      athleteScore: Math.round(calcScore * 0.7),
      safeThreshold: 65,
      status: "safe",
      clinicalNote: `Knee ground reaction torque estimated at ${Math.round(defaultTorque * 1.1)} N·m.`,
      injuryRisk: "Patellar Tendon Stress",
      preventionTip: "Land balanced over a flexed front knee to absorb ground reaction forces safely.",
    },
    {
      id: "hip_joint",
      label: "Lead Hip Internal Rotation",
      shortName: "Lead Hip",
      athleteScore: Math.round(calcScore * 0.6),
      safeThreshold: 60,
      status: "safe",
      clinicalNote: `Hip uncoil load estimated at ${Math.round(defaultTorque * 0.78)} N·m.`,
      injuryRisk: "Acetabular Impingement Prevention",
      preventionTip: "Allow the rear foot to pivot through to avoid blocking the lead hip joint.",
    },
    {
      id: "wrist",
      label: "Wrist Extension Braking",
      shortName: "Wrist Strain",
      athleteScore: Math.round(calcScore * 0.5),
      safeThreshold: 55,
      status: "safe",
      clinicalNote: `Wrist braking torque estimated at ${Math.round(defaultTorque * 0.38)} N·m.`,
      injuryRisk: "Extensor Tendon Load",
      preventionTip: "Maintain relaxed fingers on the grip through contact.",
    },
  ];
}

/** Angle (radians) of the i-th of `count` evenly-spaced radar axes, starting at 12 o'clock. */
function axisAngle(index: number, count: number) {
  return (index * 2 * Math.PI) / count - Math.PI / 2;
}

export default function JointStressInjuryRiskRadar({ actionType = "forehand", profile }: Props) {
  const axes = useMemo(() => getRiskAxesForAction(actionType, profile), [actionType, profile]);
  const [selectedAxisId, setSelectedAxisId] = useState<string>(axes[0]?.id ?? "lead_knee");

  const selectedAxis = axes.find((a) => a.id === selectedAxisId) ?? axes[0];

  // Radar chart geometry (6-gon)
  const center = 160;
  const radius = 110;
  const numAxes = axes.length;

  const points = useMemo(() => {
    return axes.map((axis, i) => {
      const angle = axisAngle(i, numAxes);
      const r = (axis.athleteScore / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  }, [axes, numAxes]);

  const safePolygonPoints = useMemo(() => {
    return axes.map((axis, i) => {
      const angle = axisAngle(i, numAxes);
      const r = (axis.safeThreshold / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  }, [axes, numAxes]);

  const hasHighLoad = axes.some((a) => a.status === "high");
  const highLoadCount = axes.filter((a) => a.status === "high").length;

  return (
    <div className="space-y-6">
      {/* Main Radar Arena */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Interactive 6-Axis Radar SVG */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-ath-navy p-5 flex flex-col items-center justify-center">
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              6-Axis Torque Load (0 - 100%)
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-ath-green font-semibold">
                <span className="h-2 w-2 rounded-full bg-ath-green" /> Safe Zone
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Your Load
              </span>
            </div>
          </div>

          <div className="relative aspect-square w-full max-w-[320px]">
            <svg viewBox="0 0 320 320" className="h-full w-full select-none">
              <defs>
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                </radialGradient>
              </defs>

              {/* Concentric Safety Web Rings */}
              {[0.25, 0.5, 0.75, 1.0].map((ring) => {
                const ringPoints = axes.map((_, i) => {
                  const angle = axisAngle(i, numAxes);
                  const r = ring * radius;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                }).join(" ");

                return (
                  <polygon
                    key={ring}
                    points={ringPoints}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                    strokeDasharray={ring === 1.0 ? "none" : "3 3"}
                  />
                );
              })}

              {/* Axis Spoke Lines */}
              {axes.map((_, i) => {
                const angle = axisAngle(i, numAxes);
                const endX = center + radius * Math.cos(angle);
                const endY = center + radius * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={endX}
                    y2={endY}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Safe Threshold Envelope Area */}
              <polygon
                points={safePolygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="rgba(16,185,129,0.08)"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Athlete Measured Load Polygon */}
              <polygon
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="url(#radarFill)"
                stroke="#f43f5e"
                strokeWidth="2.5"
                style={{ filter: "drop-shadow(0 0 8px rgba(244,63,94,0.6))" }}
              />

              {/* Interactive Joint Nodes on Radar */}
              {points.map((p, i) => {
                const axis = axes[i];
                const isSelected = axis.id === selectedAxisId;
                const isExceeded = axis.athleteScore > axis.safeThreshold;

                return (
                  <g
                    key={axis.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedAxisId(axis.id)}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? "7" : "5"}
                      fill={isExceeded ? "#f43f5e" : "#10b981"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}

              {/* Axis Labels */}
              {axes.map((axis, i) => {
                const angle = axisAngle(i, numAxes);
                const labelX = center + (radius + 24) * Math.cos(angle);
                const labelY = center + (radius + 20) * Math.sin(angle);
                const isSelected = axis.id === selectedAxisId;

                return (
                  <text
                    key={axis.id}
                    x={labelX}
                    y={labelY}
                    fill={isSelected ? "#38bdf8" : axis.status === "high" ? "#f43f5e" : "#94a3b8"}
                    fontSize="8.5"
                    fontWeight={isSelected ? "900" : "700"}
                    textAnchor="middle"
                    className="cursor-pointer"
                    onClick={() => setSelectedAxisId(axis.id)}
                  >
                    {axis.shortName} ({axis.athleteScore}%)
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right 5 Cols: Selected Joint Risk Diagnostic */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-ath-navy p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                Selected Joint Assessment
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                  selectedAxis.status === "high"
                    ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
                    : selectedAxis.status === "moderate"
                    ? "bg-ath-warn/20 text-ath-warn ring-1 ring-ath-warn/30"
                    : "bg-ath-green/20 text-ath-green ring-1 ring-ath-green/30"
                }`}
              >
                {selectedAxis.status.toUpperCase()} LOAD
              </span>
            </div>

            <h4 className="mt-2 text-base font-bold text-white">{selectedAxis.label}</h4>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-300">{selectedAxis.athleteScore}% Load</span>
              <span className="text-xs text-slate-400">Safe Limit: <strong className="text-ath-green">≤ {selectedAxis.safeThreshold}%</strong></span>
            </div>

            <p className="mt-2 text-xs text-slate-300 leading-relaxed font-medium">
              {selectedAxis.clinicalNote}
            </p>
          </div>

          {/* Injury Risk Alert Card */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 backdrop-blur-xl ring-1 ring-rose-500/30">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <ShieldAlert className="h-4 w-4" />
              <span>Potential Orthopedic Risk</span>
            </div>
            <p className="mt-1 text-xs text-rose-100 font-semibold leading-relaxed">
              {selectedAxis.injuryRisk}
            </p>
          </div>

          {/* Corrective Conditioning Fix */}
          <div className="rounded-2xl border border-ath-green/30 bg-ath-green/20 p-4 backdrop-blur-xl ring-1 ring-ath-green/30">
            <div className="flex items-center gap-2 text-ath-green font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Physical Therapy & Technique Fix</span>
            </div>
            <p className="mt-1 text-xs text-ath-green font-medium leading-relaxed">
              {selectedAxis.preventionTip}
            </p>
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-ath-navy p-5">
        <p className="max-w-md text-xs text-slate-300">Estimated via Kibler-Ellenbecker kinetic chain models & video angular deceleration — not direct EMG or force plates.</p>
        <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold ${
          hasHighLoad
            ? "bg-ath-warn/20 border-ath-warn/30 text-ath-warn"
            : "bg-ath-green/20 border-ath-green/30 text-ath-green"
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <span>{highLoadCount > 0 ? `${highLoadCount} High-Load Joint Alert` : "All Joints Within Safe Limits"}</span>
        </div>
      </div>
    </div>
  );
}
