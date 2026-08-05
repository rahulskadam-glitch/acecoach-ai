$ErrorActionPreference = "Stop"

Write-Host "AceCoach AI v6.0.0 installation verification" -ForegroundColor Cyan

if (-not (Test-Path ".\package.json")) { throw "Run this script from C:\workspace\web." }
if (Test-Path ".\web\package.json") { throw "Nested web\web folder detected. Move the inner web contents to C:\workspace\web." }

$package = Get-Content ".\package.json" -Raw | ConvertFrom-Json
if ($package.version -ne "6.0.0") { throw "Expected version 6.0.0 but found $($package.version)." }

npm run typecheck
npm run lint
npm run verify:v6

Write-Host "Static installation checks passed." -ForegroundColor Green
Write-Host "Open http://localhost:3000/version and confirm 'Six-step athlete journey: ACTIVE'." -ForegroundColor Yellow
