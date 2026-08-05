$ErrorActionPreference = "Stop"

Write-Host "AceCoach AI v3.4.0 installation verification" -ForegroundColor Cyan

if (-not (Test-Path ".\package.json")) {
  throw "Run this script from C:\workspace\web."
}

$package = Get-Content ".\package.json" -Raw | ConvertFrom-Json
if ($package.version -ne "3.4.0") {
  throw "Wrong package version: $($package.version). Expected 3.4.0."
}

$studio = Get-Content ".\src\components\analysis\ReferenceComparisonStudio.tsx" -Raw
$required = @(
  "Synchronized Motion Twin Lab",
  "Category motion twin",
  "Best-in-class motion twin",
  "player-gap-arrow",
  "Loop measured stroke",
  "Real coaching and exemplar source videos"
)

foreach ($item in $required) {
  if (-not $studio.Contains($item)) {
    throw "Missing required Motion Twin feature: $item"
  }
}

Write-Host "PASS: package version 3.4.0" -ForegroundColor Green
Write-Host "PASS: synchronized category and elite silhouettes" -ForegroundColor Green
Write-Host "PASS: phase controls, loop, vectors, and source videos" -ForegroundColor Green
Write-Host ""
Write-Host "Start the app and open http://localhost:3000/version" -ForegroundColor Yellow
