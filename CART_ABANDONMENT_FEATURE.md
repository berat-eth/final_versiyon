# Sepet Terk Etme Bildirimi Özelliği

Bu özellik, kullanıcıların sepete ürün ekledikten sonra siparişi tamamlamadan çıkması durumunda otomatik bildirim gönderir.

## Özellikler

### 🛒 Sepet Kontrolü
- Kullanıcı çıkış yapmadan önce sepet durumu kontrol edilir
- Sepette ürün varsa bildirim gönderilir
- Hem kayıtlı kullanıcılar hem de misafir kullanıcılar için çalışır

### 📱 Bildirim Türleri
1. **Veritabanı Bildirimi**: Kullanıcının bildirim geçmişine eklenir
2. **Push Bildirimi**: Uygulama içi anlık bildirim gönderilir

### 🔧 Teknik Detaylar

#### Backend (server.js)
- **Endpoint**: `POST /api/cart/check-before-logout`
- **Parametreler**: `userId`, `deviceId` (misafir kullanıcılar için)
- **Fonksiyon**: Sepet kontrolü ve veritabanı bildirimi

#### Frontend
- **AppContext**: `logout()` fonksiyonu sepet kontrolü yapar ve push notification gönderir
- **ProfileScreen**: Çıkış işlemi sırasında sepet kontrolü
- **UserController**: Logout sırasında sepet kontrolü

#### Bildirim Servisleri
- **Push Notification**: `src/services/NtfyService.ts` (Frontend'de)
- **Database**: `user_notifications` tablosu (Backend'de)

## Kullanım

### 1. Kullanıcı Sepete Ürün Ekler
```javascript
// Normal sepet ekleme işlemi
await CartController.addToCart(userId, productId, quantity);
```

### 2. Kullanıcı Çıkış Yapar
```javascript
// AppContext logout fonksiyonu otomatik sepet kontrolü yapar
await logout();
```

### 3. Sistem Otomatik Kontrol Yapar
- Sepette ürün var mı?
- Varsa push notification gönder (frontend'de)
- Veritabanına bildirim kaydet (backend'de)
- Kullanıcıyı çıkış yap

## Bildirim Mesajları

### Push Bildirimi
- **Başlık**: "Sepetinizde Ürünler Var!"
- **İçerik**: "Sepetinizde X ürün var. Siparişinizi tamamlamak için geri dönün."

### Veritabanı Bildirimi
```json
{
  "type": "cart_abandonment",
  "title": "Sepetinizde Ürünler Var!",
  "message": "Sepetinizde 3 ürün var. Siparişinizi tamamlamak için geri dönün.",
  "data": {
    "cartItems": [...],
    "totalItems": 3,
    "totalPrice": 150.00,
    "userId": 123,
    "deviceId": "device-123"
  }
}
```

## Test Etme

Test dosyasını çalıştırarak özelliği test edebilirsiniz:

```bash
node test-cart-abandonment.js
```

## Yapılandırma

### Push Bildirimi
Expo Notifications modülü gerekli:
```bash
npm install expo-notifications
```

## Hata Yönetimi

- Push bildirimi başarısız olursa sistem çalışmaya devam eder
- Veritabanı bildirimi her zaman gönderilir
- Çıkış işlemi bildirim hatalarından etkilenmez

## Performans

- Sepet kontrolü hızlı yapılır (tek SQL sorgusu)
- Bildirimler asenkron olarak gönderilir
- Kullanıcı deneyimi etkilenmez
- Sistem kaynakları verimli kullanılır
