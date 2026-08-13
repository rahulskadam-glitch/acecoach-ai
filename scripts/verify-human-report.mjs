import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/features/report/components/V6PlayerReport.tsx",
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

const report = fs.readFileSync(path.join(root, "src/features/report/components/V6PlayerReport.tsx"), "utf8");
const studio = fs.readFileSync(path.join(root, "src/features/report/components/CoachVisionStudio.tsx"), "utf8");
const story = fs.readFileSync(path.join(root, "src/features/report/components/NextGenerationCoachStory.tsx"), "utf8");
const completeReview = fs.readFileSync(path.join(root, "src/features/report/components/CompleteStrokeReview.tsx"), "utf8");
const storyModel = fs.readFileSync(path.join(root, "src/features/report/model/next-generation-story.ts"), "utf8");

for (const phrase of ["CompleteStrokeReview", "Your coaching journey", "1", "Understand", "2", "See it", "3", "Train it", "Supporting analysis", "Full stroke", "106 checks", "Method & limits", "3 · Practise it", "Your three-drill improvement plan", "Build the pattern", "Connect the stroke", "Make it repeatable", "practiceDrills.map"]) {
  if (!report.includes(phrase)) failures.push(`Active v6 report missing ${phrase}`);
}
if (report.includes("Coaching references used") || report.includes("public_coaching_reference")) failures.push("Active v6 report still exposes coaching references below the report");
for (const phrase of ["Understand your stroke", "Your stroke story", "stroke-improvement-count", "stroke-strength-count", "reviewTrace", "weight_transfer", "Follow cause → effect → correction", "One cue for the next rep", "Show on my video", "Show the moment", "What to improve", "What is already working", "connected findings to keep on your radar"]) {
  if (!completeReview.includes(phrase)) failures.push(`Complete stroke review missing ${phrase}`);
}
for (const phrase of ["CoachVision", "What I see", "Feel this", "acecoach:story-beat", "drawShortArrow", "drawCompactMarker", "placedLabels", "Clean video"]) {
  if (!studio.includes(phrase)) failures.push(`CoachVision missing ${phrase}`);
}
if (studio.includes("drawMotionCurve")) failures.push("CoachVision still contains curved correction paths");
if (studio.includes("quadraticCurveTo")) failures.push("CoachVision still contains quadratic video-overlay curves");
for (const phrase of ["AceCoach Intelligence 4.1", "Follow cause → effect → correction", "One cue for the next rep", "Show on my video"]) {
  if (!story.includes(phrase)) failures.push(`Next-generation story missing ${phrase}`);
}
for (const phrase of ["CAUSE_TO_EFFECT", "PRIMARY_CORRECTION", "ontologyVersion", "falsificationConditions"]) {
  if (!storyModel.includes(phrase)) failures.push(`Story compiler missing ${phrase}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("AceCoach Intelligence 4.1 report integrity checks passed.");
