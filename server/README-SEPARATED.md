# Huglu Backend - Ayrılmış API Sistemleri

Bu proje artık iki ayrı API server'ı kullanmaktadır:

## 🏗️ Mimari

### 1. Admin Server (Port 3001)
- **Dosya**: `admin-server.js`
- **Port**: 3001
- **Amaç**: Admin paneli için yönetim API'leri
- **Güvenlik**: Admin key authentication
- **CORS**: Sadece admin panel domain'leri

### 2. App API Server (Port 3000)
- **Dosya**: `app-api-server.js`
- **Port**: 3000
- **Amaç**: Mobil uygulama için genel API'ler
- **Güvenlik**: Tenant-based authentication
- **CORS**: Tüm origin'lere açık

## 🚀 Çalıştırma

### Geliştirme Ortamı
```bash
# Her iki server'ı aynı anda çalıştır
npm run dev:both

# Sadece admin server
npm run dev:admin

# Sadece app API server
npm run dev:app
```

### Production Ortamı
```bash
# Her iki server'ı aynı anda çalıştır
npm run start:both

# Sadece admin server
npm run start:admin

# Sadece app API server
npm run start:app
```

## 📡 API Endpoint'leri

### Admin Server (Port 3001)
```
GET  /api/health                    # Health check
GET  /api/admin/stats              # Dashboard istatistikleri
GET  /api/admin/charts             # Dashboard grafikleri
GET  /api/admin/users              # Kullanıcı listesi
GET  /api/admin/orders             # Sipariş listesi
GET  /api/admin/orders/:id         # Sipariş detayı
PUT  /api/admin/orders/:id/status  # Sipariş durumu güncelle
GET  /api/admin/products           # Ürün listesi
GET  /api/admin/products/:id       # Ürün detayı
GET  /api/admin/categories         # Kategori listesi
GET  /api/admin/flash-deals        # Flash indirimleri
POST /api/admin/flash-deals        # Flash indirim oluştur
PUT  /api/admin/flash-deals/:id    # Flash indirim güncelle
DELETE /api/admin/flash-deals/:id  # Flash indirim sil
```

### App API Server (Port 3000)
```
GET  /api/health                   # Health check
POST /api/users                    # Kullanıcı kaydı
POST /api/users/login              # Kullanıcı girişi
GET  /api/products                 # Ürün listesi
GET  /api/products/:id             # Ürün detayı
GET  /api/products/search          # Ürün arama
GET  /api/categories               # Kategori listesi
GET  /api/brands                   # Marka listesi
GET  /api/cart/:userId             # Sepet listesi
POST /api/cart                     # Sepete ekle
GET  /api/orders/user/:userId      # Kullanıcı siparişleri
POST /api/orders                   # Sipariş oluştur
GET  /api/flash-deals              # Aktif flash indirimleri
```

## 🔧 Konfigürasyon

### Environment Variables
```bash
# Admin Server
ADMIN_PORT=3001
ADMIN_KEY=your-secret-admin-key

# App API Server
APP_PORT=3000

# Database (Her iki server için ortak)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=huglu_db
```

### CORS Ayarları

#### Admin Server
```javascript
origin: ['http://localhost:8080', 'http://127.0.0.1:8080']
```

#### App API Server
```javascript
origin: true  // Tüm origin'lere açık
```

## 🛡️ Güvenlik

### Admin Server
- Admin key authentication
- Rate limiting: 1000 req/15min
- Sadece admin panel domain'lerine CORS

### App API Server
- Tenant-based authentication
- Rate limiting: 2000 req/15min
- Tüm origin'lere CORS (mobil uygulama için)

## 📱 Frontend Konfigürasyonu

### Admin Panel
```javascript
const API_BASE = 'http://213.142.159.135:3001/api';
```

### Mobil Uygulama
```typescript
const API_BASE = 'http://213.142.159.135:3000/api';
```

## 🔄 Migration

Eski `server.js` dosyası hala mevcut ancak artık kullanılmıyor. Yeni sistemde:

1. **Admin işlemleri** → Admin Server (3001)
2. **Mobil uygulama** → App API Server (3000)

## 📊 Monitoring

Her iki server da ayrı health check endpoint'leri sunar:

- Admin Server: `http://localhost:3001/api/health`
- App API Server: `http://localhost:3000/api/health`

## 🚀 Deployment

### PM2 ile
```bash
# Admin server
pm2 start admin-server.js --name "huglu-admin"

# App API server
pm2 start app-api-server.js --name "huglu-app-api"
```

### Docker ile
```bash
# Admin server
docker run -p 3001:3001 huglu-admin

# App API server
docker run -p 3000:3000 huglu-app-api
```

## 📝 Notlar

- Her iki server aynı veritabanını kullanır
- Middleware dosyası ortak kullanılır
- Database schema değişiklikleri her iki server'ı etkiler
- Log'lar ayrı tutulabilir
