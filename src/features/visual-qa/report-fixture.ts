import type { AnalysisReport, BiomechanicalProfile } from "@/modules/analysis/types";

const fixturePhases = [
  ["ready", "Ready Position", 12, ["SCI-ELLIOTT-2006", "SCI-KOVACS-2011"]],
  ["unit_turn", "Unit Turn", 7, ["SCI-ELLIOTT-2006", "SCI-FILIPCIC-2017-SPLITSTEP", "VID-MOURATOGLOU-FOOTWORK"]],
  ["backswing", "Backswing", 27, ["SCI-HE-2022-FOREHAND-LOWER-LIMB", "SCI-LANDLINGER-2010", "SCI-KOVACS-2011"]],
  ["forward_swing_contact", "Forward Swing & Contact", 40, ["SCI-ELLIOTT-2006", "SCI-GENEVOIS-2015", "SCI-STEPien-2011", "SCI-LANDLINGER-2010", "SCI-REID-BH-2002", "SCI-CHOW-2007", "SCI-FURUYA-2021", "SCI-BRITO-2024"]],
  ["follow_through", "Follow-Through", 8, ["SCI-ELLIOTT-2006", "ORG-ITF-SKILL-PHASES-2023"]],
  ["recovery", "Recovery", 8, ["ORG-ITF-SKILL-PHASES-2023", "SCI-FILIPCIC-2017-SPLITSTEP"]],
] as const;
const readyLabels = ["Ready base width", "Left knee angle", "Right knee angle", "Left hip angle", "Right hip angle", "Upper-body lean", "Head-to-balance offset", "Shoulder–hip separation", "Hand separation", "Hitting elbow angle", "Hitting shoulder angle", "Support shoulder angle"];
let fixtureMetricNumber = 0;
const fixtureMetrics = fixturePhases.flatMap(([phase, phaseLabel, count]) => Array.from({ length: count }, (_, index) => {
  fixtureMetricNumber += 1;
  const available = fixtureMetricNumber % 17 !== 0;
  const label = phase === "ready" ? readyLabels[index] : `${phaseLabel} check ${index + 1}`;
  return {
    id: `fixture_metric_${fixtureMetricNumber}`,
    label,
    phase,
    region: "whole_body",
    value: available ? 62 + index * 1.7 : null,
    displayValue: available ? `${(62 + index * 1.7).toFixed(1)}°` : "Unavailable",
    unit: "degrees",
    status: available ? "available" as const : "unavailable" as const,
    confidence: available ? 0.72 : 0,
    measurementBasis: index % 3 === 0 ? "world_pose_angle_proxy" : "image_plane_orientation_proxy",
    playerMeaning: `What the ${label.toLowerCase()} looked like during this part of the stroke.`,
  };
}));
const fixtureBiomechanicalProfile: BiomechanicalProfile = {
  version: "acecoach-kinematic-profile-v3.0.0",
  actionType: "two_handed_backhand",
  metricCount: fixtureMetrics.length,
  availableMetricCount: fixtureMetrics.filter((metric) => metric.status === "available").length,
  unavailableMetricCount: fixtureMetrics.filter((metric) => metric.status === "unavailable").length,
  measurementStatement: `${fixtureMetrics.length} transparent pose-kinematic checks across six movement phases, each grounded in cited tennis biomechanics research.`,
  phases: fixturePhases.map(([id, label, metricCount, sourceIds]) => ({
    id,
    label,
    score: 78,
    metricCount,
    availableMetricCount: fixtureMetrics.filter((metric) => metric.phase === id && metric.status === "available").length,
    confidence: 0.72,
    sourceIds: [...sourceIds],
    coachingCue: `Move smoothly through ${label.toLowerCase()}.`,
    whatIsMeasured: `Pose-estimated body positioning and timing during ${label.toLowerCase()}.`,
    checkpoints: [
      {
        bodyPart: "Feet & knees",
        areaId: "footwork_base",
        target: "Stay balanced and organized through the movement.",
        cameraBoundary: null,
      },
      {
        bodyPart: "Hands & racket",
        areaId: "backlift_preparation",
        target: "Maintain space and control with a stable setup.",
        cameraBoundary: "Exact grip and ball tracking require dedicated sensors.",
      },
    ],
    benchmarkDescription: `What best-in-class technique looks like during ${label.toLowerCase()}.`,
    commonMistakeTitles: [],
  })),
  linkages: [
    ["base", "Base", "knees", "Knees", "connected"],
    ["knees", "Knees", "hips", "Hips", "connected"],
    ["hips", "Hips", "pelvis", "Hip turn", "connected"],
    ["pelvis", "Hip turn", "shoulders", "Shoulder turn", "delayed_transfer"],
    ["shoulders", "Shoulder turn", "elbow", "Hitting elbow", "connected"],
    ["elbow", "Hitting elbow", "wrist", "Hitting hand", "connected"],
  ].map(([sourceId, sourceLabel, targetId, targetLabel, status], index) => ({
    id: `${sourceId}_to_${targetId}`,
    source: { id: sourceId, label: sourceLabel, peakTimestampSeconds: 1.1 + index * 0.08 },
    target: { id: targetId, label: targetLabel, peakTimestampSeconds: 1.18 + index * 0.08 },
    gapSeconds: status === "delayed_transfer" ? 0.28 : 0.08,
    status: status as "connected" | "delayed_transfer",
    confidence: 0.68,
    explanation: status === "connected" ? `${targetLabel} followed ${sourceLabel} by about 80 ms.` : `The transfer from ${sourceLabel} to ${targetLabel} took about 280 ms.`,
  })),
  connectedLinkCount: 5,
  linkCount: 6,
  metrics: fixtureMetrics,
};

