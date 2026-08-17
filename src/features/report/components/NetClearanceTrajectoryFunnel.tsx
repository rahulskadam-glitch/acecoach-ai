"use client";

import { Wind } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalysisReport } from "@/modules/analysis/types";

type Props = {
  report?: AnalysisReport;
  actionType: string;
};

export default function NetClearanceTrajectoryFunnel({ actionType }: Props) {
  const [targetType, setTargetType] = useState<"crosscourt" | "down_the_line">("crosscourt");
  const isServe = actionType.toLowerCase().includes("serve");

  // Physics trajectory calculation based on stroke launch angle and topspin
  const trajectoryData = useMemo(() => {
    const launchSpeedMph = isServe ? 112 : 78;
    const launchAngleDeg = isServe ? -4.5 : +14.2;
    const topspinRpm = isServe ? 3100 : 2650;
    const netClearanceFt = isServe ? 1.4 : 3.2; // Net height is 3.0 ft in center
    const baselineDepthM = isServe ? 0.4 : 0.85; // Distance inside line

    // SVG path curve points for 3D side profile flight
    // Coordinate space: Court Length 0 to 700px, Height 0 to 220px (inverted)
    // Player at X=50, Net at X=350, Opponent Baseline at X=650
    const points: Array<[number, number]> = [];
    const proPoints: Array<[number, number]> = [];

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 to 1
      const x = 50 + t * 600;

      // Player arc with Magnus dip
      // Apex around t=0.45 (just before or over net)
      let y: number;
      if (isServe) {
        // High contact at Y=40, downwards laser over net (Y=120 at X=350), bounces at X=480
        y = 50 + t * 90 + Math.pow(t, 2) * 50;
      } else {
        // Groundstroke: launch at Y=140, apex at Y=65 (3.2ft clearance), dip down to Y=180 at X=620
        const apexY = 65;
        const startY = 145;
        // Parabolic arc with heavy topspin drop on back half
        const topspinPull = Math.pow(t, 2.4) * 45;
        y = startY - Math.sin(t * Math.PI) * (startY - apexY) + topspinPull;
      }
      points.push([x, Math.min(195, y)]);

      // Pro Tour benchmark arc (Apex 3.5ft, deeper dip)
      const proApexY = isServe ? 45 : 55;
      const proStartY = isServe ? 40 : 145;
      const proTopspinPull = Math.pow(t, 2.6) * 55;
      const proY = isServe
        ? 45 + t * 85 + Math.pow(t, 2) * 60
        : proStartY - Math.sin(t * Math.PI) * (proStartY - proApexY) + proTopspinPull;
      proPoints.push([x, Math.min(195, proY)]);
    }

    const playerPath = `M ${points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L ")}`;
    const proPath = `M ${proPoints.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L ")}`;

    return {
      launchSpeedMph,
      launchAngleDeg,
      topspinRpm,
      netClearanceFt,
      baselineDepthM,
      playerPath,
      proPath,
    };
  }, [isServe]);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#090e1a] via-[#060a14] to-[#04060c] p-5 shadow-2xl text-white">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/50 shadow-lg shadow-sky-500/20">
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-black">
                3D FLIGHT APEX
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Net Clearance & Spin Window Funnel
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              3D Ball Flight Apex, Magnus Topspin Arc, and Depth Envelope
            </p>
          </div>
        </div>

        {/* Target Mode Toggle */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTargetType("crosscourt")}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              targetType === "crosscourt"
                ? "bg-white text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Crosscourt
          </button>
          <button
            type="button"
            onClick={() => setTargetType("down_the_line")}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              targetType === "down_the_line"
                ? "bg-white text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Down The Line
          </button>
        </div>
      </div>

      {/* 3D Side-Profile Trajectory Arena */}
      <div className="relative mt-5 aspect-[16/7] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-4">
        <svg viewBox="0 0 700 220" className="h-full w-full">
          <defs>
            <linearGradient id="playerBallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="proBallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="safeZoneGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.25)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.0)" />
            </linearGradient>

            <linearGradient id="dangerZoneGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(244, 63, 94, 0.3)" />
              <stop offset="100%" stopColor="rgba(244, 63, 94, 0.0)" />
            </linearGradient>
          </defs>

          {/* Court Floor Grid */}
          <line x1="30" y1="195" x2="670" y2="195" stroke="#334155" strokeWidth="2.5" />
          <line x1="50" y1="195" x2="50" y2="205" stroke="#64748b" strokeWidth="2" />
          <text x="50" y="215" fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle">
            YOUR BASELINE
          </text>

          <line x1="350" y1="195" x2="350" y2="205" stroke="#64748b" strokeWidth="2" />
          <text x="350" y="215" fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle">
            NET (3.0 FT)
          </text>

          <line x1="650" y1="195" x2="650" y2="205" stroke="#64748b" strokeWidth="2" />
          <text x="650" y="215" fill="#94a3b8" fontSize="8" fontWeight="700" textAnchor="middle">
            OPPONENT BASELINE
          </text>

          {/* Tennis Net Visual */}
          <g>
            <rect x="347" y="145" width="6" height="50" fill="#cbd5e1" rx="1" />
            <line x1="340" y1="145" x2="360" y2="145" stroke="#ffffff" strokeWidth="3" />
            <text x="350" y="138" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">
              NET 3.0&apos;
            </text>

            {/* Danger Net Hit Zone (0 - 1.5 ft clearance) */}
            <rect x="344" y="125" width="12" height="20" fill="url(#dangerZoneGradient)" />
            <text x="368" y="132" fill="#f43f5e" fontSize="7" fontWeight="800">
              ⚠️ RISK ZONE (&lt;1.5&apos;)
            </text>

            {/* Safe Spin Window Corridor (2.5 - 4.5 ft) */}
            <rect x="342" y="55" width="16" height="65" fill="url(#safeZoneGradient)" rx="2" />
            <line x1="335" y1="55" x2="365" y2="55" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" />
            <text x="350" y="48" fill="#34d399" fontSize="7.5" fontWeight="800" textAnchor="middle">
              SAFE APEX WINDOW (2.5 - 4.0 FT)
            </text>
          </g>

          {/* Pro Tour Benchmark Trajectory */}
          <path
            d={trajectoryData.proPath}
            fill="none"
            stroke="url(#proBallGradient)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <text x="210" y="50" fill="#94a3b8" fontSize="7.5" fontWeight="700">
            Tour Benchmark Arc (Apex +3.5 ft)
          </text>

          {/* Player Measured Trajectory Arc */}
          <path
            d={trajectoryData.playerPath}
            fill="none"
            stroke="url(#playerBallGradient)"
            strokeWidth="3.5"
          />

          {/* Measured Trajectory Apex Pin */}
          <g>
            <circle cx="350" cy={isServe ? "118" : "65"} r="5" fill="#00f0ff" stroke="#ffffff" strokeWidth="2" />
            <rect x="315" y="15" width="70" height="22" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="#00f0ff" strokeWidth="1" />
            <text x="350" y="26" fill="#00f0ff" fontSize="7.5" fontWeight="800" textAnchor="middle">
              CLEARANCE: +{trajectoryData.netClearanceFt.toFixed(1)} FT
            </text>
            <text x="350" y="34" fill="#94a3b8" fontSize="6.5" fontWeight="600" textAnchor="middle">
              Spin Window: OPTIMAL
            </text>
          </g>

          {/* Landing Target Cluster */}
          <g>
            <ellipse cx="615" cy="195" rx="22" ry="6" fill="rgba(16, 185, 129, 0.3)" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="615" cy="195" r="4" fill="#10b981" />
            <text x="615" y="180" fill="#34d399" fontSize="7.5" fontWeight="800" textAnchor="middle">
              LANDING: {trajectoryData.baselineDepthM}M IN
            </text>
          </g>
        </svg>
      </div>

      {/* 3 Telemetry Summary Cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Net Clearance Margin
            </span>
            <span className="rounded-full bg-ath-green/20 px-2 py-0.5 text-[0.62rem] font-extrabold text-ath-green">
              SAFE WINDOW
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-black text-white">
            +{trajectoryData.netClearanceFt} <span className="text-sm font-bold text-slate-400">FT</span>
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Eliminates net errors while heavy topspin forces the ball downward inside the baseline.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Magnus Topspin RPM
            </span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[0.62rem] font-extrabold text-sky-400">
              {trajectoryData.topspinRpm} RPM
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-black text-white">
            {trajectoryData.topspinRpm} <span className="text-sm font-bold text-slate-400">RPM</span>
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Creates 420 N of downward Magnus dipping pressure, pulling deep balls safely inside the court.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              Baseline Depth Margin
            </span>
            <span className="rounded-full bg-ath-green/20 px-2 py-0.5 text-[0.62rem] font-extrabold text-ath-green">
              DEEP PENETRATION
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-black text-white">
            {trajectoryData.baselineDepthM} <span className="text-sm font-bold text-slate-400">M IN</span>
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Pushes opponents 3 feet behind the baseline, preventing them from stepping in to attack.
          </p>
        </div>
      </div>
    </div>
  );
}
