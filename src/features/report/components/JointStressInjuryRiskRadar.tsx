"use client";

import { AlertTriangle, Shield, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

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
};

function getRiskAxesForAction(actionType: string): RiskAxis[] {
  const norm = actionType.toLowerCase();

  if (norm.includes("serve")) {
    return [
      {
        id: "shoulder_rotator",
        label: "1. Shoulder Rotator Cuff Deceleration",
        shortName: "Shoulder Cuff",
        athleteScore: 74,
        safeThreshold: 60,
        status: "high",
        clinicalNote: "Abrupt arm deceleration after contact puts excessive eccentric load on the posterior rotator cuff.",
        injuryRisk: "Rotator Cuff Tendinopathy / Infraspinatus Strain",
        preventionTip: "Allow hitting arm to follow through naturally across left hip to dissipate momentum smoothly.",
      },
      {
        id: "lumbar_spine",
        label: "2. Lumbar Spine Arching",
        shortName: "Lower Back",
        athleteScore: 68,
        safeThreshold: 55,
        status: "high",
        clinicalNote: "Tossing the ball behind head forces excessive lumbar extension and lateral facet pinching.",
        injuryRisk: "Lumbar Spondylolysis / Facet Joint Irritation",
        preventionTip: "Toss the ball 6 inches more forward into the court to arch with knees rather than lower back.",
      },
      {
        id: "lead_knee",
        label: "3. Landing Knee Impact Shock",
        shortName: "Landing Knee",
        athleteScore: 48,
        safeThreshold: 65,
        status: "safe",
        clinicalNote: "Balanced left leg landing into court absorbing 2.5x bodyweight ground force cleanly.",
        injuryRisk: "Patellar Tendon Stress",
        preventionTip: "Continue landing with soft knee flexion and balanced forward momentum.",
      },
      {
        id: "elbow_valgus",
        label: "4. Elbow Extension Snap",
        shortName: "Elbow Snap",
        athleteScore: 52,
        safeThreshold: 55,
        status: "moderate",
        clinicalNote: "Snapping elbow into full hyperextension before pronation completes.",
        injuryRisk: "Posterior Elbow Impingement",
        preventionTip: "Lead with the elbow and pronate forearm smoothly through the top of the contact window.",
      },
      {
        id: "oblique_core",
        label: "5. Oblique Core Shear",
        shortName: "Core Oblique",
        athleteScore: 28,
        safeThreshold: 55,
        status: "safe",
        clinicalNote: "Good contralateral core engagement with synchronized thoracic extension.",
        injuryRisk: "Internal Oblique Strain",
        preventionTip: "Maintain continuous rotational core stability training.",
      },
      {
        id: "kinetic_symmetry",
        label: "6. Kinetic Balance & Alignment",
        shortName: "Symmetry",
        athleteScore: 88,
        safeThreshold: 75,
        status: "safe",
        clinicalNote: "Stable trophy alignment with vertical shoulder axis tilt.",
        injuryRisk: "Asymmetric Shoulder Depletion",
        preventionTip: "Keep non-dominant arm high to preserve vertical posture axis.",
      },
    ];
  }

  // Groundstrokes (Forehand / Backhand)
  return [
    {
      id: "lead_knee",
      label: "1. Lead Knee Braking Shear",
      shortName: "Knee Shear",
      athleteScore: 78,
      safeThreshold: 65,
      status: "high",
      clinicalNote: "Stiff-legged landing generates 3.8x bodyweight braking shear into patellar tendon.",
      injuryRisk: "Patellar Tendinopathy / Jumper's Knee",
      preventionTip: "Deepen front knee flexion on deceleration to dissipate ground reaction forces smoothly.",
    },
    {
      id: "elbow_valgus",
      label: "2. Elbow Valgus Torque",
      shortName: "Elbow Valgus",
      athleteScore: 54,
      safeThreshold: 55,
      status: "moderate",
      clinicalNote: "Forearm lagging with tight grip tension increases medial epicondyle load.",
      injuryRisk: "Medial Epicondylitis (Golfer's / Tennis Elbow)",
      preventionTip: "Loosen grip pressure from 7/10 to 4/10 during backswing coil.",
    },
    {
      id: "shoulder_rotator",
      label: "3. Shoulder Deceleration Load",
      shortName: "Shoulder Cuff",
      athleteScore: 24,
      safeThreshold: 60,
      status: "safe",
      clinicalNote: "Smooth high wrap across opposite shoulder allows gradual eccentric deceleration.",
      injuryRisk: "Rotator Cuff Impingement",
      preventionTip: "Maintain continuous follow-through wrap past the chin line.",
    },
    {
      id: "lumbar_spine",
      label: "4. Lumbar Spine Hyperextension",
      shortName: "Lower Back",
      athleteScore: 18,
      safeThreshold: 50,
      status: "safe",
      clinicalNote: "Balanced rotational posture without excessive backward spine arching.",
      injuryRisk: "Lumbar Disc Compression",
      preventionTip: "Continue driving forward through the core rather than leaning back.",
    },
    {
      id: "wrist_extensor",
      label: "5. Wrist Extensor Strain",
      shortName: "Wrist Strain",
      athleteScore: 32,
      safeThreshold: 55,
      status: "safe",
      clinicalNote: "Fluid kinetic whip snaps cleanly without snapping or breaking wrist angle.",
      injuryRisk: "Extensor Carpi Tendinitis",
      preventionTip: "Use full arm pronation rather than wrist-only flicking.",
    },
    {
      id: "kinetic_symmetry",
      label: "6. Kinetic Chain Symmetry",
      shortName: "Symmetry",
      athleteScore: 92,
      safeThreshold: 75,
      status: "safe",
      clinicalNote: "Equal balance distribution and smooth rotational timing across bilateral joints.",
      injuryRisk: "Asymmetric Muscle Compensation",
      preventionTip: "Maintain bilateral core stability conditioning.",
    },
  ];
}

/** Angle (radians) of the i-th of `count` evenly-spaced radar axes, starting at 12 o'clock. */
function axisAngle(index: number, count: number) {
  return (index * 2 * Math.PI) / count - Math.PI / 2;
}

export default function JointStressInjuryRiskRadar({ actionType = "forehand" }: Props) {
  const axes = useMemo(() => getRiskAxesForAction(actionType), [actionType]);
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
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl flex flex-col items-center justify-center">
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
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl">
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

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-5 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-300 ring-1 ring-white/15">
              <Shield className="h-3.5 w-3.5" />
              Illustrative
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-slate-300">
              {actionType.replace("_", " ").toUpperCase()} · 6-Axis Stress
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Joint Stress & Injury Risk Radar
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            Typical joint-load pattern for this stroke type — not measured from your video (no force plates or EMG in a single-camera capture).
          </p>
        </div>

        {/* Overall Status Badge */}
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
