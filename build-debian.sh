#!/bin/bash

# Huglu Outdoor - Debian Linux Build Script
# Bu script Debian/Ubuntu sistemlerde APK derleme işlemini otomatikleştirir

set -e  # Hata durumunda script'i durdur

echo "🚀 Huglu Outdoor APK Build Script - Debian Linux"
echo "================================================"

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonu
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Sistem bilgilerini kontrol et
log "Sistem bilgileri kontrol ediliyor..."
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"

# Root kontrolü
if [[ $EUID -eq 0 ]]; then
   error "Bu script root kullanıcısı ile çalıştırılmamalıdır!"
   exit 1
fi

# Gerekli sistem paketlerini kur
log "Sistem paketleri güncelleniyor..."
sudo apt update

log "Gerekli sistem paketleri kuruluyor..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    unzip \
    zip \
    ca-certificates \
    gnupg \
    lsb-release

# Java ortam değişkenlerini ayarla
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

log "Java versiyonu: $(java -version 2>&1 | head -n 1)"

# Node.js kurulumu (NodeSource repository)
log "Node.js kuruluyor..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

log "Node.js versiyonu: $(node --version)"
log "NPM versiyonu: $(npm --version)"

# Yarn kurulumu (opsiyonel)
if ! command -v yarn &> /dev/null; then
    log "Yarn kuruluyor..."
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
    sudo apt update && sudo apt install -y yarn
fi

# Android SDK kurulumu
ANDROID_SDK_ROOT="$HOME/Android/Sdk"
log "Android SDK kuruluyor..."

if [ ! -d "$ANDROID_SDK_ROOT" ]; then
    mkdir -p "$HOME/Android"
    cd "$HOME/Android"
    
    # Command Line Tools indir
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip -q commandlinetools-linux-11076708_latest.zip
    mkdir -p Sdk/cmdline-tools/latest
    mv cmdline-tools/* Sdk/cmdline-tools/latest/
    rm -rf cmdline-tools commandlinetools-linux-11076708_latest.zip
    
    # Android SDK ortam değişkenlerini ayarla
    export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
    
    # SDK bileşenlerini kur
    yes | sdkmanager --licenses
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
    
    log "Android SDK kurulumu tamamlandı"
else
    log "Android SDK zaten kurulu"
    export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
fi

# Proje dizinine git
PROJECT_DIR="$(pwd)"
log "Proje dizini: $PROJECT_DIR"

# Dependencies'leri kur
log "Node.js bağımlılıkları kuruluyor..."
if [ -f "package.json" ]; then
    npm install
else
    error "package.json dosyası bulunamadı!"
    exit 1
fi

# EAS CLI kurulumu
log "EAS CLI kuruluyor..."
if ! command -v eas &> /dev/null; then
    npm install -g eas-cli
fi

log "EAS CLI versiyonu: $(eas --version)"

# Git repository kontrolü
if [ ! -d ".git" ]; then
    warn "Git repository bulunamadı. Git repository oluşturuluyor..."
    git init
    git add .
    git commit -m "Initial commit for EAS build"
fi

# EAS build konfigürasyonunu kontrol et
if [ ! -f "eas.json" ]; then
    error "eas.json dosyası bulunamadı!"
    exit 1
fi

# EAS login kontrolü
log "EAS login durumu kontrol ediliyor..."
if ! eas whoami &> /dev/null; then
    warn "EAS'a giriş yapmanız gerekiyor"
    echo "Lütfen EAS hesabınızla giriş yapın:"
    eas login
fi

log "EAS kullanıcısı: $(eas whoami)"

# Build işlemini başlat
log "Production APK build işlemi başlatılıyor..."
echo "Bu işlem birkaç dakika sürebilir..."

# Build profilini sor
echo ""
echo "Hangi build profilini kullanmak istiyorsunuz?"
echo "1) production (Release APK)"
echo "2) preview (Preview APK)"
echo "3) development (Development build)"
read -p "Seçiminizi yapın (1-3): " choice

case $choice in
    1)
        BUILD_PROFILE="production"
        ;;
    2)
        BUILD_PROFILE="preview"
        ;;
    3)
        BUILD_PROFILE="development"
        ;;
    *)
        BUILD_PROFILE="production"
        warn "Geçersiz seçim, varsayılan olarak 'production' kullanılıyor"
        ;;
esac

log "Build profili: $BUILD_PROFILE"

# Local veya remote build seçimi
echo ""
echo "Build türünü seçin:"
echo "1) Remote build (EAS sunucularında)"
echo "2) Local build (Bu makinede)"
read -p "Seçiminizi yapın (1-2): " build_type

if [ "$build_type" = "2" ]; then
    log "Local build başlatılıyor..."
    eas build --platform android --profile $BUILD_PROFILE --local
else
    log "Remote build başlatılıyor..."
    eas build --platform android --profile $BUILD_PROFILE
fi

# Build sonucunu kontrol et
if [ $? -eq 0 ]; then
    log "✅ APK build işlemi başarıyla tamamlandı!"
    
    if [ "$build_type" = "2" ]; then
        # Local build için APK dosyasını bul
        APK_FILE=$(find . -name "*.apk" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        if [ -n "$APK_FILE" ]; then
            log "APK dosyası: $APK_FILE"
            log "APK boyutu: $(du -h "$APK_FILE" | cut -f1)"
        fi
    else
        log "APK dosyasını EAS dashboard'dan indirebilirsiniz:"
        log "https://expo.dev/accounts/$(eas whoami)/projects/huglu-outdoor/builds"
    fi
else
    error "❌ APK build işlemi başarısız!"
    exit 1
fi

# Ortam değişkenlerini kalıcı hale getir
log "Ortam değişkenleri ~/.bashrc dosyasına ekleniyor..."
{
    echo ""
    echo "# Android SDK"
    echo "export ANDROID_SDK_ROOT=\"$HOME/Android/Sdk\""
    echo "export ANDROID_HOME=\"\$ANDROID_SDK_ROOT\""
    echo "export PATH=\$PATH:\$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:\$ANDROID_SDK_ROOT/platform-tools"
    echo ""
    echo "# Java"
    echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
    echo "export PATH=\$PATH:\$JAVA_HOME/bin"
} >> ~/.bashrc

log "✅ Build script tamamlandı!"
log "Yeni terminal açtığınızda ortam değişkenleri otomatik yüklenecek"
log "Veya 'source ~/.bashrc' komutunu çalıştırabilirsiniz"

echo ""
echo "🎉 Huglu Outdoor APK build işlemi tamamlandı!"
echo "================================================"
