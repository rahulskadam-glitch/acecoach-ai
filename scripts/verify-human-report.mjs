import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/features/report/components/V6PlayerReport.tsx",
  "src/features/report/components/ReportOverviewStory.tsx",
  "src/features/report/components/ReportPatternSynthesis.tsx",
  "src/features/report/components/ReportStageVideoLink.tsx",
  "src/features/report/components/CoachVisionStudio.tsx",
  "src/features/report/components/NextGenerationCoachStory.tsx",
  "src/features/report/components/CompleteStrokeReview.tsx",
  "src/features/report/model/next-generation-story.ts",
  "src/features/report/motion/motion-model.ts",
  "src/features/report/model/plain-language.ts",
];

const failures = [];
for (const file of required) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) failures.push(`Missing ${file}`);
}

const report = fs.readFileSync(
  path.join(root, "src/features/report/components/V6PlayerReport.tsx"),
  "utf8",
);
const overview = fs.readFileSync(
  path.join(root, "src/features/report/components/ReportOverviewStory.tsx"),
  "utf8",
);
const studio = fs.readFileSync(
  path.join(root, "src/features/report/components/CoachVisionStudio.tsx"),
  "utf8",
);
const pattern = fs.readFileSync(
  path.join(root, "src/features/report/components/ReportPatternSynthesis.tsx"),
  "utf8",
);
const story = fs.readFileSync(
  path.join(
    root,
    "src/features/report/components/NextGenerationCoachStory.tsx",
  ),
  "utf8",
);
const completeReview = fs.readFileSync(
  path.join(root, "src/features/report/components/CompleteStrokeReview.tsx"),
  "utf8",
);
const storyModel = fs.readFileSync(
  path.join(root, "src/features/report/model/next-generation-story.ts"),
  "utf8",
);

for (const phrase of [
  "ReportOverviewStory",
  "CompleteStrokeReview",
  "Report chapters",
  "Stroke map",
  "Video",
  "Drills",
  "Full stroke breakdown",
  "Analysis details",
  "Stroke",
  "Checks",
  "Limits",
  "Three drills · one correction",
  "practiceDrills.map",
]) {
  if (!report.includes(phrase))
    failures.push(`Active v6 report missing ${phrase}`);
}
for (const phrase of [
  "Three drills · one correction",
  "adaptPracticeCue",
  "Reassessment verdict",
  "buildReassessmentVerdict",
  "validatedBallOutcomes",
]) {
  if (!report.includes(phrase))
    failures.push(`Active v6 report missing reassessment-loop contract ${phrase}`);
}
for (const phrase of [
  "Coach&apos;s verdict",
  "Keep",
  "Change",
  "Train",
  "Stroke map",
  "Your cue",
  "Why this score",
  "What skilled movement looks like",
  "What your video shows",
  "Coach&apos;s read",
  "Why it matters",
  "Next move",
  "ReportPatternSynthesis",
  "reportStageForChapter",
  "ReportStageVideoLink",
  "Same phase · last matched video",
  "Tracker-verified ball outcome",
]) {
  if (!overview.includes(phrase))
    failures.push(`Report overview missing ${phrase}`);
}
if (overview.includes("cannot isolate one specific cause"))
  failures.push(
    "Report overview still contains low-value cause-isolation wording",
  );
if (overview.includes("Source:"))
  failures.push("Report overview still exposes a player-facing source link");
if (overview.includes("Score rule:"))
  failures.push("Report overview still exposes the internal score rule");
for (const phrase of [
  "internal reference",
  "strengthMinimumScore",
  "points below",
  "points versus",
]) {
  if (overview.includes(phrase))
    failures.push(`Report overview still exposes ${phrase}`);
}
for (const phrase of [
  "How the six phases connect",
  "Read the stroke as one movement",
  "Keep the base",
  "Change first",
  "Build after that",
  "Coach&apos;s plan",
]) {
  if (!pattern.includes(phrase))
    failures.push(`Pattern synthesis missing ${phrase}`);
}
if (
  report.includes("Coaching references used") ||
  report.includes("public_coaching_reference")
)
  failures.push(
    "Active v6 report still exposes coaching references below the report",
  );
for (const phrase of [
  "Understand your stroke",
  "Your stroke story",
  "stroke-improvement-count",
  "stroke-strength-count",
  "reviewTrace",
  "weight_transfer",
  "Follow evidence → likely effect → correction",
  "One cue for the next rep",
  "Show on my video",
  "Show the moment",
  "What to improve",
  "What is already working",
  "connected findings to keep on your radar",
]) {
  if (!completeReview.includes(phrase))
    failures.push(`Complete stroke review missing ${phrase}`);
}
for (const phrase of [
  "CoachVision",
  "What I see",
  "Feel this",
  "acecoach:story-beat",
  "drawShortArrow",
  "drawCompactMarker",
  "placedLabels",
  "Clean video",
  "BACKHAND_SIX_STAGES",
  "backhand-six-stage-video-map",
  "REPORT_STAGES",
  "reportStageForMotion",
  "of 6",
]) {
  if (!studio.includes(phrase)) failures.push(`CoachVision missing ${phrase}`);
}
if (studio.includes("drawMotionCurve"))
  failures.push("CoachVision still contains curved correction paths");
if (studio.includes("quadraticCurveTo"))
  failures.push("CoachVision still contains quadratic video-overlay curves");
for (const phrase of [
  "Athlentra Intelligence 4.1",
  "Follow cause → effect → correction",
  "One cue for the next rep",
  "Show on my video",
]) {
  if (!story.includes(phrase))
    failures.push(`Next-generation story missing ${phrase}`);
}
for (const phrase of [
  "CAUSE_TO_EFFECT",
  "PRIMARY_CORRECTION",
  "ontologyVersion",
  "falsificationConditions",
]) {
  if (!storyModel.includes(phrase))
    failures.push(`Story compiler missing ${phrase}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Athlentra Intelligence 4.1 report integrity checks passed.");
