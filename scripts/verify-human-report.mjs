import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/features/report/components/V6PlayerReport.tsx",
  "src/features/report/components/CoachVisionStudio.tsx",
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

for (const phrase of ["1 · Fix one thing", "3 · Practise it", "Supporting coaching notes", "Technical details"]) {
  if (!report.includes(phrase)) failures.push(`Active v6 report missing ${phrase}`);
}
for (const phrase of ["CoachVision", "What I see", "Why it matters", "Feel this", "All six body links", "illustrative next position", "Original video is never altered"]) {
  if (!studio.includes(phrase)) failures.push(`CoachVision missing ${phrase}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Human Motion Coach v6 integrity checks passed (15 checks).");
