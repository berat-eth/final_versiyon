# Huglu Outdoor - Admin Paneli

Modern ve basit tasarımlı admin paneli.

## Özellikler

- 📊 **Dashboard**: Genel istatistikler ve özet bilgiler
- 👥 **Kullanıcı Yönetimi**: Tüm kullanıcıları görüntüleme
- 🛒 **Sipariş Yönetimi**: Siparişleri görüntüleme ve durum güncelleme
- 📦 **Ürün Yönetimi**: XML senkronizasyonu
- 🏢 **Tenant Yönetimi**: Multi-tenant yapı yönetimi
- ⚙️ **Ayarlar**: Sistem ayarları ve bilgileri

## Kurulum

### 1. Backend Sunucusunu Başlatın
```bash
cd server
node server.js
```

### 2. Admin Panelini Açın

#### Seçenek A: Basit HTTP Server (Python)
```bash
cd admin-panel
python -m http.server 8080
```
Tarayıcıda: http://localhost:8080

#### Seçenek B: Live Server (VS Code Extension)
- VS Code'da admin-panel klasörünü açın
- index.html'e sağ tıklayıp "Open with Live Server" seçin

#### Seçenek C: Node.js HTTP Server
```bash
cd admin-panel
npx http-server -p 8080
```

## Giriş Bilgileri

- **Admin Key**: `huglu-admin-2024-secure-key`
- Bu key backend'de otomatik olarak doğrulanır

## API Endpoints

Admin paneli aşağıdaki endpoint'leri kullanır:

- `GET /api/admin/stats` - Dashboard istatistikleri
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/orders` - Sipariş listesi
- `PUT /api/admin/orders/:id/status` - Sipariş durumu güncelleme
- `GET /api/tenants` - Tenant listesi
- `POST /api/sync/products` - Ürün senkronizasyonu

## Güvenlik

⚠️ **Önemli**: Production ortamında:
1. Admin key'ini environment variable olarak saklayın
2. HTTPS kullanın
3. IP whitelist uygulayın
4. Rate limiting ekleyin

## Responsive Tasarım

Admin paneli mobil ve tablet cihazlarda da kullanılabilir:
- Mobil: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Özelleştirme

### Renk Teması Değiştirme
`style.css` dosyasında gradient renklerini değiştirin:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### API URL Değiştirme
`script.js` dosyasında API_BASE değişkenini güncelleyin:
```javascript
const API_BASE = 'http://your-server:3000/api';
```
