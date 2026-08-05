"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  GitBranch,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  ScanLine,
  Sparkles,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { confirmMovementAndReanalyze } from "@/app/actions/analysis-actions";
import type { AthleteReferenceContext } from "@/lib/reference/registry";
import type { AnalysisReport, BiomechanicalLinkage, BiomechanicalMetric } from "@/modules/analysis/types";
import { plainLanguage } from "../model/plain-language";
import {
  MOTION_STAGES,
  nearestFrame,
  stageAnchors,
  stageForTime,
  type JointName,
  type MotionStage,
  type Point,
} from "../motion/motion-model";

type OverlayMode = "coach" | "body" | "chain" | "clean";
type Landmark = { x: number; y: number; visibility: number };
type VisualCheckStatus = "good" | "correction" | "confirm";

const BODY_CONNECTIONS: Array<[string, string]> = [
  ["nose", "left_shoulder"], ["nose", "right_shoulder"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"],
  ["left_shoulder", "right_hip"], ["right_shoulder", "left_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
  ["left_wrist", "right_wrist"], ["left_knee", "right_knee"],
  ["left_ankle", "right_ankle"],
];

const MODE_OPTIONS: Array<{ id: OverlayMode; label: string; description: string }> = [
  { id: "coach", label: "Corrections", description: "Red change · green working · gray confirm" },
  { id: "body", label: "Body links", description: "Light full-body linkage map" },
  { id: "chain", label: "Power chain", description: "Green connected · red needs work" },
  { id: "clean", label: "Clean video", description: "Original footage only" },
];

const BACKHAND_FOUR_STAGES: Array<{
  number: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  motionStage: MotionStage;
  correction: string;
  visualChecks: [{ id: string; label: string }, { id: string; label: string }];
}> = [
  { number: 1, label: "Preparation", shortLabel: "Prepare", motionStage: "preparation", correction: "Turn the shoulders early and keep both hands organized together in front of the body. Racket position remains a separate video-confirmation item.", visualChecks: [{ id: "early-coil", label: "Back shoulder turns before the swing" }, { id: "two-hands-together", label: "Both hands stay organized together" }] },
  { number: 2, label: "Power position & drop", shortLabel: "Load & drop", motionStage: "loading", correction: "Load the outside leg and preserve visible space between the hands and torso before accelerating.", visualChecks: [{ id: "outside-leg-load", label: "Outside leg creates the load" }, { id: "arm-space", label: "Hands stay away from the torso" }] },
  { number: 3, label: "Contact", shortLabel: "Contact", motionStage: "contact", correction: "Keep the head inside the steady ring and meet the likely strike window with visible space from the torso.", visualChecks: [{ id: "quiet-contact", label: "Head stays quiet through the strike window" }, { id: "contact-in-front", label: "Hands meet in front with body space" }] },
  { number: 4, label: "Finish & recovery", shortLabel: "Finish & recover", motionStage: "finish", correction: "Swing through first, let the lead elbow finish above the nose line, then recover in balance.", visualChecks: [{ id: "lead-elbow-above-nose", label: "Lead elbow finishes above the nose line" }, { id: "recover", label: "First recovery step regains balance" }] },
];

function backhandGuideForMotionStage(stage: MotionStage) {
  if (stage === "preparation") return BACKHAND_FOUR_STAGES[0];
  if (stage === "loading" || stage === "swing") return BACKHAND_FOUR_STAGES[1];
  if (stage === "contact") return BACKHAND_FOUR_STAGES[2];
  return BACKHAND_FOUR_STAGES[3];
}

const STAGE_TO_PROFILE_PHASE: Record<MotionStage, BiomechanicalMetric["phase"]> = {
  preparation: "preparation",
  loading: "loading",
  swing: "acceleration",
  contact: "contact",
  finish: "follow_through",
  recovery: "follow_through",
};

const STAGE_COPY: Record<MotionStage, { question: string; observe: string; why: string; feel: string }> = {
  preparation: { question: "Did you create time before the ball arrived?", observe: "Watch the first body turn and the space between your hands and torso.", why: "Early organization lets the forward swing stay calm instead of becoming an arm-only rescue.", feel: "Turn first. Keep your options open." },
  loading: { question: "Did your base support the swing?", observe: "Watch both knees, the hip line, and whether your head stays over a usable base.", why: "The legs organize balance and give the trunk somewhere stable to rotate from.", feel: "Sit into the court, then move out of it." },
  swing: { question: "Did speed travel in the right order?", observe: "Follow the coloured chain from the base through the hips, shoulders, elbow, and hand.", why: "A connected sequence shares the work across the body and keeps the hand from rushing ahead alone.", feel: "Body starts; hand arrives last." },
  contact: { question: "Did you meet the ball with space?", observe: "Watch the hitting elbow, hand-to-body distance, head position, and balance at likely contact.", why: "Comfortable spacing makes racket control more repeatable across different incoming balls.", feel: "Meet it beside you—not on top of you." },
  finish: { question: "Could the swing slow down without losing posture?", observe: "Watch the hand path, shoulder turn, head, and base after likely contact.", why: "A free but balanced finish is evidence that the earlier sequence did not need a late correction.", feel: "Let it finish; stay tall enough to recover." },
  recovery: { question: "Were you ready for the next ball?", observe: "Watch whether the feet, knees, head, and balance point return to a useful position.", why: "A tennis stroke is not finished until the athlete can respond again.", feel: "Finish the shot, then win the next position." },
};

const STATUS_STYLE: Record<BiomechanicalLinkage["status"], { color: string; label: string; classes: string }> = {
  connected: { color: "#10b981", label: "connected", classes: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  delayed_transfer: { color: "#ef4444", label: "late", classes: "border-red-200 bg-red-50 text-red-900" },
  out_of_sequence: { color: "#ef4444", label: "out of order", classes: "border-red-200 bg-red-50 text-red-900" },
  unavailable: { color: "#94a3b8", label: "not visible", classes: "border-slate-200 bg-slate-50 text-slate-600" },
};

const VISUAL_STATUS = {
  good: { color: "#22c55e", label: "Working", classes: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  correction: { color: "#ef4444", label: "Change", classes: "border-red-200 bg-red-50 text-red-900" },
  confirm: { color: "#cbd5e1", label: "Confirm", classes: "border-slate-200 bg-slate-50 text-slate-700" },
} as const;

function visualStatus(status: "working" | "developing" | "priority" | "confirm" | undefined): VisualCheckStatus {
  if (status === "working") return "good";
  if (status === "confirm" || !status) return "confirm";
  return "correction";
}

function phaseTitle(stage: MotionStage) {
  return MOTION_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

function contentRect(video: HTMLVideoElement) {
  const width = video.clientWidth;
  const height = video.clientHeight;
  if (!video.videoWidth || !video.videoHeight) return { x: 0, y: 0, width, height };
  const videoRatio = video.videoWidth / video.videoHeight;
  const elementRatio = width / height;
  if (elementRatio > videoRatio) {
    const contentWidth = height * videoRatio;
    return { x: (width - contentWidth) / 2, y: 0, width: contentWidth, height };
  }
  const contentHeight = width / videoRatio;
  return { x: 0, y: (height - contentHeight) / 2, width, height: contentHeight };
}

function midpoint(a?: Landmark, b?: Landmark): Landmark | null {
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility, b.visibility) };
}

function stageArea(report: AnalysisReport, stage: MotionStage) {
  return report.coachingAreas?.find((area) => {
    const id = area.id.toLowerCase();
    if (stage === "preparation") return id.includes("prepar") || id.includes("backlift") || id.includes("ready");
    if (stage === "loading") return id.includes("load") || id.includes("foot") || id.includes("base") || id.includes("knee");
    if (stage === "swing") return id.includes("swing") || id.includes("sequence") || id.includes("rhythm");
    if (stage === "contact") return id.includes("contact") || id.includes("spacing");
    if (stage === "finish") return id.includes("finish") || id.includes("follow");
    return id.includes("recover") || id.includes("balance");
  });
}

export default function CoachVisionStudio({
  videoUrl,
  previewOnly = false,
  report,
  sessionId,
  actionType,
  actionOptions,
  athleteContext,
}: {
  videoUrl: string;
  previewOnly?: boolean;
  report: AnalysisReport;
  sessionId: string;
  actionType: string;
  actionOptions: Array<{ id: string; label: string }>;
  athleteContext?: AthleteReferenceContext;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSurfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const primaryIndex = report.frameSummary?.primaryRepetitionIndex ?? report.repetitions?.[0]?.index ?? null;
  const primary = report.repetitions?.find((item) => item.index === primaryIndex) ?? report.repetitions?.[0];
  const start = primary?.startSeconds ?? 0;
  const end = primary?.endSeconds ?? Math.max(report.frameSummary?.durationSeconds ?? 1, 1);
  const priorityTime = report.priorities[0]?.timestampSeconds;
  const initialTime = typeof priorityTime === "number" ? Math.max(start, Math.min(end, priorityTime)) : start;
  const anchors = useMemo(() => stageAnchors(report, start, end), [end, report, start]);
  const frames = useMemo(() => report.frameSummary?.frameMetrics ?? [], [report.frameSummary?.frameMetrics]);
  const profile = report.frameSummary?.biomechanicalProfile;
  const analysisContext = report.frameSummary?.analysisContext;
  const isTwoHandedBackhand = actionType.toLowerCase().replaceAll("-", "_").includes("two_handed_backhand");
  const side: "left" | "right" = (athleteContext?.dominantSide ?? report.frameSummary?.dominantSide ?? "right").toLowerCase().startsWith("left") ? "left" : "right";
  const [time, setTime] = useState(initialTime);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.5);
  const [mode, setMode] = useState<OverlayMode>("coach");
  const [stage, setStage] = useState<MotionStage>(stageForTime(initialTime, anchors));
  const [selectedAction, setSelectedAction] = useState(actionType);
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const currentFrame = useMemo(() => nearestFrame(frames, time), [frames, time]);
  const profilePhase = STAGE_TO_PROFILE_PHASE[stage];
  const phaseSummary = profile?.phases.find((item) => item.id === profilePhase);
  const phaseMetrics = profile?.metrics.filter((item) => item.phase === profilePhase && item.status === "available") ?? [];
  const visibleMetrics = phaseMetrics.slice(0, 5);
  const area = stageArea(report, stage);
  const copy = STAGE_COPY[stage];
  const activeBackhandGuide = isTwoHandedBackhand ? backhandGuideForMotionStage(stage) : null;
  const activeFrameworkStage = activeBackhandGuide
    ? report.coachSummary.pyramidSummary?.framework?.find((item) => item.step === activeBackhandGuide.number)
    : undefined;
  const activeVisualChecks = activeBackhandGuide?.visualChecks.map((check) => ({
    ...check,
    status: visualStatus(activeFrameworkStage?.checks?.find((item) => item.id === check.id)?.status),
  })) ?? [];
  const chainLinks = useMemo(() => profile?.linkages ?? [], [profile?.linkages]);
  const chainProgress = Math.max(0, Math.min(1, (time - anchors.loading) / Math.max(anchors.contact - anchors.loading, 0.1)));

  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const surface = mediaSurfaceRef.current;
    const canvas = canvasRef.current;
    const media = video ?? surface;
    if (!media || !canvas) return;
    const cssWidth = media.clientWidth;
    const cssHeight = media.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssWidth * ratio));
    canvas.height = Math.max(1, Math.round(cssHeight * ratio));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    if (mode === "clean" || !currentFrame?.keyLandmarks) return;
    const rect = video ? contentRect(video) : { x: 0, y: 0, width: cssWidth, height: cssHeight };
    const toCanvas = (point: { x: number; y: number }) => ({ x: rect.x + point.x * rect.width, y: rect.y + point.y * rect.height });
    const landmarks = currentFrame.keyLandmarks;

    const drawBody = (
      points: Record<string, Landmark | Point | undefined> | Partial<Record<JointName, Point>>,
      palette: { body: string; edge: string; joint: string },
      opacity = 1,
    ) => {
      const leftShoulder = points.left_shoulder;
      const rightShoulder = points.right_shoulder;
      const leftHip = points.left_hip;
      const rightHip = points.right_hip;
      if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;
      const ls = toCanvas(leftShoulder); const rs = toCanvas(rightShoulder);
      const lh = toCanvas(leftHip); const rh = toCanvas(rightHip);
      const shoulderSpan = Math.max(18, Math.hypot(rs.x - ls.x, rs.y - ls.y));
      context.save();
      context.globalAlpha = opacity;
      context.lineCap = "round";
      context.lineJoin = "round";

      context.beginPath();
      context.moveTo(ls.x, ls.y);
      context.quadraticCurveTo((ls.x + rs.x) / 2, Math.min(ls.y, rs.y) - shoulderSpan * 0.06, rs.x, rs.y);
      context.lineTo(rh.x, rh.y);
      context.quadraticCurveTo((rh.x + lh.x) / 2, Math.max(rh.y, lh.y) + shoulderSpan * 0.05, lh.x, lh.y);
      context.closePath();
      context.fillStyle = palette.body;
      context.fill();
      context.strokeStyle = palette.edge;
      context.lineWidth = Math.max(1.5, shoulderSpan * 0.035);
      context.stroke();

      const capsules: Array<[string, string, number]> = [
        ["left_shoulder", "left_elbow", 0.14], ["left_elbow", "left_wrist", 0.12],
        ["right_shoulder", "right_elbow", 0.14], ["right_elbow", "right_wrist", 0.12],
        ["left_hip", "left_knee", 0.19], ["left_knee", "left_ankle", 0.15],
        ["right_hip", "right_knee", 0.19], ["right_knee", "right_ankle", 0.15],
      ];
      capsules.forEach(([fromName, toName, width]) => {
        const from = points[fromName as JointName]; const to = points[toName as JointName];
        if (!from || !to) return;
        const a = toCanvas(from); const b = toCanvas(to);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = palette.edge;
        context.lineWidth = shoulderSpan * width + 3;
        context.stroke();
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = palette.body;
        context.lineWidth = shoulderSpan * width;
        context.stroke();
      });

      const namedPoints = points as Record<string, Landmark | Point | undefined>;
      const head = namedPoints.head ?? namedPoints.nose;
      if (head) {
        const h = toCanvas(head);
        context.beginPath();
        context.ellipse(h.x, h.y, shoulderSpan * 0.18, shoulderSpan * 0.23, 0, 0, Math.PI * 2);
        context.fillStyle = palette.body;
        context.fill();
        context.strokeStyle = palette.edge;
        context.lineWidth = Math.max(1.5, shoulderSpan * 0.035);
        context.stroke();
      }
      for (const jointName of ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]) {
        const point = points[jointName as JointName];
        if (!point) continue;
        const p = toCanvas(point);
        context.beginPath();
        context.arc(p.x, p.y, shoulderSpan * 0.055, 0, Math.PI * 2);
        context.fillStyle = palette.joint;
        context.fill();
      }
      context.restore();
    };

    if (mode === "body") drawBody(landmarks, {
      body: "rgba(186,230,253,.30)",
      edge: "rgba(56,189,248,.76)",
      joint: "rgba(248,250,252,.94)",
    }, 0.72);

    const label = (text: string, x: number, y: number, color = "#e2e8f0") => {
      context.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      const width = context.measureText(text).width + 14;
      const left = Math.max(5, Math.min(cssWidth - width - 5, x));
      const top = Math.max(5, Math.min(cssHeight - 25, y));
      context.fillStyle = "rgba(2,6,23,.84)";
      context.beginPath();
      context.roundRect(left, top, width, 22, 7);
      context.fill();
      context.fillStyle = color;
      context.fillText(text, left + 7, top + 15);
    };

    const drawLine = (a: Landmark | Point | undefined, b: Landmark | Point | undefined, color: string, width: number, dash: number[] = []) => {
      if (!a || !b) return;
      const startPoint = toCanvas(a);
      const endPoint = toCanvas(b);
      context.beginPath();
      context.setLineDash(dash);
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(endPoint.x, endPoint.y);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.shadowBlur = 0;
      context.stroke();
      context.setLineDash([]);
      context.shadowBlur = 0;
    };

    const linkColor = (index: number) => STATUS_STYLE[chainLinks[index]?.status ?? "unavailable"].color;
    const hit = side;
    const support = side === "right" ? "left" : "right";
    const bodyColor = "rgba(241,245,249,.72)";
    const assessmentColor = area?.status === "strength" ? VISUAL_STATUS.good.color : area ? VISUAL_STATUS.correction.color : VISUAL_STATUS.confirm.color;

    for (const [startName, endName] of BODY_CONNECTIONS) {
      let color = bodyColor;
      let width = mode === "chain" ? 1.8 : 1.15;
      if (mode === "chain") {
        if (startName.includes("ankle") || endName.includes("ankle")) color = linkColor(0);
        else if (startName.includes("knee") || endName.includes("knee")) color = linkColor(1);
        else if (startName.includes("hip") && endName.includes("hip")) color = linkColor(2);
        else if (startName.includes("shoulder") && endName.includes("shoulder")) color = linkColor(3);
        else if (startName === `${hit}_shoulder` && endName === `${hit}_elbow`) color = linkColor(4);
        else if (startName === `${hit}_elbow` && endName === `${hit}_wrist`) color = linkColor(5);
        else if (startName.includes(support)) color = "rgba(148,163,184,.45)";
        width = 1.9;
      }
      drawLine(landmarks[startName], landmarks[endName], color, width, [2, 5]);
    }

    const frameIndex = frames.findIndex((frame) => frame.frameIndex === currentFrame.frameIndex);
    const trail = frames.slice(Math.max(0, frameIndex - 14), frameIndex + 1)
      .map((frame) => frame.keyLandmarks?.[`${side}_wrist`])
      .filter((point): point is Landmark => Boolean(point && point.visibility >= 0.35));
    if (trail.length > 1 && mode !== "coach") {
      context.beginPath();
      trail.forEach((point, index) => {
        const mapped = toCanvas(point);
        if (index === 0) context.moveTo(mapped.x, mapped.y);
        else context.lineTo(mapped.x, mapped.y);
      });
      context.strokeStyle = assessmentColor;
      context.lineWidth = 2;
      context.setLineDash([3, 5]);
      context.stroke();
      context.setLineDash([]);
    }

    if (mode === "coach" && activeBackhandGuide) {
      type CanvasPoint = { x: number; y: number };
      const direction = side === "right" ? -1 : 1;
      const handCenter = midpoint(landmarks.left_wrist, landmarks.right_wrist);
      const shoulderCenter = midpoint(landmarks.left_shoulder, landmarks.right_shoulder);
      const ankleCenter = midpoint(landmarks.left_ankle, landmarks.right_ankle);
      const torsoCenter = midpoint(landmarks.left_hip, landmarks.right_hip) ?? shoulderCenter;
      const nose = landmarks.nose;
      const leadElbow = landmarks[`${support}_elbow`];

      const markerColor = (index: number) => VISUAL_STATUS[activeVisualChecks[index]?.status ?? "confirm"].color;
      const drawPixelArrow = (from: CanvasPoint, to: CanvasPoint, color: string) => {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        context.save();
        context.globalAlpha = 0.92;
        context.strokeStyle = color;
        context.fillStyle = color;
        context.lineWidth = 2.25;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.beginPath();
        context.moveTo(to.x, to.y);
        context.lineTo(to.x - 9 * Math.cos(angle - Math.PI / 6), to.y - 9 * Math.sin(angle - Math.PI / 6));
        context.lineTo(to.x - 9 * Math.cos(angle + Math.PI / 6), to.y - 9 * Math.sin(angle + Math.PI / 6));
        context.closePath();
        context.fill();
        context.restore();
      };
      const drawSteadyRing = (point: CanvasPoint, color: string) => {
        context.save();
        context.globalAlpha = 0.9;
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(point.x, point.y, 13, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([2, 5]);
        context.beginPath();
        context.arc(point.x, point.y, 20, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      };
      const drawReferenceLine = (from: CanvasPoint, to: CanvasPoint) => {
        context.save();
        context.strokeStyle = "rgba(226,232,240,.72)";
        context.lineWidth = 1;
        context.setLineDash([2, 5]);
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.restore();
      };

      if (activeBackhandGuide.number === 1) {
        if (shoulderCenter) {
          const shoulder = toCanvas(shoulderCenter);
          const color = markerColor(0);
          drawSteadyRing(shoulder, color);
          label("1A · TURN EARLY", shoulder.x + 20, shoulder.y + 18, color);
        }
        if (handCenter) {
          const hands = toCanvas(handCenter);
          const color = markerColor(1);
          drawSteadyRing(hands, color);
          label("1B · HANDS TOGETHER", hands.x + 18, hands.y - 24, color);
        }
      } else if (activeBackhandGuide.number === 2) {
        const outsideKnee = landmarks[`${side}_knee`];
        if (outsideKnee) {
          const knee = toCanvas(outsideKnee);
          const color = markerColor(0);
          drawPixelArrow({ x: knee.x, y: knee.y - 30 }, knee, color);
          drawSteadyRing(knee, color);
          label("2A · LOAD LEG", knee.x + 18, knee.y + 12, color);
        }
        if (handCenter && torsoCenter) {
          const hands = toCanvas(handCenter);
          const torso = toCanvas(torsoCenter);
          const color = markerColor(1);
          drawPixelArrow(torso, hands, color);
          label("2B · CREATE ARM SPACE", (torso.x + hands.x) / 2 + 10, (torso.y + hands.y) / 2 + 10, color);
        }
      } else if (activeBackhandGuide.number === 3) {
        if (nose) {
          const head = toCanvas(nose);
          const color = markerColor(0);
          drawSteadyRing(head, color);
          label("3A · KEEP HEAD QUIET", head.x + 22, head.y - 18, color);
        }
        if (handCenter && torsoCenter) {
          const hands = toCanvas(handCenter);
          const torso = toCanvas(torsoCenter);
          const color = markerColor(1);
          drawPixelArrow(torso, hands, color);
          label("3B · KEEP BODY SPACE", (torso.x + hands.x) / 2 + 10, (torso.y + hands.y) / 2 + 10, color);
        }
      } else if (activeBackhandGuide.number === 4) {
        if (nose && leadElbow) {
          const head = toCanvas(nose);
          const elbow = toCanvas(leadElbow);
          const elbowTarget = { x: elbow.x + direction * 18, y: head.y - 28 };
          drawReferenceLine({ x: head.x - 78, y: head.y }, { x: head.x + 78, y: head.y });
          label("NOSE LINE", head.x + 52, head.y + 5, VISUAL_STATUS.confirm.color);
          const color = markerColor(0);
          drawPixelArrow(elbow, elbowTarget, color);
          drawSteadyRing(elbowTarget, color);
          label("4A · ELBOW ABOVE NOSE", elbowTarget.x + 18, elbowTarget.y - 20, color);
        }
        if (ankleCenter) {
          const base = toCanvas(ankleCenter);
          const color = markerColor(1);
          drawSteadyRing(base, color);
          label("4B · RECOVER BALANCED", base.x + 20, base.y - 18, color);
        }
      }
    }

    const pointEntries = Object.entries(landmarks).filter(([, point]) => point.visibility >= 0.35);
    for (const [name, point] of pointEntries) {
      const mapped = toCanvas(point);
      const isHitJoint = name.startsWith(hit) && (name.includes("shoulder") || name.includes("elbow") || name.includes("wrist"));
      context.beginPath();
      context.arc(mapped.x, mapped.y, isHitJoint ? 5.3 : 3.8, 0, Math.PI * 2);
      context.fillStyle = isHitJoint ? "#f8fafc" : "rgba(226,232,240,.86)";
      context.fill();
    }

    if (mode === "chain" && chainLinks.length > 0) {
      const nodes = [
        midpoint(landmarks.left_ankle, landmarks.right_ankle),
        midpoint(landmarks.left_knee, landmarks.right_knee),
        midpoint(landmarks.left_hip, landmarks.right_hip),
        midpoint(landmarks.left_hip, landmarks.right_hip),
        midpoint(landmarks.left_shoulder, landmarks.right_shoulder),
        landmarks[`${side}_elbow`],
        landmarks[`${side}_wrist`],
      ];
      const activeIndex = Math.min(6, Math.floor(chainProgress * 7));
      const names = ["BASE", "KNEES", "HIPS", "TURN", "SHOULDERS", "ELBOW", "HAND"];
      nodes.forEach((node, index) => {
        if (!node) return;
        const mapped = toCanvas(node);
        const active = index === activeIndex;
        context.beginPath();
        context.arc(mapped.x, mapped.y, active ? 12 : 7, 0, Math.PI * 2);
        context.fillStyle = active ? "rgba(248,250,252,.22)" : "rgba(15,23,42,.64)";
        context.fill();
        context.strokeStyle = index === 0 ? linkColor(0) : linkColor(Math.min(index - 1, 5));
        context.lineWidth = active ? 3.5 : 2;
        context.stroke();
        if (mode === "chain") label(names[index], mapped.x + 9, mapped.y - 22, active ? (index === 0 ? linkColor(0) : linkColor(Math.min(index - 1, 5))) : "#e2e8f0");
      });
    }

    if (currentFrame.centerOfMass && mode !== "coach") {
      const com = toCanvas(currentFrame.centerOfMass);
      context.strokeStyle = assessmentColor;
      context.lineWidth = 1.75;
      context.beginPath();
      context.arc(com.x, com.y, 8, 0, Math.PI * 2);
      context.moveTo(com.x - 12, com.y);
      context.lineTo(com.x + 12, com.y);
      context.moveTo(com.x, com.y - 12);
      context.lineTo(com.x, com.y + 12);
      context.stroke();
      if (mode === "body") label("balance point", com.x + 10, com.y + 8, assessmentColor);
    }

    if (mode === "body") {
      const angleArc = (aName: string, bName: string, cName: string, value: number | null | undefined, title: string) => {
        const a = landmarks[aName]; const b = landmarks[bName]; const c = landmarks[cName];
        if (!a || !b || !c || typeof value !== "number") return;
        const pa = toCanvas(a); const pb = toCanvas(b); const pc = toCanvas(c);
        const startAngle = Math.atan2(pa.y - pb.y, pa.x - pb.x);
        const endAngle = Math.atan2(pc.y - pb.y, pc.x - pb.x);
        context.beginPath();
        context.arc(pb.x, pb.y, 23, startAngle, endAngle, false);
        context.strokeStyle = assessmentColor;
        context.lineWidth = 2;
        context.stroke();
        if (cssWidth >= 420) label(`${title} ${Math.round(value)}°`, pb.x + 18, pb.y - 30, assessmentColor);
      };
      if (stage === "loading") {
        angleArc(`${side}_hip`, `${side}_knee`, `${side}_ankle`, currentFrame.dominantKneeAngle, "knee");
        angleArc(`${support}_hip`, `${support}_knee`, `${support}_ankle`, currentFrame.oppositeKneeAngle, "support knee");
      } else if (stage === "contact" || stage === "swing") {
        angleArc(`${side}_shoulder`, `${side}_elbow`, `${side}_wrist`, currentFrame.dominantElbowAngle ?? currentFrame.elbowAngle, "elbow");
      } else if (typeof currentFrame.shoulderPelvisSeparation === "number") {
        const shoulder = midpoint(landmarks.left_shoulder, landmarks.right_shoulder);
        if (shoulder) {
          const mapped = toCanvas(shoulder);
          label(`shoulder–hip view ${Math.round(currentFrame.shoulderPelvisSeparation)}°`, mapped.x + 14, mapped.y - 30, "#fef08a");
        }
      }
    }
  }, [activeBackhandGuide, activeVisualChecks, area, chainLinks, chainProgress, currentFrame, frames, mode, side, stage]);

  useEffect(() => {
    drawOverlay();
    window.addEventListener("resize", drawOverlay);
    return () => window.removeEventListener("resize", drawOverlay);
  }, [drawOverlay]);

  useEffect(() => () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }, []);

  useEffect(() => {
    function showMoment() {
      seek(initialTime);
      document.getElementById("key-moment")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function showRegion(event: Event) {
      const detail = (event as CustomEvent<{ time?: number | null; phase?: string }>).detail;
      if (typeof detail?.time === "number") seek(detail.time);
      const requested = detail?.phase;
      const mapped: Record<string, MotionStage> = { preparation: "preparation", loading: "loading", acceleration: "swing", contact: "contact", follow_through: "finish" };
      if (requested && mapped[requested]) setStage(mapped[requested]);
      setMode("coach");
    }
    window.addEventListener("acecoach:show-key-moment", showMoment);
    window.addEventListener("acecoach:coach-region", showRegion);
    return () => {
      window.removeEventListener("acecoach:show-key-moment", showMoment);
      window.removeEventListener("acecoach:coach-region", showRegion);
    };
  });

  function updateFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= end) video.currentTime = start;
    const next = video.currentTime;
    setTime(next);
    setStage(stageForTime(next, anchors));
    if (!video.paused) animationRef.current = requestAnimationFrame(updateFromVideo);
  }

  function seek(next: number) {
    const value = Math.max(start, Math.min(end, next));
    if (videoRef.current) videoRef.current.currentTime = value;
    setTime(value);
    setStage(stageForTime(value, anchors));
  }

  async function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < start || video.currentTime >= end) video.currentTime = start;
      video.playbackRate = rate;
      try {
        await video.play();
      } catch {
        setPlaying(false);
        return;
      }
      setPlaying(true);
      animationRef.current = requestAnimationFrame(updateFromVideo);
    } else {
      video.pause();
      setPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }

  async function correctMovement() {
    if (selectedAction === actionType) return;
    setCorrecting(true);
    setCorrectionError(null);
    try {
      await confirmMovementAndReanalyze(sessionId, selectedAction);
      router.refresh();
    } catch (error) {
      setCorrectionError(error instanceof Error ? error.message : "Unable to correct and re-analyse the movement.");
    } finally {
      setCorrecting(false);
    }
  }

  const classificationConfidence = Math.round((report.movementClassification?.confidence ?? report.confidence) * 100);

  return (
    <section id="key-moment" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_90%_0%,rgba(191,219,254,.5),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#ecfdf5_100%)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800"><ScanLine className="h-4 w-4" />1 · See the video evidence</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Now see the summary on your stroke</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Use the same stage-and-letter references as the summary above. Green means the measured body check is working, red means change it, and gray means the camera cannot confirm it. The light dotted body map stays neutral.</p>
          </div>
          <div className="min-w-64 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detected movement</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-semibold text-emerald-800">{classificationConfidence}% confidence</span></div>
            <div className="mt-3 flex gap-2"><select value={selectedAction} onChange={(event) => setSelectedAction(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500" aria-label="Correct detected movement">{actionOptions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select><button type="button" onClick={() => void correctMovement()} disabled={selectedAction === actionType || correcting} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173F6A] px-3 text-xs font-semibold text-white disabled:opacity-40">{correcting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Correct</button></div>
            <p className="mt-2 text-[0.68rem] leading-5 text-slate-500">If this is wrong, correct it. The report will rebuild around the right stroke.</p>
            {correctionError ? <p role="alert" className="mt-2 text-xs text-rose-700">{correctionError}</p> : null}
          </div>
        </div>
        {analysisContext ? <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/75 p-4 md:grid-cols-[auto_1fr] md:items-start">
          <div className="flex flex-wrap gap-2 text-[0.68rem] font-semibold"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-900">{analysisContext.shotSituationLabel}</span><span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-900">Intent: {analysisContext.shotIntentLabel}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{analysisContext.cameraAngleLabel}</span>{analysisContext.athleteHeightCm ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-900">Height-aware · {analysisContext.athleteHeightCm} cm</span> : null}</div>
          <div><p className="text-xs leading-5 text-slate-500">{analysisContext.statement}</p>{analysisContext.athleteQuestion ? <p className="mt-2 flex items-start gap-2 text-xs font-medium leading-5 text-slate-800"><Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />Your question: {analysisContext.athleteQuestion}</p> : null}</div>
        </div> : null}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.48fr)_minmax(360px,.72fr)]">
        <div className="border-b border-slate-200 p-4 sm:p-6 xl:border-b-0 xl:border-r">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Video overlay lens">
            {MODE_OPTIONS.map((option) => <button key={option.id} type="button" role="tab" aria-selected={mode === option.id} onClick={() => setMode(option.id)} className={`rounded-xl border px-3 py-3 text-left transition ${mode === option.id ? "border-blue-900 bg-blue-950 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}><span className="block text-xs font-semibold">{option.label}</span><span className={`mt-1 hidden text-[0.63rem] leading-4 lg:block ${mode === option.id ? "text-blue-200" : "text-slate-400"}`}>{option.description}</span></button>)}
          </div>

          <div ref={mediaSurfaceRef} className="relative mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            {previewOnly ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(30,64,175,.25),transparent_34%),linear-gradient(145deg,#020617,#0f172a)]" aria-label="Visual QA movement preview"><div className="absolute inset-x-0 bottom-16 text-center text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-500">Visual QA movement preview</div></div> : <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" className="h-full w-full object-contain" onLoadedMetadata={() => seek(initialTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
            <div data-testid="video-stage-reference" className="absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white">{activeBackhandGuide ? `Stage ${activeBackhandGuide.number} · ${activeBackhandGuide.label}` : phaseTitle(stage)} · {time.toFixed(2)}s</p><p className="mt-1 text-[0.65rem] text-slate-300">{phaseTitle(stage)} frame {currentFrame?.frameIndex ?? "—"} · {mode === "clean" ? "original video" : MODE_OPTIONS.find((item) => item.id === mode)?.label}</p></div>
            {mode !== "clean" ? <div data-testid="correction-overlay-key" className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[0.62rem]"><span className="rounded-full bg-slate-950/88 px-2 py-1 text-slate-100">light dots = {BODY_CONNECTIONS.length} body links</span>{mode === "coach" ? <><span className="rounded-full bg-red-950/90 px-2 py-1 text-red-100">red = change</span><span className="rounded-full bg-emerald-950/90 px-2 py-1 text-emerald-100">green = working</span><span className="rounded-full bg-slate-800/90 px-2 py-1 text-slate-100">gray = confirm</span></> : null}{mode === "chain" ? <><span className="rounded-full bg-emerald-950/90 px-2 py-1 text-emerald-100">green = connected</span><span className="rounded-full bg-red-950/90 px-2 py-1 text-red-100">red = timing issue</span></> : null}</div> : null}
          </div>

          <input type="range" min={start} max={end} step={1 / Math.max(report.frameSummary?.fps ?? 30, 1)} value={Math.max(start, Math.min(end, time))} onChange={(event) => seek(Number(event.target.value))} className="mt-4 w-full accent-blue-900" aria-label="Biomechanical video timeline" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => seek(start)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Restart movement"><RefreshCw className="h-4 w-4" /></button>
            <button type="button" onClick={() => seek(time - 1 / Math.max(report.frameSummary?.fps ?? 30, 1))} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Previous frame"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => void toggle()} disabled={previewOnly} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#173F6A] px-5 font-semibold text-white hover:bg-[#103554] disabled:cursor-not-allowed disabled:opacity-50">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{previewOnly ? "Preview frames" : playing ? "Pause" : "Play at half speed"}</button>
            <button type="button" onClick={() => seek(time + 1 / Math.max(report.frameSummary?.fps ?? 30, 1))} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Next frame"><ChevronRight className="h-4 w-4" /></button>
            {[0.1, 0.25, 0.5, 1].map((value) => <button key={value} type="button" data-testid={`playback-rate-${value}`} onClick={() => { setRate(value); if (videoRef.current) videoRef.current.playbackRate = value; }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${rate === value ? "border-blue-900 bg-blue-50 text-blue-950" : "border-slate-200 text-slate-500"}`}>{value}×</button>)}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">{mode === "clean" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}Original video preserved</span>
          </div>

          <div data-testid={isTwoHandedBackhand ? "backhand-four-stage-video-map" : undefined} className={`mt-5 grid gap-2 ${isTwoHandedBackhand ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-6"}`} role="tablist" aria-label={isTwoHandedBackhand ? "Four backhand stages" : "Movement phase"}>
            {isTwoHandedBackhand ? BACKHAND_FOUR_STAGES.map((item) => <button key={item.number} type="button" role="tab" aria-selected={activeBackhandGuide?.number === item.number} onClick={() => seek(anchors[item.motionStage])} className={`rounded-xl border px-3 py-3 text-left ${activeBackhandGuide?.number === item.number ? "border-blue-300 bg-blue-50 text-blue-950 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800"}`}><span className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activeBackhandGuide?.number === item.number ? "bg-blue-950 text-white" : "bg-white text-slate-700"}`}>{item.number}</span><span className="text-xs font-semibold">{item.shortLabel}</span></span></button>) : MOTION_STAGES.map((item) => <button key={item.id} type="button" role="tab" aria-selected={stage === item.id} onClick={() => seek(anchors[item.id])} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold ${stage === item.id ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800"}`}>{item.label}</button>)}
          </div>
        </div>

        <aside className="flex flex-col bg-slate-50/70 p-5 sm:p-7">
          {activeBackhandGuide ? <div data-testid="active-four-stage-correction" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-950 text-xl font-bold text-white ring-4 ring-blue-100">{activeBackhandGuide.number}</span><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-blue-800">Matches stage {activeBackhandGuide.number} above</p><h3 className="mt-1 text-xl font-semibold text-slate-950">{activeBackhandGuide.label}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{activeBackhandGuide.correction}</p></div></div><div className="mt-4 grid gap-2" aria-label={`Stage ${activeBackhandGuide.number} correction checklist`}>{activeVisualChecks.map((check, index) => { const style = VISUAL_STATUS[check.status]; return <div key={check.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${style.classes}`}><span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white" style={{ backgroundColor: style.color }}>{activeBackhandGuide.number}{index === 0 ? "A" : "B"}</span><div><p className="text-xs font-semibold leading-5">{check.label}</p><p className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">{style.label}</p></div></div>; })}</div>{activeBackhandGuide.number === 1 || activeBackhandGuide.number === 2 ? <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-[0.68rem] leading-5 text-slate-700"><span className="font-semibold">Camera-honest view:</span> racket checkpoints remain in the written report as Confirm; no synthetic racket is drawn on the video.</p> : null}</div> : null}
          <div className={`${activeBackhandGuide ? "mt-6" : ""} flex items-start justify-between gap-4`}><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-violet-800">Coach’s eye · {activeBackhandGuide ? `Stage ${activeBackhandGuide.number}` : phaseTitle(stage)}</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">{copy.question}</h3></div><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">{phaseSummary?.availableMetricCount ?? 0}/{phaseSummary?.metricCount ?? 0} visible</span></div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-blue-100 bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800"><ScanLine className="h-4 w-4" />What I see</div><p className="mt-2 text-sm leading-6 text-slate-700">{plainLanguage(area?.observation ?? copy.observe)}</p></div>
            <div className="rounded-2xl border border-violet-100 bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-800"><Activity className="h-4 w-4" />Why the ball cares</div><p className="mt-2 text-sm leading-6 text-slate-700">{plainLanguage(area?.whyItMatters ?? copy.why)}</p></div>
            <div className="rounded-2xl bg-[#112f50] p-4 text-white"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-200"><Sparkles className="h-4 w-4" />Feel this</div><p className="mt-2 text-lg font-semibold leading-7">“{plainLanguage(area?.cue ?? report.coachingPlaybook?.feelCue ?? report.priorities[0]?.cue ?? copy.feel)}”</p></div>
          </div>

          <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Evidence behind the call</span><span className="text-[0.68rem] text-slate-400">{visibleMetrics.slice(0, 3).length} checks · open</span></summary>
            <div className="mt-3 space-y-2">
              {visibleMetrics.slice(0, 3).length > 0 ? visibleMetrics.slice(0, 3).map((metric) => <div key={metric.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3"><div><p className="text-xs font-semibold text-slate-800">{metric.label}</p><p className="mt-1 text-[0.66rem] leading-4 text-slate-500">{metric.playerMeaning}</p></div><span className="shrink-0 text-sm font-semibold text-slate-950">{metric.displayValue}</span></div>) : <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">This phase was not clear enough for a dependable body measurement.</p>}
            </div>
          </details>

          <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"><GitBranch className="h-4 w-4" />Full-body linkage map</span><span className="text-[0.68rem] text-slate-400">{BODY_CONNECTIONS.length} body links · {chainLinks.length} timing transfers</span></summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {chainLinks.map((link) => { const style = STATUS_STYLE[link.status]; return <button key={link.id} type="button" onClick={() => { const targetTime = link.target.peakTimestampSeconds; if (typeof targetTime === "number") seek(targetTime); setMode("chain"); }} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${style.classes}`}><span className="text-xs font-semibold">{link.source.label} <ArrowRight className="mx-1 inline h-3 w-3" /> {link.target.label}</span><span className="inline-flex shrink-0 items-center gap-1 text-[0.63rem] font-semibold uppercase"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />{style.label}</span></button>; })}
            </div>
          </details>

          <div className="mt-auto pt-6"><div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-[0.68rem] leading-5 text-slate-500"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>The light dotted body links use pose evidence. Green marks measured strengths, red marks corrections, and gray marks confirmation-only details. No simulated racket is drawn. This remains a 2D coaching view—not force data, racket-face measurement, or an exact 3D reconstruction.</p></div></div>
        </aside>
      </div>

      <div className="grid gap-px border-t border-slate-200 bg-slate-200 md:grid-cols-4">
        {[{ icon: Eye, title: "1 · Watch", copy: "Choose one numbered stage and use 0.1× when needed." }, { icon: GitBranch, title: "2 · Check A, then B", copy: "Read the two literal labels drawn on the athlete." }, { icon: Target, title: "3 · Feel", copy: "Use the matching short cue beside the video." }, { icon: CheckCircle2, title: "4 · Prove", copy: "Record the same drill and compare the next clip." }].map((item) => <div key={item.title} className="bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-800"><item.icon className="h-4 w-4 text-blue-800" />{item.title}</div><p className="mt-2 text-xs leading-5 text-slate-500">{item.copy}</p></div>)}
      </div>
    </section>
  );
}
