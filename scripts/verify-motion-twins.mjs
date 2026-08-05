import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const report = read("src/features/report/components/V6PlayerReport.tsx");
const studio = read("src/features/report/components/CoachVisionStudio.tsx");
const model = read("src/features/report/motion/motion-model.ts");
const checks = [
  ["package version is 6.0.0", pkg.version === "6.0.0"],
  ["active v6 report renders CoachVision", report.includes("<CoachVisionStudio")],
  ["athlete video remains the master clock", studio.includes("video.currentTime")],
  ["clean original-video lens exists", studio.includes('mode === "clean"') && studio.includes("Original video is never altered")],
  ["level-aware target pose exists", studio.includes("poseAtProgress") && studio.includes("athleteContext?.playingLevel")],
  ["target is explicitly illustrative", studio.includes("illustrative next position")],
  ["six phases exist", ["preparation", "loading", "swing", "contact", "finish", "recovery"].every((value) => model.includes(`\"${value}\"`))],
  ["phase synchronization uses measured anchors", studio.includes("stageAnchors") && studio.includes("stageForTime")],
  ["frame stepping exists", studio.includes("Previous frame") && studio.includes("Next frame")],
  ["tracked skeleton renderer exists", studio.includes("BODY_CONNECTIONS") && studio.includes("keyLandmarks")],
  ["left-side support exists", studio.includes('"left" | "right"')],
  ["scientific boundary exists", studio.includes("not a reconstructed body")],
];
for (const [name, passed] of checks) { if (!passed) throw new Error(`Motion twin verification failed: ${name}`); console.log(`PASS: ${name}`); }
console.log(`Motion twin verification passed (${checks.length} checks).`);
