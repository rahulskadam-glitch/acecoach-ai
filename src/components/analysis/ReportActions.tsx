"use client";

import { Check, Clipboard, Printer } from "lucide-react";
import { useState } from "react";

import type { AnalysisReport } from "@/modules/analysis/types";

export default function ReportActions({ report }: { report: AnalysisReport }) {
  const [copied, setCopied] = useState(false);

  async function copyPlan() {
    const priorities = report.priorities
      .map((priority) => `${priority.rank}. ${priority.title}: ${priority.cue}`)
      .join("\n");
    const drills = report.drills
      .map((drill) => `• ${drill.name} — ${drill.dosage}. Success: ${drill.successMetric}`)
      .join("\n");
    const text = [
      report.coachSummary.headline,
      `Main priority: ${report.coachSummary.mainPriority}`,
      `Why it matters: ${report.coachSummary.whyItMatters}`,
      priorities ? `\nPriorities\n${priorities}` : "",
      drills ? `\nPractice plan\n${drills}` : "",
      `\nNext session: ${report.nextSession.objective}`,
    ].filter(Boolean).join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
      >
        <Printer className="h-4 w-4" />
        Print / save PDF
      </button>
      <button
        type="button"
        onClick={() => void copyPlan()}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}
        {copied ? "Plan copied" : "Copy practice plan"}
      </button>
    </div>
  );
}
