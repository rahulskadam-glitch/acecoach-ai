import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["current package retains v5 capabilities", "package.json", '"version": "6.0.0"'],
  ["current release retains v5 capabilities", "src/lib/config/version.ts", 'APP_VERSION = "6.0.0"'],
  ["active player report", "src/components/analysis/AnalysisReport.tsx", "@/features/report/components/PlayerReport"],
  ["clean video guide toggle", "src/features/report/components/SynchronizedHumanComparison.tsx", "Compare one difference"],
  ["player-proportioned selector", "src/features/report/components/SynchronizedHumanComparison.tsx", "player-matched"],
  ["tapered limbs", "src/features/report/motion/HumanSilhouette.tsx", "taperedPolygon"],
  ["trust strip active", "src/features/report/components/PlayerReport.tsx", "<ReportTrustStrip"],
  ["primary duplicate removed", "src/features/report/model/view-model.ts", "report.priorities.slice(1, 4)"],
  ["upload state machine", "src/features/upload/domain/upload-machine.ts", "Invalid upload transition"],
  ["checksum upload", "src/components/upload/VideoUploader.tsx", "checksumSha256"],
  ["owner download action", "src/app/actions/video-actions.ts", "getVideoDownloadUrl"],
  ["download in library", "src/components/library/VideoLibrary.tsx", "Download"],
  ["practice route", "src/app/practice/page.tsx", "Guided practice"],
  ["methodology route", "src/app/methodology/page.tsx", "Validated"],
  ["support route", "src/app/support/page.tsx", "SupportRequestForm"],
  ["transparent pricing", "src/app/pricing/page.tsx", "Clear limits before you upload"],
  ["migration 021", "supabase/021_review_led_trust_platform_v500.sql", "support_requests"],
  ["source requirements retained", "docs/SOURCE_REQUIREMENTS_AND_USER_REVIEW_INPUT_V500.txt", "create a level 2 and 3 details"],
  ["red team", "docs/RED_TEAM_REVIEW_V500.md", "Round 7"],
  ["risk register", "docs/RISK_REGISTER_V500.md", "Residual risk"],
];

let failed = 0;
for (const [name, relative, expected] of checks) {
  const file = path.join(root, relative);
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const ok = content.includes(expected);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`v5 verification failed: ${failed} check(s)`);
  process.exit(1);
}
console.log(`AceCoach v5 verification passed: ${checks.length} checks`);
