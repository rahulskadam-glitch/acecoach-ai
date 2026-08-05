"use client";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  Eye,
  Gauge,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  getReferenceExperience,
  type AthleteReferenceContext,
  type ReferenceMedia,
} from "@/lib/reference/registry";
import type { AnalysisReport, FrameMetric } from "@/modules/analysis/types";

type Point = { x: number; y: number };
type Pose = Record<JointName, Point>;
type StageId = "preparation" | "loading" | "contact" | "recovery";
type Tier = "category" | "elite";

type JointName =
  | "head"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle";

const STAGES: Array<{ id: StageId; label: string }> = [
  { id: "preparation", label: "Preparation" },
  { id: "loading", label: "Loading" },
  { id: "contact", label: "Contact" },
  { id: "recovery", label: "Recovery" },
];

const CONNECTIONS: Array<[JointName, JointName]> = [
  ["head", "left_shoulder"],
  ["head", "right_shoulder"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

const STAGE_FRACTIONS: Record<StageId, number> = {
  preparation: 0,
  loading: 0.30,
  contact: 0.64,
  recovery: 1,
};

const PHASE_ALIASES: Record<StageId, string[]> = {
  preparation: ["preparation", "ready", "unit_turn", "start", "release"],
  loading: ["loading", "load", "backlift", "cocking", "plant"],
  contact: ["contact", "impact", "acceleration", "release", "contact_proxy", "ball_release"],
  recovery: ["recovery", "finish", "follow_through", "deceleration", "landing"],
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  return Object.fromEntries(
    (Object.keys(a) as JointName[]).map((joint) => [
      joint,
      { x: lerp(a[joint].x, b[joint].x, t), y: lerp(a[joint].y, b[joint].y, t) },
    ]),
  ) as Pose;
}

function basePose(): Pose {
  return {
    head: { x: 0.50, y: 0.13 },
    left_shoulder: { x: 0.42, y: 0.27 },
    right_shoulder: { x: 0.58, y: 0.27 },
    left_elbow: { x: 0.39, y: 0.42 },
    right_elbow: { x: 0.61, y: 0.42 },
    left_wrist: { x: 0.43, y: 0.53 },
    right_wrist: { x: 0.57, y: 0.53 },
    left_hip: { x: 0.45, y: 0.53 },
    right_hip: { x: 0.55, y: 0.53 },
    left_knee: { x: 0.43, y: 0.72 },
    right_knee: { x: 0.57, y: 0.72 },
    left_ankle: { x: 0.39, y: 0.91 },
    right_ankle: { x: 0.61, y: 0.91 },
  };
}

function actionFamily(actionType: string) {
  const action = actionType.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (action.includes("serve") || action.includes("overhead")) return "serve";
  if (action.includes("volley")) return "volley";
  if (action.includes("slice")) return "slice";
  if (action.includes("backhand")) return action.includes("one_handed") ? "one_hand_backhand" : "backhand";
  return "forehand";
}

function categoryScaleForLevel(level?: string | null) {
  const normalized = (level ?? "").trim().toLowerCase();
  if (["beginner", "starter", "recreational", "novice"].some((item) => normalized.includes(item))) return 0.88;
  if (["advanced", "elite", "professional", "college", "national", "international"].some((item) => normalized.includes(item))) return 1.06;
  return 0.98;
}

function movementPose(
  actionType: string,
  stage: StageId,
  tier: Tier,
  dominantSide: "left" | "right",
  categoryScale = 1,
): Pose {
  const pose = basePose();
  const family = actionFamily(actionType);
  const hit = dominantSide === "left" ? "left" : "right";
  const support = hit === "right" ? "left" : "right";
  const direction = hit === "right" ? 1 : -1;
  const elite = tier === "elite" ? 1.12 : categoryScale;
  const set = (joint: JointName, x: number, y: number) => {
    pose[joint] = { x: clamp(x, 0.05, 0.95), y: clamp(y, 0.04, 0.96) };
  };

  const hitShoulder = `${hit}_shoulder` as JointName;
  const hitElbow = `${hit}_elbow` as JointName;
  const hitWrist = `${hit}_wrist` as JointName;
  const supportShoulder = `${support}_shoulder` as JointName;
  const supportElbow = `${support}_elbow` as JointName;
  const supportWrist = `${support}_wrist` as JointName;
  const hitHip = `${hit}_hip` as JointName;
  const hitKnee = `${hit}_knee` as JointName;
  const hitAnkle = `${hit}_ankle` as JointName;
  const supportHip = `${support}_hip` as JointName;
  const supportKnee = `${support}_knee` as JointName;
  const supportAnkle = `${support}_ankle` as JointName;

  if (family === "serve") {
    if (stage === "preparation") {
      set(hitElbow, 0.5 + direction * 0.09, 0.45);
      set(hitWrist, 0.5 + direction * 0.12, 0.56);
      set(supportElbow, 0.5 - direction * 0.11, 0.36);
      set(supportWrist, 0.5 - direction * 0.15, 0.26);
    } else if (stage === "loading") {
      set(hitElbow, 0.5 + direction * 0.13, 0.24);
      set(hitWrist, 0.5 + direction * 0.06, 0.12);
      set(supportWrist, 0.5 - direction * 0.11, 0.10);
      set(hitKnee, 0.5 + direction * 0.09, 0.76);
      set(supportKnee, 0.5 - direction * 0.09, 0.77);
      set(hitAnkle, 0.5 + direction * 0.13, 0.91);
      set(supportAnkle, 0.5 - direction * 0.13, 0.91);
      pose.head.y = 0.15;
    } else if (stage === "contact") {
      set(hitElbow, 0.5 + direction * 0.04, 0.15);
      set(hitWrist, 0.5 + direction * 0.04, 0.035);
      set(supportWrist, 0.5 - direction * 0.07, 0.42);
      pose.head.y = 0.11;
      set(hitHip, 0.5 + direction * 0.04, 0.49);
      set(supportHip, 0.5 - direction * 0.04, 0.51);
    } else {
      set(hitElbow, 0.5 - direction * 0.03, 0.36);
      set(hitWrist, 0.5 - direction * 0.18 * elite, 0.53);
      set(supportWrist, 0.5 - direction * 0.07, 0.47);
      set(hitAnkle, 0.5 + direction * 0.04, 0.89);
      set(supportAnkle, 0.5 - direction * 0.17, 0.91);
    }
    return pose;
  }

  if (family === "volley") {
    if (stage === "preparation") {
      set(hitElbow, 0.5 + direction * 0.10, 0.38);
      set(hitWrist, 0.5 + direction * 0.14, 0.37);
      set(supportWrist, 0.5 - direction * 0.08, 0.39);
    } else if (stage === "loading") {
      set(hitWrist, 0.5 + direction * 0.18, 0.37);
      set(hitKnee, 0.5 + direction * 0.08, 0.75);
      set(supportAnkle, 0.5 - direction * 0.17, 0.91);
    } else if (stage === "contact") {
      set(hitElbow, 0.5 + direction * 0.14, 0.39);
      set(hitWrist, 0.5 + direction * 0.28 * elite, 0.37);
      set(supportWrist, 0.5 - direction * 0.02, 0.42);
    } else {
      set(hitWrist, 0.5 + direction * 0.10, 0.43);
      set(supportWrist, 0.5 - direction * 0.06, 0.44);
    }
    return pose;
  }

  const isBackhand = family === "backhand" || family === "one_hand_backhand" || family === "slice";
  const strokeDirection = isBackhand ? -direction : direction;
  const twoHanded = family === "backhand";
  const lowerContact = family === "slice";

  if (stage === "preparation") {
    set(hitShoulder, 0.5 + strokeDirection * 0.04, 0.27);
    set(supportShoulder, 0.5 - strokeDirection * 0.05, 0.28);
    set(hitElbow, 0.5 - strokeDirection * 0.11, 0.39);
    set(hitWrist, 0.5 - strokeDirection * 0.20 * elite, lowerContact ? 0.31 : 0.36);
    set(supportElbow, 0.5 - strokeDirection * 0.04, 0.39);
    set(supportWrist, twoHanded ? 0.5 - strokeDirection * 0.15 : 0.5 - strokeDirection * 0.04, 0.38);
    set(hitAnkle, 0.5 + strokeDirection * 0.10, 0.91);
    set(supportAnkle, 0.5 - strokeDirection * 0.13, 0.91);
  } else if (stage === "loading") {
    set(hitWrist, 0.5 - strokeDirection * 0.24 * elite, lowerContact ? 0.37 : 0.43);
    set(supportWrist, twoHanded ? 0.5 - strokeDirection * 0.18 : 0.5 - strokeDirection * 0.02, 0.40);
    set(hitKnee, 0.5 + strokeDirection * 0.08, 0.76);
    set(supportKnee, 0.5 - strokeDirection * 0.08, 0.75);
    set(hitAnkle, 0.5 + strokeDirection * 0.15 * elite, 0.91);
    set(supportAnkle, 0.5 - strokeDirection * 0.16 * elite, 0.91);
    set(hitHip, 0.5 + strokeDirection * 0.05, 0.55);
    set(supportHip, 0.5 - strokeDirection * 0.05, 0.53);
    pose.head.x = 0.5 - strokeDirection * 0.015;
  } else if (stage === "contact") {
    set(hitElbow, 0.5 + strokeDirection * 0.13, lowerContact ? 0.43 : 0.37);
    set(hitWrist, 0.5 + strokeDirection * 0.28 * elite, lowerContact ? 0.47 : 0.36);
    set(supportElbow, 0.5 + strokeDirection * (twoHanded ? 0.08 : -0.02), 0.40);
    set(supportWrist, twoHanded ? 0.5 + strokeDirection * 0.20 * elite : 0.5 - strokeDirection * 0.02, lowerContact ? 0.45 : 0.37);
    set(hitHip, 0.5 + strokeDirection * 0.04, 0.51);
    set(supportHip, 0.5 - strokeDirection * 0.03, 0.53);
    pose.head.x = 0.5 + strokeDirection * 0.01;
  } else {
    set(hitElbow, 0.5 + strokeDirection * 0.08, lowerContact ? 0.34 : 0.26);
    set(hitWrist, 0.5 - strokeDirection * 0.04, lowerContact ? 0.27 : 0.18);
    set(supportElbow, 0.5 + strokeDirection * 0.03, 0.35);
    set(supportWrist, twoHanded ? 0.5 - strokeDirection * 0.01 : 0.5 - strokeDirection * 0.06, lowerContact ? 0.35 : 0.27);
    set(hitAnkle, 0.5 + strokeDirection * 0.04, 0.91);
    set(supportAnkle, 0.5 - strokeDirection * 0.12, 0.91);
  }

  return pose;
}

function poseAtProgress(
  actionType: string,
  tier: Tier,
  dominantSide: "left" | "right",
  progress: number,
  categoryScale = 1,
) {
  const ordered = STAGES.map((stage) => ({
    id: stage.id,
    fraction: STAGE_FRACTIONS[stage.id],
    pose: movementPose(actionType, stage.id, tier, dominantSide, categoryScale),
  }));
  const value = clamp(progress);
  const nextIndex = Math.max(1, ordered.findIndex((item) => item.fraction >= value));
  const start = ordered[nextIndex - 1];
  const end = ordered[nextIndex] ?? ordered[ordered.length - 1];
  const local = end.fraction === start.fraction ? 0 : (value - start.fraction) / (end.fraction - start.fraction);
  return interpolatePose(start.pose, end.pose, clamp(local));
}

function nearestFrame(frames: FrameMetric[], time: number) {
  if (frames.length === 0) return undefined;
  let best = frames[0];
  let bestDelta = Math.abs(best.timestampSeconds - time);
  for (const frame of frames) {
    const delta = Math.abs(frame.timestampSeconds - time);
    if (delta < bestDelta) {
      best = frame;
      bestDelta = delta;
    }
  }
  return best;
}


function phaseTime(
  stage: StageId,
  timeline: AnalysisReport["movementTimeline"],
  fallbackStart: number,
  fallbackDuration: number,
) {
  const candidates = timeline ?? [];
  const found = candidates.find((item) => PHASE_ALIASES[stage].includes(item.phase));
  return found?.timestampSeconds ?? fallbackStart + STAGE_FRACTIONS[stage] * fallbackDuration;
}

function buildStageAnchors(
  timeline: AnalysisReport["movementTimeline"],
  fallbackStart: number,
  fallbackDuration: number,
  endTime: number,
) {
  const minimumGap = Math.max(fallbackDuration * 0.04, 0.015);
  const anchors = {} as Record<StageId, number>;
  let previous = fallbackStart - minimumGap;
  for (const stage of STAGES) {
    const raw = phaseTime(stage.id, timeline, fallbackStart, fallbackDuration);
    const next = Math.max(raw, previous + minimumGap);
    anchors[stage.id] = Math.min(next, endTime);
    previous = anchors[stage.id];
  }
  anchors.preparation = Math.max(fallbackStart, Math.min(anchors.preparation, endTime));
  anchors.recovery = Math.max(anchors.contact + minimumGap, Math.min(endTime, anchors.recovery));
  return anchors;
}

function progressFromStageAnchors(time: number, anchors: Record<StageId, number>) {
  const sequence = STAGES.map((stage) => ({
    id: stage.id,
    time: anchors[stage.id],
    fraction: STAGE_FRACTIONS[stage.id],
  }));
  if (time <= sequence[0].time) return 0;
  if (time >= sequence[sequence.length - 1].time) return 1;
  const endIndex = sequence.findIndex((item) => item.time >= time);
  const start = sequence[Math.max(0, endIndex - 1)];
  const end = sequence[endIndex];
  const local = end.time === start.time ? 0 : (time - start.time) / (end.time - start.time);
  return lerp(start.fraction, end.fraction, clamp(local));
}

function stageFromAnchors(time: number, anchors: Record<StageId, number>): StageId {
  if (time < anchors.loading) return "preparation";
  if (time < anchors.contact) return "loading";
  if (time < anchors.recovery) return "contact";
  return "recovery";
}

function normalizePlayerPose(frame?: FrameMetric): Partial<Pose> {
  const landmarks = frame?.keyLandmarks;
  if (!landmarks) return {};
  const points: Partial<Pose> = {};
  for (const joint of Object.keys(basePose()) as JointName[]) {
    const point = landmarks[joint];
    if (!point || point.visibility < 0.25) continue;
    points[joint] = { x: point.x, y: point.y };
  }
  return points;
}

function stageArea(report: AnalysisReport, stage: StageId) {
  const areas = report.coachingAreas ?? [];
  return areas.find((area) => PHASE_ALIASES[stage].some((alias) => area.id.includes(alias)))
    ?? areas.find((area) => area.status === "priority")
    ?? areas[0];
}

function markerTargets(stage: StageId, dominantSide: "left" | "right", playerPose: Partial<Pose>) {
  const hitWrist = `${dominantSide}_wrist` as JointName;
  const supportSide = dominantSide === "right" ? "left" : "right";
  const supportWrist = `${supportSide}_wrist` as JointName;
  const targets: Array<{ from: Point; to: Point; label: string }> = [];

  const wrist = playerPose[hitWrist];
  if (wrist) {
    if (stage === "preparation") {
      targets.push({ from: wrist, to: { x: clamp(wrist.x + (dominantSide === "right" ? -0.09 : 0.09)), y: clamp(wrist.y - 0.06) }, label: "Earlier, clearer preparation" });
    } else if (stage === "loading") {
      targets.push({ from: wrist, to: { x: clamp(wrist.x + (dominantSide === "right" ? -0.07 : 0.07)), y: clamp(wrist.y + 0.04) }, label: "Create a fuller loading corridor" });
    } else if (stage === "contact") {
      targets.push({ from: wrist, to: { x: clamp(wrist.x + (dominantSide === "right" ? 0.11 : -0.11)), y: clamp(wrist.y - 0.025) }, label: "Move the strike window forward" });
    } else {
      targets.push({ from: wrist, to: { x: 0.5, y: 0.34 }, label: "Reset toward ready position" });
    }
  }

  if (stage === "loading") {
    const left = playerPose.left_ankle;
    const right = playerPose.right_ankle;
    if (left && right) {
      targets.push({ from: left, to: { x: clamp(left.x - 0.035), y: left.y }, label: "Widen the support base" });
      targets.push({ from: right, to: { x: clamp(right.x + 0.035), y: right.y }, label: "Widen the support base" });
    }
  }

  if (stage === "contact" && playerPose[supportWrist] && targets.length < 2) {
    const point = playerPose[supportWrist]!;
    targets.push({ from: point, to: { x: clamp(point.x + (dominantSide === "right" ? 0.035 : -0.035)), y: clamp(point.y - 0.02) }, label: "Keep the support side organized" });
  }

  return targets.slice(0, 3);
}

function PoseSvg({
  pose,
  color,
  accent,
  title,
  swingPath,
  swingJoint = "right_wrist",
  ghostPose,
}: {
  pose: Partial<Pose>;
  color: string;
  accent: string;
  title: string;
  swingPath?: Pose[];
  swingJoint?: JointName;
  ghostPose?: Partial<Pose>;
}) {
  const pathPoints = swingPath?.map((item) => item[swingJoint]).filter(Boolean) ?? [];
  const smoothPath = pathPoints.length > 1
    ? pathPoints.reduce((path, point, index) => {
        const x = point.x * 100;
        const y = point.y * 100;
        if (index === 0) return `M ${x} ${y}`;
        const previous = pathPoints[index - 1];
        const controlX = ((previous.x + point.x) / 2) * 100;
        const controlY = ((previous.y + point.y) / 2) * 100;
        return `${path} Q ${controlX} ${controlY} ${x} ${y}`;
      }, "")
    : "";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={title}>
      <defs>
        <marker id={`arrow-${accent.replace("#", "")}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill={accent} />
        </marker>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="1.1" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="transparent" />
      <path d="M8 92 H92" stroke="rgba(148,163,184,.28)" strokeWidth="1" />
      {ghostPose ? CONNECTIONS.map(([a, b]) => {
        const start = ghostPose[a];
        const end = ghostPose[b];
        if (!start || !end) return null;
        return <line key={`ghost-${a}-${b}`} x1={start.x * 100} y1={start.y * 100} x2={end.x * 100} y2={end.y * 100} stroke="rgba(148,163,184,.24)" strokeWidth="1.6" strokeDasharray="3 3" />;
      }) : null}
      {pathPoints.length > 1 ? (
        <path
          d={smoothPath}
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeDasharray="4 3"
          markerEnd={`url(#arrow-${accent.replace("#", "")})`}
          opacity="0.9"
        />
      ) : null}
      {CONNECTIONS.map(([a, b]) => {
        const start = pose[a];
        const end = pose[b];
        if (!start || !end) return null;
        return <line key={`${a}-${b}`} x1={start.x * 100} y1={start.y * 100} x2={end.x * 100} y2={end.y * 100} stroke={color} strokeWidth="2.8" strokeLinecap="round" filter="url(#soft-glow)" />;
      })}
      {(Object.entries(pose) as Array<[JointName, Point]>).map(([joint, point]) => (
        <circle key={joint} cx={point.x * 100} cy={point.y * 100} r={joint === "head" ? 4.1 : 2.05} fill={joint === "head" ? "transparent" : color} stroke={color} strokeWidth={joint === "head" ? 2.5 : 0} />
      ))}
    </svg>
  );
}

function DifferenceOverlay({
  markers,
}: {
  markers: Array<{ from: Point; to: Point; label: string }>;
}) {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <marker id="player-gap-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="#fb7185" />
        </marker>
      </defs>
      {markers.map((marker, index) => {
        const midX = (marker.from.x + marker.to.x) * 50;
        const midY = (marker.from.y + marker.to.y) * 50 - 5 - index * 2;
        const path = `M ${marker.from.x * 100} ${marker.from.y * 100} Q ${midX} ${midY} ${marker.to.x * 100} ${marker.to.y * 100}`;
        return (
          <g key={`${marker.label}-${index}`}>
            <path d={path} fill="none" stroke="#fb7185" strokeWidth="1.8" strokeDasharray="4 2" markerEnd="url(#player-gap-arrow)" />
            <circle cx={marker.from.x * 100} cy={marker.from.y * 100} r="2.1" fill="#fb7185" />
          </g>
        );
      })}
    </svg>
  );
}

