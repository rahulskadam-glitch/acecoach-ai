"use client";

import { Eye, GitCompareArrows } from "lucide-react";
import { useMemo } from "react";

import type { AthleteReferenceContext } from "@/lib/reference/registry";
import type { AnalysisReport } from "@/modules/analysis/types";
import { plainLanguage } from "../../model/plain-language";
import HumanSilhouette, { type SilhouetteStyle } from "../../motion/HumanSilhouette";
import {
  nearestFrame,
  stageAnchors,
  stageForTime,
  stagePose,
  type JointName,
  type MotionStage,
  type Pose,
} from "../../motion/motion-model";

const REGION_TO_JOINT: Record<string, (side: "left" | "right") => JointName> = {
  head: () => "head",
  hands: (side) => `${side}_wrist` as JointName,
  grip: (side) => `${side}_wrist` as JointName,
  backlift: (side) => `${side}_shoulder` as JointName,
  hips: (side) => `${side}_hip` as JointName,
  knees: (side) => `${side}_knee` as JointName,
  feet: (side) => `${side}_ankle` as JointName,
  finish: (side) => `${side}_wrist` as JointName,
};

function silhouetteStyle(gender?: string | null): SilhouetteStyle {
  const value = (gender ?? "").toLowerCase();
  if (value.includes("female") || value.includes("woman") || value.includes("girl")) return "female";
  if (value.includes("male") || value.includes("man") || value.includes("boy")) return "male";
  return "neutral";
}

function poseFromLandmarks(landmarks: Record<string, { x: number; y: number; visibility: number }>): Pose | null {
  const joints: JointName[] = ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"];
  const pose = {} as Pose;
  for (const joint of joints) {
    const point = landmarks[joint];
    if (!point || point.visibility < 0.3) return null;
    pose[joint] = { x: point.x, y: point.y };
  }
  const head = landmarks.head ?? landmarks.nose;
  if (!head) return null;
  pose.head = { x: head.x, y: head.y };
  return pose;
}

/**
 * Side-by-side freeze frame: the athlete's measured pose at the main-priority
 * moment next to the category reference silhouette at the same stage, with
 * the priority body region highlighted. The reference is an illustrative
 * coaching model — not a professional-player or 3D comparison.
 */
export default function PriorityFreezeFrame({ report, actionType, athleteContext, onSeek }: {
  report: AnalysisReport;
  actionType: string;
  athleteContext?: AthleteReferenceContext;
  onSeek?: (seconds: number) => void;
}) {
  const improvement = report.coachSummary.pyramidSummary?.improvements?.[0];
  const priority = report.priorities[0];
  const timestamp = improvement?.timestampSeconds ?? priority?.timestampSeconds ?? null;
  const title = improvement?.title ?? priority?.title;
  const cue = improvement?.cue ?? priority?.cue;
  const bodyRegionId = improvement?.bodyRegionId ?? "head";
  const side: "left" | "right" = (athleteContext?.dominantSide ?? report.frameSummary?.dominantSide ?? "right").toLowerCase().startsWith("left") ? "left" : "right";

  const primary = report.repetitions?.find((rep) => rep.index === (report.frameSummary?.primaryRepetitionIndex ?? 0)) ?? report.repetitions?.[0];
  const start = primary?.startSeconds ?? 0;
  const end = primary?.endSeconds ?? Math.max(report.frameSummary?.durationSeconds ?? 1, 1);
  const anchors = useMemo(() => stageAnchors(report, start, end), [end, report, start]);

  const stage: MotionStage = typeof timestamp === "number" ? stageForTime(timestamp, anchors) : "contact";
  const frames = report.frameSummary?.frameMetrics ?? [];
  const athleteFrame = typeof timestamp === "number" ? nearestFrame(frames, timestamp) : null;
  const athletePose = athleteFrame?.keyLandmarks ? poseFromLandmarks(athleteFrame.keyLandmarks) : null;
  const referencePose = useMemo(
    () => stagePose(actionType, stage, "category", side, athleteContext?.playingLevel),
    [actionType, athleteContext?.playingLevel, side, stage],
  );
  const highlightJoint = (REGION_TO_JOINT[bodyRegionId] ?? REGION_TO_JOINT.head)(side);
  const style = silhouetteStyle(athleteContext?.gender);

  if (!athletePose || !title) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><GitCompareArrows className="h-4 w-4 text-amber-600" />Your priority moment, side by side</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{plainLanguage(title)} — the marked joint is the region to change. The reference is a coaching model for your level, not a professional player.</p>
        </div>
        {typeof timestamp === "number" && onSeek ? <button type="button" onClick={() => onSeek(timestamp)} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#173F6A] px-3 text-xs font-semibold text-white hover:bg-[#103554]"><Eye className="h-3.5 w-3.5" />Play this moment</button> : null}
      </div>
      <div className="grid sm:grid-cols-2">
        <figure className="border-b border-slate-200 bg-slate-950 p-4 sm:border-b-0 sm:border-r">
          <div className="h-52">
            <HumanSilhouette pose={athletePose} style={style} dominantSide={side} color="rgba(148,197,253,.55)" outline="#93c5fd" label="Your measured pose" activeJoint={highlightJoint} />
          </div>
          <figcaption className="mt-2 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wide text-blue-200"><span>You · {typeof timestamp === "number" ? `${timestamp.toFixed(2)}s` : "key frame"}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-blue-100">measured pose</span></figcaption>
        </figure>
        <figure className="bg-slate-900 p-4">
          <div className="h-52">
            <HumanSilhouette pose={referencePose} style={style} dominantSide={side} color="rgba(110,231,183,.5)" outline="#6ee7b7" label="Category reference pose" activeJoint={highlightJoint} />
          </div>
          <figcaption className="mt-2 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-200"><span>Reference · {stage}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-emerald-100">illustrative model</span></figcaption>
        </figure>
      </div>
      {cue ? <p className="border-t border-slate-200 bg-blue-50/60 px-5 py-3 text-sm font-semibold text-blue-950">Feel: “{plainLanguage(cue)}”</p> : null}
    </div>
  );
}
