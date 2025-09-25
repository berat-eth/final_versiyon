#!/bin/bash

# Huglu API Server - Quick Setup Script
# Bu script uzak sunucuda hızlı kurulum için kullanılır

set -e

echo "🚀 Huglu API Server - Quick Setup"
echo "=================================="

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   log_error "Bu script root kullanıcısı ile çalıştırılmalıdır"
   exit 1
fi

# Sistem bilgisi
log_info "Sistem bilgisi alınıyor..."
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""

# Sistem güncelleme
log_info "Sistem güncelleniyor..."
apt update && apt upgrade -y

# Gerekli paketleri kur
log_info "Gerekli paketler kuruluyor..."
apt install -y curl wget git nginx ufw htop nano

# Node.js kurulumu
log_info "Node.js kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Node.js versiyonunu kontrol et
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "Node.js $NODE_VERSION kuruldu"
log_success "NPM $NPM_VERSION kuruldu"

# PM2 kurulumu
log_info "PM2 kuruluyor..."
npm install -g pm2
log_success "PM2 kuruldu"

# Huglu kullanıcısı oluştur
log_info "Huglu kullanıcısı oluşturuluyor..."
if ! id "huglu" &>/dev/null; then
    useradd -r -m -s /bin/bash huglu
    log_success "Huglu kullanıcısı oluşturuldu"
else
    log_warning "Huglu kullanıcısı zaten mevcut"
fi

# Uygulama dizini oluştur
log_info "Uygulama dizini oluşturuluyor..."
mkdir -p /opt/huglu-api
mkdir -p /opt/huglu-api/logs
chown -R huglu:huglu /opt/huglu-api
log_success "Uygulama dizini hazır"

# Güvenlik duvarı ayarları
log_info "Güvenlik duvarı ayarlanıyor..."
ufw --force enable
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
log_success "Güvenlik duvarı yapılandırıldı"

# Nginx temel yapılandırması
log_info "Nginx yapılandırılıyor..."
systemctl enable nginx
systemctl start nginx

# SSL için Let's Encrypt kurulumu
log_info "Certbot kuruluyor..."
apt install -y certbot python3-certbot-nginx

# Sistem servislerini optimize et
log_info "Sistem servisleri optimize ediliyor..."
systemctl disable apache2 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true

# Log rotasyonu ayarla
log_info "Log rotasyonu ayarlanıyor..."
cat > /etc/logrotate.d/huglu-api << 'EOF'
/opt/huglu-api/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 huglu huglu
    postrotate
        pm2 restart huglu-api 2>/dev/null || true
    endscript
}
EOF

# Swap dosyası oluştur (eğer yoksa)
if ! swapon --show | grep -q swap; then
    log_info "Swap dosyası oluşturuluyor..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_success "2GB Swap dosyası oluşturuldu"
fi

# Sistem limitlerini artır
log_info "Sistem limitleri ayarlanıyor..."
cat >> /etc/security/limits.conf << 'EOF'
huglu soft nofile 65536
huglu hard nofile 65536
huglu soft nproc 32768
huglu hard nproc 32768
EOF

# Kernel parametrelerini optimize et
log_info "Kernel parametreleri optimize ediliyor..."
cat >> /etc/sysctl.conf << 'EOF'
# Network optimizations for API server
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 12582912 16777216
net.ipv4.tcp_wmem = 4096 12582912 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
EOF
sysctl -p

# Monitoring araçları kur
log_info "Monitoring araçları kuruluyor..."
apt install -y iotop iftop ncdu

# Environment template oluştur
log_info "Environment template oluşturuluyor..."
cat > /opt/huglu-api/.env.template << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration (Remote MySQL Server)
DB_HOST=92.113.22.70
DB_USER=u987029066_Admin
DB_PASSWORD=38cdfD8217..
DB_NAME=u987029066_mobil
DB_PORT=3306

# Security Configuration
ADMIN_KEY=huglu-admin-2024-secure-key-CHANGE-THIS
ENCRYPTION_KEY=your-32-byte-encryption-key-here-change-this-in-production
JWT_SECRET=your-jwt-secret-key-here-change-this

# API Configuration
API_RATE_LIMIT=100
CORS_ORIGINS=*

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/server.log

# XML Sync Configuration
XML_SYNC_ENABLED=true
XML_SYNC_INTERVAL=14400000
EOF

chown huglu:huglu /opt/huglu-api/.env.template

# Health check script oluştur
log_info "Health check scripti oluşturuluyor..."
cat > /opt/huglu-api/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Huglu API

API_URL="http://localhost:3000/api/health"
MAX_ATTEMPTS=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -f -s $API_URL > /dev/null; then
        echo "$(date): API is healthy"
        exit 0
    else
        echo "$(date): API health check failed (attempt $ATTEMPT/$MAX_ATTEMPTS)"
        ATTEMPT=$((ATTEMPT + 1))
        sleep 5
    fi
done

echo "$(date): API is not responding, restarting service"
pm2 restart huglu-api
EOF

chmod +x /opt/huglu-api/health-check.sh
chown huglu:huglu /opt/huglu-api/health-check.sh

# Crontab için health check ekle
log_info "Crontab health check ekleniyor..."
(crontab -u huglu -l 2>/dev/null; echo "*/5 * * * * /opt/huglu-api/health-check.sh >> /opt/huglu-api/logs/health-check.log 2>&1") | crontab -u huglu -

# Sistem bilgilerini göster
log_success "Kurulum tamamlandı!"
echo ""
echo "📊 Sistem Bilgileri:"
echo "==================="
echo "Node.js: $NODE_VERSION"
echo "NPM: $NPM_VERSION"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "Disk Kullanımı: $(df -h / | awk 'NR==2 {print $3"/"$2" ("$5")"}')"
echo "RAM: $(free -h | awk 'NR==2{printf "%.1fG/%.1fG (%.1f%%)\n", $3/1024,$2/1024,($3/$2)*100}')"
echo "Swap: $(free -h | awk 'NR==3{printf "%.1fG/%.1fG\n", $3/1024,$2/1024}')"
echo ""
echo "📂 Dizinler:"
echo "============"
echo "Uygulama: /opt/huglu-api"
echo "Loglar: /opt/huglu-api/logs"
echo "Nginx: /etc/nginx"
echo ""
echo "🔧 Sonraki Adımlar:"
echo "=================="
echo "1. Uygulama dosyalarını /opt/huglu-api dizinine kopyalayın"
echo "2. .env dosyasını oluşturun: cp /opt/huglu-api/.env.template /opt/huglu-api/.env"
echo "3. .env dosyasını düzenleyin: nano /opt/huglu-api/.env"
echo "4. Dependencies kurun: cd /opt/huglu-api && npm install --production"
echo "5. Uygulamayı başlatın: pm2 start ecosystem.config.js --env production"
echo "6. SSL sertifikası kurun: certbot --nginx -d yourdomain.com"
echo ""
echo "🌐 Test Komutları:"
echo "=================="
echo "curl http://localhost:3000/api/health"
echo "pm2 status"
echo "pm2 logs huglu-api"
echo ""
echo "✅ Sunucu hazır!"
