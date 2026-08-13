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
  ANNOTATION_VISIBILITY_THRESHOLD,
  CausalLandmarkStabilizer,
  MOTION_STAGES,
  calibratedNormalizedPoint,
  containRect,
  interpolatedFrameAtTime,
  stageAnchors,
  stageForTime,
  type MotionStage,
  type Point,
} from "../motion/motion-model";

type OverlayMode = "coach" | "body" | "chain" | "clean";
type Landmark = { x: number; y: number; visibility: number };
type VisualCheckStatus = "good" | "correction" | "confirm";

const BODY_CONNECTIONS: Array<[string, string]> = [
  ["nose", "neck_center"],
  ["neck_center", "left_shoulder"], ["neck_center", "right_shoulder"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["neck_center", "pelvis_center"],
  ["pelvis_center", "left_hip"], ["pelvis_center", "right_hip"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
];

const MODE_OPTIONS: Array<{ id: OverlayMode; label: string; description: string }> = [
  { id: "coach", label: "Corrections", description: "Red change · green working · uncertain hidden" },
  { id: "body", label: "Body links", description: "Joint-to-joint anatomical segments" },
  { id: "chain", label: "Power chain", description: "Base → knee → hip → hand" },
  { id: "clean", label: "Clean video", description: "Original footage only" },
];

const BACKHAND_FOUR_STAGES: Array<{
  number: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  motionStage: MotionStage;
  correction: string;
  visualChecks: Array<{ id: string; label: string }>;
}> = [
  { number: 1, label: "Preparation", shortLabel: "Prepare", motionStage: "preparation", correction: "Turn the shoulders early and keep both hands organized together in front of the body. Racket position remains a separate video-confirmation item.", visualChecks: [{ id: "early-coil", label: "Back shoulder turns before the swing" }, { id: "two-hands-together", label: "Both hands stay organized together" }] },
  { number: 2, label: "Power position & drop", shortLabel: "Load & drop", motionStage: "loading", correction: "Load the outside leg and preserve visible space between the hands and torso before accelerating.", visualChecks: [{ id: "outside-leg-load", label: "Outside leg creates the load" }, { id: "arm-space", label: "Hands stay away from the torso" }] },
  { number: 3, label: "Contact", shortLabel: "Contact", motionStage: "contact", correction: "Keep the head inside the steady ring and meet the likely strike window with visible space from the torso.", visualChecks: [{ id: "quiet-contact", label: "Head stays quiet through the strike window" }, { id: "contact-in-front", label: "Hands meet in front with body space" }] },
  { number: 4, label: "Finish & recovery", shortLabel: "Finish & recover", motionStage: "finish", correction: "Swing through first, let the lead elbow finish above the nose line, then recover in balance.", visualChecks: [{ id: "lead-elbow-above-nose", label: "Lead elbow finishes above the nose line" }, { id: "recover", label: "First recovery step regains balance" }, { id: "swing-through", label: "Hands travel through before finishing" }] },
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
  const videoFrameRef = useRef<number | null>(null);
  const primaryIndex = report.frameSummary?.primaryRepetitionIndex ?? report.repetitions?.[0]?.index ?? null;
  const primary = report.repetitions?.find((item) => item.index === primaryIndex) ?? report.repetitions?.[0];
  const start = primary?.startSeconds ?? 0;
  const end = primary?.endSeconds ?? Math.max(report.frameSummary?.durationSeconds ?? 1, 1);
  const priorityTime = report.priorities[0]?.timestampSeconds;
  const initialTime = typeof priorityTime === "number" ? Math.max(start, Math.min(end, priorityTime)) : start;
  const anchors = useMemo(() => stageAnchors(report, start, end), [end, report, start]);
  const frames = useMemo(() => report.frameSummary?.frameMetrics ?? [], [report.frameSummary?.frameMetrics]);
  const stabilizerRef = useRef(new CausalLandmarkStabilizer());
  const labelPlacementRef = useRef(new Map<string, { candidateIndex: number; left: number; top: number }>());
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
  const [storyCaption, setStoryCaption] = useState<string | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(() => stabilizerRef.current.update(interpolatedFrameAtTime(frames, initialTime)));
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
  const activeVisualChecks = useMemo(() => activeBackhandGuide?.visualChecks.map((check) => ({
    ...check,
    status: visualStatus(activeFrameworkStage?.checks?.find((item) => item.id === check.id)?.status),
  })) ?? [], [activeBackhandGuide, activeFrameworkStage]);
  const chainLinks = useMemo(() => profile?.linkages ?? [], [profile?.linkages]);
  const chainProgress = Math.max(0, Math.min(1, (time - anchors.loading) / Math.max(anchors.contact - anchors.loading, 0.1)));
  const presentationStep = report.frameSummary?.videoRegistration?.medianFrameIntervalSeconds
    ?? 1 / Math.max(report.frameSummary?.fps ?? 30, 1);

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
    if (seeking || mode === "clean" || !currentFrame?.keyLandmarks) return;
    const registration = report.frameSummary?.videoRegistration;
    const rect = video
      ? containRect(video.clientWidth, video.clientHeight, video.videoWidth, video.videoHeight)
      : { x: 0, y: 0, width: cssWidth, height: cssHeight };
    const toCanvas = (point: { x: number; y: number }) => {
      const calibrated = calibratedNormalizedPoint(point, registration);
      return { x: rect.x + calibrated.x * rect.width, y: rect.y + calibrated.y * rect.height };
    };
    const landmarks = currentFrame.keyLandmarks;
    const neckCenter = midpoint(landmarks.left_shoulder, landmarks.right_shoulder);
    const pelvisCenter = midpoint(landmarks.left_hip, landmarks.right_hip);
    const torsoCenter = neckCenter && pelvisCenter ? midpoint(neckCenter, pelvisCenter) : null;
    const navelCenter = neckCenter && pelvisCenter ? {
      x: neckCenter.x + (pelvisCenter.x - neckCenter.x) * 0.72,
      y: neckCenter.y + (pelvisCenter.y - neckCenter.y) * 0.72,
      visibility: Math.min(neckCenter.visibility, pelvisCenter.visibility),
    } : null;
    const alignedLandmarks: Record<string, Landmark | undefined> = {
      ...landmarks,
      neck_center: neckCenter ?? undefined,
      pelvis_center: pelvisCenter ?? undefined,
      torso_center: torsoCenter ?? undefined,
      navel_center: navelCenter ?? undefined,
    };
    const leftShoulderCanvas = landmarks.left_shoulder ? toCanvas(landmarks.left_shoulder) : null;
    const rightShoulderCanvas = landmarks.right_shoulder ? toCanvas(landmarks.right_shoulder) : null;
    const leftHipCanvas = landmarks.left_hip ? toCanvas(landmarks.left_hip) : null;
    const rightHipCanvas = landmarks.right_hip ? toCanvas(landmarks.right_hip) : null;
    const neckCanvas = neckCenter ? toCanvas(neckCenter) : null;
    const pelvisCanvas = pelvisCenter ? toCanvas(pelvisCenter) : null;
    const bodyScalePixels = Math.max(
      18,
      leftShoulderCanvas && rightShoulderCanvas ? Math.hypot(rightShoulderCanvas.x - leftShoulderCanvas.x, rightShoulderCanvas.y - leftShoulderCanvas.y) : 0,
      leftHipCanvas && rightHipCanvas ? Math.hypot(rightHipCanvas.x - leftHipCanvas.x, rightHipCanvas.y - leftHipCanvas.y) * 1.15 : 0,
      neckCanvas && pelvisCanvas ? Math.hypot(pelvisCanvas.x - neckCanvas.x, pelvisCanvas.y - neckCanvas.y) * 0.45 : 0,
    );

    const placedLabels: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    const label = (text: string, x: number, y: number, color = "#e2e8f0") => {
      context.font = "700 9px ui-sans-serif, system-ui, sans-serif";
      const width = Math.min(cssWidth - 10, context.measureText(text).width + 12);
      const height = 18;
      const candidates = [
        { left: x, top: y },
        { left: x, top: y - 25 },
        { left: x - width - 10, top: y },
        { left: x - width - 10, top: y - 25 },
        { left: x - width / 2, top: y + 13 },
      ].map((item) => ({
        left: Math.max(5, Math.min(cssWidth - width - 5, item.left)),
        top: Math.max(5, Math.min(cssHeight - height - 5, item.top)),
      }));
      const prior = labelPlacementRef.current.get(text);
      const candidateOrder = prior
        ? [prior.candidateIndex, ...candidates.map((_, index) => index).filter((index) => index !== prior.candidateIndex)]
        : candidates.map((_, index) => index);
      let selectedIndex = -1;
      let position: { left: number; top: number } | undefined;
      for (const candidateIndex of candidateOrder) {
        const desired = candidates[candidateIndex];
        const proposed = prior && candidateIndex === prior.candidateIndex
          ? {
              left: prior.left + (desired.left - prior.left) * 0.3,
              top: prior.top + (desired.top - prior.top) * 0.3,
            }
          : desired;
        const collides = placedLabels.some((placed) => (
          proposed.left < placed.right + 5
          && proposed.left + width > placed.left - 5
          && proposed.top < placed.bottom + 5
          && proposed.top + height > placed.top - 5
        ));
        if (!collides) {
          selectedIndex = candidateIndex;
          position = proposed;
          break;
        }
      }
      if (!position) {
        labelPlacementRef.current.delete(text);
        return;
      }
      const { left, top } = position;
      labelPlacementRef.current.set(text, { candidateIndex: selectedIndex, left, top });
      placedLabels.push({ left, top, right: left + width, bottom: top + height });
      context.fillStyle = "rgba(2,6,23,.84)";
      context.beginPath();
      context.roundRect(left, top, width, height, 6);
      context.fill();
      context.fillStyle = color;
      context.fillText(text, left + 6, top + 12.5, width - 12);
    };

    const drawLine = (
      a: Landmark | Point | undefined,
      b: Landmark | Point | undefined,
      color: string,
      width: number,
      dash: number[] = [],
      maximumShoulderSpans = 3.4,
    ) => {
      if (!a || !b) return;
      const startPoint = toCanvas(a);
      const endPoint = toCanvas(b);
      if (Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) > bodyScalePixels * maximumShoulderSpans) return;
      context.save();
      context.beginPath();
      context.setLineDash(dash);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(endPoint.x, endPoint.y);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
      context.restore();
    };

    const linkColor = (index: number) => STATUS_STYLE[chainLinks[index]?.status ?? "unavailable"].color;
    const hit = side;
    const support = side === "right" ? "left" : "right";
    const assessmentColor = area?.status === "strength" ? VISUAL_STATUS.good.color : area ? VISUAL_STATUS.correction.color : VISUAL_STATUS.confirm.color;

    if (mode === "body" || mode === "chain") {
      for (const [startName, endName] of BODY_CONNECTIONS) {
        drawLine(
          alignedLandmarks[startName],
          alignedLandmarks[endName],
          mode === "body" ? "rgba(125,211,252,.92)" : "rgba(203,213,225,.34)",
          mode === "body" ? 2.1 : 1.25,
        );
      }
    }

    if (mode === "body" || mode === "chain") {
      const pointEntries = Object.entries(landmarks).filter(([, point]) => point.visibility >= ANNOTATION_VISIBILITY_THRESHOLD);
      for (const [name, point] of pointEntries) {
        const mapped = toCanvas(point);
        const isHitJoint = name.startsWith(hit) && (name.includes("shoulder") || name.includes("elbow") || name.includes("wrist"));
        context.beginPath();
        context.arc(mapped.x, mapped.y, isHitJoint ? 3.8 : 2.8, 0, Math.PI * 2);
        context.fillStyle = isHitJoint ? "#f8fafc" : "rgba(226,232,240,.82)";
        context.fill();
      }
    }

    const cameraSupportsMeasurement = !["unsupported", "not_visible"].includes(analysisContext?.cameraAngle ?? "");
    if (mode === "coach" && activeBackhandGuide && cameraSupportsMeasurement && currentFrame.visibility >= ANNOTATION_VISIBILITY_THRESHOLD) {
      type CanvasPoint = { x: number; y: number };
      const visible = (name: string) => {
        const point = landmarks[name];
        return point && point.visibility >= ANNOTATION_VISIBILITY_THRESHOLD ? point : undefined;
      };
      const visibleMidpoint = (first: string, second: string) => midpoint(visible(first), visible(second));
      const handCenter = visibleMidpoint("left_wrist", "right_wrist");
      const shoulderCenter = visibleMidpoint("left_shoulder", "right_shoulder");
      const ankleCenter = visibleMidpoint("left_ankle", "right_ankle");
      const hipCenter = visibleMidpoint("left_hip", "right_hip");
      const torsoCenter = hipCenter && shoulderCenter ? midpoint(hipCenter, shoulderCenter) : hipCenter ?? shoulderCenter;
      const nose = visible("nose");
      const leadElbow = visible(`${support}_elbow`);
      const leadWrist = visible(`${support}_wrist`);
      const previousFinishLandmarks = interpolatedFrameAtTime(frames, Math.max(start, time - 0.1))?.keyLandmarks;
      const mappedLeftShoulder = landmarks.left_shoulder ? toCanvas(landmarks.left_shoulder) : null;
      const mappedRightShoulder = landmarks.right_shoulder ? toCanvas(landmarks.right_shoulder) : null;
      const shoulderWidth = mappedLeftShoulder && mappedRightShoulder
        ? Math.hypot(mappedRightShoulder.x - mappedLeftShoulder.x, mappedRightShoulder.y - mappedLeftShoulder.y)
        : 80;
      const markerRadius = Math.max(4, Math.min(6, shoulderWidth * 0.055));

      const markerColor = (index: number) => {
        const status = activeVisualChecks[index]?.status ?? "confirm";
        return status === "confirm" ? null : VISUAL_STATUS[status].color;
      };
      const drawShortArrow = (from: CanvasPoint, to: CanvasPoint, color: string) => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 5) return;
        const unitX = dx / distance;
        const unitY = dy / distance;
        const arrowLength = Math.min(distance * 0.72, Math.max(18, Math.min(34, shoulderWidth * 0.34)));
        const end = { x: to.x - unitX * (markerRadius + 2), y: to.y - unitY * (markerRadius + 2) };
        const start = { x: end.x - unitX * arrowLength, y: end.y - unitY * arrowLength };
        const headLength = Math.max(5, Math.min(7, markerRadius + 1));
        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";
        context.globalAlpha = 0.32;
        context.strokeStyle = color;
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        context.globalAlpha = 0.98;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        context.beginPath();
        context.moveTo(end.x, end.y);
        context.lineTo(end.x - unitX * headLength - unitY * headLength * 0.62, end.y - unitY * headLength + unitX * headLength * 0.62);
        context.moveTo(end.x, end.y);
        context.lineTo(end.x - unitX * headLength + unitY * headLength * 0.62, end.y - unitY * headLength - unitX * headLength * 0.62);
        context.stroke();
        context.restore();
      };
      const drawCompactMarker = (point: CanvasPoint, color: string) => {
        context.save();
        context.globalAlpha = 0.96;
        context.fillStyle = "rgba(2,6,23,.72)";
        context.beginPath();
        context.arc(point.x, point.y, markerRadius, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = color;
        context.lineWidth = 1.75;
        context.beginPath();
        context.arc(point.x, point.y, markerRadius, 0, Math.PI * 2);
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
        if (shoulderCenter && mappedLeftShoulder && mappedRightShoulder) {
          const shoulder = toCanvas(shoulderCenter);
          const color = markerColor(0);
          if (color) {
            drawShortArrow(mappedLeftShoulder, mappedRightShoulder, color);
            drawCompactMarker(shoulder, color);
            label("1A · TURN EARLY", shoulder.x + 11, shoulder.y + 9, color);
          }
        }
        const hittingWrist = visible(`${side}_wrist`);
        if (handCenter && hittingWrist) {
          const hands = toCanvas(handCenter);
          const wrist = toCanvas(hittingWrist);
          const color = markerColor(1);
          if (color) {
            drawShortArrow(wrist, hands, color);
            drawCompactMarker(hands, color);
            label("1B · HANDS TOGETHER", hands.x + 11, hands.y - 19, color);
          }
        }
      } else if (activeBackhandGuide.number === 2) {
        const outsideKnee = visible(`${side}_knee`);
        const outsideHip = visible(`${side}_hip`);
        const outsideAnkle = visible(`${side}_ankle`);
        if (outsideKnee && outsideHip && outsideAnkle) {
          const knee = toCanvas(outsideKnee);
          const hip = toCanvas(outsideHip);
          const ankle = toCanvas(outsideAnkle);
          const color = markerColor(0);
          if (color) {
            drawShortArrow(hip, knee, color);
            drawShortArrow(knee, ankle, color);
            drawCompactMarker(knee, color);
            label("2A · LOAD HIP → KNEE → ANKLE", knee.x + 11, knee.y + 7, color);
          }
        }
        if (handCenter && torsoCenter) {
          const hands = toCanvas(handCenter);
          const torso = toCanvas(torsoCenter);
          const color = markerColor(1);
          if (color) {
            drawShortArrow(torso, hands, color);
            drawCompactMarker(hands, color);
            label("2B · CREATE SPACE", hands.x + 11, hands.y + 7, color);
          }
        }
      } else if (activeBackhandGuide.number === 3) {
        if (nose && shoulderCenter) {
          const head = toCanvas(nose);
          const headSegment = toCanvas(midpoint(nose, shoulderCenter)!);
          const color = markerColor(0);
          if (color) {
            drawShortArrow(headSegment, head, color);
            drawCompactMarker(head, color);
            label("3A · HEAD QUIET", headSegment.x + 11, headSegment.y - 18, color);
          }
        }
        if (handCenter && torsoCenter) {
          const hands = toCanvas(handCenter);
          const torso = toCanvas(torsoCenter);
          const color = markerColor(1);
          if (color) {
            drawShortArrow(torso, hands, color);
            drawCompactMarker(hands, color);
            label("3B · BODY SPACE", hands.x + 11, hands.y + 7, color);
          }
        }
      } else if (activeBackhandGuide.number === 4) {
        if (nose && leadElbow) {
          const head = toCanvas(nose);
          const elbow = toCanvas(leadElbow);
          const leadShoulder = visible(`${support}_shoulder`);
          drawReferenceLine({ x: head.x - shoulderWidth * 0.55, y: head.y }, { x: head.x + shoulderWidth * 0.55, y: head.y });
          const color = markerColor(0);
          if (color && leadShoulder) {
            drawShortArrow(toCanvas(leadShoulder), elbow, color);
            drawCompactMarker(elbow, color);
            label("4A · ELBOW HIGH", elbow.x + 11, elbow.y - 18, color);
          }
        }
        if (ankleCenter && torsoCenter) {
          const base = toCanvas(ankleCenter);
          const torso = toCanvas(torsoCenter);
          const color = markerColor(1);
          if (color) {
            drawShortArrow(torso, base, color);
            drawCompactMarker(base, color);
            label("4B · RECOVER", base.x + 11, base.y - 18, color);
          }
        }
        if (leadWrist && previousFinishLandmarks) {
          const previousWrist = previousFinishLandmarks[`${support}_wrist`];
          if (previousWrist && previousWrist.visibility >= ANNOTATION_VISIBILITY_THRESHOLD) {
            const wrist = toCanvas(leadWrist);
            const prior = toCanvas(previousWrist);
            if (Math.hypot(wrist.x - prior.x, wrist.y - prior.y) > 2) {
              const color = markerColor(2);
              if (color) {
                drawShortArrow(prior, wrist, color);
                drawCompactMarker(wrist, color);
                label("4C · SWING THROUGH", wrist.x + 11, wrist.y + 7, color);
              }
            }
          }
        }
      }
    }

    if (mode === "chain") {
      const nodes: Array<{ name: string; point: Landmark | undefined }> = [
        { name: "BASE", point: alignedLandmarks[`${side}_ankle`] },
        { name: "KNEE", point: alignedLandmarks[`${side}_knee`] },
        { name: "HIP", point: alignedLandmarks[`${side}_hip`] },
        { name: "CORE", point: alignedLandmarks.torso_center },
        { name: "SHOULDER", point: alignedLandmarks[`${side}_shoulder`] },
        { name: "ELBOW", point: alignedLandmarks[`${side}_elbow`] },
        { name: "HAND", point: alignedLandmarks[`${side}_wrist`] },
      ];
      const activeSegment = Math.min(5, Math.floor(chainProgress * 6));
      for (let index = 0; index < nodes.length - 1; index += 1) {
        const from = nodes[index].point;
        const to = nodes[index + 1].point;
        if (!from || !to) continue;
        const color = linkColor(index);
        const active = index === activeSegment;
        if (active) drawLine(from, to, `${color}55`, 7);
        drawLine(from, to, color, active ? 3.4 : 2.35);
      }
      nodes.forEach((node, index) => {
        if (!node.point) return;
        const mapped = toCanvas(node.point);
        const active = index === activeSegment || index === activeSegment + 1;
        const color = linkColor(Math.max(0, Math.min(index - 1, 5)));
        context.beginPath();
        context.arc(mapped.x, mapped.y, active ? 5.8 : 3.8, 0, Math.PI * 2);
        context.fillStyle = "rgba(2,6,23,.8)";
        context.fill();
        context.strokeStyle = color;
        context.lineWidth = active ? 2.5 : 1.6;
        context.stroke();
      });
      const activeFrom = nodes[activeSegment];
      const activeTo = nodes[activeSegment + 1];
      if (activeFrom?.point && activeTo?.point) {
        const anchor = toCanvas(midpoint(activeFrom.point, activeTo.point)!);
        label(`${activeFrom.name} → ${activeTo.name}`, anchor.x + 9, anchor.y - 22, linkColor(activeSegment));
      }
    }

    const balancePoint = navelCenter ?? currentFrame.centerOfMass;
    if (balancePoint && mode !== "coach") {
      const com = toCanvas(balancePoint);
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
      const angleMarker = (aName: string, bName: string, cName: string, value: number | null | undefined, title: string) => {
        const a = landmarks[aName]; const b = landmarks[bName]; const c = landmarks[cName];
        if (!a || !b || !c || typeof value !== "number") return;
        const pb = toCanvas(b);
        context.beginPath();
        context.arc(pb.x, pb.y, 6, 0, Math.PI * 2);
        context.fillStyle = "rgba(2,6,23,.72)";
        context.fill();
        context.strokeStyle = assessmentColor;
        context.lineWidth = 1.75;
        context.stroke();
        if (cssWidth >= 420) label(`${title} ${Math.round(value)}°`, pb.x + 10, pb.y - 20, assessmentColor);
      };
      if (stage === "loading") {
        angleMarker(`${side}_hip`, `${side}_knee`, `${side}_ankle`, currentFrame.dominantKneeAngle, "knee");
        angleMarker(`${support}_hip`, `${support}_knee`, `${support}_ankle`, currentFrame.oppositeKneeAngle, "support knee");
      } else if (stage === "contact" || stage === "swing") {
        angleMarker(`${side}_shoulder`, `${side}_elbow`, `${side}_wrist`, currentFrame.dominantElbowAngle ?? currentFrame.elbowAngle, "elbow");
      } else if (typeof currentFrame.shoulderPelvisSeparation === "number") {
        const shoulder = midpoint(landmarks.left_shoulder, landmarks.right_shoulder);
        if (shoulder) {
          const mapped = toCanvas(shoulder);
          label(`shoulder–hip view ${Math.round(currentFrame.shoulderPelvisSeparation)}°`, mapped.x + 14, mapped.y - 30, "#fef08a");
        }
      }
    }
  }, [activeBackhandGuide, activeVisualChecks, analysisContext?.cameraAngle, area, chainLinks, chainProgress, currentFrame, frames, mode, report.frameSummary?.videoRegistration, seeking, side, stage, start, time]);

  useEffect(() => {
    drawOverlay();
    window.addEventListener("resize", drawOverlay);
    return () => window.removeEventListener("resize", drawOverlay);
  }, [drawOverlay]);

  useEffect(() => {
    stabilizerRef.current.reset();
    labelPlacementRef.current.clear();
    setCurrentFrame(stabilizerRef.current.update(interpolatedFrameAtTime(frames, initialTime)));
  }, [frames, initialTime]);

  useEffect(() => {
    labelPlacementRef.current.clear();
  }, [mode, stage]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const video = videoRef.current;
    if (video && videoFrameRef.current !== null && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(videoFrameRef.current);
    }
  }, []);

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
      setStoryCaption(null);
    }
    function showStoryBeat(event: Event) {
      const detail = (event as CustomEvent<{ timestampSeconds?: number; playbackRate?: number; caption?: string; intent?: string }>).detail;
      if (typeof detail?.timestampSeconds === "number") seek(detail.timestampSeconds);
      if (typeof detail?.playbackRate === "number") {
        setRate(detail.playbackRate);
        if (videoRef.current) videoRef.current.playbackRate = detail.playbackRate;
      }
      setMode(detail?.intent === "clean" || detail?.intent === "orient" ? "clean" : "coach");
      setStoryCaption(detail?.caption ?? null);
    }
    window.addEventListener("acecoach:show-key-moment", showMoment);
    window.addEventListener("acecoach:coach-region", showRegion);
    window.addEventListener("acecoach:story-beat", showStoryBeat);
    return () => {
      window.removeEventListener("acecoach:show-key-moment", showMoment);
      window.removeEventListener("acecoach:coach-region", showRegion);
      window.removeEventListener("acecoach:story-beat", showStoryBeat);
    };
  });

  function applyPresentedTime(next: number, resetRegistration = false) {
    const value = Math.max(start, Math.min(end, next));
    if (resetRegistration) {
      stabilizerRef.current.reset();
      labelPlacementRef.current.clear();
    }
    const measuredFrame = interpolatedFrameAtTime(frames, value);
    setCurrentFrame(stabilizerRef.current.update(measuredFrame));
    setTime(value);
    setStage(stageForTime(value, anchors));
  }

  function cancelFrameSync() {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const video = videoRef.current;
    if (video && videoFrameRef.current !== null && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(videoFrameRef.current);
      videoFrameRef.current = null;
    }
  }

  function updateFromAnimationClock() {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= end) {
      setSeeking(true);
      video.currentTime = start;
      return;
    }
    applyPresentedTime(video.currentTime);
    if (!video.paused) animationRef.current = requestAnimationFrame(updateFromAnimationClock);
  }

  function scheduleFrameSync() {
    const video = videoRef.current;
    if (!video || video.paused) return;
    if (typeof video.requestVideoFrameCallback === "function") {
      videoFrameRef.current = video.requestVideoFrameCallback((_now, metadata) => {
        videoFrameRef.current = null;
        if (metadata.mediaTime >= end) {
          setSeeking(true);
          video.currentTime = start;
        } else {
          applyPresentedTime(metadata.mediaTime);
        }
        if (!video.paused) scheduleFrameSync();
      });
      return;
    }
    animationRef.current = requestAnimationFrame(updateFromAnimationClock);
  }

  function seek(next: number) {
    const value = Math.max(start, Math.min(end, next));
    const video = videoRef.current;
    if (video) {
      setSeeking(true);
      video.currentTime = value;
      return;
    }
    applyPresentedTime(value, true);
  }

  function handleSeeked() {
    const video = videoRef.current;
    if (!video) return;
    setSeeking(false);
    applyPresentedTime(video.currentTime, true);
  }

  async function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < start || video.currentTime >= end) {
        setSeeking(true);
        video.currentTime = start;
      }
      video.playbackRate = rate;
      try {
        await video.play();
      } catch {
        setPlaying(false);
        return;
      }
      setPlaying(true);
      cancelFrameSync();
      scheduleFrameSync();
    } else {
      video.pause();
      setPlaying(false);
      cancelFrameSync();
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800"><ScanLine className="h-4 w-4" />2 · See it in your video</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Watch where the pattern begins</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Use the same stage-and-letter references as the summary above. Green means the measured body check is working and red means change it. Confirmation-only or low-confidence joints stay in the checklist but are not drawn on the athlete. Body links and the power chain each follow their own measured anatomical segments.</p>
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
            {previewOnly ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(30,64,175,.25),transparent_34%),linear-gradient(145deg,#020617,#0f172a)]" aria-label="Visual QA movement preview"><div className="absolute inset-x-0 bottom-16 text-center text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-500">Visual QA movement preview</div></div> : <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" className="h-full w-full object-contain" style={{ transform: report.frameSummary?.videoRegistration?.mirrored ? "scaleX(-1)" : undefined }} onLoadedMetadata={() => seek(initialTime)} onSeeked={handleSeeked} onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); cancelFrameSync(); }} />}
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
            {storyCaption ? <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center"><p className="max-w-xl rounded-2xl border border-white/15 bg-slate-950/88 px-4 py-3 text-center text-sm font-semibold leading-6 text-white shadow-xl backdrop-blur">{storyCaption}</p></div> : null}
            <div data-testid="video-stage-reference" className="absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white">{activeBackhandGuide ? `Stage ${activeBackhandGuide.number} · ${activeBackhandGuide.label}` : phaseTitle(stage)} · {time.toFixed(2)}s</p><p className="mt-1 text-[0.65rem] text-slate-300">{phaseTitle(stage)} frame {currentFrame?.frameIndex ?? "—"} · {mode === "clean" ? "original video" : MODE_OPTIONS.find((item) => item.id === mode)?.label}</p></div>
            {mode !== "clean" ? <div data-testid="correction-overlay-key" className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[0.62rem]">{mode === "body" ? <span className="rounded-full bg-sky-950/90 px-2 py-1 text-sky-100">{BODY_CONNECTIONS.length} anatomical segments</span> : null}{mode === "coach" ? <><span className="rounded-full bg-red-950/90 px-2 py-1 text-red-100">red = change</span><span className="rounded-full bg-emerald-950/90 px-2 py-1 text-emerald-100">green = working</span><span className="rounded-full bg-slate-800/90 px-2 py-1 text-slate-100">uncertain = hidden</span></> : null}{mode === "chain" ? <><span className="rounded-full bg-slate-950/88 px-2 py-1 text-slate-100">base → knee → hip → core → shoulder → elbow → hand</span><span className="rounded-full bg-emerald-950/90 px-2 py-1 text-emerald-100">green = connected</span><span className="rounded-full bg-red-950/90 px-2 py-1 text-red-100">red = timing issue</span></> : null}</div> : null}
          </div>

          <input type="range" min={start} max={end} step={presentationStep} value={Math.max(start, Math.min(end, time))} onChange={(event) => seek(Number(event.target.value))} className="mt-4 w-full accent-blue-900" aria-label="Biomechanical video timeline" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => seek(start)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Restart movement"><RefreshCw className="h-4 w-4" /></button>
            <button type="button" onClick={() => seek(time - presentationStep)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Previous frame"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => void toggle()} disabled={previewOnly} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#173F6A] px-5 font-semibold text-white hover:bg-[#103554] disabled:cursor-not-allowed disabled:opacity-50">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{previewOnly ? "Preview frames" : playing ? "Pause" : "Play at half speed"}</button>
            <button type="button" onClick={() => seek(time + presentationStep)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Next frame"><ChevronRight className="h-4 w-4" /></button>
            {[0.1, 0.25, 0.5, 1].map((value) => <button key={value} type="button" data-testid={`playback-rate-${value}`} onClick={() => { setRate(value); if (videoRef.current) videoRef.current.playbackRate = value; }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${rate === value ? "border-blue-900 bg-blue-50 text-blue-950" : "border-slate-200 text-slate-500"}`}>{value}×</button>)}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">{mode === "clean" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}Original video preserved</span>
          </div>

          <div data-testid={isTwoHandedBackhand ? "backhand-four-stage-video-map" : undefined} className={`mt-5 grid gap-2 ${isTwoHandedBackhand ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-6"}`} role="tablist" aria-label={isTwoHandedBackhand ? "Four backhand stages" : "Movement phase"}>
            {isTwoHandedBackhand ? BACKHAND_FOUR_STAGES.map((item) => <button key={item.number} type="button" role="tab" aria-selected={activeBackhandGuide?.number === item.number} onClick={() => seek(anchors[item.motionStage])} className={`rounded-xl border px-3 py-3 text-left ${activeBackhandGuide?.number === item.number ? "border-blue-300 bg-blue-50 text-blue-950 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800"}`}><span className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activeBackhandGuide?.number === item.number ? "bg-blue-950 text-white" : "bg-white text-slate-700"}`}>{item.number}</span><span className="text-xs font-semibold">{item.shortLabel}</span></span></button>) : MOTION_STAGES.map((item) => <button key={item.id} type="button" role="tab" aria-selected={stage === item.id} onClick={() => seek(anchors[item.id])} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold ${stage === item.id ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800"}`}>{item.label}</button>)}
          </div>
        </div>

        <aside className="flex flex-col bg-slate-50/70 p-5 sm:p-7">
          {activeBackhandGuide ? <div data-testid="active-four-stage-correction" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-950 text-xl font-bold text-white ring-4 ring-blue-100">{activeBackhandGuide.number}</span><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-blue-800">Matches stage {activeBackhandGuide.number} above</p><h3 className="mt-1 text-xl font-semibold text-slate-950">{activeBackhandGuide.label}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{activeBackhandGuide.correction}</p></div></div><div className="mt-4 grid gap-2" aria-label={`Stage ${activeBackhandGuide.number} correction checklist`}>{activeVisualChecks.map((check, index) => { const style = VISUAL_STATUS[check.status]; return <div key={check.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${style.classes}`}><span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white" style={{ backgroundColor: style.color }}>{activeBackhandGuide.number}{String.fromCharCode(65 + index)}</span><div><p className="text-xs font-semibold leading-5">{check.label}</p><p className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">{style.label}</p></div></div>; })}</div>{activeBackhandGuide.number === 1 || activeBackhandGuide.number === 2 ? <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-[0.68rem] leading-5 text-slate-700"><span className="font-semibold">Camera-honest view:</span> racket checkpoints remain in the written report as Confirm; no synthetic racket is drawn on the video.</p> : null}</div> : null}
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

          <div className="mt-auto pt-6"><div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-[0.68rem] leading-5 text-slate-500"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Body links connect only measured anatomical neighbours; no cross-body or hand-to-hand lines are invented. The power chain follows the measured hitting-side path from base to hand. Confirmation-only, occluded, implausible, or low-confidence joints are withheld instead of guessing. This remains a 2D coaching view—not force data, racket-face measurement, or an exact 3D reconstruction.</p></div></div>
        </aside>
      </div>

      <div className="grid gap-px border-t border-slate-200 bg-slate-200 md:grid-cols-4">
        {[{ icon: Eye, title: "1 · Watch", copy: "Choose one numbered stage and use 0.1× when needed." }, { icon: GitBranch, title: "2 · Check A, then B", copy: "Read the two literal labels drawn on the athlete." }, { icon: Target, title: "3 · Feel", copy: "Use the matching short cue beside the video." }, { icon: CheckCircle2, title: "4 · Prove", copy: "Record the same drill and compare the next clip." }].map((item) => <div key={item.title} className="bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-800"><item.icon className="h-4 w-4 text-blue-800" />{item.title}</div><p className="mt-2 text-xs leading-5 text-slate-500">{item.copy}</p></div>)}
      </div>
    </section>
  );
}