const fixtureBodyRegionReview = [
  { id: "head", title: "Head & eyes", status: "priority" as const, coachNote: "Your head drifts as the stroke enters the likely contact window. Keep the chin over the shoulder and let both arms complete the shot before the eyes leave.", whyItMatters: "A quieter head makes timing, balance, and direction easier to repeat.", cue: "Chin over the shoulder; see it through.", phase: "contact", timestampSeconds: 2.4, measurementStatus: "video_estimate" as const, evidence: [{ id: "head", label: "Head stability", displayValue: "0.18 widths", confidence: 0.88, measurementBasis: "pose_kinematic_proxy" }] },
  { id: "hands", title: "Hands & contact space", status: "strength" as const, coachNote: "Your hands preserve useful space from the torso through the likely strike window.", whyItMatters: "Space lets both arms travel through the ball instead of being rescued by a cramped hand path.", cue: "Arms away. Meet it in front.", phase: "contact", timestampSeconds: 2.4, measurementStatus: "video_estimate" as const, evidence: [{ id: "hands", label: "Hitting-hand space", displayValue: "1.24 widths", confidence: 0.84, measurementBasis: "pose_kinematic_proxy" }] },
  { id: "grip", title: "Grip & racket face", status: "needs_confirmation" as const, coachNote: "I cannot identify your grip or racket-face angle reliably from body landmarks alone. Confirm the grip or record a closer side view of the hand and handle.", whyItMatters: "Grip changes contact height, arm shape, spin window, and racket-face behavior.", cue: "Confirm your grip before the next set.", phase: "contact", timestampSeconds: 2.4, measurementStatus: "athlete_confirmation" as const, evidence: [] },
  { id: "backlift", title: "Shoulders & backlift", status: "strength" as const, coachNote: "You organize the shoulder coil early enough to create time before the forward swing.", whyItMatters: "Early preparation gives the feet and arms time to find the ball without rushing.", cue: "Coil, pivot, then move.", phase: "preparation", timestampSeconds: 1.05, measurementStatus: "video_estimate" as const, evidence: [{ id: "turn", label: "Shoulder-line turn", displayValue: "36°", confidence: 0.91, measurementBasis: "image_plane_rotation_proxy" }] },
  { id: "hips", title: "Hips & weight transfer", status: "developing" as const, coachNote: "Your hips contribute, but the transfer reaches the shoulders later than the rest of the chain.", whyItMatters: "A connected transfer shares the work across the body and keeps the hand from forcing speed.", cue: "Load first. Transfer through the shot.", phase: "loading", timestampSeconds: 1.45, measurementStatus: "video_estimate" as const, evidence: [{ id: "hips", label: "Hip-line movement", displayValue: "18°", confidence: 0.82, measurementBasis: "image_plane_rotation_proxy" }] },
  { id: "knees", title: "Knees: load then drive", status: "developing" as const, coachNote: "You create a useful knee bend. Treat that as the load, hold it into the strike window, then drive upward and forward into the finish.", whyItMatters: "The bend and the drive are separate events; connecting them keeps the arms from creating all the speed.", cue: "Load first. Drive through second.", phase: "loading", timestampSeconds: 1.45, measurementStatus: "video_estimate" as const, evidence: [{ id: "knee", label: "Hitting-side knee", displayValue: "126°", confidence: 0.87, measurementBasis: "world_pose_angle_proxy" }] },
  { id: "feet", title: "Feet & hitting base", status: "priority" as const, coachNote: "The base becomes less functional as you arrive at the ball. Use the first turn to pivot, then move and set before the strike.", whyItMatters: "Efficient movement creates time and prevents a last-second upper-body rescue.", cue: "Split, pivot, move, set.", phase: "preparation", timestampSeconds: 0.7, measurementStatus: "video_estimate" as const, evidence: [{ id: "base", label: "Ready base width", displayValue: "1.18 widths", confidence: 0.89, measurementBasis: "pose_kinematic_proxy" }] },
  { id: "finish", title: "Finish & body balance", status: "priority" as const, coachNote: "The hand path shortens before the recovery step. Swing through the intended line, let the finish develop naturally for the ball, then reset.", whyItMatters: "A complete release supports the swing path and gives the feet a cleaner recovery signal.", cue: "Through first, finish free, recover.", phase: "follow_through", timestampSeconds: 3.15, measurementStatus: "video_estimate" as const, evidence: [{ id: "finish", label: "Head movement after contact", displayValue: "0.16 widths", confidence: 0.85, measurementBasis: "pose_kinematic_proxy" }] },
];

