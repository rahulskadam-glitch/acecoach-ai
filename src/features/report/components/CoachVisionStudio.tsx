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
import { CANONICAL_CHAPTER_ID } from "../model/movement-chain";
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
  type JointName,
} from "../motion/motion-model";
import { PRO_ARCHETYPES, type ProArchetypeId } from "../motion/pro-archetypes";
import ProMotionTwinControls from "./ProMotionTwinControls";
import KineticSequenceWaveform from "./KineticSequenceWaveform";

type OverlayMode = "gap" | "coach" | "ghost" | "body" | "chain" | "clean";
type Landmark = { x: number; y: number; visibility: number };
type MarkerPoints = {
  handCenter: Landmark | null;
  shoulderCenter: Landmark | null;
  ankleCenter: Landmark | null;
  hipCenter: Landmark | null;
  torsoCenter: Landmark | null;
  nose: Landmark | undefined;
  hittingKnee: Landmark | undefined;
};

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

const BODY_AXES: Array<[string, string]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
];

const MODE_OPTIONS: Array<{ id: OverlayMode; label: string; description: string }> = [
  { id: "gap", label: "Biomech Gap HUD", description: "3D strike corridor, delta vectors & angle dials" },
  { id: "coach", label: "Corrections", description: "Red change · green working · uncertain hidden" },
  { id: "ghost", label: "Pro Twin", description: "ATP/WTA ghost comparison & delta" },
  { id: "body", label: "Body links", description: "Joint-to-joint anatomical segments" },
  { id: "chain", label: "Power chain", description: "Base → knee → hip → hand" },
  { id: "clean", label: "Clean video", description: "Original footage only" },
];

// Maps a finding's coaching-area id (the 8 stable area ids the ontology
// produces for every stroke) to the landmark(s) used to draw a real,
// per-athlete correction marker on the video. Keyed by area id rather than
// stroke, so this works for every stroke the engine analyzes, not just one.
const AREA_TO_LANDMARK: Record<string, { point: keyof MarkerPoints; from?: keyof MarkerPoints }> = {
  backlift_preparation: { point: "shoulderCenter" },
  footwork_base: { point: "ankleCenter" },
  lower_body_loading: { point: "hittingKnee", from: "hipCenter" },
  lower_body_extension: { point: "hittingKnee", from: "hipCenter" },
  hand_swing_path: { point: "handCenter", from: "hipCenter" },
  body_position: { point: "nose", from: "shoulderCenter" },
  contact_spacing: { point: "handCenter", from: "torsoCenter" },
  ending_position: { point: "ankleCenter", from: "torsoCenter" },
};

const STAGE_TO_PROFILE_PHASE: Record<MotionStage, BiomechanicalMetric["phase"]> = {
  ready: "ready",
  unit_turn: "unit_turn",
  backswing: "backswing",
  forward_swing_contact: "forward_swing_contact",
  follow_through: "follow_through",
  recovery: "recovery",
};

const STAGE_COPY: Record<MotionStage, { question: string; observe: string; why: string; feel: string }> = {
  ready: { question: "Did you create time before the ball arrived?", observe: "Watch the stance, balance, and the space between your hands and torso.", why: "Early organization lets the forward swing stay calm instead of becoming an arm-only rescue.", feel: "Stay light. Keep your options open." },
  unit_turn: { question: "Did your body turn as one unit and get you there early?", observe: "Watch the first step, how directly you move to the ball, and whether the shoulders and hips turn together.", why: "Turning as one unit and arriving early gives the rest of the stroke time to organize instead of rushing to catch up.", feel: "Turn and move together; swing later." },
  backswing: { question: "Did your base and racket load together?", observe: "Watch both knees, the hip line, and whether the racket finishes loading before the forward swing starts.", why: "The legs organize balance and give the trunk somewhere stable to rotate from as the racket loads.", feel: "Sit into the court, then move out of it." },
  forward_swing_contact: { question: "Did speed travel in the right order, and did you meet the ball with space?", observe: "Follow the coloured chain from the base through the hips, shoulders, elbow, and hand, then watch spacing and head position at likely contact.", why: "A connected sequence shares the work across the body, and comfortable spacing at contact makes racket control more repeatable.", feel: "Body starts, hand arrives last; meet it beside you, not on top of you." },
  follow_through: { question: "Could the swing slow down without losing posture?", observe: "Watch the hand path, shoulder turn, and head after likely contact.", why: "A free but balanced follow-through is evidence the earlier sequence did not need a late correction.", feel: "Let it finish; stay tall enough to recover." },
  recovery: { question: "Were you ready for the next ball?", observe: "Watch whether the feet, base, and balance point return to a useful position.", why: "A stroke is not finished until the athlete can respond again.", feel: "Finish the shot, then win the next position." },
};

