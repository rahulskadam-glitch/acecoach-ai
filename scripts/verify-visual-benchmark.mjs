import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const reportExport = read("src/components/analysis/AnalysisReport.tsx");
const playerReport = read("src/features/report/components/PlayerReport.tsx");
const comparison = read("src/features/report/components/SynchronizedHumanComparison.tsx");
const checks = [
  ["package version is 6.0.0", pkg.version === "6.0.0"],
  ["legacy report entry exports the compatible player report", reportExport.includes("PlayerReport")],
  ["active report imports synchronized human comparison", playerReport.includes("SynchronizedHumanComparison")],
  ["category reference panel exists", comparison.includes("Your next target")],
  ["elite reference panel exists", comparison.includes("Best-in-class principle")],
  ["clean-player requirement exists", comparison.includes("clean by default")],
];
for (const [name, passed] of checks) { if (!passed) throw new Error(`Visual benchmark verification failed: ${name}`); console.log(`PASS: ${name}`); }
console.log(`Visual benchmark verification passed (${checks.length} checks).`);
