@echo off
echo 🚀 Huglu Outdoor Admin Panel Başlatılıyor...
echo.
echo 📋 Gereksinimler kontrol ediliyor...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python bulunamadı! Python 3.x yüklü olmalı.
    echo 📥 Python'u şu adresten indirin: https://python.org
    pause
    exit /b 1
)

echo ✅ Python bulundu
echo.

REM Check if backend server is running
echo 🔍 Backend sunucusu kontrol ediliyor...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Backend sunucusu çalışmıyor gibi görünüyor
    echo 💡 Önce backend sunucusunu başlatın:
    echo    cd server
    echo    node server.js
    echo.
    echo 🤔 Yine de devam etmek istiyor musunuz? ^(y/N^)
    set /p continue=
    if /i not "%continue%"=="y" (
        echo 👋 Admin panel başlatılmadı.
        pause
        exit /b 1
    )
)

echo.
echo 🌐 Admin paneli başlatılıyor...
echo 📱 Tarayıcınız otomatik olarak açılacak
echo 🔑 Admin Key: huglu-admin-2024-secure-key
echo.
echo ⏹️  Durdurmak için Ctrl+C tuşlayın
echo.

python server.py
