"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AnalysisReport } from "@/modules/analysis/types";

export default function CoachAudioSummary({ report }: { report: AnalysisReport }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const text = useMemo(() => {
    const playbook = report.coachingPlaybook;
    return [
      report.coachSummary.headline,
      `Your strongest quality is ${report.coachSummary.strongestQuality}.`,
      `Your first focus is ${playbook?.todayFocus ?? report.coachSummary.mainPriority}.`,
      `Why it matters: ${report.coachSummary.whyItMatters}`,
      `Use this cue: ${playbook?.feelCue ?? report.priorities[0]?.cue ?? "one change at a time"}.`,
      `You will know it is working when ${playbook?.successTest ?? report.nextSession.successCriteria[0] ?? "the movement becomes more repeatable"}.`,
    ].join(" ");
  }, [report]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggle() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/15 print:hidden"
    >
      {speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      <Volume2 className="h-4 w-4" />
      {speaking ? "Stop coach audio" : "Listen to coach summary"}
    </button>
  );
}
