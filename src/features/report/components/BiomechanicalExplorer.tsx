"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Eye, GitBranch, Info, LoaderCircle, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

import { confirmMovementAndReanalyze } from "@/app/actions/analysis-actions";
import type { BiomechanicalLinkage, BiomechanicalMetric, BiomechanicalProfile } from "@/modules/analysis/types";

type Props = {
  profile?: BiomechanicalProfile;
  sessionId: string;
  actionType: string;
};

const linkageStyle: Record<BiomechanicalLinkage["status"], { label: string; dot: string; panel: string }> = {
  connected: { label: "Connected", dot: "bg-ath-green", panel: "border-ath-green/25 bg-ath-green/10 text-ath-green" },
  delayed_transfer: { label: "Late transfer", dot: "bg-ath-warn", panel: "border-ath-warn/25 bg-ath-warn/10 text-ath-warn" },
  out_of_sequence: { label: "Out of order", dot: "bg-rose-500", panel: "border-rose-200 bg-rose-50 text-rose-950" },
  unavailable: { label: "Not visible", dot: "bg-slate-300", panel: "border-slate-200 bg-slate-50 text-slate-700" },
};

function basisLabel(metric: BiomechanicalMetric) {
  const basis = metric.measurementBasis;
  if (basis === "world_pose_angle_proxy") return "3D pose-angle estimate";
  if (basis.includes("angular_speed")) return "2D turn-speed estimate";
  if (basis.includes("rotation") || basis.includes("orientation")) return "2D camera-view estimate";
  if (basis.includes("sequence")) return "Peak-timing estimate";
  if (basis.includes("timing")) return "Frame timing";
  if (basis.includes("visibility")) return "Landmark visibility";
  if (basis.includes("variability")) return "Across-stroke comparison";
  if (basis.includes("motion_signal")) return "Pose-motion signal";
  return "Body-scaled pose estimate";
}

function confidenceLabel(value: number) {
  if (value >= 0.65) return "clear";
  if (value >= 0.42) return "usable";
  return "limited";
}