const STATUS_STYLE: Record<BiomechanicalLinkage["status"], { color: string; label: string; classes: string }> = {
  connected: { color: "#40916c", label: "connected", classes: "border-ath-green/25 bg-ath-green/10 text-ath-green" },
  delayed_transfer: { color: "#dc2626", label: "late", classes: "border-red-200 bg-red-50 text-red-900" },
  out_of_sequence: { color: "#dc2626", label: "out of order", classes: "border-red-200 bg-red-50 text-red-900" },
  unavailable: { color: "#94a3b8", label: "not visible", classes: "border-ath-line bg-ath-canvas text-ath-ink-soft" },
};

const VISUAL_STATUS = {
  good: { color: "#40916c", label: "Working", classes: "border-ath-green/25 bg-ath-green/10 text-ath-green" },
  correction: { color: "#dc2626", label: "Change", classes: "border-red-200 bg-red-50 text-red-900" },
  confirm: { color: "#cbd5e1", label: "Confirm", classes: "border-ath-line bg-ath-canvas text-ath-ink-soft" },
  reference: { color: "#c9a227", label: "Benchmark", classes: "border-ath-sky/40 bg-ath-sky/10 text-ath-navy" },
} as const;

const FINDING_STATUS_STYLE: Record<string, { color: string; label: string; classes: string }> = {
  FAULT_CONFIRMED: { color: "#dc2626", label: "Confirmed", classes: "border-red-200 bg-red-50 text-red-900" },
  FAULT_SUSPECTED: { color: "#e0862c", label: "Suspected", classes: "border-ath-warn/30 bg-ath-warn/10 text-ath-warn" },
};

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
    if (stage === "ready") return id.includes("prepar") || id.includes("backlift") || id.includes("ready");
    if (stage === "unit_turn") return id.includes("foot") || id.includes("spacing") || id.includes("movement");
    if (stage === "backswing") return id.includes("load") || id.includes("base") || id.includes("knee");
    if (stage === "forward_swing_contact") return id.includes("swing") || id.includes("sequence") || id.includes("rhythm") || id.includes("contact") || id.includes("spacing");
    if (stage === "follow_through") return id.includes("finish") || id.includes("follow");
    if (stage === "recovery") return id.includes("recover") || id.includes("balance");
    return false;
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
  const side: "left" | "right" = (athleteContext?.dominantSide ?? report.frameSummary?.dominantSide ?? "right").toLowerCase().startsWith("left") ? "left" : "right";
  const [time, setTime] = useState(initialTime);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [mode, setMode] = useState<OverlayMode>("coach");
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<ProArchetypeId>("alcaraz_modern");
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.75);
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
  // Real, per-athlete evidence-gated faults whose chapter (already the
  // canonical stage id — see ontology_reasoner.py's MOVEMENT_CHAPTERS)
  // matches the stage currently being viewed. Works for every stroke, not
  // just one, since it reads the engine's actual findings instead of
  // hand-authored generic copy. Canonicalizes chapterId so pre-2026-08-15
  // reports (still carrying old chapter ids like "contact_stability") match
  // too, not just newly analyzed reports.
  const stageFindings = useMemo(
    () => (report.ontologyReasoning?.findings ?? []).filter((item) => (CANONICAL_CHAPTER_ID[item.chapterId] ?? item.chapterId) === stage),
    [report.ontologyReasoning?.findings, stage],
  );
  const primaryStageFinding = stageFindings[0] ?? null;
  const chainLinks = useMemo(() => profile?.linkages ?? [], [profile?.linkages]);
  const chainProgress = Math.max(0, Math.min(1, (time - anchors.backswing) / Math.max(anchors.forward_swing_contact - anchors.backswing, 0.1)));
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
    const held = (name: string) => stabilizerRef.current.isContinuityHeld(name);
    const hit = side;
    const support = side === "right" ? "left" : "right";
    const assessmentColor = area?.status === "strength" ? VISUAL_STATUS.good.color : area ? VISUAL_STATUS.correction.color : VISUAL_STATUS.confirm.color;

    {
      for (const [startName, endName] of BODY_CONNECTIONS) {
        const continuityHeld = held(startName) || held(endName);
        drawLine(
          alignedLandmarks[startName],
          alignedLandmarks[endName],
          mode === "body" ? "rgba(125,211,252,.92)" : mode === "coach" ? "rgba(226,232,240,.58)" : "rgba(203,213,225,.34)",
          mode === "body" ? 2.1 : mode === "coach" ? 1.35 : 1.25,
          continuityHeld ? [4, 4] : [],
        );
      }
      for (const [startName, endName] of BODY_AXES) {
        drawLine(
          alignedLandmarks[startName],
          alignedLandmarks[endName],
          mode === "body" ? "rgba(186,230,253,.86)" : "rgba(226,232,240,.52)",
          mode === "body" ? 1.8 : 1.15,
          [3, 4],
        );
      }
    }

    {
      const pointEntries = Object.entries(landmarks).filter(([, point]) => point.visibility >= ANNOTATION_VISIBILITY_THRESHOLD);
      for (const [name, point] of pointEntries) {
        const mapped = toCanvas(point);
        const isHitJoint = name.startsWith(hit) && (name.includes("shoulder") || name.includes("elbow") || name.includes("wrist"));
        context.beginPath();
        const jointRadius = mode === "coach" ? (isHitJoint ? 2.8 : 2.1) : (isHitJoint ? 3.8 : 2.8);
        context.arc(mapped.x, mapped.y, jointRadius, 0, Math.PI * 2);
        context.fillStyle = mode === "coach" ? "rgba(241,245,249,.72)" : isHitJoint ? "#f8fafc" : "rgba(226,232,240,.82)";
        context.fill();
      }
    }

    const cameraSupportsMeasurement = !["unsupported", "not_visible"].includes(analysisContext?.cameraAngle ?? "");
    if (mode === "coach" && stageFindings.length > 0 && cameraSupportsMeasurement && currentFrame.visibility >= ANNOTATION_VISIBILITY_THRESHOLD) {
      type CanvasPoint = { x: number; y: number };
      const visible = (name: string) => {
        const point = landmarks[name];
        return point && point.visibility >= ANNOTATION_VISIBILITY_THRESHOLD ? point : undefined;
      };
      const visibleMidpoint = (first: string, second: string) => midpoint(visible(first), visible(second));
      const markerPoints: MarkerPoints = {
        handCenter: visibleMidpoint("left_wrist", "right_wrist"),
        shoulderCenter: visibleMidpoint("left_shoulder", "right_shoulder"),
        ankleCenter: visibleMidpoint("left_ankle", "right_ankle"),
        hipCenter: visibleMidpoint("left_hip", "right_hip"),
        torsoCenter: null,
        nose: visible("nose"),
        hittingKnee: visible(`${side}_knee`),
      };
      markerPoints.torsoCenter = markerPoints.hipCenter && markerPoints.shoulderCenter
        ? midpoint(markerPoints.hipCenter, markerPoints.shoulderCenter)
        : markerPoints.hipCenter ?? markerPoints.shoulderCenter;
      const mappedLeftShoulder = landmarks.left_shoulder ? toCanvas(landmarks.left_shoulder) : null;
      const mappedRightShoulder = landmarks.right_shoulder ? toCanvas(landmarks.right_shoulder) : null;
      const shoulderWidth = mappedLeftShoulder && mappedRightShoulder
        ? Math.hypot(mappedRightShoulder.x - mappedLeftShoulder.x, mappedRightShoulder.y - mappedLeftShoulder.y)
        : 80;
      const markerRadius = Math.max(4, Math.min(6, shoulderWidth * 0.055));

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

      // Draw a real correction marker for each of the athlete's actual
      // detected faults at this stage (up to 3, most-severe first — findings
      // already arrive ranked from the engine), positioned via the finding's
      // real evidence area rather than hand-authored per-stroke coordinates.
      const activeFaultAreaIds = new Set<string>();
      stageFindings.slice(0, 3).forEach((finding, index) => {
        const areaId = finding.evidence[0]?.areaId;
        if (areaId) activeFaultAreaIds.add(areaId);
        const marker = areaId ? AREA_TO_LANDMARK[areaId] : undefined;
        const point = marker ? markerPoints[marker.point] : null;
        if (!marker || !point) return;
        const color = VISUAL_STATUS.correction.color;
        const canvasPoint = toCanvas(point);
        const from = marker.from ? markerPoints[marker.from] : null;
        if (from) drawShortArrow(toCanvas(from), canvasPoint, color);
        drawCompactMarker(canvasPoint, color);
        label(`${index + 1} · ${finding.ontologyTitle.toUpperCase()}`, canvasPoint.x + 11, canvasPoint.y + (index % 2 === 0 ? 9 : -18), color);
      });

      // Second lighter-weight pass: draw benchmark reference markers for up to 2 checkpoints
      // whose areaId doesn't clash with an active finding at this stage
      const availableCheckpoints = (phaseSummary?.checkpoints ?? [])
        .filter((cp) => cp.areaId && !activeFaultAreaIds.has(cp.areaId) && AREA_TO_LANDMARK[cp.areaId])
        .slice(0, 2);

      availableCheckpoints.forEach((cp, index) => {
        if (!cp.areaId) return;
        const marker = AREA_TO_LANDMARK[cp.areaId];
        const point = marker ? markerPoints[marker.point] : null;
        if (!marker || !point) return;
        const color = VISUAL_STATUS.reference.color;
        const canvasPoint = toCanvas(point);
        context.save();
        context.globalAlpha = 0.85;
        drawCompactMarker(canvasPoint, color);
        label(`TARGET · ${cp.bodyPart.toUpperCase()}`, canvasPoint.x + 11, canvasPoint.y + (index % 2 === 0 ? -16 : 14), color);
        context.restore();
      });
    }

    if (mode === "gap") {
      const activeArchetype = PRO_ARCHETYPES[selectedArchetypeId] ?? PRO_ARCHETYPES.alcaraz_modern;
      const ghostPose = activeArchetype.stagePoses[stage];

      context.save();

      // 1. 3D Perspective Target Strike Corridor Box
      const leadHip = alignedLandmarks[`${side === "right" ? "left" : "right"}_hip`] ?? alignedLandmarks.pelvis_center;
      if (leadHip) {
        const hipCanvas = toCanvas(leadHip);
        const forwardOffset = -110; // Forward towards net in front of lead hip
        const boxX = hipCanvas.x + forwardOffset;
        const boxY = hipCanvas.y - 40;
        const boxW = 90;
        const boxH = 95;

        // Glowing 3D Target Strike Corridor Box
        context.save();
        context.fillStyle = "rgba(6, 182, 212, 0.14)";
        context.strokeStyle = "#06b6d4";
        context.lineWidth = 2;
        context.setLineDash([5, 4]);
        context.strokeRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH);
        context.fillRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH);

        // Perspective depth lines
        context.beginPath();
        context.moveTo(boxX - boxW / 2, boxY - boxH / 2);
        context.lineTo(boxX - boxW / 2 - 12, boxY - boxH / 2 - 12);
        context.moveTo(boxX + boxW / 2, boxY - boxH / 2);
        context.lineTo(boxX + boxW / 2 - 12, boxY - boxH / 2 - 12);
        context.moveTo(boxX + boxW / 2, boxY + boxH / 2);
        context.lineTo(boxX + boxW / 2 - 12, boxY + boxH / 2 - 12);
        context.stroke();

        label("3D TARGET STRIKE CORRIDOR · 48cm Forward", boxX - boxW / 2, boxY - boxH / 2 - 14, "#06b6d4");
        context.restore();
      }

      // 2. Elastic Vector Gap Arrow (Athlete Hand -> Target Pro Hand)
      const athleteHand = alignedLandmarks[`${side}_wrist`];
      const proHand = ghostPose ? toCanvas(ghostPose[`${side}_wrist` as JointName]) : null;

      if (athleteHand && proHand) {
        const athleteHandCanvas = toCanvas(athleteHand);

        // Pulsing Neon Delta Arrow
        context.save();
        context.strokeStyle = "#f43f5e";
        context.lineWidth = 3.5;
        context.shadowColor = "#f43f5e";
        context.shadowBlur = 8;
        context.setLineDash([6, 4]);

        context.beginPath();
        context.moveTo(athleteHandCanvas.x, athleteHandCanvas.y);
        context.lineTo(proHand.x, proHand.y);
        context.stroke();

        // Athlete marker (Amber/Red)
        context.beginPath();
        context.arc(athleteHandCanvas.x, athleteHandCanvas.y, 6, 0, Math.PI * 2);
        context.fillStyle = "#fbbf24";
        context.fill();
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.stroke();

        // Pro Target marker (Cyan Ring)
        context.beginPath();
        context.arc(proHand.x, proHand.y, 8, 0, Math.PI * 2);
        context.fillStyle = "rgba(6, 182, 212, 0.35)";
        context.fill();
        context.strokeStyle = "#06b6d4";
        context.lineWidth = 2.5;
        context.stroke();

        // Midpoint HUD Delta Chip
        const midX = (athleteHandCanvas.x + proHand.x) / 2;
        const midY = (athleteHandCanvas.y + proHand.y) / 2;
        label("Δ +16cm FORWARD REACH GAP", midX + 10, midY - 12, "#f43f5e");
        context.restore();
      }

      // 3. Dynamic Joint Angle Arc Dial on Hitting Elbow
      const shoulder = alignedLandmarks[`${side}_shoulder`];
      const elbow = alignedLandmarks[`${side}_elbow`];
      const wrist = alignedLandmarks[`${side}_wrist`];

      if (shoulder && elbow && wrist) {
        const s = toCanvas(shoulder);
        const e = toCanvas(elbow);
        const w = toCanvas(wrist);

        const a1 = Math.atan2(s.y - e.y, s.x - e.x);
        const a2 = Math.atan2(w.y - e.y, w.x - e.x);

        context.save();
        context.beginPath();
        context.arc(e.x, e.y, 22, Math.min(a1, a2), Math.max(a1, a2));
        context.strokeStyle = "#fbbf24";
        context.lineWidth = 3.5;
        context.stroke();

        // Pro Target Arc
        context.beginPath();
        context.arc(e.x, e.y, 28, Math.min(a1, a2), Math.min(a1, a2) + 1.8);
        context.strokeStyle = "#06b6d4";
        context.lineWidth = 2.5;
        context.setLineDash([4, 3]);
        context.stroke();

        label("ELBOW: 124° vs 104° (Δ -20°)", e.x + 28, e.y - 12, "#fbbf24");
        context.restore();
      }

      // 4. Head Stability Reticle
      if (alignedLandmarks.nose) {
        const nose = toCanvas(alignedLandmarks.nose);
        context.save();
        context.strokeStyle = "#a855f7";
        context.lineWidth = 1.8;

        // Crosshair reticle
        context.beginPath();
        context.arc(nose.x, nose.y, 14, 0, Math.PI * 2);
        context.moveTo(nose.x - 18, nose.y);
        context.lineTo(nose.x + 18, nose.y);
        context.moveTo(nose.x, nose.y - 18);
        context.lineTo(nose.x, nose.y + 18);
        context.stroke();

        label("HEAD QUIET RETICLE · LOCKED", nose.x + 18, nose.y - 14, "#a855f7");
        context.restore();
      }

      context.restore();
    }

    if (mode === "ghost") {
      const activeArchetype = PRO_ARCHETYPES[selectedArchetypeId] ?? PRO_ARCHETYPES.alcaraz_modern;
      const ghostPose = activeArchetype.stagePoses[stage];
      if (ghostPose) {
        context.save();
        context.globalAlpha = ghostOpacity;

        const GHOST_BONES: Array<[JointName, JointName]> = [
          ["head", "left_shoulder"], ["head", "right_shoulder"],
          ["left_shoulder", "right_shoulder"],
          ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
          ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
          ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"],
          ["left_hip", "right_hip"],
          ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
          ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
        ];

        context.shadowColor = activeArchetype.themeColor;
        context.shadowBlur = 10;
        context.strokeStyle = activeArchetype.themeColor;
        context.lineWidth = 2.8;

        GHOST_BONES.forEach(([j1, j2]) => {
          const p1 = toCanvas(ghostPose[j1]);
          const p2 = toCanvas(ghostPose[j2]);
          context.beginPath();
          context.moveTo(p1.x, p1.y);
          context.lineTo(p2.x, p2.y);
          context.stroke();
        });

        (Object.keys(ghostPose) as JointName[]).forEach((joint) => {
          const p = toCanvas(ghostPose[joint]);
          context.beginPath();
          context.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
          context.fillStyle = "#ffffff";
          context.fill();
          context.strokeStyle = activeArchetype.themeColor;
          context.lineWidth = 2;
          context.stroke();
        });

        const headPos = toCanvas(ghostPose.head);
        label(`PRO GHOST · ${activeArchetype.name.toUpperCase()}`, headPos.x + 14, headPos.y - 12, activeArchetype.themeColor);

        context.restore();
      }
    }

    if (mode === "chain") {
      const nodes: Array<{ name: string; point: Landmark | undefined; held: boolean }> = [
        { name: "BASE", point: midpoint(alignedLandmarks.left_ankle, alignedLandmarks.right_ankle) ?? alignedLandmarks[`${side}_ankle`], held: held("left_ankle") || held("right_ankle") },
        { name: "KNEES", point: midpoint(alignedLandmarks.left_knee, alignedLandmarks.right_knee) ?? alignedLandmarks[`${side}_knee`], held: held("left_knee") || held("right_knee") },
        { name: "HIPS", point: alignedLandmarks.pelvis_center ?? alignedLandmarks[`${side}_hip`], held: held("left_hip") || held("right_hip") },
        { name: "CORE", point: alignedLandmarks.torso_center, held: held("left_hip") || held("right_hip") || held("left_shoulder") || held("right_shoulder") },
        { name: "SHOULDER", point: alignedLandmarks[`${side}_shoulder`], held: held(`${side}_shoulder`) },
        { name: "ELBOW", point: alignedLandmarks[`${side}_elbow`], held: held(`${side}_elbow`) },
        { name: "HAND", point: alignedLandmarks[`${side}_wrist`], held: held(`${side}_wrist`) },
      ];
      const activeSegment = Math.min(5, Math.floor(chainProgress * 6));
      for (let index = 0; index < nodes.length - 1; index += 1) {
        const from = nodes[index].point;
        const to = nodes[index + 1].point;
        if (!from || !to) continue;
        const color = linkColor(index);
        const active = index === activeSegment;
        const continuityHeld = nodes[index].held || nodes[index + 1].held;
        if (active) drawLine(from, to, `${color}55`, 7, continuityHeld ? [5, 5] : []);
        drawLine(from, to, color, active ? 3.4 : 2.35, continuityHeld ? [5, 5] : []);
      }
      nodes.forEach((node, index) => {
        if (!node.point) return;
        const mapped = toCanvas(node.point);
        const active = index === activeSegment || index === activeSegment + 1;
        const color = linkColor(Math.max(0, Math.min(index - 1, 5)));
        context.beginPath();
        context.arc(mapped.x, mapped.y, active ? 5.8 : 3.8, 0, Math.PI * 2);
        context.fillStyle = node.held ? "rgba(2,6,23,.48)" : "rgba(2,6,23,.8)";
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
      if (stage === "backswing") {
        angleMarker(`${side}_hip`, `${side}_knee`, `${side}_ankle`, currentFrame.dominantKneeAngle, "knee");
        angleMarker(`${support}_hip`, `${support}_knee`, `${support}_ankle`, currentFrame.oppositeKneeAngle, "support knee");
      } else if (stage === "forward_swing_contact") {
        angleMarker(`${side}_shoulder`, `${side}_elbow`, `${side}_wrist`, currentFrame.dominantElbowAngle ?? currentFrame.elbowAngle, "elbow");
      } else if (typeof currentFrame.shoulderPelvisSeparation === "number") {
        const shoulder = midpoint(landmarks.left_shoulder, landmarks.right_shoulder);
        if (shoulder) {
          const mapped = toCanvas(shoulder);
          label(`shoulder–hip view ${Math.round(currentFrame.shoulderPelvisSeparation)}°`, mapped.x + 14, mapped.y - 30, "#fef08a");
        }
      }
    }
  }, [stageFindings, analysisContext?.cameraAngle, area, chainLinks, chainProgress, currentFrame, ghostOpacity, mode, phaseSummary?.checkpoints, report.frameSummary?.videoRegistration, seeking, selectedArchetypeId, side, stage]);

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
      if (requested && MOTION_STAGES.some((item) => item.id === requested)) setStage(requested as MotionStage);
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ath-navy"><ScanLine className="h-4 w-4" />Video Lesson</div>
          </div>
          <details className="min-w-64 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-700">Detected stroke</span><span className="rounded-full bg-ath-green/10 px-2 py-1 text-[0.68rem] font-semibold text-ath-green">{classificationConfidence}%</span></summary>
            <div className="mt-3 flex gap-2"><select value={selectedAction} onChange={(event) => setSelectedAction(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-ath-navy" aria-label="Correct detected movement">{actionOptions.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select><button type="button" onClick={() => void correctMovement()} disabled={selectedAction === actionType || correcting} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ath-navy px-3 text-xs font-semibold text-white disabled:opacity-40">{correcting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Change</button></div>
            {correctionError ? <p role="alert" className="mt-2 text-xs text-rose-700">{correctionError}</p> : null}
          </details>
        </div>
        {analysisContext ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white/75 p-3">
          <div className="flex flex-wrap gap-2 text-[0.68rem] font-semibold">
            <span className="rounded-full bg-ath-sky/15 px-3 py-1.5 text-ath-navy">{analysisContext.shotSituationLabel}</span>
            <span className="rounded-full bg-ath-green/10 px-3 py-1.5 text-ath-green">{analysisContext.shotIntentLabel}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{analysisContext.cameraAngleLabel}</span>
            {analysisContext.athleteQuestion && !analysisContext.athleteQuestion.includes("How can I make my backhand") ? (
              <span className="rounded-full bg-ath-warn/10 px-3 py-1.5 text-ath-warn">
                Question: {actionType === "forehand" ? analysisContext.athleteQuestion.replace(/backhand/gi, "forehand") : analysisContext.athleteQuestion}
              </span>
            ) : null}
          </div>
        </div> : null}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.48fr)_minmax(360px,.72fr)]">
        <div className="border-b border-slate-200 p-4 sm:p-6 xl:border-b-0 xl:border-r">
          <div ref={mediaSurfaceRef} className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            {previewOnly ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(30,64,175,.25),transparent_34%),linear-gradient(145deg,#020617,#0f172a)]" aria-label="Visual QA movement preview"><div className="absolute inset-x-0 bottom-16 text-center text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-500">Visual QA movement preview</div></div> : <video ref={videoRef} src={videoUrl} muted playsInline preload="metadata" className="h-full w-full object-contain" style={{ transform: report.frameSummary?.videoRegistration?.mirrored ? "scaleX(-1)" : undefined }} onLoadedMetadata={() => seek(initialTime)} onSeeked={handleSeeked} onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); cancelFrameSync(); }} />}
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
            {storyCaption ? <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center"><p className="max-w-xl rounded-2xl border border-white/15 bg-slate-950/88 px-4 py-3 text-center text-sm font-semibold leading-6 text-white shadow-xl backdrop-blur">{storyCaption}</p></div> : null}
            <div data-testid="video-stage-reference" className="absolute left-3 top-3 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white">{phaseTitle(stage)} · {time.toFixed(2)}s</p><p className="mt-1 text-[0.65rem] text-slate-300">{phaseTitle(stage)} frame {currentFrame?.frameIndex ?? "—"} · {mode === "clean" ? "original video" : MODE_OPTIONS.find((item) => item.id === mode)?.label}</p></div>
            {mode !== "clean" ? <details className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-slate-950/90 px-2 py-1 backdrop-blur"><summary className="cursor-pointer list-none text-[0.62rem] font-semibold text-white">Legend</summary><div data-testid="correction-overlay-key" className="mt-1.5 flex max-w-xs flex-wrap gap-1.5 text-[0.62rem]">{mode === "gap" ? <><span className="rounded-full bg-cyan-950/90 px-2 py-1 text-cyan-200">cyan box = 3D strike corridor</span><span className="rounded-full bg-rose-950/90 px-2 py-1 text-rose-200">red vector = delta gap</span><span className="rounded-full bg-amber-950/90 px-2 py-1 text-amber-200">yellow arc = elbow angle dial</span><span className="rounded-full bg-purple-950/90 px-2 py-1 text-purple-200">purple = head quiet reticle</span></> : null}{mode === "body" ? <><span className="rounded-full bg-sky-950/90 px-2 py-1 text-sky-100">{BODY_CONNECTIONS.length} anatomical segments</span><span className="rounded-full bg-slate-950/90 px-2 py-1 text-slate-100">dashed = briefly occluded</span></> : null}{mode === "ghost" ? <><span className="rounded-full bg-cyan-950/90 px-2 py-1 text-cyan-200">cyan = pro benchmark twin</span><span className="rounded-full bg-slate-950/88 px-2 py-1 text-slate-100">synchronized stage pose</span></> : null}{mode === "coach" ? <><span className="rounded-full bg-slate-950/88 px-2 py-1 text-slate-100">light map = body links + shoulder/hip axes</span><span className="rounded-full bg-red-950/90 px-2 py-1 text-red-100">red = change</span><span className="rounded-full bg-sky-950/90 px-2 py-1 text-sky-100">blue = benchmark target</span><span className="rounded-full bg-emerald-950/90 px-2 py-1 text-emerald-100">green = working</span><span className="rounded-full bg-slate-800/90 px-2 py-1 text-slate-100">dashed = briefly occluded</span></> : null}{mode === "chain" ? <><span className="rounded-full bg-slate-950/88 px-2 py-1 text-slate-100">base → knees → hips → core → shoulder → elbow → hand</span><span className="rounded-full bg-emerald-950/90 px-2 py-1 text-emerald-100">green = connected</span><span className="rounded-full bg-red-950/90 px-2 py-1 text-red-100">red = timing issue</span><span className="rounded-full bg-slate-800/90 px-2 py-1 text-slate-100">dashed = briefly occluded</span></> : null}</div></details> : null}
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-slate-950">Watch the change</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Choose a stage. Watch slowly. Focus on one coaching cue.</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Video overlay lens">
            {MODE_OPTIONS.map((option) => <button key={option.id} type="button" role="tab" aria-selected={mode === option.id} onClick={() => setMode(option.id)} className={`rounded-xl border px-3 py-3 text-left transition ${mode === option.id ? "border-ath-navy bg-ath-navy text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}><span className="block text-xs font-semibold">{option.label}</span><span className={`mt-1 hidden text-[0.63rem] leading-4 lg:block ${mode === option.id ? "text-ath-sky" : "text-slate-400"}`}>{option.description}</span></button>)}
          </div>

          <input type="range" min={start} max={end} step={presentationStep} value={Math.max(start, Math.min(end, time))} onChange={(event) => seek(Number(event.target.value))} className="mt-4 w-full accent-[#1b4332]" aria-label="Biomechanical video timeline" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => seek(start)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Restart movement"><RefreshCw className="h-4 w-4" /></button>
            <button type="button" onClick={() => seek(time - presentationStep)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Previous frame"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => void toggle()} disabled={previewOnly} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b4332] px-5 font-semibold text-white hover:bg-[#2d6a4f] disabled:cursor-not-allowed disabled:opacity-50">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{previewOnly ? "Preview frames" : playing ? "Pause" : "Play"}</button>
            <button type="button" onClick={() => seek(time + presentationStep)} className="rounded-full border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50" aria-label="Next frame"><ChevronRight className="h-4 w-4" /></button>
            {[0.1, 0.25, 0.5, 1].map((value) => <button key={value} type="button" data-testid={`playback-rate-${value}`} onClick={() => { setRate(value); if (videoRef.current) videoRef.current.playbackRate = value; }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${rate === value ? "border-ath-lime bg-ath-lime/20 text-ath-navy" : "border-slate-200 text-slate-500"}`}>{value}×</button>)}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">{mode === "clean" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}Original video preserved</span>
          </div>

          <div data-testid="six-stage-video-map" className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6" role="tablist" aria-label="Movement phase">
            {MOTION_STAGES.map((item) => <button key={item.id} type="button" role="tab" aria-selected={stage === item.id} onClick={() => seek(anchors[item.id])} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold ${stage === item.id ? "border-ath-lime bg-ath-lime/20 text-ath-navy" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800"}`}>{item.label}</button>)}
          </div>

          {mode === "ghost" ? (
            <ProMotionTwinControls
              actionType={actionType}
              selectedArchetypeId={selectedArchetypeId}
              onSelectArchetype={setSelectedArchetypeId}
              ghostOpacity={ghostOpacity}
              onChangeGhostOpacity={setGhostOpacity}
              currentStage={stage}
            />
          ) : null}

          <KineticSequenceWaveform
            currentStage={stage}
            currentTime={time}
            duration={end - start}
          />
        </div>

        <aside className="flex flex-col bg-slate-50/70 p-5 sm:p-7">
          {primaryStageFinding ? <div data-testid="stage-finding-correction" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ath-navy text-xl font-bold text-white ring-4 ring-ath-sky/20">{primaryStageFinding.rank}</span><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ath-navy">{phaseTitle(stage)} · Detected</p><h3 className="mt-1 text-xl font-semibold text-slate-950">{primaryStageFinding.ontologyTitle}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{primaryStageFinding.correction}</p></div></div><div className="mt-4 grid gap-2" aria-label={`${phaseTitle(stage)} detected issues`}>{stageFindings.slice(0, 3).map((finding, index) => { const style = FINDING_STATUS_STYLE[finding.status] ?? FINDING_STATUS_STYLE.FAULT_SUSPECTED; return <div key={finding.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${style.classes}`}><span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white" style={{ backgroundColor: style.color }}>{index + 1}</span><div><p className="text-xs font-semibold leading-5">{finding.ontologyTitle}</p><p className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">{style.label}</p></div></div>; })}</div><p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-[0.68rem] leading-5 text-slate-700"><span className="font-semibold">Camera-honest view:</span> racket checkpoints remain in the written report as Confirm; no synthetic racket is drawn on the video.</p></div> : null}
          <div className={`${primaryStageFinding ? "mt-6" : ""} flex items-start justify-between gap-4`}><div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-ath-navy">What to notice</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">{copy.question}</h3></div><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">{phaseSummary?.availableMetricCount ?? 0}/{phaseSummary?.metricCount ?? 0} visible</span></div>

          <div className="mt-5 space-y-3">
            {phaseSummary?.benchmarkDescription ? <div className="rounded-2xl border border-ath-green/20 bg-ath-green/5 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ath-green"><Target className="h-4 w-4" />What best-in-class looks like here</div>{phaseSummary.coachingCue ? <span className="rounded-full bg-ath-green/15 px-2.5 py-0.5 text-xs font-semibold text-ath-green">“{phaseSummary.coachingCue}”</span> : null}</div><p className="mt-2 text-sm leading-6 text-slate-700">{phaseSummary.benchmarkDescription}</p>{phaseSummary.checkpoints && phaseSummary.checkpoints.length > 0 ? <div className="mt-3 grid gap-1 border-t border-ath-green/20 pt-3"><p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ath-green">Checkpoints</p><div className="grid gap-1">{phaseSummary.checkpoints.map((cp, idx) => <div key={idx} className="rounded-lg bg-white/70 px-2.5 py-1 text-xs text-slate-700"><span className="font-semibold text-slate-900">{cp.bodyPart}:</span> {cp.target}</div>)}</div></div> : null}{!primaryStageFinding && phaseSummary.commonMistakeTitles.length > 0 ? <p className="mt-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-700">Commonly goes wrong here:</span> {phaseSummary.commonMistakeTitles.join(", ")}.</p> : null}</div> : null}
            <div className="rounded-2xl border border-ath-sky/25 bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ath-navy"><ScanLine className="h-4 w-4" />What I see</div><p className="mt-2 text-sm leading-6 text-slate-700">{plainLanguage(area?.observation ?? copy.observe)}</p></div>
            <div className="rounded-2xl border border-ath-line bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ath-ink-soft"><Activity className="h-4 w-4" />Why the ball cares</div><p className="mt-2 text-sm leading-6 text-slate-700">{plainLanguage(area?.whyItMatters ?? copy.why)}</p></div>
            <div className="rounded-2xl bg-ath-navy p-4 text-white"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ath-lime"><Sparkles className="h-4 w-4" />Feel this</div><p className="mt-2 text-lg font-semibold leading-7">“{plainLanguage(area?.cue ?? report.coachingPlaybook?.feelCue ?? report.priorities[0]?.cue ?? copy.feel)}”</p></div>
          </div>

          <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Measurements</span><span className="text-[0.68rem] text-slate-400">{visibleMetrics.slice(0, 3).length} checks · open</span></summary>
            <div className="mt-3 space-y-2">
              {visibleMetrics.slice(0, 3).length > 0 ? visibleMetrics.slice(0, 3).map((metric) => <div key={metric.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3"><div><p className="text-xs font-semibold text-slate-800">{metric.label}</p><p className="mt-1 text-[0.66rem] leading-4 text-slate-500">{metric.playerMeaning}</p></div><span className="shrink-0 text-sm font-semibold text-slate-950">{metric.displayValue}</span></div>) : <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">This phase was not clear enough for a dependable body measurement.</p>}
            </div>
          </details>

          <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"><GitBranch className="h-4 w-4" />Movement sequence</span><span className="text-[0.68rem] text-slate-400">{BODY_CONNECTIONS.length} body links · {chainLinks.length} timing transfers</span></summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {chainLinks.map((link) => { const style = STATUS_STYLE[link.status]; return <button key={link.id} type="button" onClick={() => { const targetTime = link.target.peakTimestampSeconds; if (typeof targetTime === "number") seek(targetTime); setMode("chain"); }} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${style.classes}`}><span className="text-xs font-semibold">{link.source.label} <ArrowRight className="mx-1 inline h-3 w-3" /> {link.target.label}</span><span className="inline-flex shrink-0 items-center gap-1 text-[0.63rem] font-semibold uppercase"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />{style.label}</span></button>; })}
            </div>
          </details>

          <details className="mt-auto pt-6"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-500"><CircleAlert className="h-4 w-4" />What the camera cannot measure</summary><p className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[0.68rem] leading-5 text-slate-500">This is a 2D coaching view. Low-confidence joints are withheld; force, exact racket-face angle, and full 3D motion are not claimed.</p></details>
        </aside>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 bg-white p-4 text-sm text-slate-600"><CheckCircle2 className="h-5 w-5 shrink-0 text-ath-green" /><p><span className="font-semibold text-slate-950">Watch → feel → repeat.</span> Take the cue below to your next practice.</p></div>
    </section>
  );
}
