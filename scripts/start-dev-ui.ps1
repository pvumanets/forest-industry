# Podnyat' Docker-stek i otkryt' UI v brauzere (bez kirillitsy v soobshheniyah — kodirovka PS).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Start Docker Desktop, wait until it is ready, then run this script again." -ForegroundColor Red
    exit 1
}

Write-Host "Starting db, api, web..." -ForegroundColor Cyan
docker compose up -d db api web
if ($LASTEXITCODE -ne 0) {
    Write-Host "docker compose up failed." -ForegroundColor Red
    exit 1
}

$port = "5174"
if (Test-Path ".env") {
    $line = Get-Content ".env" | Where-Object { $_ -match '^\s*WEB_HOST_PORT\s*=' } | Select-Object -First 1
    if ($line -match '=\s*(\d+)') { $port = $Matches[1] }
}

$url = "http://localhost:$port/login"
Write-Host "Waiting for Vite (up to 45s)..." -ForegroundColor DarkGray
$ok = $false
for ($i = 0; $i -lt 45; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}

if (-not $ok) {
    Write-Host "Web did not respond on $url yet. Check: docker compose ps ; docker compose logs web --tail 40" -ForegroundColor Yellow
}

Write-Host "Opening: $url" -ForegroundColor Green
Start-Process $url
