# Refresh metrics seed in Docker Compose dev DB (repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/refresh-dev-seed.ps1
# Requires: docker compose up -d (db + api).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Grove Pulse: alembic upgrade head + gp_api.seed --reset-metrics" -ForegroundColor Cyan
docker compose exec -T api alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw "alembic failed" }
docker compose exec -T api python -m gp_api.seed --reset-metrics
if ($LASTEXITCODE -ne 0) { throw "seed failed" }
Write-Host "Done. Users and outlets unchanged." -ForegroundColor Green
