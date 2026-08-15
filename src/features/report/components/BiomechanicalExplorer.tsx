"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Eye, GitBranch, Info, LoaderCircle, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";

import { confirmMovementAndReanalyze } from "@/app/actions/analysis-actions";
import type { BiomechanicalLinkage, BiomechanicalMetric, BiomechanicalProfile } from "@/modules/analysis/types";

type Props = {
  profile?: BiomechanicalProfile;
  sessionId: string;
  actionType: string;
};

const linkageStyle: Record<BiomechanicalLinkage["status"], { label: string; dot: string; panel: string }> = {
  connected: { label: "Connected", dot: "bg-emerald-500", panel: "border-emerald-200 bg-emerald-50 text-emerald-950" },
  delayed_transfer: { label: "Late transfer", dot: "bg-amber-500", panel: "border-amber-200 bg-amber-50 text-amber-950" },
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
  const firstPhase = profile?.phases[0]?.id ?? "preparation";
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
          <ScanLine className="mt-0.5 h-5 w-5 text-blue-800" />
          <div>
            <h2 className="text-xl font-semibold text-slate-950">106-point movement map</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">Re-analyse this recording to generate the new six-phase movement and body-linkage profile.</p>
            <button type="button" onClick={() => void reanalyze()} disabled={reanalyzing} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#071b2d] px-4 text-sm font-semibold text-white hover:bg-[#0d2b42] disabled:opacity-60">{reanalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}{reanalyzing ? "Building 106-point map…" : "Re-analyse this video"}</button>
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
      <div className="border-b border-slate-200 bg-gradient-to-br from-[#102F50] via-[#071b2d] to-[#21598F] p-6 text-white sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100"><ScanLine className="h-4 w-4" />Full movement deep dive</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Your 106-point movement map</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50">See what each part of your body did, when it happened, and how movement passed from the ground through the hitting hand.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-2xl font-semibold">{profile.availableMetricCount}</p><p className="text-[0.68rem] uppercase tracking-wide text-blue-100">of 106 visible</p></div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-2xl font-semibold">6</p><p className="text-[0.68rem] uppercase tracking-wide text-blue-100">swing phases</p></div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-2xl font-semibold">{profile.connectedLinkCount}/{availableLinks || "—"}</p><p className="text-[0.68rem] uppercase tracking-wide text-blue-100">links on time</p></div>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-white/15 bg-black/10 p-4 text-xs leading-6 text-blue-50"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>These are 106 transparent checks from one camera—not 106 sensors. “Likely contact” is the strongest whole-body motion moment; racket face, ball speed, force, joint load, and muscle activity are not claimed.</p></div>
      </div>

      <div className="space-y-8 p-6 sm:p-9">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-violet-800"><GitBranch className="h-4 w-4" />Body linkage</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">How movement travelled through your body</h3>
            </div>
            <p className="max-w-md text-xs leading-5 text-slate-500">Each link compares the timing of two movement peaks. It describes order—not force or power output.</p>
          </div>

          {chainNodes.length > 0 ? <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {chainNodes.map((node, index) => {
              const incoming = index > 0 ? profile.linkages[index - 1] : null;
              const style = incoming ? linkageStyle[incoming.status] : null;
              return <div key={`${node.id}-${index}`} className="flex shrink-0 items-center gap-2">
                {index > 0 ? <ArrowRight className={`h-5 w-5 ${incoming?.status === "connected" ? "text-emerald-500" : incoming?.status === "unavailable" ? "text-slate-300" : "text-amber-500"}`} /> : null}
                <div className="min-w-28 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className={`mx-auto block h-2.5 w-2.5 rounded-full ${style?.dot ?? "bg-blue-600"}`} />
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
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-blue-800"><Activity className="h-4 w-4" />All measurements</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">Explore the stroke phase by phase</h3>
            </div>
            <p className="text-xs text-slate-500">Select a phase to see every check and what it means.</p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="tablist" aria-label="Movement phases">
            {profile.phases.map((phase, index) => {
              const selected = phase.id === selectedSummary?.id;
              return <button key={phase.id} type="button" role="tab" aria-selected={selected} onClick={() => setSelectedPhase(phase.id)} className={`min-h-16 rounded-2xl border p-3 text-left transition ${selected ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3"><span className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-blue-800" : "text-slate-500"}`}>{index + 1} · {phase.label}</span><span className="text-xs font-semibold text-slate-500">{phase.availableMetricCount}/{phase.metricCount}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${selected ? "bg-blue-700" : "bg-slate-400"}`} style={{ width: `${phase.metricCount ? phase.availableMetricCount / phase.metricCount * 100 : 0}%` }} /></div>
              </button>;
            })}
          </div>

          {selectedSummary ? <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6" role="tabpanel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">Phase {profile.phases.findIndex((phase) => phase.id === selectedSummary.id) + 1}</p><h4 className="mt-1 text-2xl font-semibold text-slate-950">{selectedSummary.label}</h4></div>
              <div className="flex gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{selectedSummary.availableMetricCount} visible</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{selectedSummary.metricCount - selectedSummary.availableMetricCount} unavailable</span></div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {selectedMetrics.map((metric) => {
                const numbered = metricsById.get(metric.id);
                const available = metric.status === "available";
                return <article key={metric.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${available ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-400"}`}>{numbered?.number ?? "—"}</span><div><h5 className="font-semibold text-slate-950">{metric.label}</h5><p className="mt-1 text-xs leading-5 text-slate-500">{metric.playerMeaning}</p></div></div>
                    <p className={`shrink-0 text-right text-sm font-semibold ${available ? "text-slate-950" : "text-slate-400"}`}>{metric.displayValue}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[0.68rem] font-medium">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${available ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{available ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}{available ? "Camera estimate" : "Not reliably visible"}</span>
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