function SourceVideo({
  media,
  icon,
  accent,
}: {
  media: ReferenceMedia | null;
  icon: ReactNode;
  accent: "sky" | "violet";
}) {
  const tone = accent === "sky" ? "text-sky-300" : "text-violet-300";
  if (!media) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <div className={`flex items-center gap-2 ${tone}`}>{icon}<p className="text-sm font-semibold">Source video not yet curated</p></div>
        <p className="mt-3 text-sm leading-6 text-slate-400">The synchronized silhouette remains available without substituting an unrelated movement.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
      <div className="flex items-start justify-between gap-4 p-4">
        <div>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] ${tone}`}>{icon}{accent === "sky" ? "Category source" : "Elite source"}</div>
          <p className="mt-2 font-semibold text-white">{media.title}</p>
          <p className="mt-1 text-xs text-slate-500">{media.organization}</p>
        </div>
        <a href={media.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white" aria-label={`Open ${media.title}`}>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {media.youtubeId ? (
        <iframe
          title={`${media.title} by ${media.organization}`}
          src={`https://www.youtube-nocookie.com/embed/${media.youtubeId}?rel=0&modestbranding=1`}
          className="aspect-video w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : null}
      <p className="border-t border-white/10 p-4 text-xs leading-5 text-slate-500">{media.rightsNote}</p>
    </div>
  );
}