const fixtureCoachingEvidence: AnalysisReport["evidence"] = [{
  id: "athlete-supplied-complete-stroke-guide",
  title: "The Complete Tennis Stroke Technical Guide",
  organization: "Athlete-supplied coaching and biomechanics synthesis",
  year: 2026,
  level: "coach_consensus",
  scope: ["forehand", "one_handed_backhand", "two_handed_backhand", "slice", "serve", "forehand_volley", "backhand_volley", "overhead", "kinetic_chain"],
  use: "Supplies the stroke-specific phase and body-link rubric for every supported tennis stroke while keeping racket, ball, force, and grip claims confirmation-only.",
}, {
  id: "athlete-supplied-backhand-phase-rubric",
  title: "Two-Handed Backhand — Full Technical Breakdown",
  organization: "Athlete-supplied coaching synthesis",
  year: 2026,
  level: "coach_consensus",
  scope: ["two_handed_backhand", "phase_model", "head_control", "knee_loading", "knee_extension", "non_dominant_hand"],
  use: "Adds the seven-phase body-part rubric while keeping force, grip, racket, and ball claims confirmation-only.",
}, ...[
  ["venus-williams-backhand-fundamentals", "How To Hit A Tennis Backhand With Venus Williams", "Venus Williams", 2023, "https://www.youtube.com/watch?v=5M52JoEDtwY"],
  ["mouratoglou-fluid-backhand", "7 Steps to a Fluid Two-Handed Backhand", "Patrick Mouratoglou", 2021, "https://www.youtube.com/watch?v=WNnW9Dd2vMY"],
  ["top-tennis-training-three-step-backhand", "Perfect Two Handed Backhand in 3 Steps", "Top Tennis Training", 2024, "https://www.youtube.com/watch?v=i1k8MLOsOwI"],
  ["coach-adri-two-handed-backhand-masterclass", "Two-handed Backhand Masterclass by ATP Coach Adri", "Tennisnerd / ATP Coach Adri", 2025, "https://www.youtube.com/watch?v=X5YFyzx50CQ"],
  ["nathan-pasha-five-step-backhand", "Five Steps to an ATP Two-Handed Backhand", "Crunch Time Coaching / Nathan Pasha", 2021, "https://www.youtube.com/watch?v=6cdC2cHfd28"],
  ["tennis-tv-atp-backhand-variations", "Analysing ATP Tennis Players' Two-Handed Backhands", "Tennis TV", 2021, "https://www.youtube.com/watch?v=xXw7ZZfdy7w"],
].map(([id, title, organization, year, url]) => ({ id: String(id), title: String(title), organization: String(organization), year: Number(year), url: String(url), level: "public_coaching_reference" as const, scope: ["two_handed_backhand"], use: "Informs context-aware two-handed backhand coaching language without changing the measured score." }))];

const fixtureFrames = Array.from({ length: 121 }, (_, frameIndex) => {
  const progress = frameIndex / 120;
  const swing = Math.sin(progress * Math.PI);
  const turn = Math.sin(Math.min(1, progress * 1.7) * Math.PI) * 0.035;
  return {
    frameIndex,
    timestampSeconds: frameIndex / 30,
    visibility: 0.94,
    elbowAngle: 112 + progress * 35,
    dominantElbowAngle: 112 + progress * 35,
    shoulderAngle: 72 + progress * 18,
    kneeAngle: 148 - swing * 24,
    dominantKneeAngle: 148 - swing * 24,
    oppositeKneeAngle: 151 - swing * 18,
    shoulderPelvisSeparation: 8 + swing * 22,
    baseWidthNormalized: 1.18,
    wristSpeedNormalizedPerSecond: swing * 3.6,
    centerOfMass: { x: 0.50 + turn * 0.3, y: 0.57 + swing * 0.015 },
    keyLandmarks: {
      nose: { x: 0.50 + turn * 0.15, y: 0.17, visibility: 0.97 },
      left_shoulder: { x: 0.42 - turn, y: 0.33, visibility: 0.96 },
      right_shoulder: { x: 0.58 + turn, y: 0.34, visibility: 0.96 },
      left_elbow: { x: 0.39 - turn, y: 0.47, visibility: 0.95 },
      right_elbow: { x: 0.58 + progress * 0.11, y: 0.46 - swing * 0.08, visibility: 0.95 },
      left_wrist: { x: 0.39, y: 0.57, visibility: 0.94 },
      right_wrist: { x: 0.41 + progress * 0.32, y: 0.53 - swing * 0.18, visibility: 0.94 },
      left_hip: { x: 0.45 - turn * 0.45, y: 0.57, visibility: 0.96 },
      right_hip: { x: 0.55 + turn * 0.45, y: 0.57, visibility: 0.96 },
      left_knee: { x: 0.44, y: 0.75 + swing * 0.015, visibility: 0.95 },
      right_knee: { x: 0.57, y: 0.75 + swing * 0.02, visibility: 0.95 },
      left_ankle: { x: 0.40, y: 0.93, visibility: 0.95 },
      right_ankle: { x: 0.62, y: 0.93, visibility: 0.95 },
    },
  };
});

