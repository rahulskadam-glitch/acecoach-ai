import type { AnalysisReport } from "@/modules/analysis/types";
import { plainLanguage } from "./plain-language";

export type ResolvedPracticeDrill = {
  id: string;
  number: number;
  name: string;
  stageLabel: string;
  purpose: string;
  cue: string;
  dosage: string;
  successMetric: string;
  focusArea: string;
};

/**
 * Guarantees that every player report always presents at least 3 structured,
 * actionable practice drills (Isolation, Progressive Ball Strike, and Match Transfer)
 * calibrated to the athlete's detected priority flaw and stroke.
 */
export function resolveThreePracticeDrills(
  report: AnalysisReport,
  movementName = "Stroke"
): ResolvedPracticeDrill[] {
  const topPriority = report.priorities?.[0];
  const primaryCue = topPriority?.cue ?? report.coachSummary?.practiceFocus?.[0] ?? "Turn early, accelerate out in front";
  const primaryFlaw = topPriority?.title ?? `${movementName} kinetic chain timing`;

  // Start with any engine-provided drills
  const existing: ResolvedPracticeDrill[] = (report.drills ?? []).map((d, index) => ({
    id: d.id ?? `drill_${index + 1}`,
    number: index + 1,
    name: plainLanguage(d.name),
    stageLabel: index === 0 ? "1. Isolation & Feel" : index === 1 ? "2. Progressive Live Feed" : "3. Situational Court Transfer",
    purpose: d.purpose,
    cue: plainLanguage(d.cue),
    dosage: plainLanguage(d.dosage),
    successMetric: plainLanguage(d.successMetric),
    focusArea: index === 0 ? "Biomechanical Fix" : index === 1 ? "Timing & Ball Strike" : "Match Play & Recovery",
  }));

  if (existing.length >= 3) {
    return existing.slice(0, 3);
  }

  // Fallback 3-tier progression ladder templates
  const fallbackTemplates = [
    {
      id: "drill_1_isolation",
      number: 1,
      name: `${movementName} Isolation Rehearsal`,
      stageLabel: "1. Isolation & Feel Rehearsal",
      purpose: `Lock in the primary movement pattern for: ${primaryFlaw}.`,
      cue: primaryCue,
      dosage: "3 sets × 10 shadow reps with mirror or court line check",
      successMetric: "Execute 8 of 10 swings with correct feel cue and balanced base.",
      focusArea: "Biomechanical Fix",
    },
    {
      id: "drill_2_progressive_feed",
      number: 2,
      name: "Drop-Feed Contact & Kinetic Drive",
      stageLabel: "2. Progressive Ball Strike",
      purpose: `Transfer the mechanical cue into live ball contact without rushing the kinetic sequence.`,
      cue: "Load into the legs, then release the swing through contact",
      dosage: "3 sets × 8 self-drop or partner feeds",
      successMetric: "Achieve clean sweet-spot strike and steady head on 7 of 8 feeds.",
      focusArea: "Timing & Strike Consistency",
    },
    {
      id: "drill_3_match_transfer",
      number: 3,
      name: "Rally Progression & Balanced Recovery",
      stageLabel: "3. Situational Court Transfer",
      purpose: `Maintain the technical fix during cross-court rallies and dynamic recovery steps.`,
      cue: "Finish the swing fully before taking the first recovery step",
      dosage: "3 sets × 6 shot rally sequences to deep target zones",
      successMetric: "Land 5 of 6 balls past the service line with immediate balanced recovery.",
      focusArea: "Match Play & Recovery",
    },
  ];

  const combined = [...existing];
  for (const template of fallbackTemplates) {
    if (combined.length >= 3) break;
    combined.push({
      ...template,
      number: combined.length + 1,
    });
  }

  return combined.slice(0, 3);
}
