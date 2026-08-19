"use client";

import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Dumbbell,
  Eye,
  Gauge,
  LayoutDashboard,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import AthlentraMark from "@/components/design-system/AthlentraMark";
import { getSport } from "@/lib/sports";
import type { PlayerReportProps } from "../types";
import { buildPlayerReportView } from "../model/view-model";
import { concise, plainLanguage } from "../model/plain-language";
import { resolveThreePracticeDrills } from "../model/practice-drills";
import { computePlayerBiomechanicalProfile } from "../motion/player-kinetics-engine";
import type { MotionStage } from "../motion/motion-model";
import TennisBiomechanicsIndex from "./TennisBiomechanicsIndex";
import KinematicDataMatrix from "./KinematicDataMatrix";
import KineticEnergyTransferStudio from "./KineticEnergyTransferStudio";
import CoachVisionStudio from "./CoachVisionStudio";
import BiomechanicalExplorer from "./BiomechanicalExplorer";
import JointStressInjuryRiskRadar from "./JointStressInjuryRiskRadar";
import RotatorCuffDecelerationBarometer from "./RotatorCuffDecelerationBarometer";
import NetClearanceTrajectoryFunnel from "./NetClearanceTrajectoryFunnel";
import WeightTransferStudio from "./WeightTransferStudio";
import SessionTrend, { type SessionTrendPoint } from "./insights/SessionTrend";
import CoachAIDrawer from "./CoachAIDrawer";

type ReportTab = "hub" | "overview" | "video" | "phases" | "energy" | "weight_transfer" | "telemetry" | "injury" | "tracking" | "practice" | "longitudinal";
type InjuryView = "joint_stress" | "shoulder_braking";

