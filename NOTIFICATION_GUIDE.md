# 📱 Bildirim Sistemi Kullanım Kılavuzu

Bu kılavuz, uygulamanızda bulunan tüm bildirim türlerini nasıl kullanacağınızı gösterir.

## 🚀 Hızlı Başlangıç

### Frontend'de Kullanım
```typescript
import { NotificationService } from '../services/NotificationService';

// Sipariş durumu bildirimi
await NotificationService.sendOrderStatusNotification(
  userId, 
  orderId, 
  'confirmed', 
  { trackingCode: 'ABC123' }
);

// Stok bildirimi
await NotificationService.sendStockNotification(
  userId, 
  productId, 
  'Test Ürün', 
  'low_stock'
);
```

### Backend'de Kullanım
```javascript
const { NotificationService } = require('./services/notification-service');

// Sipariş durumu bildirimi
await NotificationService.sendOrderStatusNotification(
  tenantId, 
  userId, 
  orderId, 
  'confirmed', 
  { trackingCode: 'ABC123' }
);
```

## 📋 Bildirim Türleri

### 1. 🛒 Sipariş Durumu Bildirimleri

#### Kullanım Alanları:
- Sipariş onaylandığında
- Kargoya verildiğinde
- Teslim edildiğinde
- İptal edildiğinde

#### Frontend Kullanımı:
```typescript
// Sipariş onaylandı
await NotificationService.sendOrderStatusNotification(
  userId, 
  orderId, 
  'confirmed'
);

// Kargoya verildi
await NotificationService.sendOrderStatusNotification(
  userId, 
  orderId, 
  'shipped',
  { trackingCode: 'ABC123' }
);

// Teslim edildi
await NotificationService.sendOrderStatusNotification(
  userId, 
  orderId, 
  'delivered'
);
```

#### Mesaj Örnekleri:
- ✅ "Siparişiniz Onaylandı! Sipariş #12345 hazırlanıyor."
- 🚚 "Siparişiniz Kargoya Verildi! Takip kodu: ABC123"
- 📦 "Siparişiniz Teslim Edildi! Değerlendirmenizi bekliyoruz."

### 2. 📦 Stok Bildirimleri

#### Kullanım Alanları:
- Favori ürün stokta kaldığında
- Ürün tekrar stokta olduğunda
- Ürün stokta kalmadığında

#### Frontend Kullanımı:
```typescript
// Stokta kalan ürün
await NotificationService.sendStockNotification(
  userId, 
  productId, 
  'Test Ürün', 
  'low_stock'
);

// Tekrar stokta olan ürün
await NotificationService.sendStockNotification(
  userId, 
  productId, 
  'Test Ürün', 
  'back_in_stock'
);
```

#### Mesaj Örnekleri:
- ⚠️ "Favori Ürününüz Stokta Kaldı! Test Ürün stokta kaldı!"
- 🎉 "Favori Ürününüz Tekrar Stokta! Test Ürün tekrar stokta!"

### 3. 💰 Fiyat Bildirimleri

#### Kullanım Alanları:
- Favori ürün fiyatı düştüğünde
- Fiyat artacağında

#### Frontend Kullanımı:
```typescript
// Fiyat düştü
await NotificationService.sendPriceNotification(
  userId, 
  productId, 
  'Test Ürün', 
  { 
    type: 'decreased', 
    percentage: 20, 
    newPrice: 80 
  }
);

// Fiyat artacak
await NotificationService.sendPriceNotification(
  userId, 
  productId, 
  'Test Ürün', 
  { 
    type: 'increased', 
    newPrice: 110 
  }
);
```

#### Mesaj Örnekleri:
- 💰 "Fiyat Düştü! Test Ürün fiyatı %20 düştü!"
- 📈 "Fiyat Artacak! Test Ürün fiyatı yarın artacak!"

### 4. 🎯 Kampanya Bildirimleri

#### Kullanım Alanları:
- Yeni kampanya duyuruları
- Kampanya bitiyor uyarıları
- Kişisel teklifler

#### Frontend Kullanımı:
```typescript
// Yeni kampanya
await NotificationService.sendCampaignNotification(
  userId, 
  {
    type: 'new_campaign',
    name: 'Yeni Kampanya',
    description: '100 TL üzeri %15 indirim'
  }
);

// Kampanya bitiyor
await NotificationService.sendCampaignNotification(
  userId, 
  {
    type: 'ending_soon',
    name: 'Son Saatler',
    timeLeft: '2 saat'
  }
);
```

#### Mesaj Örnekleri:
- 🎯 "Yeni Kampanya! 100 TL üzeri %15 indirim"
- ⏰ "Kampanya Son Saatler! Son 2 saat!"

### 5. 💳 Cüzdan Bildirimleri

#### Kullanım Alanları:
- Para yüklendiğinde
- Para çekildiğinde
- Ödeme yapıldığında

