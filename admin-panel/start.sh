#!/bin/bash

echo "🚀 Huglu Outdoor Admin Panel Başlatılıyor..."
echo

echo "📋 Gereksinimler kontrol ediliyor..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Python bulunamadı! Python 3.x yüklü olmalı."
        echo "📥 Python'u şu adresten indirin: https://python.org"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

echo "✅ Python bulundu"
echo

# Check if backend server is running
echo "🔍 Backend sunucusu kontrol ediliyor..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "⚠️  Backend sunucusu çalışmıyor gibi görünüyor"
    echo "💡 Önce backend sunucusunu başlatın:"
    echo "   cd server"
    echo "   node server.js"
    echo
    read -p "🤔 Yine de devam etmek istiyor musunuz? (y/N): " continue
    if [[ ! "$continue" =~ ^[Yy]$ ]]; then
        echo "👋 Admin panel başlatılmadı."
        exit 1
    fi
fi

echo
echo "🌐 Admin paneli başlatılıyor..."
echo "📱 Tarayıcınız otomatik olarak açılacak"
echo "🔑 Admin Key: huglu-admin-2024-secure-key"
echo
echo "⏹️  Durdurmak için Ctrl+C tuşlayın"
echo

$PYTHON_CMD server.py