export default function V6PlayerReport(props: PlayerReportProps & { sessionId: string; previewOnly?: boolean }) {
  const {
    report,
    actionType,
    sportId,
    sessionId,
    strokeHistory,
    athleteContext,
    videoUrl,
    validatedBallOutcomes,
  } = props;
  const sport = getSport(sportId);
  const resolvedActionType = report.movementClassification?.analysisAction ?? actionType;
  const view = buildPlayerReportView(report, resolvedActionType);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [selectedStage, setSelectedStage] = useState<MotionStage>("forward_swing_contact");
  const [injuryView, setInjuryView] = useState<InjuryView>("joint_stress");
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);
  const actionOptions = sport.actions.map((item) => ({ id: item.id, label: item.label }));

  const movement =
    report.movementClassification?.analysisActionLabel ??
    sport.actions.find((item) => item.id === actionType)?.label ??
    actionType.replaceAll("_", " ");

  // Dynamic player-specific biomechanics computed directly from video frames
  const kinetics = useMemo(() => {
    return computePlayerBiomechanicalProfile(report, resolvedActionType);
  }, [report, resolvedActionType]);

  // Guarantees at least 3 structured practice drills tailored to this stroke & priority flaw
  const practiceDrills = resolveThreePracticeDrills(report, movement);
  const firstDrill = practiceDrills[0];

  const trendPoints: SessionTrendPoint[] = (strokeHistory ?? []).map((item) => ({
    sessionId: item.sessionId,
    date: new Date(item.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: item.score,
    consistency: null,
    capture: 0,
  }));

  const hubTiles: Array<{ id: ReportTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "video", label: "Video", icon: Eye },
    { id: "phases", label: "Stroke Phases", icon: Activity },
    { id: "energy", label: "Energy Flow", icon: Zap },
    { id: "weight_transfer", label: "Weight Transfer", icon: Scale },
    { id: "telemetry", label: "Telemetry", icon: Gauge },
    { id: "injury", label: "Injury Risk", icon: ShieldAlert },
    { id: "tracking", label: "Ball Tracking", icon: Wind },
    { id: "practice", label: "Practice", icon: Dumbbell },
    { id: "longitudinal", label: "Longitudinal Analysis", icon: TrendingUp },
  ];
  const sectionLabel = hubTiles.find((tile) => tile.id === activeTab)?.label ?? "";

  function goTo(tab: ReportTab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 pb-8 pt-1 sm:px-6">
      {activeTab === "hub" ? (
        /* Landing hub: every section one tap away, no scroll */
        <div className="fixed inset-0 z-[60] flex flex-col bg-ath-navy px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex flex-col items-center gap-1 py-3">
            <AthlentraMark inverse />
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-ath-lime capitalize">{movement}</p>
          </div>

          <div className="mt-4 grid flex-1 auto-rows-fr grid-cols-2 gap-3">
            {hubTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => goTo(tile.id)}
                className="flex flex-col items-center justify-center gap-2.5 rounded-3xl border border-white/10 bg-white/5 text-white transition active:scale-95 active:bg-white/10"
              >
                <tile.icon className="h-7 w-7 text-ath-lime" />
                <span className="text-sm font-bold">{tile.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCoachDrawerOpen(true)}
            className="mt-3 flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-ath-lime text-sm font-black text-ath-navy shadow-lg shadow-black/20 transition active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            <span>Ask the Coach</span>
          </button>
        </div>
      ) : (
        <>
          {/* Header: back to hub, section name, Ask Coach */}
          <header className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => goTo("hub")}
              className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3.5 text-xs font-bold text-white transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Hub</span>
            </button>
            <h1 className="text-xs font-black uppercase tracking-[0.14em] text-white">{sectionLabel}</h1>
            <button
              type="button"
              onClick={() => setIsCoachDrawerOpen(true)}
              className="flex min-h-10 items-center gap-2 rounded-full bg-ath-lime px-3.5 text-xs font-black text-ath-navy shadow-lg shadow-black/20 transition active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </header>

      {/* Overview: score + top priority */}
      {activeTab === "overview" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          <TennisBiomechanicsIndex report={report} movementName={movement} />

          <button
            type="button"
            onClick={() => goTo("video")}
            className="w-full flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-left transition hover:border-white/20 active:scale-[0.99] backdrop-blur-xl group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ath-lime/15 text-ath-lime ring-1 ring-ath-lime/30">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-ath-lime transition">
                  Open the video
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  See exactly where each correction shows up, stage by stage
                </p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 -rotate-90 text-slate-400 group-hover:translate-x-1 transition" />
          </button>
        </section>
      )}

      {/* Video: Player's raw video movement analysis */}
      {activeTab === "video" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          <CoachVisionStudio
            videoUrl={videoUrl}
            previewOnly={props.previewOnly}
            report={report}
            sessionId={sessionId}
            actionType={resolvedActionType}
            actionOptions={actionOptions}
            athleteContext={athleteContext}
          />
        </section>
      )}

      {/* Phases: per-stage benchmark, checkpoints, and common mistakes */}
      {activeTab === "phases" && (
        <section className="animate-in fade-in duration-200">
          <BiomechanicalExplorer
            profile={report.frameSummary?.biomechanicalProfile}
            sessionId={sessionId}
            actionType={resolvedActionType}
          />
        </section>
      )}

      {/* Energy flow: power waterfall, net clearance, joint load */}
      {activeTab === "energy" && (
        <section className="animate-in fade-in duration-200">
          <KineticEnergyTransferStudio
            currentStage={selectedStage}
            onSeekToStage={setSelectedStage}
            actionType={resolvedActionType}
            profile={kinetics}
          />
        </section>
      )}

      {/* Weight Transfer: seesaw balance, moment detail, 4-phase storyboard */}
      {activeTab === "weight_transfer" && (
        <section className="animate-in fade-in duration-200">
          <WeightTransferStudio
            currentStage={selectedStage}
            onSeekToStage={setSelectedStage}
            profile={kinetics}
          />
        </section>
      )}

      {/* Telemetry: live 9-tile kinematic dashboard */}
      {activeTab === "telemetry" && (
        <section className="animate-in fade-in duration-200">
          <KinematicDataMatrix
            actionType={resolvedActionType}
            profile={kinetics}
            report={report}
          />
        </section>
      )}

      {/* Injury Risk: every joint-load/safety view lives here, nowhere else */}
      {activeTab === "injury" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setInjuryView("joint_stress")}
              className={`min-h-9 rounded-lg text-xs font-bold transition ${injuryView === "joint_stress" ? "bg-ath-lime text-ath-navy" : "text-slate-400 hover:text-white"}`}
            >
              Joint Stress
            </button>
            <button
              type="button"
              onClick={() => setInjuryView("shoulder_braking")}
              className={`min-h-9 rounded-lg text-xs font-bold transition ${injuryView === "shoulder_braking" ? "bg-ath-lime text-ath-navy" : "text-slate-400 hover:text-white"}`}
            >
              Shoulder Braking
            </button>
          </div>

          {injuryView === "joint_stress" ? (
            <JointStressInjuryRiskRadar actionType={resolvedActionType} profile={kinetics} />
          ) : (
            <RotatorCuffDecelerationBarometer actionType={resolvedActionType} profile={kinetics} />
          )}
        </section>
      )}

      {/* Ball Tracking: 3D net clearance and spin window (Hawk-Eye style) */}
      {activeTab === "tracking" && (
        <section className="animate-in fade-in duration-200">
          <NetClearanceTrajectoryFunnel actionType={resolvedActionType} validatedBallOutcomes={validatedBallOutcomes} />
        </section>
      )}

      {/* Practice drills */}
      {activeTab === "practice" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {firstDrill ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-black text-ath-lime">{practiceDrills.length}</span>
                <span className="text-xs text-slate-400">{practiceDrills.length === 1 ? "drill" : "drills"} in today&apos;s plan</span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-ath-lime/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-ath-lime ring-1 ring-ath-lime/30">
                  Daily Prescribed Drill
                </span>
                <span className="text-xs text-slate-400 font-mono">15 Min Protocol</span>
              </div>

              <h2 className="mt-3 text-2xl font-black text-white">
                {plainLanguage(firstDrill.name)}
              </h2>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {concise(firstDrill.purpose, 160)}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-400 block">Dosage</span>
                  <span className="mt-1 text-sm font-black text-white block">{plainLanguage(firstDrill.dosage)}</span>
                </div>

                <div className="rounded-2xl border border-ath-lime/30 bg-ath-lime/10 p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-ath-lime block">Primary Feel Cue</span>
                  <span className="mt-1 text-sm font-black text-white block">“{plainLanguage(firstDrill.cue)}”</span>
                </div>

                <div className="rounded-2xl border border-ath-sky/30 bg-ath-sky/10 p-4">
                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-ath-sky block">Success Metric</span>
                  <span className="mt-1 text-sm font-black text-white block">{plainLanguage(firstDrill.successMetric)}</span>
                </div>
              </div>

              {practiceDrills.length > 1 && (
                <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Progression Ladder</h4>
                  {practiceDrills.slice(1).map((drill, index) => (
                    <div key={drill.id} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-3.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                        {index + 2}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-white">{plainLanguage(drill.name)}</h5>
                        <p className="text-[0.68rem] text-slate-300 mt-0.5">{plainLanguage(drill.dosage)} · <span className="text-ath-lime font-bold">“{plainLanguage(drill.cue)}”</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center text-xs text-slate-300">
              Practice shadow swings focusing on: “{view.coachingCue}”
            </div>
          )}
        </section>
      )}

      {/* Longitudinal Analysis: multi-session trend for this movement */}
      {activeTab === "longitudinal" && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {trendPoints.length >= 2 ? (
            <SessionTrend points={trendPoints} currentSessionId={sessionId} />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center text-xs text-slate-300">
              This is your first recorded session for this movement — your trend will appear here once you have at least two sessions to compare.
            </div>
          )}
        </section>
      )}
        </>
      )}

      <CoachAIDrawer
        isOpen={isCoachDrawerOpen}
        onClose={() => setIsCoachDrawerOpen(false)}
        sessionId={sessionId}
        report={report}
        movementName={movement}
      />
    </div>
  );
}
