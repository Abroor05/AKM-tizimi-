# ============================================================
# PostgreSQL 16 Portable avtomatik o'rnatish va sozlash skripti
# ============================================================
$ErrorActionPreference = "Stop"

$destZip = "$env:TEMP\postgresql-16.15-5-windows-x64-binaries.zip"
$targetBase = "C:\Users\Fujitsu-HS"
$pgsqlDir = "C:\Users\Fujitsu-HS\pgsql"
$dataDir = "$pgsqlDir\data"
$url = "https://get.enterprisedb.com/postgresql/postgresql-16.15-5-windows-x64-binaries.zip"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PostgreSQL 16 O'rnatish Boshlandi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Zip yuklab olish
if (-not (Test-Path $destZip) -and -not (Test-Path "$pgsqlDir\bin\postgres.exe")) {
    Write-Host "[1/6] PostgreSQL 16 yuklab olinmoqda (~370MB)..." -ForegroundColor Yellow
    curl.exe -L --retry 3 --progress-bar -o $destZip $url
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Yuklab olishda xatolik yuz berdi!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Yuklab olish muvaffaqiyatli tugadi." -ForegroundColor Green
} else {
    Write-Host "[1/6] PostgreSQL arxivi yoki papkasi mavjud." -ForegroundColor Green
}

# 2. Arxivdan chiqarish
if (-not (Test-Path "$pgsqlDir\bin\postgres.exe")) {
    Write-Host "[2/6] Arxivdan chiqarilmoqda (C:\Users\Fujitsu-HS\pgsql)..." -ForegroundColor Yellow
    Expand-Archive -Path $destZip -DestinationPath $targetBase -Force
    Write-Host "Arxiv muvaffaqiyatli chiqarildi." -ForegroundColor Green
} else {
    Write-Host "[2/6] PostgreSQL binar fayllari tayyor: $pgsqlDir" -ForegroundColor Green
}

# 3. Data klasterini yaratish
if (-not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Host "[3/6] Data klasteri yaratilmoqda (initdb)..." -ForegroundColor Yellow
    $passFile = "$env:TEMP\pg_init_pass.txt"
    [System.IO.File]::WriteAllText($passFile, "postgres`n")
    & "$pgsqlDir\bin\initdb.exe" -D $dataDir -U postgres -E UTF8 --locale=C --auth=trust --pwfile=$passFile
    Remove-Item -Force $passFile -ErrorAction SilentlyContinue
    Write-Host "Data klasteri muvaffaqiyatli yaratildi." -ForegroundColor Green
} else {
    Write-Host "[3/6] Data klasteri allaqachon mavjud." -ForegroundColor Green
}

# 4. Serverni ishga tushirish
Write-Host "[4/6] PostgreSQL serveri tekshirilmoqda va ishga tushirilmoqda..." -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if (-not $portCheck) {
    & "$pgsqlDir\bin\pg_ctl.exe" -D $dataDir -l "$pgsqlDir\logfile.txt" start
    Start-Sleep -Seconds 3
}

$portCheckAfter = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($portCheckAfter) {
    Write-Host "PostgreSQL 5432 portda muvaffaqiyatli ishlayapti!" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL ishga tushmadi. Log faylini tekshiring: $pgsqlDir\logfile.txt" -ForegroundColor Red
    exit 1
}

# 5. Parolni tekshirish va akm_db bazasini yaratish
Write-Host "[5/6] Parol va akm_db bazasi tekshirilmoqda..." -ForegroundColor Yellow
& "$pgsqlDir\bin\psql.exe" -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
$dbExists = & "$pgsqlDir\bin\psql.exe" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='akm_db'"
if ("$dbExists".Trim() -ne "1") {
    & "$pgsqlDir\bin\createdb.exe" -U postgres akm_db
    Write-Host "akm_db bazasi yaratildi!" -ForegroundColor Green
} else {
    Write-Host "akm_db bazasi mavjud." -ForegroundColor Green
}

# 6. PATH muhitiga qo'shish
Write-Host "[6/6] PATH tizimiga qo'shilmoqda..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$pgsqlDir\bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$pgsqlDir\bin", "User")
}
$env:Path = "$env:Path;$pgsqlDir\bin"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PostgreSQL 16 Muvaffaqiyatli Sozlandi!" -ForegroundColor Green
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host "  User: postgres" -ForegroundColor White
Write-Host "  Pass: postgres" -ForegroundColor White
Write-Host "  Baza: akm_db" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