#### Frontend Kullanımı:
```typescript
// Para yüklendi
await NotificationService.sendWalletNotification(
  userId, 
  'deposit', 
  100, 
  250
);

// Para çekildi
await NotificationService.sendWalletNotification(
  userId, 
  'withdraw', 
  50, 
  200
);
```

#### Mesaj Örnekleri:
- 💳 "Cüzdanınıza Para Yüklendi! 100 TL yüklendi. Bakiye: 250 TL"
- 💸 "Cüzdanınızdan Para Çekildi 50 TL çekildi. Kalan: 200 TL"

### 6. 🔐 Güvenlik Bildirimleri

#### Kullanım Alanları:
- Yeni giriş yapıldığında
- Şifre değiştirildiğinde
- Şüpheli aktivite tespit edildiğinde

#### Frontend Kullanımı:
```typescript
// Yeni giriş
await NotificationService.sendSecurityNotification(
  userId, 
  'new_login',
  { device: 'iPhone 15' }
);

// Şifre değişikliği
await NotificationService.sendSecurityNotification(
  userId, 
  'password_changed'
);
```

#### Mesaj Örnekleri:
- 🔐 "Yeni Giriş Hesabınıza iPhone 15'ten giriş yapıldı."
- 🔑 "Şifre Değiştirildi Şifreniz başarıyla değiştirildi."

### 7. 🎨 Kişiselleştirilmiş Öneriler

#### Kullanım Alanları:
- Benzer ürün önerileri
- Tamamlayıcı ürün önerileri
- Trend ürünler

#### Frontend Kullanımı:
```typescript
// Benzer ürünler
await NotificationService.sendPersonalizedNotification(
  userId, 
  {
    type: 'similar_products',
    productName: 'Test Ürün'
  }
);

// Trend ürünler
await NotificationService.sendPersonalizedNotification(
  userId, 
  {
    type: 'trending_products'
  }
);
```

#### Mesaj Örnekleri:
- 👀 "Bu Ürünü Beğendiniz Mi? Test Ürün benzeri ürünler için tıklayın."
- 🔥 "Trend Ürünler Bu hafta en çok beğenilen ürünleri keşfedin!"

### 8. ⏰ Zamanlanmış Bildirimler

#### Kullanım Alanları:
- Haftalık özetler
- Aylık raporlar
- Doğum günü kutlamaları
- Üyelik yıldönümleri

#### Frontend Kullanımı:
```typescript
// Haftalık özet
await NotificationService.sendScheduledNotification(
  userId, 
  'weekly_summary',
  { viewedProducts: 15 }
);

// Doğum günü
await NotificationService.sendScheduledNotification(
  userId, 
  'birthday_wish',
  {}
);
```

#### Mesaj Örnekleri:
- 📊 "Haftalık Özetiniz Bu hafta 15 ürün görüntülediniz."
- 🎂 "Doğum Gününüz Kutlu Olsun! Özel indirim kodunuz: BIRTHDAY2024"

## 🔧 Gelişmiş Özellikler

### Toplu Bildirim Gönderme
```typescript
// Birden fazla kullanıcıya aynı bildirimi gönder
await NotificationService.sendBulkNotification(
  [userId1, userId2, userId3], 
  'campaign', 
  'Yeni Kampanya!', 
  '100 TL üzeri %15 indirim'
);
```

### Backend'de Toplu Bildirim
```javascript
// Backend'de toplu bildirim
await NotificationService.sendBulkNotification(
  tenantId, 
  [1, 2, 3, 4, 5], 
  'campaign', 
  'Yeni Kampanya!', 
  '100 TL üzeri %15 indirim'
);
```

## 🧪 Test Etme

Tüm bildirim türlerini test etmek için:

```bash
node test-notifications.js
```

## 📊 Bildirim İstatistikleri

Bildirimler `user_notifications` tablosunda saklanır:

```sql
SELECT 
  type,
  COUNT(*) as count,
  DATE(createdAt) as date
FROM user_notifications 
WHERE tenantId = 1 
GROUP BY type, DATE(createdAt)
ORDER BY date DESC;
```

## 🎯 En İyi Uygulamalar

1. **Zamanlama**: Bildirimleri kullanıcının aktif olduğu saatlerde gönderin
2. **Kişiselleştirme**: Kullanıcının ilgi alanlarına göre bildirim gönderin
3. **Sıklık**: Çok sık bildirim göndermeyin (günde max 3-5)
4. **İçerik**: Kısa ve net mesajlar yazın
5. **Test**: Yeni bildirim türlerini önce test edin

## 🚨 Hata Yönetimi

Tüm bildirim fonksiyonları hata durumunda güvenli şekilde çalışır:

```typescript
try {
  await NotificationService.sendOrderStatusNotification(userId, orderId, 'confirmed');
} catch (error) {
  console.error('Bildirim gönderilemedi:', error);
  // Uygulama çalışmaya devam eder
}
```

Bu sistem sayesinde kullanıcılarınızla etkili iletişim kurabilir, satış oranlarınızı artırabilir ve müşteri memnuniyetini yükseltebilirsiniz! 🎉✨
