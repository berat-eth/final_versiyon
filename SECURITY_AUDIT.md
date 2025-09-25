## Huglu Mobil – Güvenlik Denetim Raporu

Tarih: 2025-09-10

### Kapsam
- Sunucu (Node/Express, `serv/` ve `server/`)
- Mobil/İstemci (`src/`)
- Admin Panel (`admin-panel/`)

### Özet Sonuç
**Kritik** düzeyde birden fazla zafiyet bulundu: sabitlenmiş anahtarlar (ifşa), zayıf/yanlış kriptografi, gevşek CORS, kimlik doğrulamasız uçlar (IDOR riski), rate limiting eksikliği ve hassas veri loglama.

---

### Kritik Bulgular

1) Hardcoded Admin Key (ifşa)
- Admin anahtarı hem admin panelde hem sunucuda sabitlenmiş.

```js
// admin-panel/script.js
const API_BASE = 'http://213.142.159.135:3000/api';
const ADMIN_KEY = 'huglu-admin-2024-secure-key';
```

```js
// serv/server.js
function authenticateAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const ADMIN_KEY = process.env.ADMIN_KEY || 'huglu-admin-2024-secure-key';
  // ...
}
```

2) Hardcoded Tenant API Key (ifşa)
- İstemci tarafında varsayılan API anahtarı gömülü ve otomatik set ediliyor.

```ts
// src/utils/api-service.ts
const DEFAULT_API_KEY = 'huglu_f22635b6...';
apiService.setApiKey(DEFAULT_API_KEY);
```

3) Gevşek CORS (origin *)
- Tüm origin’lere izin verilmiş, CSRF/XSS vektörlerini genişletir.

```js
// serv/server.js
app.use(cors());
```

4) Kimlik doğrulamasız sepet uçları – IDOR riski
- `cart` uçlarında tenant/user doğrulaması yok; farklı `userId` ile veri erişimi/değişimi mümkün olabilir.

```js
// serv/server.js
app.get('/api/cart/:userId', async (req, res) => { /* ... */ });
app.post('/api/cart', async (req, res) => { /* ... */ });
```

5) Kriptografi ve Anahtar Yönetimi Hataları
- `ENCRYPTION_KEY` her başlatmada `randomBytes(32)` ile üretiliyor (kalıcı değil).
- `createDecipher('aes-256-cbc', ENCRYPTION_KEY)` kullanımı yanlış/deprecated; IV yönetimi atlanmış.

```js
// serv/server.js
const ENCRYPTION_KEY = crypto.randomBytes(32);
const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
```

6) Rate limiting ve brute force koruması yok
- Login ve admin uçları sınırsız denemeye açık.

7) Hassas veri loglama
- Prod modda POST/PUT gövdeleri (parola vb.) loglanıyor.

```js
// serv/server.js
if (req.body && Object.keys(req.body).length > 0) {
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
}
```

---

### Orta Düzey Bulgular
- Admin panelde sunucu IP ve anahtar görünürlüğü (bilgi ifşası)
- Ayrıntılı hata mesajları bazı uçlarda sızabilir
- Güvenlik header’ları eksik (`helmet`, `hpp` yok)

### Düşük Düzey / İyileştirmeler
- ENV/gizli yönetimi yetersiz; DB host/credentials kodda
- HTTPS/HSTS zorunluluğu yapılandırmada görünmüyor

---

### Önerilen Düzeltmeler (Kısa Yol Haritası)

Dalga 1 – Kritik Sertleştirme
- Tüm sabit anahtarları koddan kaldır, `.env` üzerinden yönet; anahtarları ROTATE et
- İstemcide statik API key kullanımını bırak; JWT tabanlı kullanıcı auth’a geç
- CORS’u domain allowlist ile sıkılaştır; gereksiz header’ları kapat
- `helmet`, `hpp`, `express-rate-limit` ekle; login/admin uçlarında agresif limit
- `cart` ve benzeri uçlarda `authenticateTenant`/kullanıcı doğrulaması zorunlu yap; IDOR kontrolü
- Prod’da istek gövdelerinin loglanmasını kapat ve hassas alanları maskele

Dalga 2 – Kriptografi ve Veri Migrasyonu
- AES-256-GCM + `crypto.createCipheriv`/`createDecipheriv` ve rastgele IV
- `ENCRYPTION_KEY` kalıcı ve `.env` kaynaklı olmalı
- Eski verilerin güvenli migrasyon planı (geçişte çift okuma stratejisi)

Dalga 3 – Operasyonel ve Altyapı Sertleştirme
- Hata mesajlarını kullanıcıya genel, iç loglara detay şeklinde ayır
- Nginx/Proxy katmanında HTTPS zorunlu, HSTS, güvenlik header’ları
- Secrets yönetimi (ör. Docker secrets/VAULT) ve CI/CD’de sızıntı taraması

---