export default function BiomechanicalExplorer({ profile, sessionId, actionType }: Props) {
  const router = useRouter();
  const firstPhase = profile?.phases[0]?.id ?? "setup";
  const [selectedPhase, setSelectedPhase] = useState(firstPhase);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const metricsById = useMemo(
    () => new Map(profile?.metrics.map((metric, index) => [metric.id, { metric, number: index + 1 }]) ?? []),
    [profile?.metrics],
  );
  const selectedSummary = profile?.phases.find((phase) => phase.id === selectedPhase) ?? profile?.phases[0];
  const selectedMetrics = profile?.metrics.filter((metric) => metric.phase === selectedSummary?.id) ?? [];

  async function reanalyze() {
    setReanalyzing(true);
    setReanalyzeError(null);
    try {
      await confirmMovementAndReanalyze(sessionId, actionType);
      router.refresh();
    } catch (error) {
      setReanalyzeError(error instanceof Error ? error.message : "Unable to re-analyse this recording.");
    } finally {
      setReanalyzing(false);
    }
  }

  if (!profile) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <ScanLine className="mt-0.5 h-5 w-5 text-ath-navy" />
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Stroke Phases</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">Re-analyse this recording to generate the six-phase movement and body-linkage profile.</p>
            <button type="button" onClick={() => void reanalyze()} disabled={reanalyzing} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ath-navy px-4 text-sm font-semibold text-white hover:bg-ath-navy-raised disabled:opacity-60">{reanalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}{reanalyzing ? "Building the stroke phases…" : "Re-analyse this video"}</button>
            {reanalyzeError ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{reanalyzeError}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  const chainNodes = profile.linkages.length > 0
    ? [profile.linkages[0].source, ...profile.linkages.map((link) => link.target)]
    : [];
  const availableLinks = profile.linkages.filter((link) => link.status !== "unavailable").length;

  return (
    <section id="movement-map" className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-ath-navy p-6 text-white sm:p-9">
        <div className="flex flex-wrap-reverse items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ath-lime"><ScanLine className="h-4 w-4" />Stroke Phases</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Every stage of your stroke</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">See what each part of your body did, when it happened, and how movement passed from the ground through the hitting hand.</p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-2xl font-semibold">{profile.availableMetricCount}</p><p className="text-[0.68rem] uppercase tracking-wide text-ath-sky">of {profile.metricCount} visible</p></div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-2xl font-semibold">6</p><p className="text-[0.68rem] uppercase tracking-wide text-ath-sky">swing phases</p></div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-2xl font-semibold">{profile.connectedLinkCount}/{availableLinks || "—"}</p><p className="text-[0.68rem] uppercase tracking-wide text-ath-sky">links on time</p></div>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-white/15 bg-black/10 p-4 text-xs leading-6 text-white/80"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>These are {profile.metricCount} transparent checks from one camera—not {profile.metricCount} sensors. “Likely contact” is the strongest whole-body motion moment; racket face, ball speed, force, joint load, and muscle activity are not claimed.</p></div>
      </div>

      <div className="space-y-8 p-6 sm:p-9">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-ath-navy"><GitBranch className="h-4 w-4" />Body linkage</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">How movement travelled through your body</h3>
            </div>
            <p className="max-w-md text-xs leading-5 text-slate-500">Each link compares the timing of two movement peaks. It describes order—not force or power output.</p>
          </div>

          {chainNodes.length > 0 ? <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {chainNodes.map((node, index) => {
              const incoming = index > 0 ? profile.linkages[index - 1] : null;
              const style = incoming ? linkageStyle[incoming.status] : null;
              return <div key={`${node.id}-${index}`} className="flex shrink-0 items-center gap-2">
                {index > 0 ? <ArrowRight className={`h-5 w-5 ${incoming?.status === "connected" ? "text-ath-green" : incoming?.status === "unavailable" ? "text-slate-300" : "text-ath-warn"}`} /> : null}
                <div className="min-w-28 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className={`mx-auto block h-2.5 w-2.5 rounded-full ${style?.dot ?? "bg-ath-navy"}`} />
                  <p className="mt-2 text-sm font-semibold text-slate-950">{node.label}</p>
                  <p className="mt-1 text-[0.68rem] text-slate-500">{typeof node.peakTimestampSeconds === "number" ? `${node.peakTimestampSeconds.toFixed(2)}s peak` : "peak unavailable"}</p>
                </div>
              </div>;
            })}
          </div> : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profile.linkages.map((link) => {
              const style = linkageStyle[link.status];
              return <article key={link.id} className={`rounded-2xl border p-4 ${style.panel}`}>
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{link.source.label} → {link.target.label}</p><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-wide"><span className={`h-2 w-2 rounded-full ${style.dot}`} />{style.label}</span></div>
                <p className="mt-2 text-xs leading-5 opacity-80">{link.explanation}</p>
              </article>;
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-ath-navy"><Activity className="h-4 w-4" />All measurements</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">Explore the stroke phase by phase</h3>
            </div>
            <p className="text-xs text-slate-500">Select a phase to see every check and what it means.</p>
          </div>

          <div className="mt-5 h-56 w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-2" aria-label="Camera coverage across the six phases">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={profile.phases.map((phase) => ({
                phase: phase.label,
                coveragePercent: phase.metricCount ? Math.round((phase.availableMetricCount / phase.metricCount) * 100) : 0,
              }))}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="phase" tick={{ fontSize: 11, fill: "#475569" }} />
                <Radar dataKey="coveragePercent" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[0.68rem] leading-5 text-slate-500">Each point is the share of that phase&apos;s checks the camera could measure clearly — not a technique score.</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="tablist" aria-label="Movement phases">
            {profile.phases.map((phase, index) => {
              const selected = phase.id === selectedSummary?.id;
              return <button key={phase.id} type="button" role="tab" aria-selected={selected} onClick={() => setSelectedPhase(phase.id)} className={`min-h-16 rounded-2xl border p-3 text-left transition ${selected ? "border-ath-lime bg-ath-lime/15 ring-2 ring-ath-lime/30" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3"><span className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-ath-navy" : "text-slate-500"}`}>{index + 1} · {phase.label}</span><span className="text-[0.68rem] text-slate-500">{phase.availableMetricCount}/{phase.metricCount} · {typeof phase.score === "number" ? `${Math.round(phase.score)}/100` : "unscored"}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${selected ? "bg-ath-navy" : "bg-slate-400"}`} style={{ width: `${phase.metricCount ? phase.availableMetricCount / phase.metricCount * 100 : 0}%` }} /></div>
              </button>;
            })}
          </div>

          {selectedSummary ? <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6" role="tabpanel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ath-navy">Phase {profile.phases.findIndex((phase) => phase.id === selectedSummary.id) + 1}</p><h4 className="mt-1 text-2xl font-semibold text-slate-950">{selectedSummary.label}</h4></div>
              <div className="flex gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{selectedSummary.availableMetricCount} visible</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{selectedSummary.metricCount - selectedSummary.availableMetricCount} unavailable</span></div>
            </div>

            {selectedSummary.benchmarkDescription ? <div className="mt-4 rounded-2xl border border-ath-green/20 bg-ath-green/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ath-green">What best-in-class looks like here</p>
                {selectedSummary.coachingCue ? <span className="rounded-full bg-ath-green/15 px-2.5 py-0.5 text-xs font-semibold text-ath-green">“{selectedSummary.coachingCue}”</span> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{selectedSummary.benchmarkDescription}</p>
              {selectedSummary.checkpoints && selectedSummary.checkpoints.length > 0 ? <div className="mt-3 grid gap-1.5 border-t border-ath-green/20 pt-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-ath-green">Key body checkpoints</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {selectedSummary.checkpoints.map((cp, idx) => <div key={idx} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs"><span className="font-semibold text-slate-900">{cp.bodyPart}:</span> {cp.target}</div>)}
                </div>
              </div> : null}
              {selectedSummary.commonMistakeTitles.length > 0 ? <p className="mt-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-700">Commonly goes wrong here:</span> {selectedSummary.commonMistakeTitles.join(", ")}.</p> : null}
            </div> : null}

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {selectedMetrics.map((metric) => {
                const numbered = metricsById.get(metric.id);
                const available = metric.status === "available";
                return <article key={metric.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${available ? "bg-ath-sky/15 text-ath-navy" : "bg-slate-100 text-slate-400"}`}>{numbered?.number ?? "—"}</span><div><h5 className="font-semibold text-slate-950">{metric.label}</h5><p className="mt-1 text-xs leading-5 text-slate-500">{metric.playerMeaning}</p></div></div>
                    <p className={`shrink-0 text-right text-sm font-semibold ${available ? "text-slate-950" : "text-slate-400"}`}>{metric.displayValue}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[0.68rem] font-medium">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${available ? "bg-ath-green/10 text-ath-green" : "bg-slate-100 text-slate-500"}`}>{available ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}{available ? "Camera estimate" : "Not reliably visible"}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600"><Eye className="h-3 w-3" />{basisLabel(metric)}</span>
                    {available ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{confidenceLabel(metric.confidence)} confidence · {Math.round(metric.confidence * 100)}%</span> : null}
                  </div>
                </article>;
              })}
            </div>
          </div> : null}
        </div>
      </div>
    </section>
  );
}
