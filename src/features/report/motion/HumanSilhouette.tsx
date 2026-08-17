"use client";

import type { JointName, Point, Pose } from "./motion-model";

export type SilhouetteStyle = "male" | "female" | "neutral";

type Props = {
  pose: Pose;
  style?: SilhouetteStyle;
  dominantSide: "left" | "right";
  strokeType?: "two_handed_backhand" | "one_handed_backhand" | "forehand" | "serve" | "volley";
  color?: string;
  outline?: string;
  opacity?: number;
  label: string;
  swingPath?: Point[];
  activeJoint?: JointName;
  targetPoint?: Point | null;
  targetLabel?: string;
  themeColor?: string;
};

const WIDTH = 360;
const HEIGHT = 250;

function f(val: number): string {
  return (Math.round(val * 100) / 100).toFixed(2);
}

function map(point: Point) {
  return {
    x: Math.round(point.x * WIDTH * 100) / 100,
    y: Math.round(point.y * HEIGHT * 100) / 100,
  };
}

function midpoint(a: Point, b: Point) {
  return {
    x: Math.round(((a.x + b.x) / 2) * 10000) / 10000,
    y: Math.round(((a.y + b.y) / 2) * 10000) / 10000,
  };
}

function extendedPoint(from: Point, through: Point, distance: number) {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 0.001);
  return {
    x: Math.round((through.x + (dx / length) * distance) * 10000) / 10000,
    y: Math.round((through.y + (dy / length) * distance) * 10000) / 10000,
  };
}

/**
 * Calculates the interior angle (in degrees) between three 2D joint points.
 */
function getJointFlexionAngle(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y) || 0.001;
  const mag2 = Math.hypot(v2.x, v2.y) || 0.001;
  const cosVal = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosVal) * (180 / Math.PI);
}

/**
 * Calculates the 3D X-Factor separation angle between shoulder girdle and pelvis.
 */
function getXFactorAngle(ls: Point, rs: Point, lh: Point, rh: Point): number {
  const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
  const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
  let diff = Math.abs(shoulderAngle - hipAngle) * (180 / Math.PI);
  if (diff > 180) diff = 360 - diff;
  return Math.round(diff);
}

/**
 * Constructs an organic, curved muscle contour path (Bézier curves)
 * with dynamic Squash & Stretch muscle deformation.
 */
function curvedMusclePath(
  a: Point,
  b: Point,
  startW: number,
  midWOuter: number,
  midWInner: number,
  endW: number,
  curveBias = 0.5,
) {
  const p1 = map(a);
  const p2 = map(b);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.max(Math.hypot(dx, dy), 0.001);
  const nx = -dy / len;
  const ny = dx / len;

  const midX = p1.x + dx * curveBias;
  const midY = p1.y + dy * curveBias;

  const o1x = p1.x + nx * startW;
  const o1y = p1.y + ny * startW;
  const omx = midX + nx * midWOuter;
  const omy = midY + ny * midWOuter;
  const o2x = p2.x + nx * endW;
  const o2y = p2.y + ny * endW;

  const i2x = p2.x - nx * endW;
  const i2y = p2.y - ny * endW;
  const imx = midX - nx * midWInner;
  const imy = midY - ny * midWInner;
  const i1x = p1.x - nx * startW;
  const i1y = p1.y - ny * startW;

  return `M ${f(o1x)} ${f(o1y)}
    Q ${f(omx)} ${f(omy)} ${f(o2x)} ${f(o2y)}
    L ${f(i2x)} ${f(i2y)}
    Q ${f(imx)} ${f(imy)} ${f(i1x)} ${f(i1y)} Z`;
}

/**
 * Renders an organic human muscle segment with Fortiche/Arcane dynamic muscle heatmaps,
 * volumetric depth, dynamic squash/stretch bulge, and Blur Studio tendon fibers.
 */
