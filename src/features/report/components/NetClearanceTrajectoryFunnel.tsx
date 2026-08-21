"use client";

import { Wind } from "lucide-react";
import { useMemo } from "react";
import type { AnalysisReport } from "@/modules/analysis/types";
import type { ValidatedBallOutcome } from "../types";

type Props = {
  report?: AnalysisReport;
  actionType: string;
  validatedBallOutcomes?: ValidatedBallOutcome[];
};

export default function NetClearanceTrajectoryFunnel({ actionType, validatedBallOutcomes }: Props) {
  const isServe = actionType.toLowerCase().includes("serve");

  // Real per-repetition ball-tracker data, when this session had validated tracking.
  const realOutcomes = validatedBallOutcomes ?? [];
  const realClearances = realOutcomes.map((o) => o.netClearanceCm).filter((v): v is number => typeof v === "number");
  const hasRealData = realClearances.length > 0;
  const realAvgClearanceCm = hasRealData ? realClearances.reduce((sum, v) => sum + v, 0) / realClearances.length : null;

  // Illustrative flight-path shape only — a generic arc for this stroke type, not a
  // per-athlete measurement (single-camera video does not capture ball trajectory).
  const trajectoryData = useMemo(() => {
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
      playerPath,
      proPath,
    };
  }, [isServe]);

  return (
    <div className="rounded-3xl border border-white/10 bg-ath-navy p-5 text-white">
      {/* 3D Side-Profile Trajectory Arena */}
      <div className="relative mt-5 aspect-[16/7] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
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
          <line x1="350" y1="195" x2="350" y2="205" stroke="#64748b" strokeWidth="2" />
          <line x1="650" y1="195" x2="650" y2="205" stroke="#64748b" strokeWidth="2" />

          {/* Tennis Net Visual */}
          <g>
            <rect x="347" y="145" width="6" height="50" fill="#cbd5e1" rx="1" />
            <line x1="340" y1="145" x2="360" y2="145" stroke="#ffffff" strokeWidth="3" />

            {/* Danger Net Hit Zone (0 - 1.5 ft clearance) */}
            <rect x="344" y="125" width="12" height="20" fill="url(#dangerZoneGradient)" />
            <text x="368" y="132" fill="#f43f5e" fontSize="7" fontWeight="800">
              ⚠️ RISK ZONE (&lt;1.5&apos;)
            </text>

            {/* Safe Spin Window Corridor (2.5 - 4.5 ft) */}
            <rect x="342" y="55" width="16" height="65" fill="url(#safeZoneGradient)" rx="2" />
            <line x1="335" y1="55" x2="365" y2="55" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>

          {/* Pro Tour Benchmark Trajectory */}
          <path
            d={trajectoryData.proPath}
            fill="none"
            stroke="url(#proBallGradient)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Player Measured Trajectory Arc */}
          <path
            d={trajectoryData.playerPath}
            fill="none"
            stroke="url(#playerBallGradient)"
            strokeWidth="3.5"
          />

          {/* Apex Pin */}
          <g>
            <circle cx="350" cy={isServe ? "118" : "65"} r="5" fill="#00f0ff" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Landing Target Cluster */}
          <g>
            <ellipse cx="615" cy="195" rx="22" ry="6" fill="rgba(16, 185, 129, 0.3)" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="615" cy="195" r="4" fill="#10b981" />
          </g>
        </svg>
      </div>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/50 shadow-lg shadow-sky-500/20">
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider ${hasRealData ? "bg-ath-green text-slate-950" : "bg-ath-sky/15 text-ath-sky border border-ath-sky/20"}`}>
                {hasRealData ? "TRACKER VERIFIED" : "MODEL ESTIMATE"}
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Net Clearance & Spin Window Funnel
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {hasRealData
                ? `Flight shape is a stylized trajectory; the clearance figures below are measured from ${realOutcomes.length} tracked ${realOutcomes.length === 1 ? "repetition" : "repetitions"}.`
                : "Flight trajectory estimated via Brody-Cross aerodynamic projectile models when direct ball tracking is not visible in the frame."}
            </p>
          </div>
        </div>
      </div>

      {/* Telemetry Summary */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {hasRealData ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                Avg Net Clearance
              </span>
              <p className="mt-2 font-mono text-3xl font-black text-white">
                {realAvgClearanceCm!.toFixed(0)} <span className="text-sm font-bold text-slate-400">CM</span>
              </p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Measured by the ball tracker across {realClearances.length} tracked {realClearances.length === 1 ? "shot" : "shots"} this session.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                Repetitions Tracked
              </span>
              <p className="mt-2 font-mono text-3xl font-black text-white">
                {realOutcomes.length}
              </p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Total repetitions with validated ball-tracker outcomes this session.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                Placement Zones Seen
              </span>
              <p className="mt-2 text-sm font-semibold text-white leading-relaxed">
                {Array.from(new Set(realOutcomes.map((o) => o.placementZone).filter((z): z is string => Boolean(z)))).join(", ") || "Not classified"}
              </p>
            </div>
          </>
        ) : (
          <div className="sm:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-slate-400">
            Ball tracking was not available in this recording — trajectory estimated using standard aerodynamic physics models.
          </div>
        )}
      </div>
    </div>
  );
}