### Hızlı Kontrol Listesi
- [ ] Admin ve Tenant API key’lerini kaldır/rotate et
- [ ] CORS allowlist uygula
- [ ] Rate limit + helmet + hpp ekle
- [ ] `cart` ve benzeri uçlarda auth/authorization şartı
- [ ] Prod loglarında gövde ve hassas alanları maskele/çıkar
- [ ] AES-GCM’e geç ve anahtarları `.env`’e al
- [ ] HTTPS/HSTS ve güvenlik header’larını etkinleştir

---

### Not
Bu rapor hızlı bir statik incelemeye dayanır. Düzeltmeler sonrası yeniden test (dinamik/pentest) önerilir.



---

### Düzeltme Adımları (Detaylı Uygulama)

1) Hardcoded Admin Key ve Tenant API Key (ifşa)
- Koddan sabit anahtarları kaldır, `.env` ile yönet ve anahtarları ROTATE et.
- Yeni anahtar üretimi:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

- Örnek `.env` (sunucu):

```bash
ADMIN_KEY=uydurulmus_yeni_admin_key
ENCRYPTION_KEY=32_bayt_hex_key_(64_hex_karakter)
CORS_ORIGINS=https://app.example.com,https://admin.example.com
NODE_ENV=production
```

- `serv/server.js` içinde sadece ortam değişkenini kullan ve yoksa başlatmayı durdur:

```js
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error('ADMIN_KEY is required');
}
```

- İstemci tarafında (mobil/web) varsayılan API key’i tamamen kaldır. Kimlik doğrulama JWT ile yapılmalı; API key son kullanıcıya dağıtılmamalı.
- Admin Panel: `ADMIN_KEY` sabitini sil. Bunun yerine oturum açma akışı kullan:
  - POST `/api/admin/login` → JWT ver (HttpOnly cookie veya kısa ömürlü Bearer)
  - Tüm admin uçlarında `Authorization: Bearer <token>` kullan.

2) CORS’u sıkılaştır
- Sadece izin verilen origin’ler:

```js
const cors = require('cors');
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));
```

3) Rate limiting, Helmet ve HPP ekle

```bash
npm i helmet hpp express-rate-limit
```

```js
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(hpp());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/users/login', authLimiter);
app.use('/api/admin', authLimiter);
```

4) Sepet uçlarını kimlik doğrulamasıyla koru (IDOR’u engelle)
- Kullanıcı kimliğini parametre/istek gövdesinden değil token’dan al.

```js
// Örnek: JWT doğrulama sonrası req.user.id set edildiğini varsayar
app.get('/api/cart', authenticateTenant, authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await poolWrapper.execute(
    `SELECT c.*, p.name, p.price, p.image, p.stock FROM cart c
     JOIN products p ON c.productId = p.id
     WHERE c.userId = ? AND c.tenantId = ? ORDER BY c.createdAt DESC`,
    [userId, req.tenant.id]
  );
  res.json({ success: true, data: rows });
});

app.post('/api/cart', authenticateTenant, authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity, variationString, selectedVariations } = req.body;
  // ... ek doğrulamalar ve tenantId eşlemesi
});
```

5) Kriptografiyi AES‑256‑GCM’e taşı ve anahtarı sabitle
- `.env` içinde 32 baytlık hex key kullan (`ENCRYPTION_KEY`).

```js
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encryptGCM(plainText) {
  const iv = require('crypto').randomBytes(12);
  const cipher = require('crypto').createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptGCM(payload) {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = require('crypto').createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}
```

- Geçiş stratejisi: Okurken önce GCM dene, başarısız olursa eski şemayı dene; arka planda toplu migrasyon job’ı ile alanları GCM’e çevir.

6) Loglamayı güvenli hale getir

```js
function maskSensitive(obj) {
  const clone = JSON.parse(JSON.stringify(obj || {}));
  const keys = ['password', 'newPassword', 'phone', 'email', 'card', 'cvv'];
  keys.forEach(k => { if (clone[k]) clone[k] = '***'; });
  return clone;
}

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.body) {
      console.log('REQ', req.method, req.path, maskSensitive(req.body));
    }
    next();
  });
}
```

7) Hata mesajlarını sadeleştir (kullanıcıya)

```js
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ success: false, message: 'Beklenmeyen bir hata oluştu' });
});
```

8) HTTPS/HSTS (Nginx örneği)

```nginx
server {
  listen 80;
  server_name app.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name app.example.com;
  # ssl_certificate ...; ssl_certificate_key ...
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;
  add_header Referrer-Policy no-referrer;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  location /api/ { proxy_pass http://127.0.0.1:3000/; }
}
```

9) Admin panel kimlik doğrulama akışı
- `ADMIN_KEY` kaldır. Giriş sayfası → `/api/admin/login` → HttpOnly cookie (tercih) veya kısa ömürlü Bearer.
- Tüm isteklerde cookie/bearer gönder; CORS’ta `credentials: true` olmalı.

10) Operasyonel adımlar
- Secrets’ları repo dışına taşı: `.env` ve deployment secret’ları (Docker secrets/VAULT).
- CI/CD’de sızıntı taraması ekle (örn. `gitleaks`).
- Düzeltmeler sonrası dinamik test ve gerektiğinde pentest.
