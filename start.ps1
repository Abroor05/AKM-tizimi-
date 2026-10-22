# ============================================================
# KBT Loyihasini ishga tushirish skripti (PostgreSQL)
# Ishlatish: PowerShell da ./start.ps1
# ============================================================

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KBT Loyihasi ishga tushmoqda..." -ForegroundColor Cyan
Write-Host "  Ma'lumotlar bazasi: PostgreSQL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# PostgreSQL xizmatini tekshirish
$pgService = Get-Service *postgres* -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }
if (-not $pgService) {
    Write-Host "PostgreSQL xizmati tekshirilmoqda..." -ForegroundColor Yellow
    Start-Service postgresql* -ErrorAction SilentlyContinue
}

# Port 5000 ni tozalash
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "Port 5000 band, tozalanmoqda..." -ForegroundColor Yellow
    $port5000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
}

# Port 3000 ni tozalash
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "Port 3000 band, tozalanmoqda..." -ForegroundColor Yellow
    $port3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
}

# Backend ishga tushirish (yangi terminalda)
Write-Host "Backend ishga tushmoqda (port 5000, PostgreSQL)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; node --watch src/index.js" -WindowStyle Normal

$backendReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 1
        if ($health.status -eq "ok") {
            $backendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $backendReady) {
    Write-Host "Backend javob bermadi. Frontend ishga tushirilmadi." -ForegroundColor Red
    exit 1
}

# Frontend ishga tushirish (yangi terminalda)
Write-Host "Frontend ishga tushmoqda (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tayyor!" -ForegroundColor Green
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:     http://localhost:5000/api" -ForegroundColor White
Write-Host "  Swagger UI:  http://localhost:5000/api/docs" -ForegroundColor Yellow
Write-Host "  Database:    PostgreSQL (akm_db:5432)" -ForegroundColor Green
Write-Host "  Login:       admin / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Brauzerda ochish
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
