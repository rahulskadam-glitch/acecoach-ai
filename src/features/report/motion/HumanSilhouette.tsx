"use client";

import type { JointName, Point, Pose } from "./motion-model";

export type SilhouetteStyle = "male" | "female" | "neutral";

type Props = {
  pose: Pose;
  style?: SilhouetteStyle;
  dominantSide: "left" | "right";
  color: string;
  outline: string;
  opacity?: number;
  label: string;
  swingPath?: Point[];
  activeJoint?: JointName;
  targetPoint?: Point | null;
  targetLabel?: string;
};

const WIDTH = 360;
const HEIGHT = 250;

function map(point: Point) { return { x: point.x * WIDTH, y: point.y * HEIGHT }; }
function midpoint(a: Point, b: Point) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function extendedPoint(from: Point, through: Point, distance: number) {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 0.001);
  return { x: through.x + (dx / length) * distance, y: through.y + (dy / length) * distance };
}

function profile(style: SilhouetteStyle) {
  if (style === "male") return { shoulder: 1.08, waist: 0.78, hip: 0.88, head: 15.2, arm: [10.5, 7.2], leg: [15.5, 10.2] } as const;
  if (style === "female") return { shoulder: 0.96, waist: 0.72, hip: 1.02, head: 14.7, arm: [9.2, 6.4], leg: [14.5, 9.4] } as const;
  return { shoulder: 1, waist: 0.76, hip: 0.94, head: 14.9, arm: [9.8, 6.8], leg: [15, 9.8] } as const;
}

function taperedPolygon(a: Point, b: Point, startWidth: number, endWidth: number) {
  const start = map(a);
  const end = map(b);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Math.hypot(dx, dy), 0.001);
  const nx = -dy / length;
  const ny = dx / length;
  return [
    `${start.x + nx * startWidth},${start.y + ny * startWidth}`,
    `${end.x + nx * endWidth},${end.y + ny * endWidth}`,
    `${end.x - nx * endWidth},${end.y - ny * endWidth}`,
    `${start.x - nx * startWidth},${start.y - ny * startWidth}`,
  ].join(" ");
}

function TaperedLimb({ a, b, startWidth, endWidth, color, opacity, outline }: { a: Point; b: Point; startWidth: number; endWidth: number; color: string; opacity: number; outline: string }) {
  const start = map(a);
  const end = map(b);
  return <g><polygon points={taperedPolygon(a, b, startWidth, endWidth)} fill={color} opacity={opacity} stroke={outline} strokeWidth="0.7" strokeLinejoin="round" /><circle cx={start.x} cy={start.y} r={startWidth} fill={color} opacity={opacity} /><circle cx={end.x} cy={end.y} r={endWidth} fill={color} opacity={opacity} /></g>;
}

