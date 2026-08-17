"use client";

import { Info, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type KinematicMetric = {
  id: string;
  label: string;
  value: string;
  unit: string;
  tourBenchmark: string;
  delta: string;
  status: "optimal" | "warning" | "alert";
  category: "racket" | "body_3dma" | "ball_flight";
  definition: string;
  coachingCue: string;
};

type Props = {
  actionType?: string;
  onSelectMetric?: (metricId: string) => void;
};

export default function KinematicDataMatrix({ actionType = "forehand", onSelectMetric }: Props) {
  const [activeCategory, setActiveCategory] = useState<"all" | "racket" | "body_3dma" | "ball_flight">("all");
  const [inspectedMetric, setInspectedMetric] = useState<KinematicMetric | null>(null);

  const isServe = actionType.toLowerCase().includes("serve");

  // Dynamic stroke-aware Kinematic Telemetry parameters
  const metrics: KinematicMetric[] = useMemo(() => {
    if (isServe) {
      return [
        {
          id: "racket_speed",
          label: "Racket Head Speed",
          value: "112.4",
          unit: "mph",
          tourBenchmark: "115 - 128 mph",
          delta: "Near Tour",
          status: "optimal",
          category: "racket",
          definition: "Linear speed of racket geometric center 2ms prior to ball impact.",
          coachingCue: "Accelerate wrist snap at the peak of the trophy extension.",
        },
        {
          id: "impact_height",
          label: "Impact Apex Height",
          value: "2.84",
          unit: "m",
          tourBenchmark: "2.80 - 2.95 m",
          delta: "Optimal Apex",
          status: "optimal",
          category: "racket",
          definition: "Vertical height of stringbed contact above ground level.",
          coachingCue: "Strike at full upward extension to maximize clearance angles.",
        },
        {
          id: "pronation_vel",
          label: "Forearm Pronation",
          value: "1420",
          unit: "°/s",
          tourBenchmark: "1550 - 1800 °/s",
          delta: "-130 °/s",
          status: "warning",
          category: "body_3dma",
          definition: "Peak internal rotational velocity of forearm through contact.",
          coachingCue: "Pronate palm outward to the right fence immediately after strike.",
        },
        {
          id: "shoulder_tilt",
          label: "Shoulder Cartwheel Tilt",
          value: "38.5",
          unit: "°",
          tourBenchmark: "42 - 50 °",
          delta: "-4.5° Tilt",
          status: "alert",
          category: "body_3dma",
          definition: "Vertical angle between dominant and non-dominant shoulder in trophy pose.",
          coachingCue: "Drop hitting shoulder lower and drive upward with leading hip.",
        },
        {
          id: "spin_rate",
          label: "Ball Spin Rate",
          value: "3150",
          unit: "RPM",
          tourBenchmark: "2800 - 3600 RPM",
          delta: "+350 RPM",
          status: "optimal",
          category: "ball_flight",
          definition: "Revolutions per minute imparted on ball at launch.",
          coachingCue: "Brush up the back edge of the ball from 7 o'clock to 1 o'clock.",
        },
        {
          id: "launch_angle",
          label: "Vertical Launch Angle",
          value: "9.2",
          unit: "°",
          tourBenchmark: "8.5 - 11.0 °",
          delta: "Ideal Flight",
          status: "optimal",
          category: "ball_flight",
          definition: "Initial trajectory vector angle relative to horizontal plane.",
          coachingCue: "Maintain firm wrist angle through string compression.",
        },
      ];
    }

    // Forehand / Backhand Defaults
    return [
      {
        id: "racket_speed",
        label: "Racket Head Speed",
        value: "74.8",
        unit: "mph",
        tourBenchmark: "76 - 84 mph",
        delta: "Optimal Pace",
        status: "optimal",
        category: "racket",
        definition: "Peak speed of racket center of percussion before ball impact.",
        coachingCue: "Relax grip pressure to 4/10 to unlock whip acceleration.",
      },
      {
        id: "attack_angle",
        label: "Vertical Attack Angle",
        value: "+16.8",
        unit: "°",
        tourBenchmark: "+14° to +20°",
        delta: "True Lift",
        status: "optimal",
        category: "racket",
        definition: "Low-to-high swing path ascent angle into the ball.",
        coachingCue: "Drop the racket head 6 inches below the ball before driving up.",
      },
      {
        id: "face_angle",
        label: "Face Angle at Impact",
        value: "-2.4",
        unit: "°",
        tourBenchmark: "-1.5° to -3.5°",
        delta: "Square Face",
        status: "optimal",
        category: "racket",
        definition: "Racket face orientation relative to incoming flight path at strike.",
        coachingCue: "Keep wrist locked and drive through 3 imaginary balls.",
      },
      {
        id: "hip_shoulder_separation",
        label: "Hip-Shoulder Lag",
        value: "22.5",
        unit: "°",
        tourBenchmark: "28° - 35°",
        delta: "-6.5° Lag Loss",
        status: "alert",
        category: "body_3dma",
        definition: "Angular difference between pelvis rotation and upper torso rotation.",
        coachingCue: "Hold chest sideways while leading the forward drive with your belly button.",
      },
      {
        id: "pelvis_angular_velocity",
        label: "Pelvis Rotation",
        value: "540",
        unit: "°/s",
        tourBenchmark: "620 - 750 °/s",
        delta: "-80 °/s",
        status: "warning",
        category: "body_3dma",
        definition: "Peak rotational speed of the hips during forward uncoiling.",
        coachingCue: "Drive hard off the back foot to ignite hip uncoiling earlier.",
      },
      {
        id: "arm_deceleration",
        label: "Shoulder Braking Torque",
        value: "52.0",
        unit: "N·m",
        tourBenchmark: "< 45 N·m",
        delta: "+7 N·m Load",
        status: "warning",
        category: "body_3dma",
        definition: "Eccentric deceleration load absorbed by posterior rotator cuff.",
        coachingCue: "Let your hitting arm wrap fully across the opposite hip to dissipate energy.",
      },
      {
        id: "ball_exit_speed",
        label: "Ball Exit Speed",
        value: "71.2",
        unit: "mph",
        tourBenchmark: "75 - 82 mph",
        delta: "-3.8 mph",
        status: "warning",
        category: "ball_flight",
        definition: "Speed of tennis ball leaving stringbed after energy compression.",
        coachingCue: "Meet the ball 10 inches further in front of your lead hip.",
      },
      {
        id: "spin_rate",
        label: "Topspin Rate",
        value: "2850",
        unit: "RPM",
        tourBenchmark: "2700 - 3400 RPM",
        delta: "Heavy Spin",
        status: "optimal",
        category: "ball_flight",
        definition: "Forward revolution rate creating aerodynamic Magnus downforce.",
        coachingCue: "Brush up the back of the ball aggressively through the contact zone.",
      },
      {
        id: "net_clearance",
        label: "Net Clearance Apex",
        value: "3.2",
        unit: "ft",
        tourBenchmark: "2.8 - 3.8 ft",
        delta: "Safe Clearance",
        status: "optimal",
        category: "ball_flight",
        definition: "Trajectory height above net center for safe depth consistency.",
        coachingCue: "Aim for a high 3-foot window above the white net tape.",
      },
    ];
  }, [isServe]);

  const filteredMetrics = useMemo(() => {
    if (activeCategory === "all") return metrics;
    return metrics.filter((m) => m.category === activeCategory);
  }, [metrics, activeCategory]);

  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-5 sm:p-7 backdrop-blur-2xl shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-black text-white">Live Stroke Telemetry</h3>
          <p className="text-xs text-slate-400">9 core parameters from 60fps optical tracking</p>
        </div>

        {/* Category Filters (iOS Segmented Pills) */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          {[
            { id: "all", label: "All (9)" },
            { id: "racket", label: "Racket" },
            { id: "body_3dma", label: "Body" },
            { id: "ball_flight", label: "Ball" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
              className={`rounded-lg px-3 py-1.5 font-bold transition text-xs ${
                activeCategory === cat.id
                  ? "bg-ath-lime text-ath-navy shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Apple Watch Style Telemetry Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filteredMetrics.map((m) => {
          const isInspected = inspectedMetric?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setInspectedMetric(isInspected ? null : m);
                onSelectMetric?.(m.id);
              }}
              className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                isInspected
                  ? "border-ath-lime bg-ath-lime/10 shadow-lg shadow-ath-lime/10 ring-1 ring-ath-lime"
                  : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90"
              }`}
            >
              {/* Top Row: Metric Label & Status Dot */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 truncate pr-1">
                  {m.label}
                </span>
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    m.status === "optimal"
                      ? "bg-ath-green shadow-sm shadow-ath-green/80"
                      : m.status === "warning"
                      ? "bg-ath-warn shadow-sm shadow-ath-warn/80"
                      : "bg-rose-400 shadow-sm shadow-rose-400/80"
                  }`}
                />
              </div>

              {/* Center: Large Value */}
              <div className="my-2 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {m.value}
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">{m.unit}</span>
              </div>

              {/* Bottom: Benchmark Info */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[0.65rem]">
                <span className="text-slate-400">Tour Benchmark:</span>
                <span className="font-mono font-bold text-slate-200">{m.tourBenchmark}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Metric Inspector Drawer */}
      {inspectedMetric && (
        <div className="mt-4 rounded-2xl border border-ath-lime/30 bg-ath-lime/5 p-4 text-xs backdrop-blur-md animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-ath-lime p-2 text-ath-navy font-black">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-black text-white text-sm">{inspectedMetric.label}</h4>
                <p className="text-slate-300 mt-0.5">{inspectedMetric.definition}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedMetric(null)}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/20"
            >
              Done
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-ath-green/10 border border-ath-green/20 p-3 text-emerald-100">
            <Sparkles className="h-4 w-4 shrink-0 text-ath-green mt-0.5" />
            <div>
              <strong className="font-bold text-white">Biomechanical Feel Cue: </strong>
              <span>{inspectedMetric.coachingCue}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
