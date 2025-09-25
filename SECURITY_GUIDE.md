# 🔒 Huglu API Güvenlik Rehberi

## 📋 Genel Bakış

Bu rehber, Huglu API'sinin güvenlik özelliklerini ve kullanımını açıklar. API, çok katmanlı güvenlik sistemi ile korunmaktadır.

## 🛡️ Güvenlik Katmanları

### 1. **API Key Authentication**
- Tüm API endpoint'leri API key gerektirir
- Admin ve tenant API key'leri ayrı ayrı yönetilir
- Global middleware ile zorunlu hale getirilmiştir

### 2. **JWT Token Sistemi**
- Access ve refresh token desteği
- Token blacklist sistemi
- Role-based access control (RBAC)
- Permission-based access control

### 3. **Gelişmiş Güvenlik Middleware**
- IP reputation kontrolü
- Saldırı paterni tespiti
- Request size limiting
- Progressive rate limiting

### 4. **Veri Şifreleme**
- AES-256-GCM şifreleme
- Tenant bazlı anahtar yönetimi
- Hassas alanların otomatik şifrelenmesi
- Anahtar rotasyon sistemi

### 5. **Güvenlik Monitoring**
- Gerçek zamanlı tehdit tespiti
- Güvenlik event loglama
- Otomatik alert sistemi
- Güvenlik skoru hesaplama

## 🔧 Kurulum ve Yapılandırma

### Gerekli Bağımlılıklar

```bash
npm install jsonwebtoken express-slow-down
```

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
API_ENCRYPTION_KEY=your-32-byte-encryption-key
ENCRYPT_RESPONSES=true
DECRYPT_REQUESTS=true

# Security
SSL_ENABLED=true
SSL_CA_PATH=/path/to/ca.pem
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

## 🚀 Kullanım

### 1. API Key ile İstek Gönderme

```javascript
const response = await fetch('/api/users', {
  method: 'GET',
  headers: {
    'X-API-Key': 'your-api-key',
    'X-Tenant-Id': 'tenant-id',
    'Content-Type': 'application/json'
  }
});
```

### 2. JWT Token ile Authentication

```javascript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Authenticated request
const response = await fetch('/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Token Refresh

```javascript
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: 'your-refresh-token'
  })
});

const { accessToken, refreshToken } = await refreshResponse.json();
```

## 🔍 Güvenlik Monitoring

### Güvenlik Durumu Kontrolü

```bash
curl -X GET http://localhost:3000/api/security/status
```

### Detaylı Güvenlik Raporu

```bash
curl -X GET http://localhost:3000/api/security/report
```

### Güvenlik Testleri Çalıştırma

```bash
# Server dizininde
node run-security-tests.js

# Veya npm script ile
npm run security:test
```

## 🛠️ Güvenlik Testleri

### Otomatik Testler

```javascript
const SecurityTests = require('./security/security-tests');
const tests = new SecurityTests('http://localhost:3000');

const report = await tests.runAllTests();
console.log(report);
```

### Test Kategorileri

1. **SQL Injection Test**
2. **XSS Test**
3. **Authentication Bypass Test**
4. **Rate Limiting Test**
5. **Input Validation Test**
6. **CORS Test**
7. **Security Headers Test**
8. **File Upload Test**
9. **Path Traversal Test**
10. **Command Injection Test**

## 📊 Güvenlik Metrikleri

### Güvenlik Skoru

- **90-100**: Mükemmel güvenlik
- **70-89**: İyi güvenlik
- **50-69**: Orta güvenlik
- **30-49**: Zayıf güvenlik
- **0-29**: Kritik güvenlik

### Alert Seviyeleri

- **Critical**: Acil müdahale gerekli
- **High**: Yüksek öncelik
- **Medium**: Orta öncelik
- **Low**: Düşük öncelik

## 🔐 Güvenlik Best Practices

### 1. **API Key Yönetimi**
- API key'leri düzenli olarak rotasyon yapın
- Güçlü, rastgele key'ler kullanın
- Key'leri güvenli şekilde saklayın

### 2. **JWT Token Güvenliği**
- Token'ları HTTPS üzerinden gönderin
- Kısa süreli access token'lar kullanın
- Refresh token'ları güvenli şekilde saklayın

### 3. **Veri Şifreleme**
- Hassas verileri her zaman şifreleyin
- Güçlü şifreleme algoritmaları kullanın
- Anahtarları düzenli olarak rotasyon yapın

### 4. **Monitoring ve Logging**
- Güvenlik event'lerini sürekli izleyin
- Anormal aktiviteleri hemen tespit edin
- Log'ları güvenli şekilde saklayın

### 5. **Input Validation**
- Tüm kullanıcı girişlerini doğrulayın
- SQL injection ve XSS koruması uygulayın
- Dosya yüklemelerini kısıtlayın

## 🚨 Incident Response

### Güvenlik Açığı Tespit Edildiğinde

1. **Hemen müdahale edin**
2. **Etkilenen sistemleri izole edin**
3. **Log'ları analiz edin**
4. **Açığı kapatın**
5. **Sistemleri güncelleyin**
6. **Kullanıcıları bilgilendirin**

### Acil Durum Kontakları

- **Güvenlik Ekibi**: security@huglu.com
- **Teknik Ekip**: tech@huglu.com
- **Yönetim**: management@huglu.com

## 📈 Güvenlik İyileştirmeleri

### Gelecek Güncellemeler

1. **Multi-Factor Authentication (MFA)**
2. **Biometric Authentication**
3. **Zero Trust Architecture**
4. **Advanced Threat Detection**
5. **Automated Security Patching**

### Önerilen Araçlar

- **WAF (Web Application Firewall)**
- **SIEM (Security Information and Event Management)**
- **Vulnerability Scanner**
- **Penetration Testing Tools**

## 📚 Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

## 🤝 Katkıda Bulunma

Güvenlik iyileştirmeleri için:

1. Issue oluşturun
2. Pull request gönderin
3. Güvenlik ekibi ile iletişime geçin

---

**Not**: Bu rehber sürekli güncellenmektedir. En son güvenlik önerileri için düzenli olarak kontrol edin.