function OrganicLimbSegment({
  a,
  b,
  startW,
  midWOuter,
  midWInner,
  endW,
  themeColor = "#38bdf8",
  muscleName,
  bulgeFactor = 1.0,
}: {
  a: Point;
  b: Point;
  startW: number;
  midWOuter: number;
  midWInner: number;
  endW: number;
  themeColor?: string;
  muscleName?: string;
  bulgeFactor?: number;
}) {
  const isLoaded = bulgeFactor > 1.22;
  const activeColor = isLoaded ? "#f59e0b" : themeColor;
  const finalMidOuter = midWOuter * bulgeFactor;
  const finalMidInner = midWInner * bulgeFactor;
  const path = curvedMusclePath(a, b, startW, finalMidOuter, finalMidInner, endW);
  const p1 = map(a);
  const p2 = map(b);

  return (
    <g aria-label={muscleName}>
      {/* Soft Ambient Rim Lighting & Subsurface Glow */}
      <path d={path} fill={activeColor} opacity={isLoaded ? 0.25 : 0.14} strokeWidth="0" />
      {/* Dense Muscle Core with Volumetric Depth */}
      <path
        d={path}
        fill={isLoaded ? "rgba(24,18,12,0.96)" : "rgba(12,18,34,0.95)"}
        stroke={activeColor}
        strokeWidth={isLoaded ? "1.6" : "1.3"}
        strokeLinejoin="round"
        opacity={0.97}
      />
      {/* Kinetic Muscle Fiber Core Vector */}
      <line
        x1={f(p1.x)}
        y1={f(p1.y)}
        x2={f(p2.x)}
        y2={f(p2.y)}
        stroke={activeColor}
        strokeWidth={isLoaded ? "1.4" : "1"}
        strokeDasharray={isLoaded ? "5 2" : "4 3"}
        opacity={isLoaded ? 0.9 : 0.7}
      />
      {/* Dynamic Muscle Belly Highlight */}
      {isLoaded ? (
        <circle
          cx={f((p1.x + p2.x) / 2)}
          cy={f((p1.y + p2.y) / 2)}
          r={f(finalMidOuter * 0.55)}
          fill="#f59e0b"
          opacity="0.35"
        />
      ) : null}
      {/* Subtle Specular Center Nodes */}
      <circle cx={f(p1.x)} cy={f(p1.y)} r={f(startW * 0.55)} fill="rgba(15,23,42,0.9)" stroke={activeColor} strokeWidth="1" />
      <circle cx={f(p1.x)} cy={f(p1.y)} r="1.5" fill="#ffffff" opacity={0.9} />
      <circle cx={f(p2.x)} cy={f(p2.y)} r={f(endW * 0.55)} fill="rgba(15,23,42,0.9)" stroke={activeColor} strokeWidth="1" />
      <circle cx={f(p2.x)} cy={f(p2.y)} r="1.5" fill="#ffffff" opacity={0.9} />
    </g>
  );
}

/**
 * Ergonomic Athletic Tennis Court Shoe with realistic treads,
 * heel counter, arch support, and reinforced toe cap.
 */
function AthleticShoe({
  ankle,
  direction = "right",
  themeColor = "#38bdf8",
}: {
  ankle: { x: number; y: number };
  direction?: "left" | "right";
  themeColor?: string;
}) {
  const dir = direction === "left" ? -1 : 1;
  const heelX = ankle.x - dir * 4;
  const heelY = ankle.y + 4;
  const toeX = ankle.x + dir * 14;
  const toeY = ankle.y + 6;
  const soleY = ankle.y + 7.5;
  const instepX = ankle.x + dir * 5;
  const instepY = ankle.y + 1.5;

  const shoePath = `M ${f(ankle.x - dir * 3)} ${f(ankle.y)}
    L ${f(heelX)} ${f(heelY)}
    Q ${f(heelX + dir * 2)} ${f(soleY)} ${f(ankle.x + dir * 4)} ${f(soleY)}
    L ${f(toeX)} ${f(soleY)}
    Q ${f(toeX + dir * 2)} ${f(toeY)} ${f(toeX)} ${f(toeY - 2.5)}
    Q ${f(instepX + dir * 3)} ${f(instepY + 1)} ${f(instepX)} ${f(instepY)}
    Q ${f(ankle.x + dir * 1)} ${f(ankle.y + 1)} ${f(ankle.x + dir * 3)} ${f(ankle.y)} Z`;

  return (
    <g>
      {/* Cushioned Midsole Outsole */}
      <path
        d={`M ${f(heelX)} ${f(heelY + 1)} L ${f(toeX + dir * 1)} ${f(toeY + 1)}`}
        stroke={themeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Main Shoe Upper Contour */}
      <path
        d={shoePath}
        fill="rgba(10,15,30,0.96)"
        stroke="#ffffff"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Tennis Court Herringbone Grip Grooves */}
      <line
        x1={f(ankle.x - dir * 1)}
        y1={f(soleY)}
        x2={f(ankle.x + dir * 8)}
        y2={f(soleY)}
        stroke={themeColor}
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
      />
      {/* Lacing eyelets */}
      <circle cx={f(instepX)} cy={f(instepY + 1.5)} r="0.9" fill="#ffffff" />
      <circle cx={f(instepX + dir * 3)} cy={f(instepY + 2.5)} r="0.9" fill="#ffffff" />
    </g>
  );
}