export default function HumanSilhouette({ pose, style = "neutral", dominantSide, color, outline, opacity = 0.58, label, swingPath = [], activeJoint, targetPoint, targetLabel }: Props) {
  const body = profile(style);
  const leftShoulder = map(pose.left_shoulder);
  const rightShoulder = map(pose.right_shoulder);
  const leftHip = map(pose.left_hip);
  const rightHip = map(pose.right_hip);
  const head = map(pose.head);
  const neck = map(midpoint(pose.left_shoulder, pose.right_shoulder));
  const shoulderWidth = Math.max(Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y), 42);
  const hipWidth = Math.max(Math.hypot(rightHip.x - leftHip.x, rightHip.y - leftHip.y), 30);
  const waistLeft = { x: leftShoulder.x * 0.35 + leftHip.x * 0.65, y: leftShoulder.y * 0.35 + leftHip.y * 0.65 };
  const waistRight = { x: rightShoulder.x * 0.35 + rightHip.x * 0.65, y: rightShoulder.y * 0.35 + rightHip.y * 0.65 };
  const torsoPath = `M ${leftShoulder.x - shoulderWidth * 0.035 * body.shoulder} ${leftShoulder.y}
    Q ${waistLeft.x - shoulderWidth * 0.055 * body.waist} ${waistLeft.y} ${leftHip.x - hipWidth * 0.085 * body.hip} ${leftHip.y + 4}
    Q ${(leftHip.x + rightHip.x) / 2} ${Math.max(leftHip.y, rightHip.y) + 18} ${rightHip.x + hipWidth * 0.085 * body.hip} ${rightHip.y + 4}
    Q ${waistRight.x + shoulderWidth * 0.055 * body.waist} ${waistRight.y} ${rightShoulder.x + shoulderWidth * 0.035 * body.shoulder} ${rightShoulder.y}
    Q ${neck.x} ${neck.y - 4} ${leftShoulder.x - shoulderWidth * 0.035 * body.shoulder} ${leftShoulder.y} Z`;

  const hitElbow = pose[`${dominantSide}_elbow` as JointName];
  const hitWrist = pose[`${dominantSide}_wrist` as JointName];
  const racketTip = extendedPoint(hitElbow, hitWrist, 0.14);
  const racketCenter = extendedPoint(hitElbow, hitWrist, 0.105);
  const racketFrom = map(hitWrist);
  const racketTo = map(racketTip);
  const racketHead = map(racketCenter);
  const angle = Math.atan2(racketTo.y - racketFrom.y, racketTo.x - racketFrom.x) * 180 / Math.PI;
  const active = activeJoint ? map(pose[activeJoint]) : null;
  const target = targetPoint ? map(targetPoint) : null;
  const key = label.replace(/\W/g, "");

  return <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="h-full w-full">
    <defs><marker id={`arrow-${key}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#fb7185" /></marker></defs>
    <ellipse cx="180" cy="236" rx="92" ry="7" fill="rgba(15,23,42,.62)" />
    {swingPath.length > 1 ? <path d={swingPath.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * WIDTH} ${point.y * HEIGHT}`).join(" ")} fill="none" stroke={outline} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="7 7" opacity="0.68" /> : null}

    <g>
      <TaperedLimb a={pose.left_hip} b={pose.left_knee} startWidth={body.leg[0]} endWidth={body.leg[0] * 0.78} color={color} opacity={opacity} outline={outline} />
      <TaperedLimb a={pose.left_knee} b={pose.left_ankle} startWidth={body.leg[0] * 0.72} endWidth={body.leg[1]} color={color} opacity={opacity} outline={outline} />
      <TaperedLimb a={pose.right_hip} b={pose.right_knee} startWidth={body.leg[0]} endWidth={body.leg[0] * 0.78} color={color} opacity={opacity} outline={outline} />
      <TaperedLimb a={pose.right_knee} b={pose.right_ankle} startWidth={body.leg[0] * 0.72} endWidth={body.leg[1]} color={color} opacity={opacity} outline={outline} />
      {["left", "right"].map((side) => { const foot = map(pose[`${side}_ankle` as JointName]); return <ellipse key={side} cx={foot.x + 7} cy={foot.y + 3} rx="19" ry="6.5" fill={color} opacity={opacity} stroke={outline} strokeWidth="0.7" transform={`rotate(-7 ${foot.x} ${foot.y})`} />; })}

      <path d={torsoPath} fill={color} opacity={opacity} stroke={outline} strokeWidth="1" />
      <path d={`M ${leftHip.x - 7} ${leftHip.y - 1} Q ${(leftHip.x + rightHip.x) / 2} ${leftHip.y + 14} ${rightHip.x + 7} ${rightHip.y - 1} L ${rightHip.x + 12} ${rightHip.y + 13} Q ${(leftHip.x + rightHip.x) / 2} ${rightHip.y + 22} ${leftHip.x - 12} ${leftHip.y + 13} Z`} fill={color} opacity={opacity} stroke={outline} strokeWidth="0.8" />
      <path d={`M ${neck.x - 7} ${neck.y - 2} L ${head.x - 6} ${head.y + body.head - 2} L ${head.x + 6} ${head.y + body.head - 2} L ${neck.x + 7} ${neck.y - 2} Z`} fill={color} opacity={opacity} />
      <ellipse cx={head.x} cy={head.y} rx={body.head * 0.82} ry={body.head} fill={color} opacity={Math.min(opacity + 0.08, 0.82)} stroke={outline} strokeWidth="0.8" />
      {style === "female" ? <path d={`M ${head.x + 6} ${head.y - 8} Q ${head.x + 21} ${head.y + 3} ${head.x + 11} ${head.y + 20}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" opacity={opacity} /> : null}

      <TaperedLimb a={pose.left_shoulder} b={pose.left_elbow} startWidth={body.arm[0]} endWidth={body.arm[0] * 0.72} color={color} opacity={opacity} outline={outline} />
      <TaperedLimb a={pose.left_elbow} b={pose.left_wrist} startWidth={body.arm[0] * 0.68} endWidth={body.arm[1]} color={color} opacity={opacity} outline={outline} />
      <TaperedLimb a={pose.right_shoulder} b={pose.right_elbow} startWidth={body.arm[0]} endWidth={body.arm[0] * 0.72} color={color} opacity={opacity} outline={outline} />
      <TaperedLimb a={pose.right_elbow} b={pose.right_wrist} startWidth={body.arm[0] * 0.68} endWidth={body.arm[1]} color={color} opacity={opacity} outline={outline} />
    </g>

    <g opacity="0.86"><line x1={racketFrom.x} y1={racketFrom.y} x2={racketTo.x} y2={racketTo.y} stroke={outline} strokeWidth="5" strokeLinecap="round" /><g transform={`rotate(${angle} ${racketHead.x} ${racketHead.y})`}><ellipse cx={racketHead.x} cy={racketHead.y} rx="24" ry="33" fill="rgba(2,6,23,.20)" stroke={outline} strokeWidth="3.5" />{[-10, 0, 10].map((offset) => <line key={`v-${offset}`} x1={racketHead.x + offset} y1={racketHead.y - 28} x2={racketHead.x + offset} y2={racketHead.y + 28} stroke={outline} strokeWidth="0.8" opacity="0.5" />)}{[-14, -5, 5, 14].map((offset) => <line key={`h-${offset}`} x1={racketHead.x - 19} y1={racketHead.y + offset} x2={racketHead.x + 19} y2={racketHead.y + offset} stroke={outline} strokeWidth="0.8" opacity="0.5" />)}</g></g>

    {active ? <circle cx={active.x} cy={active.y} r="10" fill="none" stroke="#fb7185" strokeWidth="3.5" opacity="0.9" /> : null}
    {active && target ? <><line x1={active.x} y1={active.y} x2={target.x} y2={target.y} stroke="#fb7185" strokeWidth="3.5" strokeDasharray="6 5" markerEnd={`url(#arrow-${key})`} /><circle cx={target.x} cy={target.y} r="8" fill="rgba(52,211,153,.16)" stroke="#34d399" strokeWidth="2.5" />{targetLabel ? <text x={Math.min(target.x + 10, WIDTH - 110)} y={Math.max(target.y - 10, 18)} fill="#f8fafc" fontSize="12" fontWeight="600">{targetLabel}</text> : null}</> : null}
  </svg>;
}
