# Verify local Docker dev stack (db + api + web). Run from repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/verify-dev-stack.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Fail([string]$msg) {
    Write-Host "FAIL: $msg" -ForegroundColor Red
    exit 1
}

Write-Host "Grove Pulse - stack check (localhost)" -ForegroundColor Cyan
Write-Host ""

Write-Host -NoNewline "1. GET http://127.0.0.1:8000/api/health ... "
$h = curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/api/health
if ($h -ne "200") { Fail "expected HTTP 200, got $h (is API up?)" }
Write-Host "OK ($h)" -ForegroundColor Green

Write-Host -NoNewline "2. GET http://127.0.0.1:5174/api/auth/me (Vite proxy) ... "
$me = curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:5174/api/auth/me
if ($me -ne "401") { Fail "expected HTTP 401 without cookie, got $me" }
Write-Host "OK ($me)" -ForegroundColor Green

Write-Host -NoNewline "3. LoginPage.tsx in web container (TELEGRAM_HANDLE marker) ... "
$g = docker compose exec -T web sh -c "grep -c TELEGRAM_HANDLE /app/src/pages/LoginPage.tsx" 2>&1
if ($LASTEXITCODE -ne 0) { Fail "docker compose exec web failed: $g" }
$gc = ($g | Out-String).Trim()
if ([int]$gc -lt 1) { Fail "LoginPage.tsx mismatch (wrong apps/web bind mount?)" }
Write-Host "OK (grep=$gc)" -ForegroundColor Green

Write-Host ""
Write-Host "All checks passed. Open: http://localhost:5174/login" -ForegroundColor Green
