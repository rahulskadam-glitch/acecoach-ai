$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$required = @(
  "src\features\report\components\PlayerReport.tsx",
  "src\features\report\components\SynchronizedHumanComparison.tsx",
  "src\features\report\motion\HumanSilhouette.tsx",
  "src\features\report\model\plain-language.ts",
  "public\version.json"
)

foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing required v4 file: $file" }
}

$version = Get-Content "public\version.json" | ConvertFrom-Json
if ($version.version -ne "4.0.0") { throw "Expected v4.0.0, found $($version.version)" }

Write-Host "AceCoach AI v4.0.0 files verified." -ForegroundColor Green
Write-Host "Run: npm install; npm run typecheck; npm run lint; npm run verify:human-report; npm run dev" -ForegroundColor Cyan
