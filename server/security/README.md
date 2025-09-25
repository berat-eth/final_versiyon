# Veritabanı Güvenlik Sistemi

Bu modül, veritabanı güvenliğini maksimuma çıkarmak için kapsamlı güvenlik önlemleri sağlar.

## Özellikler

### 1. Veritabanı Bağlantı Güvenliği
- SSL/TLS şifreleme
- Güçlü kimlik doğrulama
- Bağlantı timeout'ları
- Otomatik yeniden bağlanma

### 2. SQL Injection Koruması
- Parametreli sorgular
- Tehlikeli SQL komutlarının tespiti
- Giriş sanitizasyonu
- Query doğrulaması

### 3. Brute Force Koruması
- IP tabanlı engelleme
- Başarısız giriş takibi
- Otomatik engelleme kaldırma
- Rate limiting

### 4. Veri Maskeleme
- Hassas verilerin maskeleme
- Log güvenliği
- Audit trail

### 5. Giriş Doğrulama
- Kapsamlı input validation
- XSS koruması
- Format doğrulaması
- Sanitizasyon

## Kullanım

```javascript
const DatabaseSecurity = require('./security/database-security');
const InputValidation = require('./security/input-validation');
const RateLimiter = require('./security/rate-limiter');

// Güvenlik modüllerini başlat
const dbSecurity = new DatabaseSecurity();
const inputValidator = new InputValidation();
const rateLimiter = new RateLimiter();

// Veritabanı konfigürasyonu
const dbConfig = dbSecurity.getSecureDbConfig();

// Giriş doğrulama
const validatedData = inputValidator.validateUserData(req.body);

// Rate limiting
app.use('/api/users', rateLimiter.middleware({
  maxRequests: 5,
  windowMs: 300000
}));
```

## Güvenlik Önerileri

1. **Environment Variables**: Tüm hassas bilgileri environment variable'larda saklayın
2. **SSL Sertifikaları**: Production'da SSL sertifikaları kullanın
3. **Güçlü Şifreler**: Veritabanı şifrelerini güçlü yapın
4. **Regular Updates**: Güvenlik güncellemelerini düzenli yapın
5. **Monitoring**: Audit log'ları düzenli kontrol edin
6. **Backup**: Güvenli backup stratejisi uygulayın

## Güvenlik Raporu

```javascript
// Güvenlik durumunu kontrol et
const report = dbSecurity.getSecurityReport();
console.log('Güvenlik Raporu:', report);
```

## Rate Limiting

```javascript
// Endpoint'e özel rate limit
app.post('/api/users/login', 
  rateLimiter.middleware({ maxRequests: 3, windowMs: 300000 }),
  loginHandler
);
```

## Audit Log

Tüm veritabanı işlemleri otomatik olarak loglanır:
- Kullanıcı girişleri
- Veri değişiklikleri
- Hata durumları
- Güvenlik ihlalleri