export function HumanSilhouette({
  pose,
  dominantSide,
  strokeType = "forehand",
  label,
  activeJoint,
  targetPoint,
  targetLabel,
  themeColor = "#38bdf8",
}: Props) {
  const idPrefix = label.replace(/\s+/g, "_").toLowerCase();

  // Athletic Landmarks (Broader athletic shoulders and sculpted limbs)
  const leftShoulder = map(pose.left_shoulder);
  const rightShoulder = map(pose.right_shoulder);
  const leftHip = map(pose.left_hip);
  const rightHip = map(pose.right_hip);
  const leftKnee = map(pose.left_knee);
  const rightKnee = map(pose.right_knee);
  const leftAnkle = map(pose.left_ankle);
  const rightAnkle = map(pose.right_ankle);
  const leftWrist = map(pose.left_wrist);
  const rightWrist = map(pose.right_wrist);

  const headPos = map(pose.head);
  const neck = midpoint(leftShoulder, rightShoulder);
  const pelvis = midpoint(leftHip, rightHip);

  // Pixar Dynamic Muscle "Squash & Stretch" Flexion Measurements
  const leftKneeAngle = getJointFlexionAngle(pose.left_hip, pose.left_knee, pose.left_ankle);
  const rightKneeAngle = getJointFlexionAngle(pose.right_hip, pose.right_knee, pose.right_ankle);
  const leftElbowAngle = getJointFlexionAngle(pose.left_shoulder, pose.left_elbow, pose.left_wrist);
  const rightElbowAngle = getJointFlexionAngle(pose.right_shoulder, pose.right_elbow, pose.right_wrist);

  // Live 3D X-Factor Core Separation Angle
  const xFactorCoil = getXFactorAngle(pose.left_shoulder, pose.right_shoulder, pose.left_hip, pose.right_hip);

  // Dynamic Muscle Bulge Multipliers
  const leftQuadBulge = 1.0 + Math.max(0, (180 - leftKneeAngle) / 180) * 0.42;
  const rightQuadBulge = 1.0 + Math.max(0, (180 - rightKneeAngle) / 180) * 0.42;
  const leftCalfBulge = 1.0 + Math.max(0, (180 - leftKneeAngle) / 180) * 0.28;
  const rightCalfBulge = 1.0 + Math.max(0, (180 - rightKneeAngle) / 180) * 0.28;

  const leftBicepBulge = 1.0 + Math.max(0, (180 - leftElbowAngle) / 180) * 0.40;
  const rightBicepBulge = 1.0 + Math.max(0, (180 - rightElbowAngle) / 180) * 0.40;
  const leftForearmBulge = 1.0 + Math.max(0, (180 - leftElbowAngle) / 180) * 0.32;
  const rightForearmBulge = 1.0 + Math.max(0, (180 - rightElbowAngle) / 180) * 0.32;

  // Active target joint callout
  const active = activeJoint ? map(pose[activeJoint]) : null;
  const target = targetPoint ? map(targetPoint) : null;

  // Performance Athletic Shorts
  const leftShortsBottom = midpoint(leftHip, leftKnee);
  const rightShortsBottom = midpoint(rightHip, rightKnee);
  const shortsPath = `M ${f(leftHip.x - 7.5)} ${f(leftHip.y)}
    L ${f(rightHip.x + 7.5)} ${f(rightHip.y)}
    L ${f(rightShortsBottom.x + 8)} ${f(rightShortsBottom.y)}
    L ${f(rightShortsBottom.x - 4)} ${f(rightShortsBottom.y + 1)}
    L ${f(pelvis.x)} ${f(pelvis.y + 12)}
    L ${f(leftShortsBottom.x + 4)} ${f(leftShortsBottom.y + 1)}
    L ${f(leftShortsBottom.x - 8)} ${f(leftShortsBottom.y)} Z`;

  // Performance Athletic Jersey / Polo (V-taper athletic cut)
  const jerseyPath = `M ${f(leftShoulder.x - 8)} ${f(leftShoulder.y)}
    Q ${f(neck.x)} ${f(neck.y - 2)} ${f(rightShoulder.x + 8)} ${f(rightShoulder.y)}
    L ${f(rightHip.x + 6.5)} ${f(rightHip.y)}
    L ${f(leftHip.x - 6.5)} ${f(leftHip.y)} Z`;

  // Grip Hand & Racket Vectors
  const isTwoHanded = strokeType === "two_handed_backhand";
  const dominantWrist = dominantSide === "right" ? rightWrist : leftWrist;
  const dominantElbow = dominantSide === "right" ? map(pose.right_elbow) : map(pose.left_elbow);
  const dominantShoulder = dominantSide === "right" ? rightShoulder : leftShoulder;
  const rearFoot = dominantSide === "right" ? rightAnkle : leftAnkle;

  const racketFrom = dominantWrist;
  const racketHead = extendedPoint(dominantElbow, dominantWrist, 44);

  const dx = racketHead.x - racketFrom.x;
  const dy = racketHead.y - racketFrom.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // 3D Perspective Foreshortening on Racket Hoop
  const hoopRy = 16 * (0.65 + 0.35 * Math.abs(Math.cos((angle * Math.PI) / 180)));

  // Quiet-Eye Gaze Vector
  const gazeTarget = targetPoint ? map(targetPoint) : racketHead;

  // Forward Lead Foot for Deceleration Dust Puff
  const leadFoot = dominantSide === "right" ? leftAnkle : rightAnkle;

  // Production I.G "Line of Action" Kinetic Flow S-Curve
  const lineOfActionPath = `M ${f(rearFoot.x)} ${f(rearFoot.y)}
    Q ${f(pelvis.x)} ${f(pelvis.y + 10)} ${f(pelvis.x)} ${f(pelvis.y)}
    Q ${f(neck.x)} ${f(neck.y)} ${f(dominantShoulder.x)} ${f(dominantShoulder.y)}
    Q ${f(dominantElbow.x)} ${f(dominantElbow.y)} ${f(dominantWrist.x)} ${f(dominantWrist.y)}
    L ${f(racketHead.x)} ${f(racketHead.y)}`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-full w-full select-none"
      role="img"
      aria-label={`${label} Motion Twin Avatar`}
    >
      <defs>
        {/* Living Breathing CSS Keyframe Animation Style */}
        <style>{`
          @keyframes athleticBreathe {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-0.8px) scale(1.012); }
          }
          .living-torso {
            transform-origin: 180px 140px;
            animation: athleticBreathe 4.2s ease-in-out infinite;
          }
        `}</style>

        {/* Soft Holographic Glow Filter */}
        <filter id={`hologlow-${idPrefix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Dynamic Spatial Court Floor Gradient */}
        <radialGradient id={`studioFloor-${idPrefix}`} cx="50%" cy="88%" r="65%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
          <stop offset="45%" stopColor="rgba(15,23,42,0.6)" />
          <stop offset="100%" stopColor="rgba(2,6,23,0.95)" />
        </radialGradient>

        {/* Ground Anchor Light */}
        <radialGradient id={`holoGlow-${idPrefix}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={themeColor} stopOpacity="0.45" />
          <stop offset="60%" stopColor={themeColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        {/* Soft Ground Contact Shadow Filter */}
        <filter id={`shadowBlur-${idPrefix}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        {/* Volumetric Cylindrical Torso Gradient */}
        <linearGradient id={`torsoVolumetric-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(8,12,24,0.98)" />
          <stop offset="35%" stopColor="rgba(18,28,52,0.96)" />
          <stop offset="70%" stopColor="rgba(10,16,32,0.96)" />
          <stop offset="100%" stopColor="rgba(6,9,18,0.98)" />
        </linearGradient>

        {/* Production I.G Line of Action Glowing Energy Stream */}
        <linearGradient id={`lineOfActionGrad-${idPrefix}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.85" />
          <stop offset="100%" stopColor={themeColor} stopOpacity="0.95" />
        </linearGradient>

        {/* Laser Arrow Marker */}
        <marker id={`arrow-${idPrefix}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill={themeColor} />
        </marker>
      </defs>

      {/* Broadcast AR 3D Spatial Floor */}
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill={`url(#studioFloor-${idPrefix})`} />

      {/* Perspective Court Alignment Grid */}
      <g opacity="0.2">
        <line x1="0" y1="210" x2={WIDTH} y2="210" stroke={themeColor} strokeWidth="1.5" />
        <line x1="0" y1="240" x2={WIDTH} y2="240" stroke={themeColor} strokeWidth="1" />
        <line x1="70" y1="180" x2="30" y2="250" stroke={themeColor} strokeWidth="1" />
        <line x1="290" y1="180" x2="330" y2="250" stroke={themeColor} strokeWidth="1" />
        <line x1="180" y1="180" x2="180" y2="250" stroke={themeColor} strokeWidth="1" strokeDasharray="4 4" />
      </g>

      {/* 🏟️ Pixar RenderMan Stadium Fresnel Floor Reflection */}
      <g opacity="0.12" transform="scale(1, -0.28) translate(0, -960)" filter={`url(#shadowBlur-${idPrefix})`}>
        <ellipse cx={f(leftAnkle.x)} cy={f(leftAnkle.y)} rx="14" ry="6" fill={themeColor} />
        <ellipse cx={f(rightAnkle.x)} cy={f(rightAnkle.y)} rx="14" ry="6" fill={themeColor} />
      </g>

      {/* Deceleration Court Chalk Dust Particles Under Planted Lead Shoe */}
      <g opacity="0.7">
        <circle cx={f(leadFoot.x - 12)} cy={f(leadFoot.y + 6)} r="2.2" fill="#ffffff" opacity="0.6" />
        <circle cx={f(leadFoot.x - 7)} cy={f(leadFoot.y + 3)} r="3.2" fill={themeColor} opacity="0.4" />
        <circle cx={f(leadFoot.x + 8)} cy={f(leadFoot.y + 4)} r="2.8" fill="#ffffff" opacity="0.5" />
        <circle cx={f(leadFoot.x + 15)} cy={f(leadFoot.y + 7)} r="1.8" fill={themeColor} opacity="0.6" />
      </g>

      {/* Disney Research Dynamic Ground Contact Shadows */}
      <ellipse
        cx={f(leftAnkle.x)}
        cy={f(leftAnkle.y + 7.5)}
        rx={f(14 * leftQuadBulge)}
        ry="4.5"
        fill="rgba(0,0,0,0.65)"
        filter={`url(#shadowBlur-${idPrefix})`}
      />
      <ellipse
        cx={f(rightAnkle.x)}
        cy={f(rightAnkle.y + 7.5)}
        rx={f(14 * rightQuadBulge)}
        ry="4.5"
        fill="rgba(0,0,0,0.65)"
        filter={`url(#shadowBlur-${idPrefix})`}
      />

      {/* Ground Center Anchor Ring */}
      <ellipse
        cx={f((leftAnkle.x + rightAnkle.x) / 2)}
        cy={f(Math.max(leftAnkle.y, rightAnkle.y) + 6)}
        rx="54"
        ry="8"
        fill={`url(#holoGlow-${idPrefix})`}
        stroke={themeColor}
        strokeWidth="0.9"
        strokeDasharray="4 2"
      />

      {/* Production I.G "Line of Action" Kinetic Spine Flow */}
      <path
        d={lineOfActionPath}
        fill="none"
        stroke={`url(#lineOfActionGrad-${idPrefix})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="6 3"
        opacity="0.85"
      />

      {/* ORGANIC ATHLETIC HUMAN ANATOMY (With Alberto Mielgo Living Torso) */}
      <g>
        {/* Legs: Powerful Muscular Thighs (Quadriceps & Hamstrings) */}
        <OrganicLimbSegment
          a={pose.left_hip}
          b={pose.left_knee}
          startW={11}
          midWOuter={13.5}
          midWInner={11}
          endW={8}
          themeColor={themeColor}
          muscleName="Left Quadricep"
          bulgeFactor={leftQuadBulge}
        />
        <OrganicLimbSegment
          a={pose.right_hip}
          b={pose.right_knee}
          startW={11}
          midWOuter={13.5}
          midWInner={11}
          endW={8}
          themeColor={themeColor}
          muscleName="Right Quadricep"
          bulgeFactor={rightQuadBulge}
        />

        {/* Patella (Knee Cap) Anatomical Nodes */}
        <circle cx={f(leftKnee.x)} cy={f(leftKnee.y)} r="6" fill="rgba(15,23,42,0.96)" stroke={themeColor} strokeWidth="1.5" />
        <circle cx={f(leftKnee.x)} cy={f(leftKnee.y)} r="2" fill="#ffffff" />
        <circle cx={f(rightKnee.x)} cy={f(rightKnee.y)} r="6" fill="rgba(15,23,42,0.96)" stroke={themeColor} strokeWidth="1.5" />
        <circle cx={f(rightKnee.x)} cy={f(rightKnee.y)} r="2" fill="#ffffff" />

        {/* Weta FX Ambient Occlusion Popliteal Crease (Behind Knee Flexion) */}
        {leftKneeAngle < 140 ? (
          <path
            d={`M ${f(leftKnee.x - 3)} ${f(leftKnee.y)} Q ${f(leftKnee.x)} ${f(leftKnee.y + 3)} ${f(leftKnee.x + 3)} ${f(leftKnee.y)}`}
            stroke="rgba(0,0,0,0.85)"
            strokeWidth="1.6"
            fill="none"
          />
        ) : null}
        {rightKneeAngle < 140 ? (
          <path
            d={`M ${f(rightKnee.x - 3)} ${f(rightKnee.y)} Q ${f(rightKnee.x)} ${f(rightKnee.y + 3)} ${f(rightKnee.x + 3)} ${f(rightKnee.y)}`}
            stroke="rgba(0,0,0,0.85)"
            strokeWidth="1.6"
            fill="none"
          />
        ) : null}

        {/* Legs: Sculpted Athletic Calves (Gastrocnemius & Achilles Tendon) */}
        <OrganicLimbSegment
          a={pose.left_knee}
          b={pose.left_ankle}
          startW={8}
          midWOuter={10.8}
          midWInner={8}
          endW={5}
          themeColor={themeColor}
          muscleName="Left Calf"
          bulgeFactor={leftCalfBulge}
        />
        <OrganicLimbSegment
          a={pose.right_knee}
          b={pose.right_ankle}
          startW={8}
          midWOuter={10.8}
          midWInner={8}
          endW={5}
          themeColor={themeColor}
          muscleName="Right Calf"
          bulgeFactor={rightCalfBulge}
        />

        {/* Blur Studio Achilles Tendon Tension Line */}
        <line
          x1={f(rightAnkle.x)}
          y1={f(rightAnkle.y - 8)}
          x2={f(rightAnkle.x)}
          y2={f(rightAnkle.y + 2)}
          stroke={rightCalfBulge > 1.15 ? "#fbbf24" : themeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Pro Tennis Court Shoes */}
        <AthleticShoe ankle={leftAnkle} direction="left" themeColor={themeColor} />
        <AthleticShoe ankle={rightAnkle} direction="right" themeColor={themeColor} />

        {/* Pro Performance Tennis Shorts */}
        <path d={shortsPath} fill="rgba(8,12,24,0.96)" stroke={themeColor} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Shorts Athletic Contrast Side Piping */}
        <path d={`M ${f(leftHip.x - 7.5)} ${f(leftHip.y + 1)} L ${f(leftShortsBottom.x - 8)} ${f(leftShortsBottom.y)}`} stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity={0.8} />
        <path d={`M ${f(rightHip.x + 7.5)} ${f(rightHip.y + 1)} L ${f(rightShortsBottom.x + 8)} ${f(rightShortsBottom.y)}`} stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity={0.8} />

        {/* LIVING UPPER BODY (Micro-Breathing & Volumetric Torso Shading) */}
        <g className="living-torso">
          {/* Performance Athletic Jersey with Volumetric Cylindrical Gradient */}
          <path d={jerseyPath} fill={`url(#torsoVolumetric-${idPrefix})`} stroke={themeColor} strokeWidth="1.4" strokeLinejoin="round" />

          {/* 🎽 Marvelous Designer / Disney Cloth Dynamic Strain Folds on Coil */}
          {xFactorCoil > 18 ? (
            <g opacity="0.6">
              <path
                d={`M ${f(rightShoulder.x - 2)} ${f(rightShoulder.y + 6)} Q ${f(neck.x + 2)} ${f(neck.y + 14)} ${f(leftHip.x + 4)} ${f(leftHip.y - 2)}`}
                stroke={themeColor}
                strokeWidth="1.2"
                strokeDasharray="4 2"
                fill="none"
              />
              <path
                d={`M ${f(rightShoulder.x - 6)} ${f(rightShoulder.y + 12)} Q ${f(neck.x - 2)} ${f(neck.y + 18)} ${f(leftHip.x + 8)} ${f(leftHip.y + 2)}`}
                stroke={themeColor}
                strokeWidth="1.0"
                strokeDasharray="3 2"
                fill="none"
              />
            </g>
          ) : null}

          {/* Live 3D X-Factor Core Separation Angle HUD Arc */}
          <g transform={`translate(${f(pelvis.x)}, ${f(pelvis.y - 12)})`}>
            <circle cx="0" cy="0" r="14" fill="none" stroke={themeColor} strokeWidth="1" strokeDasharray="2 2" opacity="0.75" />
            <path
              d={`M 0,-14 A 14,14 0 0,1 ${f(Math.sin((xFactorCoil * Math.PI) / 180) * 14)},${f(-Math.cos((xFactorCoil * Math.PI) / 180) * 14)}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
            />
            <text x="18" y="-2" fill="#fbbf24" fontSize="7.5" fontWeight="900" textAnchor="start">
              X-FACTOR {xFactorCoil}°
            </text>
          </g>

          {/* Athletic Neckline / V-Collar */}
          <path
            d={`M ${f(neck.x - 7)} ${f(neck.y - 2)} Q ${f(neck.x)} ${f(neck.y + 5)} ${f(neck.x + 7)} ${f(neck.y - 2)}`}
            stroke="#ffffff"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Chest Pectoral Contour Lines */}
          <path
            d={`M ${f(leftShoulder.x + 4)} ${f(leftShoulder.y + 7)} Q ${f(neck.x)} ${f(neck.y + 14)} ${f(rightShoulder.x - 4)} ${f(rightShoulder.y + 7)}`}
            stroke={themeColor}
            strokeWidth="1.1"
            strokeDasharray="3 2"
            fill="none"
            opacity={0.65}
          />

          {/* Spine Core Line */}
          <line x1={f(neck.x)} y1={f(neck.y)} x2={f(pelvis.x)} y2={f(pelvis.y)} stroke={themeColor} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />

          {/* Organic Upper Arms (Broad Athletic Deltoid & Bicep) */}
          <OrganicLimbSegment
            a={pose.left_shoulder}
            b={pose.left_elbow}
            startW={8.5}
            midWOuter={10}
            midWInner={8.2}
            endW={6.5}
            themeColor={themeColor}
            muscleName="Left Bicep"
            bulgeFactor={leftBicepBulge}
          />
          <OrganicLimbSegment
            a={pose.right_shoulder}
            b={pose.right_elbow}
            startW={8.5}
            midWOuter={10}
            midWInner={8.2}
            endW={6.5}
            themeColor={themeColor}
            muscleName="Right Bicep"
            bulgeFactor={rightBicepBulge}
          />

          {/* Sculpted Athletic Deltoid Shoulder Caps */}
          <circle cx={f(leftShoulder.x)} cy={f(leftShoulder.y)} r="8" fill="rgba(15,23,42,0.96)" stroke={themeColor} strokeWidth="1.5" />
          <circle cx={f(leftShoulder.x)} cy={f(leftShoulder.y)} r="2.2" fill="#ffffff" />
          <circle cx={f(rightShoulder.x)} cy={f(rightShoulder.y)} r="8" fill="rgba(15,23,42,0.96)" stroke={themeColor} strokeWidth="1.5" />
          <circle cx={f(rightShoulder.x)} cy={f(rightShoulder.y)} r="2.2" fill="#ffffff" />

          {/* Organic Forearms (Defined Pronators & Extensors) */}
          <OrganicLimbSegment
            a={pose.left_elbow}
            b={pose.left_wrist}
            startW={6.5}
            midWOuter={8}
            midWInner={6.5}
            endW={4.5}
            themeColor={themeColor}
            muscleName="Left Forearm"
            bulgeFactor={leftForearmBulge}
          />
          <OrganicLimbSegment
            a={pose.right_elbow}
            b={pose.right_wrist}
            startW={6.5}
            midWOuter={8}
            midWInner={6.5}
            endW={4.5}
            themeColor={themeColor}
            muscleName="Right Forearm"
            bulgeFactor={rightForearmBulge}
          />

          {/* Anatomical Muscular Neck */}
          <path
            d={`M ${f(neck.x - 4)} ${f(neck.y)} L ${f(headPos.x - 4.5)} ${f(headPos.y + 9)} M ${f(neck.x + 4)} ${f(neck.y)} L ${f(headPos.x + 4.5)} ${f(headPos.y + 9)}`}
            stroke={themeColor}
            strokeWidth="1.6"
            opacity={0.85}
          />

          {/* Pro Tennis Player Head & Visor/Cap */}
          <ellipse cx={f(headPos.x)} cy={f(headPos.y)} rx="9.5" ry="11.5" fill="rgba(10,15,30,0.95)" stroke={themeColor} strokeWidth="1.4" />
          <path
            d={`M ${f(headPos.x - 9)} ${f(headPos.y - 2)} Q ${f(headPos.x)} ${f(headPos.y - 12)} ${f(headPos.x + 9)} ${f(headPos.y - 2)} Z`}
            fill={themeColor}
            opacity={0.85}
          />
          <path
            d={`M ${f(headPos.x + (dominantSide === "right" ? -7 : 7))} ${f(headPos.y - 2)} L ${f(headPos.x + (dominantSide === "right" ? -14 : 14))} ${f(headPos.y - 4)}`}
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Disney / Pixar 'Quiet-Eye' Gaze Lock onto Strike Point */}
          <circle cx={f(headPos.x + (dominantSide === "right" ? -4 : 4))} cy={f(headPos.y + 1)} r="1.8" fill="#ffffff" />
          <line
            x1={f(headPos.x + (dominantSide === "right" ? -4 : 4))}
            y1={f(headPos.y + 1)}
            x2={f(gazeTarget.x)}
            y2={f(gazeTarget.y)}
            stroke={themeColor}
            strokeWidth="1.2"
            strokeDasharray="3 2"
            opacity="0.75"
          />
        </g>
      </g>

      {/* 🎾 REALISTIC TOUR-GRADE TENNIS RACKET (With 3D Perspective Foreshortening) */}
      <g>
        {/* Two-handed bridge wrap connecting both hands on the grip */}
        {isTwoHanded ? (
          <line
            x1={f(leftWrist.x)}
            y1={f(leftWrist.y)}
            x2={f(rightWrist.x)}
            y2={f(rightWrist.y)}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}

        {/* Articulated Hand & Fingers on Grip */}
        <ellipse cx={f(racketFrom.x)} cy={f(racketFrom.y)} rx="3.5" ry="4.5" fill="rgba(15,23,42,0.95)" stroke="#ffffff" strokeWidth="1.2" />
        <path
          d={`M ${f(racketFrom.x - 2)} ${f(racketFrom.y - 2)} Q ${f(racketFrom.x + 3)} ${f(racketFrom.y)} ${f(racketFrom.x - 2)} ${f(racketFrom.y + 2)}`}
          stroke="#ffffff"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Synthetic Perforated Grip Handle with Grip Wrap Ridges */}
        <line
          x1={f(racketFrom.x)}
          y1={f(racketFrom.y)}
          x2={f(racketHead.x)}
          y2={f(racketHead.y)}
          stroke="#0f172a"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <line
          x1={f(racketFrom.x)}
          y1={f(racketFrom.y)}
          x2={f(racketHead.x)}
          y2={f(racketHead.y)}
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Brand Rubber Collar Band */}
        <circle
          cx={f(racketFrom.x + (racketHead.x - racketFrom.x) * 0.35)}
          cy={f(racketFrom.y + (racketHead.y - racketFrom.y) * 0.35)}
          r="2.4"
          fill={themeColor}
        />
        {/* Flared Pro Butt Cap */}
        <circle
          cx={f(racketFrom.x)}
          cy={f(racketFrom.y)}
          r="3.5"
          fill="#0f172a"
          stroke="#ffffff"
          strokeWidth="1.2"
        />

        {/* Aerodynamic Carbon Graphite Racket Head with 3D Foreshortening */}
        <g transform={`rotate(${angle} ${f(racketHead.x)} ${f(racketHead.y)})`}>
          {/* Dual-Beam Aerodynamic Throat Yoke */}
          <path
            d={`M ${f(racketHead.x - 22)} ${f(racketHead.y)} 
               L ${f(racketHead.x - 14)} ${f(racketHead.y - 7.5)} 
               M ${f(racketHead.x - 22)} ${f(racketHead.y)} 
               L ${f(racketHead.x - 14)} ${f(racketHead.y + 7.5)}`}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Bridge Cross Piece */}
          <line
            x1={f(racketHead.x - 14)}
            y1={f(racketHead.y - 7.5)}
            x2={f(racketHead.x - 14)}
            y2={f(racketHead.y + 7.5)}
            stroke={themeColor}
            strokeWidth="2"
          />

          {/* Outer Graphite Frame Bevel with 3D Foreshortened Minor Axis */}
          <ellipse
            cx={f(racketHead.x)}
            cy={f(racketHead.y)}
            rx="23"
            ry={f(hoopRy)}
            fill="rgba(15,23,42,0.6)"
            stroke="#ffffff"
            strokeWidth="2.8"
            style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }}
          />
          {/* Inner Accent Channel */}
          <ellipse
            cx={f(racketHead.x)}
            cy={f(racketHead.y)}
            rx="21.5"
            ry={f(hoopRy - 1.5)}
            fill="none"
            stroke={themeColor}
            strokeWidth="1.2"
            opacity="0.9"
          />

          {/* 16x19 High-Density String Grid */}
          {[-10, -5, 0, 5, 10].map((offset) => (
            <line
              key={`m-${offset}`}
              x1={f(racketHead.x - 19)}
              y1={f(racketHead.y + offset * (hoopRy / 16))}
              x2={f(racketHead.x + 19)}
              y2={f(racketHead.y + offset * (hoopRy / 16))}
              stroke="#ffffff"
              strokeWidth="0.8"
              opacity="0.75"
            />
          ))}
          {[-14, -7, 0, 7, 14].map((offset) => (
            <line
              key={`c-${offset}`}
              x1={f(racketHead.x + offset)}
              y1={f(racketHead.y - hoopRy * 0.85)}
              x2={f(racketHead.x + offset)}
              y2={f(racketHead.y + hoopRy * 0.85)}
              stroke="#ffffff"
              strokeWidth="0.8"
              opacity="0.75"
            />
          ))}

          {/* Rubber Vibration Dampener at 6 o'clock */}
          <circle
            cx={f(racketHead.x - 12)}
            cy={f(racketHead.y)}
            r="2.2"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="0.8"
          />
        </g>
      </g>

      {/* Target Joint Callout Dial */}
      {active ? (
        <circle cx={f(active.x)} cy={f(active.y)} r="9" fill="none" stroke="#fb7185" strokeWidth="2.5" opacity="0.9" />
      ) : null}
      {active && target ? (
        <>
          <line
            x1={f(active.x)}
            y1={f(active.y)}
            x2={f(target.x)}
            y2={f(target.y)}
            stroke="#fb7185"
            strokeWidth="2"
            strokeDasharray="4 2"
            markerEnd={`url(#arrow-${idPrefix})`}
          />
          <circle cx={f(target.x)} cy={f(target.y)} r="5" fill="#fb7185" opacity="0.95" />
          {targetLabel ? (
            <text x={f(target.x + 8)} y={f(target.y + 4)} fill="#fb7185" fontSize="10" fontWeight="bold">
              {targetLabel}
            </text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

export default HumanSilhouette;