export const visualQaReport: AnalysisReport = {
  overallScore: 78,
  scoreStatus: "provisional_criterion_index",
  scoreLabel: "Technique execution index",
  confidence: 0.91,
  captureQuality: { score: 88, grade: "good", positives: ["Full athlete visible", "Stable camera"], limitations: [] },
  qualityGate: { status: "passed", capturePassed: true, movementConfirmed: true, sportSupported: true, repetitionDetected: true, repetitionCount: 4, minimumRepetitionsForScore: 2, canUseTechniqueScore: true, messages: [] },
  phaseScores: ["Preparation", "Load", "Swing", "Contact", "Finish", "Recovery"].map((label, index) => ({ id: label.toLowerCase(), label, score: 74 + index, note: "Measured from the clearest repetition.", confidence: 0.88, basis: "measured in image plane" })),
  metricScores: [{ id: "turn_timing", label: "Shoulder-turn timing", score: 68, explanation: "Preparation begins later than the next target.", confidence: 0.91, basis: "estimated proxy" }],
  strengths: [
    { title: "Organized preparation", evidence: "The shoulder coil is organized before the forward swing.", frameIndex: 32, timestampSeconds: 1.05, confidence: 0.91 },
    { title: "Useful contact space", evidence: "The hitting hand keeps useful space from the torso at the likely contact frame.", frameIndex: 72, timestampSeconds: 2.4, confidence: 0.88 },
  ],
  priorities: [
    { rank: 1, title: "Keep the head quieter through contact", finding: "The head moves as the stroke enters the likely contact window.", impact: "Extra movement makes timing and direction harder to repeat.", nextStep: "Keep the chin over the shoulder until both arms complete the strike.", cue: "Chin over the shoulder; see it through", frameIndex: 72, timestampSeconds: 2.4, confidence: 0.91, measurementBasis: "estimated proxy" },
    { rank: 2, title: "Swing through, then recover", finding: "The hand path shortens before the first recovery step.", impact: "A complete release supports the intended swing path and prepares the next movement.", nextStep: "Let the non-dominant side carry through the intended line before the finish develops.", cue: "Through first, finish free, recover", frameIndex: 96, timestampSeconds: 3.2, confidence: 0.84, measurementBasis: "estimated proxy" },
    { rank: 3, title: "Build a more usable hitting base", finding: "The base becomes less functional as the player arrives at the ball.", impact: "Efficient movement creates time and reduces upper-body compensation.", nextStep: "Pivot, move, set, strike, and recover.", cue: "Split, pivot, move, set", frameIndex: 21, timestampSeconds: 0.7, confidence: 0.86, measurementBasis: "estimated proxy" },
  ],
  drills: [
    { id: "quiet_head", name: "Chin-over-shoulder contact rehearsal", purpose: "Keep the visual and postural reference steady through the hit.", cue: "Chin over the shoulder; see it through", dosage: "3 sets of 10 controlled backhands", successMetric: "Keep the head quiet through 8 of 10 backhands", regression: "Shadow the stroke without a ball", progression: "Add a gentle cross-court feed" },
    { id: "finish_recover", name: "Swing-through, finish, and recover", purpose: "Carry the two-handed swing through its intended line before the first recovery step.", cue: "Through first, finish free, recover", dosage: "3 sets of 8 fed balls", successMetric: "Swing through and recover in balance in 8 of 10 repetitions", regression: "Start from the power position", progression: "Alternate backhand and recovery targets" },
    { id: "split_pivot_move", name: "Split-pivot-move backhand sequence", purpose: "Connect the first turn to efficient movement and a functional base.", cue: "Split, pivot, move, set", dosage: "3 sets of 6 movement patterns", successMetric: "Arrive balanced before 8 of 10 swings", regression: "Rehearse without a racket", progression: "Add a live directional feed" },
  ],
  nextSession: { objective: "Quieter head through contact", recordingPlan: "Record again after two focused sessions from the same camera position.", successCriteria: ["Keep the head quiet through contact in eight of ten controlled backhands."], sessionPlan: [{ block: "Warm-up", duration: "5 min", focus: "Chin-over-shoulder shadow swings" }] },
  coachSummary: {
    headline: "Build the complete two-handed backhand",
    strongestQuality: "Preparation and contact space give the stroke a usable foundation.",
    mainPriority: "Keep the head quieter through contact.",
    whyItMatters: "Stable visual and postural control makes the forward swing easier to repeat.",
    practiceFocus: ["Chin over the shoulder; see it through."],
    contextStatement: "Read as a neutral rally ball with an intention of depth.",
    coachVerdict: "Your preparation gives you time. Keep your head quieter through contact.",
    pyramidSummary: {
      headline: "Your preparation gives you time. Keep your head quieter through contact.",
      bottomLine: "Your two-handed backhand already shows organized preparation and useful contact space. First, keep your head quieter through contact. Then improve the finish, recovery, and hitting base.",
      synthesisNote: "This answer combines the full-video pattern, phase timing, body-position estimates, repetition evidence, and the available biomechanical checks. It leaves out anything the camera cannot support.",
      strengths: [
        { id: "strength-1", title: "Your preparation gives you time", summary: "You organize the shoulder turn before the forward swing.", whyItMatters: "Early preparation gives the feet and arms time to find the ball.", timestampSeconds: 1.05, bodyRegionId: "backlift", phase: "preparation" },
        { id: "strength-2", title: "You create useful contact space", summary: "The hands have room to travel through the likely strike window.", whyItMatters: "Space preserves the swing corridor.", timestampSeconds: 2.4, bodyRegionId: "hands", phase: "contact" },
      ],
      improvements: [
        { id: "improvement-1", title: "Keep your head quieter through contact", summary: "Keep the eyes and head quieter while both arms complete the shot.", whyItMatters: "This makes timing and direction more repeatable.", cue: "Chin over the shoulder; see it through.", timestampSeconds: 2.4, bodyRegionId: "head", phase: "contact" },
        { id: "improvement-2", title: "Swing through, then recover", summary: "Let the non-dominant side carry through the intended line before the finish develops.", whyItMatters: "A complete release supports the swing path and the next movement.", cue: "Through first, finish free, recover.", timestampSeconds: 3.15, bodyRegionId: "finish", phase: "follow_through" },
        { id: "improvement-3", title: "Build a more usable hitting base", summary: "Pivot, move, set the base, strike, and recover.", whyItMatters: "Efficient movement creates time and prevents last-second upper-body compensation.", cue: "Split, pivot, move, set.", timestampSeconds: 0.7, bodyRegionId: "feet", phase: "preparation" },
      ],
      firstAction: { title: "Keep your head quieter through contact", reason: "Stable visual and postural control makes the forward swing easier to repeat.", cue: "Chin over the shoulder; see it through.", drillName: "Chin-over-shoulder contact rehearsal", successMetric: "Keep the head quiet through 8 of 10 controlled backhands." },
      framework: [
        { id: "backhand-preparation", step: 1, label: "Preparation", title: "Coil early and move to the ball", status: "priority", summary: "Organize the grip change, shoulder coil, pivot, and movement before the forward swing. Set the racket head above the hands during this early preparation.", coachCue: "Turn early. Racket head above the hands.", cameraBoundary: "Grip change and exact racket-head position need a clear hand-and-racket view.", checks: [
          { id: "early-coil", label: "Early shoulder coil", status: "working", finding: "The turn is organized before the forward swing." },
          { id: "pivot-move", label: "Pivot and adjustment steps", status: "priority", finding: "The arrival base needs a quicker pivot, movement, and set sequence." },
          { id: "two-hands-together", label: "Both hands organize together", status: "confirm", finding: "Confirm the top and bottom hands complete the grip organization together during the first unit turn.", cameraBoundary: "Body landmarks do not identify bevels or the exact grip-change moment." },
          { id: "racket-organized", label: "Racket above the hands", status: "confirm", finding: "Confirm the racket is organized above the hands before it drops.", cameraBoundary: "Racket tracking is not available in this recording." },
          { id: "preparation-head-hold", label: "Head stays quiet during the turn", status: "working", finding: "Early head-movement range stays controlled through the unit turn." },
        ], timestampSeconds: 1.05, bodyRegionId: "backlift", phase: "preparation" },
        { id: "backhand-power-position", step: 2, label: "Power position & drop", title: "Load the outside leg, then let the racket drop", status: "developing", summary: "Stay lower, load the outside leg, and keep both elbows and hands away from the torso. After the Stage 1 setup above the hands, let the racket head drop below the hand line before acceleration.", coachCue: "Load. Arms away. Racket head below the hands.", cameraBoundary: "String angle and exact racket height are not measured without racket tracking.", checks: [
          { id: "outside-leg-load", label: "Back or outside-leg load", status: "developing", finding: "Stay lower and organize the back or outside leg before turning through.", cameraBoundary: "Video shows body position, not an exact weight percentage or ground force." },
          { id: "arm-space", label: "Both arms away from the torso", status: "working", finding: "The hands preserve useful room from the torso." },
          { id: "chin-shoulder", label: "Chin over the back shoulder", status: "priority", finding: "Head control needs to become quieter as the stroke approaches contact." },
          { id: "racket-drop-below-hands", label: "Racket head drops below the hand line", status: "confirm", finding: "Confirm the racket head moves from above the hands in Stage 1 to below the hand line before acceleration.", cameraBoundary: "Racket height and string angle require a clear racket-and-hand view." },
          { id: "load-hip-separation", label: "Hips organize before the release", status: "developing", finding: "Visible shoulder–hip separation is present at the load; preserve it until the forward sequence begins.", cameraBoundary: "This is an image-plane rotation proxy." },
        ], timestampSeconds: 1.45, bodyRegionId: "hips", phase: "loading" },
        { id: "backhand-contact", step: 3, label: "Contact", title: "Make space and keep the head quiet", status: "priority", summary: "After the knee-bend load, drive the legs through the swing while the top, non-dominant hand leads the path and the bottom hand guides. Keep the head quiet and preserve room for both arms.", coachCue: "Load, drive, top hand through. Keep the head quiet.", cameraBoundary: "Exact contact, hand force, and racket-face angle require additional sensing.", checks: [
          { id: "knee-drive-after-load", label: "Knees drive after they load", status: "developing", finding: "The visible knee drive begins after the load; extend through rather than standing early.", cameraBoundary: "Knee angles are pose estimates, not ground-force measurements." },
          { id: "hips-lead-shoulders", label: "Hips lead the upper-body release", status: "developing", finding: "Let the hip-line movement lead the shoulder-line release.", cameraBoundary: "Image-plane turn timing is camera-dependent." },
          { id: "two-hand-roles", label: "Top hand drives; bottom hand guides", status: "confirm", finding: "The non-dominant top hand should lead the swing path while the bottom hand stabilizes and guides.", cameraBoundary: "Pose cannot measure force or grip dominance." },
          { id: "quiet-contact", label: "Quiet head through contact", status: "priority", finding: "Keep the head and upper body quieter while both arms complete the strike." },
          { id: "contact-in-front", label: "Contact space in front", status: "working", finding: "The hands preserve a useful contact-space proxy.", cameraBoundary: "This is a body-spacing proxy; exact ball contact is not detected." },
          { id: "extend-direction", label: "Extension in the intended direction", status: "working", finding: "Keep both arms connected and send the hands through the intended ball line before the finish develops." },
          { id: "contact-racket-face", label: "Racket face at contact", status: "confirm", finding: "Confirm the racket face matches the intended height, spin, and direction.", cameraBoundary: "Racket-face angle and ball response require racket and ball tracking." },
        ], timestampSeconds: 2.4, bodyRegionId: "head", phase: "contact" },
        { id: "backhand-finish-recovery", step: 4, label: "Finish & recovery", title: "Swing through, finish the elbow above the nose, and recover", status: "priority", summary: "Let the non-dominant side carry through the intended line, bring the lead elbow above the nose line, then regain the base and recover.", coachCue: "Through first. Elbow above the nose. Recover.", cameraBoundary: "The camera can estimate hand path, balance, and recovery timing, but not ball quality or the exact racket finish.", checks: [
          { id: "swing-through", label: "Hands travel through before finishing", status: "priority", finding: "Carry the hands through the intended line before allowing the racket to finish." },
          { id: "finish-knee-extension", label: "Leg drive continues into the finish", status: "developing", finding: "Extend from the earlier knee load into the follow-through.", cameraBoundary: "This is a knee-angle estimate, not a force measurement." },
          { id: "head-releases-after-contact", label: "Head releases only after contact", status: "priority", finding: "Hold the strike window, then let the eyes follow the ball." },
          { id: "lead-elbow-above-nose", label: "Lead elbow finishes above the nose line", status: "priority", finding: "For this topspin/depth pattern, let the lead elbow rise above the nose line after the hands travel through." },
          { id: "recover", label: "Balanced first recovery step", status: "priority", finding: "Complete the swing, regain the base, and make the first recovery step without rushing." },
        ], timestampSeconds: 3.15, bodyRegionId: "finish", phase: "follow_through" },
      ],
    },
  },
  performanceStory: { identity: "A two-handed backhand with organized preparation and useful contact space.", rootCauseHypothesis: "Head movement through contact is reducing repeatability.", transferRisk: "Faster feeds may shorten the finish and recovery.", nextMilestone: "A quieter head through contact in eight of ten repetitions.", coachPrinciple: "Create time, stay quiet, finish the swing." },
  visualMoments: [{ id: "priority", kind: "priority", label: "Preparation", title: "Turn begins late", explanation: "Compare the shoulder line here.", cue: "Turn before the ball arrives", frameIndex: 72, timestampSeconds: 2.4 }],
  measurementCoverage: { measured: [{ label: "2D body landmarks", detail: "Measured in the image plane." }], estimated: [{ label: "Turn timing", detail: "Estimated proxy from visible shoulder landmarks." }], unavailable: [{ label: "Force", detail: "Unavailable from this recording." }] },
  practicePlan: { title: "Quieter contact, complete finish", primaryGoal: "Keep the head quiet through contact", cue: "Chin over the shoulder; see it through", sessions: [{ id: "s1", day: "Session 1", title: "Own the contact window", duration: "15 min", objective: "Stay visually and posturally quiet", drillName: "Chin-over-shoulder contact rehearsal", dosage: "3 × 10", successMetric: "8 of 10 quiet-head contacts" }] },
  coachingPlaybook: { todayFocus: "Quieter head through contact", feelCue: "Chin over the shoulder; see it through", visualCue: "The head remains quiet until both arms complete the strike", commonCompensation: "Looking up before the swing finishes", successTest: "8 of 10", transferChallenge: "Gentle cross-court feeds", coachQuestion: "Could you see the contact window for a fraction longer?" },
  evidence: fixtureCoachingEvidence,
  safetyNote: "Stop if you feel pain or unusual discomfort.",
  limitations: ["Monocular video cannot measure force, joint loading, or precise 3D motion."],
  frameSummary: { fps: 30, frameCount: 121, processedFrameCount: 121, durationSeconds: 4, dominantSide: "right", analysisAction: "two_handed_backhand", primaryRepetitionIndex: 0, frameMetrics: fixtureFrames, biomechanicalProfile: fixtureBiomechanicalProfile, analysisContext: { cameraAngle: "side", cameraAngleLabel: "side view", shotSituation: "neutral_rally", shotSituationLabel: "neutral rally ball", shotIntent: "depth", shotIntentLabel: "depth", athleteQuestion: "How can I make my backhand more reliable?", source: "athlete_supplied", statement: "Read as a neutral rally ball with an intention of depth. These labels were supplied by the athlete; body positions and timing come from the video.", athleteHeightCm: 178, heightSource: "athlete_supplied", calibrationStatement: "Athlete-supplied height (178 cm) is used only to contextualize body-relative reach and spacing." }, athleteCalibration: { status: "height_aware", heightCm: 178, uses: ["Contextualize reach and spacing relative to the athlete", "Label the visual body model with the supplied physical scale"], limitation: "A single uncalibrated camera cannot recover exact 3D distance, ground force, joint load, or individual body proportions from height alone." }, bodyRegionReview: fixtureBodyRegionReview },
  movementTimeline: ["preparation", "loading", "acceleration", "contact_proxy", "follow_through", "recovery"].map((phase, index) => ({ phase, frameIndex: index * 20, timestampSeconds: index * 0.7, coachingFocus: phase.replaceAll("_", " ") })),
  repetitions: [{ index: 0, startFrame: 0, peakFrame: 72, endFrame: 120, startSeconds: 0, peakSeconds: 2.4, endSeconds: 4, durationSeconds: 4, peakMotion: 3.6, meanVisibility: 0.94, phaseTimeline: [] }],
  movementClassification: { detectedAction: "two_handed_backhand", detectedLabel: "Two-handed backhand", confidence: 0.94, alternatives: [], reasons: ["Confirmed by the athlete"], selectedAction: "two_handed_backhand", selectedLabel: "Two-handed backhand", mismatch: false, requiresConfirmation: false, classifierVersion: "v6", analysisAction: "two_handed_backhand", analysisActionLabel: "Two-handed backhand", decisionMode: "confirmed" },
  coachingAreas: [
    { id: "backlift_preparation", label: "Preparation and backlift timing", score: 88, status: "strength", observation: "The shoulder coil is organized before the forward swing.", coachingGoal: "Preserve this early organization while improving the later links.", cue: "Coil, pivot, then move.", whyItMatters: "Early preparation creates time for spacing and movement.", confidence: 0.91, measurementBasis: "image_plane_rotation_proxy", frameIndex: 32, timestampSeconds: 1.05 },
    { id: "body_position_head", label: "Body position and head stability", score: 48, status: "priority", observation: "The head moves as the stroke enters the likely contact window.", coachingGoal: "Keep the chin over the shoulder through the hit.", cue: "Chin over the shoulder; see it through.", whyItMatters: "A quieter head supports repeatable timing and direction.", confidence: 0.88, measurementBasis: "pose_kinematic_proxy", frameIndex: 72, timestampSeconds: 2.4 },
    { id: "contact_space", label: "Contact-space proxy", score: 78, status: "strength", observation: "The hands preserve useful room from the torso.", coachingGoal: "Keep this space while the head stays quieter.", cue: "Arms away. Meet it in front.", whyItMatters: "Space preserves the swing corridor.", confidence: 0.84, measurementBasis: "pose_kinematic_proxy", frameIndex: 72, timestampSeconds: 2.4 },
    { id: "finish_recovery", label: "Finish and recovery", score: 52, status: "priority", observation: "The hand path shortens before the first recovery step.", coachingGoal: "Swing through the intended line, finish naturally for the ball, then recover.", cue: "Through first, finish free, recover.", whyItMatters: "A complete release supports the swing path and next movement.", confidence: 0.85, measurementBasis: "pose_kinematic_proxy", frameIndex: 96, timestampSeconds: 3.2 },
    { id: "footwork_base", label: "Footwork and hitting base", score: 44, status: "priority", observation: "The base becomes less functional on arrival.", coachingGoal: "Connect the pivot to movement and a balanced set position.", cue: "Split, pivot, move, set.", whyItMatters: "Efficient movement creates time and reduces compensation.", confidence: 0.86, measurementBasis: "pose_kinematic_proxy", frameIndex: 21, timestampSeconds: 0.7 },
  ],
  engineManifest: { engineVersion: "visual-qa", poseModelVersion: "visual-qa", biomechanicsVersion: "visual-qa", scoringVersion: "visual-qa", knowledgeVersion: "visual-qa", ontologyVersion: "4.1.0", ontologyManifestHash: "visual-qa-manifest", ontologyReasonerVersion: "visual-qa", reportVersion: "visual-qa", analysisMode: "visual_qa" },
  nextGenerationStory: {
    insightId: "VISUAL-QA-PRIMARY", role: "PRIMARY_CORRECTION", archetype: "LIMITATION",
    thesis: "Your preparation gives you time; the clearest next change is keeping the head quieter through the strike window.",
    rootEvent: "G5", evidenceIds: ["metric:head_displacement_body_ratio:pose_kinematic_proxy"],
    comparisonBasis: { type: "within_clip_observation", scope: "synthetic visual-QA fixture" }, causalChain: [],
    confidence: { detection: 0.91, measurement: 0.88, context: 0.91, interpretation: 0.74 },
    falsificationConditions: ["The pattern does not recur in a comparable recording."],
    playerCoaching: { coachRead: "Your preparation gives you time. Keep your head quieter through contact.", keep: "Organized preparation", change: "Keep the chin over the shoulder until both arms complete the strike.", why: "A quieter visual reference makes timing and direction easier to repeat.", feel: "Chin over the shoulder; see it through", watch: "Watch the head through the likely contact window.", train: "Chin-over-shoulder contact rehearsal: 3 sets of 10", success: "Keep the head quiet through 8 of 10 controlled backhands.", languageProfileId: "PLAYER_COACH_v4.1", surface: "PLAYER_COACH" },
    visualStory: { storyId: "VISUAL-QA-STORY", archetype: "CAUSE_TO_EFFECT", focusInsightId: "VISUAL-QA-PRIMARY", beats: [
      { beatId: "B1_ORIENT", timeWindow: { timestampSeconds: 1.05 }, playbackRate: 1, overlays: [], caption: "Watch the whole stroke." },
      { beatId: "B2_CAUSE", timeWindow: { timestampSeconds: 2.0 }, playbackRate: 0.5, overlays: ["EVENT_BEACON"], caption: "The head begins to move before the strike window closes." },
      { beatId: "B3_EFFECT", timeWindow: { timestampSeconds: 2.4 }, playbackRate: 0.5, overlays: ["EVIDENCE_HIGHLIGHT"], caption: "That movement makes the contact window harder to repeat." },
      { beatId: "B4_CORRECTION", timeWindow: { timestampSeconds: 2.4 }, playbackRate: 0.5, overlays: ["CUE_CARD"], caption: "Keep the chin over the shoulder through the hit." },
      { beatId: "B5_CLEAN", timeWindow: { timestampSeconds: 1.05 }, playbackRate: 1, overlays: [], caption: "Replay with one cue." },
    ] },
  },
  ontologyReasoning: {
    status: "FAULT_SUSPECTED", priorityScore: 0.82, candidateCount: 1, evaluatedFaultIds: ["BH-HEAD-01"], cameraSupport: "side", sourceIds: ["SCI-ELLIOTT-2006"], ontologyVersion: "4.1.0", manifestHash: "visual-qa-manifest", policiesApplied: ["fault_evidence_evaluation"], gatedCapabilities: [],
    findings: [{ id: "VISUAL-QA-PRIMARY", rank: 1, role: "PRIMARY", chapterId: "forward_swing_contact", label: "Forward Swing & Contact", faultId: "BH-HEAD-01", ontologyTitle: "Early head movement", domain: "Stability", status: "FAULT_SUSPECTED", score: 48, priorityScore: 0.82, confidence: 0.74, summary: "The head moves before the strike window is complete.", why: "A stable visual reference supports repeatable timing.", correction: "Keep the chin over the shoulder until both arms complete the strike.", cue: "Chin over the shoulder; see it through", watch: "Watch near 2.40s.", phaseOrigin: "G5", phaseVisibleEffect: "G6", overlayMarkers: ["EVENT_BEACON"], sourceIds: ["SCI-ELLIOTT-2006"], evidence: [{ areaId: "body_position_head", label: "Body position and head stability", observation: "The head moves as the stroke enters the likely contact window.", score: 48, confidence: 0.88, measurementBasis: "pose_kinematic_proxy", timestampSeconds: 2.4 }], drill: { id: "quiet_head", name: "Chin-over-shoulder contact rehearsal", purpose: "Keep the visual reference steady.", dosage: "3 sets of 10", cue: "Chin over the shoulder; see it through", success: "8 of 10 quiet-head contacts", targetFaultIds: ["BH-HEAD-01"] } }],
    strengthReview: [{ chapterId: "ready", label: "Ready Position", score: 88, summary: "Your preparation is organized early enough to give the forward swing time.", evidence: [{ areaId: "backlift_preparation", label: "Preparation and backlift timing", observation: "The shoulder coil is organized before the forward swing.", score: 88, confidence: 0.91, measurementBasis: "image_plane_rotation_proxy" }] }],
    movementChain: [
      { id: "ready", label: "Ready Position", status: "strength", score: 88, summary: "Preparation is supporting the stroke.", faultId: null, evidence: [] },
      { id: "unit_turn", label: "Unit Turn", status: "developing", score: 66, summary: "The arrival base changes between repetitions.", faultId: null, evidence: [] },
      { id: "backswing", label: "Backswing", status: "developing", score: 72, summary: "The load is visible but not always consistent.", faultId: null, evidence: [] },
      { id: "forward_swing_contact", label: "Forward Swing & Contact", status: "priority", score: 48, summary: "The head moves before the strike window is complete.", faultId: "BH-HEAD-01", evidence: [] },
      { id: "follow_through", label: "Follow-Through", status: "developing", score: 74, summary: "The leg drive after the load is not always consistent.", faultId: null, evidence: [] },
      { id: "recovery", label: "Recovery", status: "developing", score: 68, summary: "The finish does not always lead directly into recovery.", faultId: null, evidence: [] },
    ],
  } as AnalysisReport["ontologyReasoning"],
  knowledgeControl: { status: "CONTROLLED", failClosed: true, policyVersion: "1.0.0", ontologyVersion: "4.1.0", manifestHash: "visual-qa-manifest", domains: {
    calculations: { authorized: true, decision: "visual_qa_fixture", policyIds: ["AC-SCORE-001"] }, insights: { authorized: true, decision: "visual_qa_fixture", policyIds: ["AC-INSIGHT-001"] }, recommendations: { authorized: true, decision: "visual_qa_fixture", policyIds: ["AC-RECOMMEND-001"] }, benchmarks: { authorized: true, decision: "withheld", policyIds: ["AC-BENCHMARK-001"] }, records: { authorized: true, decision: "visual_qa_fixture", policyIds: ["AC-RECORD-001"] }, report: { authorized: true, decision: "visual_qa_fixture", policyIds: ["AC-REPORT-001"] },
  }, legacyRecordPolicy: "read_only_excluded_from_derived_records", reportFallbacksAllowed: false, contracts: { comparisons: { maximumCaptureScoreDifference: 15, improvedScoreDelta: 4, unchangedLowerScoreDelta: -4, requireSameEngine: true, requireSameRuntime: true, requireSameContext: true, requireSameKnowledgePolicy: true, requireSameManifestHash: true }, longitudinal: { distributionSpreadDivisor: 2, minimumHistorySessions: 2, historyWindowSessions: 3, meaningfulShiftPoints: 4 } } },
};
