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
  ["athlete video remains the master clock", studio.includes("video.currentTime") && studio.includes("metadata.mediaTime")],
  ["canvas follows compositor-presented frames", studio.includes("requestVideoFrameCallback") && studio.includes("scheduleFrameSync")],
  ["pose frames register to exact presented time", studio.includes("interpolatedFrameAtTime") && model.includes("timestampSeconds: time") && model.includes("frameAtOrBefore")],
  ["pose stabilization is causal", studio.includes("CausalLandmarkStabilizer") && model.includes("current and past samples only")],
  ["seeks wait for decoded video frame", studio.includes("onSeeked={handleSeeked}") && studio.includes("if (seeking")],
  ["clean original-video lens exists", studio.includes('mode === "clean"') && studio.includes("Original video preserved")],
  ["level-aware target pose model exists", model.includes("poseAtProgress") && model.includes("playingLevel")],
  ["active overlay is grounded in pose evidence", studio.includes("measured anatomical neighbours") && studio.includes("not force data")],
  ["six phases exist", ["preparation", "loading", "swing", "contact", "finish", "recovery"].every((value) => model.includes(`\"${value}\"`))],
  ["phase synchronization uses measured anchors", studio.includes("stageAnchors") && studio.includes("stageForTime")],
  ["frame stepping exists", studio.includes("Previous frame") && studio.includes("Next frame")],
  ["tracked skeleton renderer exists", studio.includes("BODY_CONNECTIONS") && studio.includes("keyLandmarks")],
  ["left-side support exists", studio.includes('"left" | "right"')],
  ["scientific boundary exists", studio.includes("not force data") && studio.includes("exact 3D reconstruction")],
];
for (const [name, passed] of checks) { if (!passed) throw new Error(`Motion twin verification failed: ${name}`); console.log(`PASS: ${name}`); }
console.log(`Motion twin verification passed (${checks.length} checks).`);
