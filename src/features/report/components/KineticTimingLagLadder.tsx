"use client";

import { Clock } from "lucide-react";
import type { AnalysisReport } from "@/modules/analysis/types";

type Props = {
  report?: AnalysisReport;
  actionType: string;
};

type TimingStep = {
  id: string;
  segment: string;
  athleteTimeMs: number;
  proTimeMs: number;
  lagMs: number;
  proLagMs: number;
  status: "optimal" | "early_leak" | "delayed";
  insight: string;
};

export default function KineticTimingLagLadder({ actionType }: Props) {
  const isServe = actionType.toLowerCase().includes("serve");

  const steps: TimingStep[] = isServe
    ? [
        {
          id: "legs",
          segment: "1. Ground Spring & Knee Extension",
          athleteTimeMs: 0,
          proTimeMs: 0,
          lagMs: 0,
          proLagMs: 0,
          status: "optimal",
          insight: "Explosive upward launch from deep knee loading.",
        },
        {
          id: "hips",
          segment: "2. Pelvis Cartwheel & Uncoil",
          athleteTimeMs: 110,
          proTimeMs: 125,
          lagMs: 110,
          proLagMs: 125,
          status: "optimal",
          insight: "Pelvis tilts and uncoils upward toward the ball.",
        },
        {
          id: "torso",
          segment: "3. Thoracic Spine & Chest Whip",
          athleteTimeMs: 145,
          proTimeMs: 175,
          lagMs: 35,
          proLagMs: 50,
          status: "early_leak",
          insight: "Upper body fired 15ms too quickly before full shoulder tilt.",
        },
        {
          id: "arm",
          segment: "4. Upper Arm & Elbow Cartwheel",
          athleteTimeMs: 180,
          proTimeMs: 215,
          lagMs: 35,
          proLagMs: 40,
          status: "optimal",
          insight: "Elbow leads into the high trophy slot.",
        },
        {
          id: "wrist",
          segment: "5. Forearm Pronation & Contact Snap",
          athleteTimeMs: 210,
          proTimeMs: 245,
          lagMs: 30,
          proLagMs: 30,
          status: "optimal",
          insight: "Peak contact snap delivers maximum racket head velocity.",
        },
      ]
    : [
        {
          id: "legs",
          segment: "1. Ground Reaction Drive",
          athleteTimeMs: 0,
          proTimeMs: 0,
          lagMs: 0,
          proLagMs: 0,
          status: "optimal",
          insight: "Back foot push initiates forward momentum.",
        },
        {
          id: "hips",
          segment: "2. Pelvis Rotational Uncoil",
          athleteTimeMs: 95,
          proTimeMs: 120,
          lagMs: 95,
          proLagMs: 120,
          status: "early_leak",
          insight: "Hips opened 25ms prematurely before shoulder turn was set.",
        },
        {
          id: "torso",
          segment: "3. Torso Core Uncoiling (X-Factor)",
          athleteTimeMs: 130,
          proTimeMs: 165,
          lagMs: 35,
          proLagMs: 45,
          status: "optimal",
          insight: "Elastic recoil whips from abdominal obliques.",
        },
        {
          id: "arm",
          segment: "4. Racket Drop Lag Slot",
          athleteTimeMs: 160,
          proTimeMs: 200,
          lagMs: 30,
          proLagMs: 35,
          status: "early_leak",
          insight: "Shallow racket drop limits gravitational whip.",
        },
        {
          id: "wrist",
          segment: "5. Terminal Forearm Pronation Snap",
          athleteTimeMs: 190,
          proTimeMs: 230,
          lagMs: 30,
          proLagMs: 30,
          status: "optimal",
          insight: "Clean wrist snap through the hitting window.",
        },
      ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#090e1a] via-[#060a14] to-[#04060c] p-5 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/20">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-500 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-black">
                KINEMATIC TIMING CASCADE
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Kinetic Timing Lag Ladder
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Millisecond Sequential Handoff Delays vs. ATP/WTA Gold Standard
            </p>
          </div>
        </div>

        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30">
          Kinetic Sequence Index: 78%
        </span>
      </div>

      {/* Timing Ladder Visualization */}
      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const isEarly = step.status === "early_leak";
          return (
            <div
              key={step.id}
              className={`rounded-2xl border p-4 transition ${
                isEarly
                  ? "border-amber-500/30 bg-amber-950/10"
                  : "border-white/10 bg-slate-900/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-mono font-bold text-slate-200">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold text-white sm:text-sm">{step.segment}</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400">You:</span>
                    <span className="font-black text-emerald-400">+{step.athleteTimeMs} ms</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400">Pro:</span>
                    <span className="font-bold text-sky-300">+{step.proTimeMs} ms</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold uppercase ${
                      isEarly
                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                    }`}
                  >
                    {isEarly ? "PREMATURE LEAK (-25ms)" : "OPTIMAL SEQUENCE"}
                  </span>
                </div>
              </div>

              {/* Visual Millisecond Progress Bar */}
              <div className="mt-3 relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (step.athleteTimeMs / 250) * 100)}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">{step.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
