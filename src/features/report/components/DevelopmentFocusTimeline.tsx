"use client";

import { Target } from "lucide-react";
import type { ActiveDevelopmentFocus, CueTimelineEntry } from "../types";

type Props = {
  activeFocus?: ActiveDevelopmentFocus | null;
  cueTimeline?: CueTimelineEntry[];
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  emerging: { label: "Just started tracking", tone: "bg-white/10 text-slate-300" },
  active: { label: "Actively focused", tone: "bg-ath-sky/20 text-ath-sky" },
  improving: { label: "Improving", tone: "bg-ath-green/20 text-ath-green" },
  plateaued: { label: "Holding steady", tone: "bg-white/10 text-slate-300" },
  regressed: { label: "Needs attention", tone: "bg-ath-warn/20 text-ath-warn" },
  retention_regressed: { label: "Regressed after being solved", tone: "bg-rose-500/20 text-rose-300" },
  solved: { label: "Solved — confirming it holds", tone: "bg-ath-green/20 text-ath-green" },
  uncertain: { label: "Uncertain — needs clearer video", tone: "bg-white/10 text-slate-300" },
  superseded: { label: "Durably solved", tone: "bg-ath-lime/20 text-ath-lime" },
};

const CHANGE_REASON_LABEL: Record<string, string> = {
  initialized: "Set",
  stable: "Kept",
  solved: "Confirmed solved",
  disproven: "Regressed — cue reopened",
  superseded: "Retention confirmed",
  coach_override: "Coach adjusted",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DevelopmentFocusTimeline({ activeFocus, cueTimeline = [] }: Props) {
  if (!activeFocus) {
    return (
      <div className="rounded-3xl border border-white/10 bg-ath-navy p-6 text-center text-xs text-slate-300">
        No coaching focus is being tracked for this stroke and context yet — it starts once there are enough comparable sessions to make a claim.
      </div>
    );
  }

  const status = STATUS_LABEL[activeFocus.status] ?? { label: activeFocus.status, tone: "bg-white/10 text-slate-300" };

  return (
    <div className="rounded-3xl border border-white/10 bg-ath-navy p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Target className="h-4 w-4 text-ath-lime" />
          Coaching focus
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </div>

      {activeFocus.cue ? (
        <p className="mt-3 text-sm font-semibold italic text-slate-100">“{activeFocus.cue}”</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
        {activeFocus.confidence !== null ? <span>Confidence <span className="font-bold text-white">{Math.round(activeFocus.confidence * 100)}%</span></span> : null}
        <span>Last updated <span className="font-bold text-white">{formatDate(activeFocus.updatedAt)}</span></span>
      </div>

      {cueTimeline.length > 0 ? (
        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">History</p>
          {cueTimeline.map((entry, index) => (
            <div key={`${entry.createdAt}-${index}`} className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-slate-200">{CHANGE_REASON_LABEL[entry.changeReason] ?? entry.changeReason}</span>
                {entry.nextCue ? <p className="mt-0.5 truncate text-slate-400">“{entry.nextCue}”</p> : null}
              </div>
              <span className="shrink-0 text-slate-500">{formatDate(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