export default function ReferenceComparisonStudio({
  videoUrl,
  report,
  sportId,
  actionType,
  athleteContext,
}: {
  videoUrl: string;
  report: AnalysisReport;
  sportId: string;
  actionType: string;
  athleteContext?: AthleteReferenceContext;
}) {
  const reference = useMemo(
    () => getReferenceExperience(sportId, actionType, athleteContext),
    [actionType, athleteContext, sportId],
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const [activeStage, setActiveStage] = useState<StageId>("preparation");
  const [showSourceVideos, setShowSourceVideos] = useState(false);
  const [loopPrimaryStroke, setLoopPrimaryStroke] = useState(true);

  const frames = useMemo(() => report.frameSummary?.frameMetrics ?? [], [report.frameSummary?.frameMetrics]);
  const repetitions = report.repetitions ?? [];
  const primaryIndex = report.frameSummary?.primaryRepetitionIndex ?? repetitions[0]?.index ?? 0;
  const primary = repetitions.find((item) => item.index === primaryIndex) ?? repetitions[0];
  const fallbackStart = primary?.startSeconds ?? 0;
  const fallbackDuration = Math.max(primary?.durationSeconds ?? report.frameSummary?.durationSeconds ?? 1, 0.2);
  const timeline = useMemo(
    () => (primary?.phaseTimeline?.length ? primary.phaseTimeline : report.movementTimeline ?? []),
    [primary, report.movementTimeline],
  );
  const startTime = primary?.startSeconds ?? 0;
  const endTime = primary?.endSeconds ?? Math.max(report.frameSummary?.durationSeconds ?? 1, 1);
  const stageAnchors = useMemo(
    () => buildStageAnchors(timeline, fallbackStart, fallbackDuration, endTime),
    [endTime, fallbackDuration, fallbackStart, timeline],
  );
  const normalizedProgress = progressFromStageAnchors(currentTime, stageAnchors);
  const stage = stageFromAnchors(currentTime, stageAnchors);
  const dominantSide: "left" | "right" = report.frameSummary?.dominantSide?.toLowerCase().startsWith("left") ? "left" : "right";
  const categoryScale = categoryScaleForLevel(athleteContext?.playingLevel);
  const swingJoint = `${dominantSide}_wrist` as JointName;
  const currentFrame = useMemo(() => nearestFrame(frames, currentTime), [currentTime, frames]);
  const playerPose = useMemo(() => normalizePlayerPose(currentFrame), [currentFrame]);
  const categoryPose = useMemo(
    () => poseAtProgress(actionType, "category", dominantSide, normalizedProgress, categoryScale),
    [actionType, categoryScale, dominantSide, normalizedProgress],
  );
  const elitePose = useMemo(() => poseAtProgress(actionType, "elite", dominantSide, normalizedProgress), [actionType, dominantSide, normalizedProgress]);
  const categoryPath = useMemo(
    () => STAGES.map((item) => movementPose(actionType, item.id, "category", dominantSide, categoryScale)),
    [actionType, categoryScale, dominantSide],
  );
  const elitePath = useMemo(() => STAGES.map((item) => movementPose(actionType, item.id, "elite", dominantSide)), [actionType, dominantSide]);
  const differenceMarkers = useMemo(() => markerTargets(stage, dominantSide, playerPose), [dominantSide, playerPose, stage]);
  const activeArea = stageArea(report, activeStage);
  const activeReferenceCheckpoint = reference?.checkpoints.find((item) => item.id === activeStage) ?? reference?.checkpoints[0];

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const video = videoRef.current;
      if (!video) return;
      if (loopPrimaryStroke && video.currentTime >= endTime - 0.025) {
        video.currentTime = startTime;
      }
      setCurrentTime(video.currentTime);
      setActiveStage(stageFromAnchors(video.currentTime, stageAnchors));
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [endTime, loopPrimaryStroke, playing, stageAnchors, startTime]);

  function seek(time: number) {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(Number.isFinite(video.duration) ? video.duration : endTime, time));
    video.currentTime = next;
    setCurrentTime(next);
  }

  function jumpToStage(nextStage: StageId) {
    setActiveStage(nextStage);
    seek(stageAnchors[nextStage]);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (loopPrimaryStroke && (video.currentTime < startTime || video.currentTime >= endTime)) video.currentTime = startTime;
      try {
        await video.play();
      } catch {
        return;
      }
    } else {
      video.pause();
    }
  }

  function setRate(rate: number) {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }

  return (
    <section
      id="reference-studio"
      className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-violet-500/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_32%),rgba(15,23,42,0.84)] shadow-2xl shadow-black/25"
    >
      <div className="p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
              <Layers3 className="h-5 w-5" />
              Synchronized Motion Twin Lab
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-white lg:text-4xl">
              Your swing and two simulated reference movements—locked to the same phase
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              The athlete video is the master clock. The category and best-in-class silhouettes advance through preparation, loading, contact, and recovery at the same normalized moment. Red arrows highlight the most useful directional correction on your measured pose.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
              AceCoach v3.4.0 · deterministic phase-aligned simulation
            </div>
          </div>
          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Category lens</p>
            <p className="mt-1 font-semibold text-white">{reference?.categoryLens ?? "Development reference"}</p>
            <p className="mt-1 text-xs text-sky-100/60">{report.referenceComparison?.cohortLabel ?? reference?.categoryLabel ?? "Criterion-based lens"}</p>
            <p className="mt-1 text-[11px] text-sky-100/45">Template range adapted to saved playing level; not an age percentile.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/65 p-3">
          <button type="button" onClick={() => seek(startTime)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10" aria-label="Restart primary stroke">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void togglePlayback()} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause all" : "Play all"}
          </button>
          {[0.25, 0.5, 1].map((rate) => (
            <button key={rate} type="button" onClick={() => setRate(rate)} className={`rounded-xl px-3 py-2 text-sm ${playbackRate === rate ? "bg-white text-slate-950" : "border border-white/10 bg-white/5 text-slate-300"}`}>
              {rate}×
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={loopPrimaryStroke} onChange={(event) => setLoopPrimaryStroke(event.target.checked)} className="accent-violet-400" />
            Loop measured stroke
          </label>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToStage(item.id)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${activeStage === item.id ? "border-violet-400/55 bg-violet-400/15 text-violet-100" : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-black shadow-lg shadow-black/25">
            <div className="border-b border-white/10 bg-slate-950/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">1 · Your measured movement</p>
              <p className="mt-2 font-semibold text-white">{activeArea?.label ?? STAGES.find((item) => item.id === stage)?.label}</p>
            </div>
            <div
              className="relative overflow-hidden bg-black"
              style={{ aspectRatio: `${report.frameSummary?.width ?? 16} / ${report.frameSummary?.height ?? 9}` }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(event) => {
                  setCurrentTime(event.currentTarget.currentTime);
                  setActiveStage(stageFromAnchors(event.currentTarget.currentTime, stageAnchors));
                }}
                onLoadedMetadata={(event) => {
                  event.currentTarget.playbackRate = playbackRate;
                  seek(startTime);
                }}
              />
              <div className="pointer-events-none absolute inset-0">
                <PoseSvg pose={playerPose} color="#34d399" accent="#38bdf8" title="Measured athlete pose" />
                <DifferenceOverlay markers={differenceMarkers} />
              </div>
              <div className="absolute left-3 top-3 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-white backdrop-blur">
                <p className="font-semibold capitalize text-emerald-300">{stage}</p>
                <p className="mt-1 text-slate-300">{currentTime.toFixed(2)} s · {Math.round(normalizedProgress * 100)}%</p>
              </div>
            </div>
            <div className="border-t border-white/10 bg-slate-950/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">Visible correction markers</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{activeArea?.observation ?? "The red vectors show a directional coaching target at the current phase."}</p>
              {differenceMarkers[0] ? <p className="mt-3 text-sm font-medium text-rose-200">Marker: {differenceMarkers[0].label}</p> : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950/75 shadow-lg shadow-black/25">
            <div className="border-b border-white/10 bg-slate-950/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">2 · Category motion twin</p>
              <p className="mt-2 font-semibold text-white">{reference?.categoryLens ?? "Development reference"}</p>
            </div>
            <div className="aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,.12),transparent_40%),#020617] p-3">
              <PoseSvg
                pose={categoryPose}
                ghostPose={movementPose(actionType, activeStage, "category", dominantSide, categoryScale)}
                color="#7dd3fc"
                accent="#38bdf8"
                title="Category reference silhouette"
                swingPath={categoryPath}
                swingJoint={swingJoint}
              />
            </div>
            <div className="border-t border-white/10 bg-slate-950/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Category objective</p>
              <p className="mt-2 text-sm font-semibold text-white">{activeReferenceCheckpoint?.label ?? activeStage}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{activeReferenceCheckpoint?.focus ?? activeArea?.coachingGoal ?? "Build a repeatable movement shape suited to your development category."}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-950/75 shadow-lg shadow-black/25">
            <div className="border-b border-white/10 bg-slate-950/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">3 · Best-in-class motion twin</p>
              <p className="mt-2 font-semibold text-white">Elite organizing principle</p>
            </div>
            <div className="aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.15),transparent_42%),#020617] p-3">
              <PoseSvg
                pose={elitePose}
                ghostPose={movementPose(actionType, activeStage, "elite", dominantSide)}
                color="#c4b5fd"
                accent="#a78bfa"
                title="Best-in-class reference silhouette"
                swingPath={elitePath}
                swingJoint={swingJoint}
              />
            </div>
            <div className="border-t border-white/10 bg-slate-950/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">Pattern to notice</p>
              <p className="mt-2 text-sm font-semibold text-white">{activeReferenceCheckpoint?.label ?? activeStage}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{activeReferenceCheckpoint?.eliteFocus ?? activeReferenceCheckpoint?.focus ?? "Observe whole-body organization, spacing, and readiness rather than copying an exact body shape."}</p>
            </div>
          </div>
        </div>

        <input
          type="range"
          min={startTime}
          max={Math.max(endTime, startTime + 0.01)}
          step={1 / Math.max(report.frameSummary?.fps ?? 30, 1)}
          value={Math.min(Math.max(currentTime, startTime), endTime)}
          onChange={(event) => seek(Number(event.target.value))}
          className="mt-5 w-full accent-violet-400"
          aria-label="Synchronized stroke timeline"
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-emerald-300" />
              <p className="font-semibold text-white">Difference interpreter</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">Your gap</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{activeArea?.observation ?? "Review the red marker on the measured silhouette."}</p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Category target</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{activeReferenceCheckpoint?.focus ?? activeArea?.coachingGoal}</p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">Elite principle</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{activeReferenceCheckpoint?.eliteFocus ?? "Preserve balance, sequencing, and readiness while adapting to the ball."}</p>
              </div>
            </div>
            {activeArea?.cue ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
                <ArrowRight className="h-5 w-5 shrink-0 text-emerald-300" />
                <p className="text-sm text-emerald-100"><span className="font-semibold">Use this cue:</span> “{activeArea.cue}”</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
              <div className="flex items-center gap-2 text-emerald-200"><Target className="h-4 w-4" /><p className="text-sm font-semibold">What to copy</p></div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{activeReferenceCheckpoint?.focus ?? "Copy the organizing principle—not an exact silhouette."}</p>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-5">
              <div className="flex items-center gap-2 text-violet-200"><Eye className="h-4 w-4" /><p className="text-sm font-semibold">What not to copy blindly</p></div>
              <p className="mt-3 text-sm leading-6 text-slate-300">Body proportions, grip, stance, tactical intent, incoming ball, and camera angle change the visible shape. The simulated twins illustrate a coaching principle, not a universal joint-angle prescription.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <div className="flex items-center gap-2 text-amber-200"><CircleAlert className="h-4 w-4" /><p className="text-sm font-semibold">Scientific boundary</p></div>
              <p className="mt-3 text-sm leading-6 text-slate-300">These silhouettes are deterministic visual simulations generated from phase templates and the confirmed movement family. They are not motion-capture avatars, age percentiles, or direct force measurements.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <button type="button" onClick={() => setShowSourceVideos((value) => !value)} className="flex w-full items-center justify-between gap-4 text-left">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><BadgeCheck className="h-4 w-4 text-emerald-300" />Real coaching and exemplar source videos</div>
              <p className="mt-1 text-sm text-slate-400">Use the simulations for synchronized learning; open the curated source videos for complete demonstrations and coaching context.</p>
            </div>
            <span className="text-sm font-semibold text-violet-200">{showSourceVideos ? "Hide" : "Show"}</span>
          </button>
          {showSourceVideos ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <SourceVideo media={reference?.categoryReference ?? null} icon={<Users className="h-4 w-4" />} accent="sky" />
              <SourceVideo media={reference?.eliteReference ?? null} icon={<Sparkles className="h-4 w-4" />} accent="violet" />
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            <Activity className="h-4 w-4 text-sky-300" />
            Synchronization method
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            AceCoach identifies the primary measured repetition, preserves its measured phase anchors, maps each phase interval to a normalized reference interval, and drives both simulated references from the same clock. This preserves stage alignment even when preparation, loading, contact, and recovery occupy different shares of the athlete’s stroke.
          </p>
        </div>
      </div>
    </section>
  );
}
