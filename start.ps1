# ============================================================
# KBT Loyihasini ishga tushirish skripti
# Ishlatish: PowerShell da ./start.ps1
# ============================================================

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KBT Loyihasi ishga tushmoqda..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

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
Write-Host "Backend ishga tushmoqda (port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; node --watch src/index.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# Frontend ishga tushirish (yangi terminalda)
Write-Host "Frontend ishga tushmoqda (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tayyor!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000/api" -ForegroundColor White
Write-Host "  Login: admin / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Brauzerda ochish
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
