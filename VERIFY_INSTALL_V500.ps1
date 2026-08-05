$ErrorActionPreference = "Stop"

Write-Host "AceCoach AI v5.0.0 verification" -ForegroundColor Cyan
if (-not (Test-Path ".\package.json")) { throw "Run this script from C:\workspace\web" }
if (Test-Path ".\web\package.json") { throw "Nested web\web folder detected. The project root must be C:\workspace\web." }

$package = Get-Content ".\package.json" -Raw | ConvertFrom-Json
if ($package.version -ne "5.0.0") { throw "Expected package version 5.0.0, found $($package.version)" }

npm run typecheck
npm run lint
npm run verify:v5
npm run test:analysis

Write-Host "Static and test verification passed. Open http://localhost:3000/version after npm run dev." -ForegroundColor Green
