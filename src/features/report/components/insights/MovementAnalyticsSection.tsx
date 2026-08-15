"use client";

import { BarChart3, ChevronDown } from "lucide-react";

import type { AthleteReferenceContext } from "@/lib/reference/registry";
import type { AnalysisReport } from "@/modules/analysis/types";
import JointAngleTimeline from "./JointAngleTimeline";
import PriorityFreezeFrame from "./PriorityFreezeFrame";
import RepetitionRhythmPanel from "./RepetitionRhythmPanel";
import ScoreBandGauge from "./ScoreBandGauge";
import SessionTrend, { type SessionTrendPoint } from "./SessionTrend";

export function seekReportVideo(time: number) {
  window.dispatchEvent(new CustomEvent("acecoach:coach-region", { detail: { time } }));
  document.getElementById("key-moment")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * "See the numbers" section: trend, priority freeze-frame, coaching-area
 * gauges, rhythm evidence, and joint-angle traces. Everything links back to
 * the video and re-expresses engine-asserted data only.
 */
export default function MovementAnalyticsSection({ report, actionType, athleteContext, sessionTrend, sessionId }: {
  report: AnalysisReport;
  actionType: string;
  athleteContext?: AthleteReferenceContext;
  sessionTrend?: SessionTrendPoint[];
  sessionId: string;
}) {
  const areas = (report.coachingAreas ?? []).slice().sort((a, b) => a.score - b.score);
  const trendPoints = sessionTrend ?? [];

  return (
    <section id="movement-analytics" className="scroll-mt-24 space-y-4">
      <PriorityFreezeFrame report={report} actionType={actionType} athleteContext={athleteContext} onSeek={seekReportVideo} />

      {trendPoints.length >= 2 ? <SessionTrend points={trendPoints} currentSessionId={sessionId} /> : null}

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-2">
          <span className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-blue-800" /><span><span className="block font-semibold text-slate-950">See the numbers behind the coaching</span><span className="mt-1 block text-sm text-slate-500">Area gauges, stroke rhythm, and joint-angle traces from this recording.</span></span></span>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </summary>
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-5">
          {areas.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Coaching areas at a glance</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Each gauge shows the engine&apos;s 0–100 area score. The marked line is the same threshold the engine uses to call an area a strength.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {areas.map((area) => (
                  <ScoreBandGauge
                    key={area.id}
                    label={area.label}
                    score={area.score}
                    status={area.status}
                    detail={area.observation}
                    onShow={typeof area.timestampSeconds === "number" ? () => seekReportVideo(area.timestampSeconds as number) : undefined}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <RepetitionRhythmPanel report={report} onSeek={seekReportVideo} />
          <JointAngleTimeline report={report} onSeek={seekReportVideo} />
        </div>
      </details>
    </section>
  );
}
