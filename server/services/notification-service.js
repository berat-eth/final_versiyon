const { poolWrapper } = require('../orm/sequelize');

class NotificationService {
  // Sipariş durumu bildirimleri
  static async sendOrderStatusNotification(tenantId, userId, orderId, status, orderDetails = {}) {
    try {
      let title, message;
      
      switch (status) {
        case 'confirmed':
          title = '✅ Siparişiniz Onaylandı!';
          message = `Sipariş #${orderId} onaylandı ve hazırlanıyor.`;
          break;
        case 'shipped':
          title = '🚚 Siparişiniz Kargoya Verildi!';
          message = `Sipariş #${orderId} kargoya verildi. Takip kodu: ${orderDetails.trackingCode || 'Yakında'}`;
          break;
        case 'delivered':
          title = '📦 Siparişiniz Teslim Edildi!';
          message = `Sipariş #${orderId} başarıyla teslim edildi. Değerlendirmenizi bekliyoruz.`;
          break;
        case 'cancelled':
          title = '❌ Siparişiniz İptal Edildi';
          message = `Sipariş #${orderId} iptal edildi. ${orderDetails.reason || 'Detaylar için iletişime geçin.'}`;
          break;
        default:
          title = '📋 Sipariş Durumu Güncellendi';
          message = `Sipariş #${orderId} durumu güncellendi.`;
      }

      await this.createNotification(tenantId, userId, 'order_status', title, message, {
        orderId,
        status,
        ...orderDetails
      });

      console.log(`📱 Order status notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Order status notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Stok bildirimleri
  static async sendStockNotification(tenantId, userId, productId, productName, stockType) {
    try {
      let title, message;
      
      if (stockType === 'low_stock') {
        title = '⚠️ Favori Ürününüz Stokta Kaldı!';
        message = `${productName} stokta kaldı! Hemen sipariş verin.`;
      } else if (stockType === 'back_in_stock') {
        title = '🎉 Favori Ürününüz Tekrar Stokta!';
        message = `${productName} tekrar stokta! Kaçırmayın.`;
      } else if (stockType === 'out_of_stock') {
        title = '😔 Ürün Stokta Yok';
        message = `${productName} stokta kalmadı. Stok geldiğinde bildirim alacaksınız.`;
      }

      await this.createNotification(tenantId, userId, 'stock_alert', title, message, {
        productId,
        productName,
        stockType
      });

      console.log(`📱 Stock notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Stock notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Fiyat bildirimleri
  static async sendPriceNotification(tenantId, userId, productId, productName, priceChange) {
    try {
      let title, message;
      
      if (priceChange.type === 'decreased') {
        title = '💰 Fiyat Düştü!';
        message = `${productName} fiyatı %${priceChange.percentage} düştü! Yeni fiyat: ${priceChange.newPrice} TL`;
      } else if (priceChange.type === 'increased') {
        title = '📈 Fiyat Artacak!';
        message = `${productName} fiyatı yarın ${priceChange.newPrice} TL olacak!`;
      }

      await this.createNotification(tenantId, userId, 'price_alert', title, message, {
        productId,
        productName,
        priceChange
      });

      console.log(`📱 Price notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Price notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Kampanya bildirimleri
  static async sendCampaignNotification(tenantId, userId, campaign) {
    try {
      let title, message;
      
      if (campaign.type === 'new_campaign') {
        title = '🎯 Yeni Kampanya!';
        message = `${campaign.name} - ${campaign.description}`;
      } else if (campaign.type === 'ending_soon') {
        title = '⏰ Kampanya Son Saatler!';
        message = `${campaign.name} son ${campaign.timeLeft}! Kaçırmayın.`;
      } else if (campaign.type === 'personal_offer') {
        title = '🎁 Özel Teklifiniz!';
        message = `${campaign.name} - Sadece sizin için!`;
      }

      await this.createNotification(tenantId, userId, 'campaign', title, message, {
        campaignId: campaign.id,
        campaignType: campaign.type,
        ...campaign
      });

      console.log(`📱 Campaign notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Campaign notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Cüzdan bildirimleri
  static async sendWalletNotification(tenantId, userId, walletAction, amount, balance) {
    try {
      let title, message;
      
      if (walletAction === 'deposit') {
        title = '💳 Cüzdanınıza Para Yüklendi!';
        message = `Cüzdanınıza ${amount} TL yüklendi. Toplam bakiye: ${balance} TL`;
      } else if (walletAction === 'withdraw') {
        title = '💸 Cüzdanınızdan Para Çekildi';
        message = `Cüzdanınızdan ${amount} TL çekildi. Kalan bakiye: ${balance} TL`;
      } else if (walletAction === 'payment') {
        title = '🛒 Ödeme Yapıldı';
        message = `Sipariş ödemesi ${amount} TL cüzdanınızdan çekildi. Kalan bakiye: ${balance} TL`;
      }

      await this.createNotification(tenantId, userId, 'wallet', title, message, {
        walletAction,
        amount,
        balance
      });

      console.log(`📱 Wallet notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Wallet notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Güvenlik bildirimleri
  static async sendSecurityNotification(tenantId, userId, securityEvent, details = {}) {
    try {
      let title, message;
      
      switch (securityEvent) {
        case 'new_login':
          title = '🔐 Yeni Giriş';
          message = `Hesabınıza ${details.device || 'yeni cihazdan'} giriş yapıldı.`;
          break;
        case 'password_changed':
          title = '🔑 Şifre Değiştirildi';
          message = 'Şifreniz başarıyla değiştirildi.';
          break;
        case 'suspicious_activity':
          title = '⚠️ Şüpheli Aktivite';
          message = 'Hesabınızda şüpheli aktivite tespit edildi. Lütfen kontrol edin.';
          break;
        case 'account_locked':
          title = '🔒 Hesap Kilitlendi';
          message = 'Güvenlik nedeniyle hesabınız geçici olarak kilitlendi.';
          break;
      }

      await this.createNotification(tenantId, userId, 'security', title, message, {
        securityEvent,
        ...details
      });

      console.log(`📱 Security notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Security notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Kişiselleştirilmiş öneriler
  static async sendPersonalizedNotification(tenantId, userId, recommendation) {
    try {
      let title, message;
      
      if (recommendation.type === 'similar_products') {
        title = '👀 Bu Ürünü Beğendiniz Mi?';
        message = `${recommendation.productName} benzeri ürünler için tıklayın.`;
      } else if (recommendation.type === 'complementary_products') {
        title = '🛍️ Bu Ürünle Birlikte Alınan';
        message = `${recommendation.productName} ile birlikte alınan popüler ürünler.`;
      } else if (recommendation.type === 'trending_products') {
        title = '🔥 Trend Ürünler';
        message = 'Bu hafta en çok beğenilen ürünleri keşfedin!';
      }

      await this.createNotification(tenantId, userId, 'recommendation', title, message, {
        recommendationType: recommendation.type,
        ...recommendation
      });

      console.log(`📱 Personalized notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Personalized notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Zamanlanmış bildirimler
  static async sendScheduledNotification(tenantId, userId, scheduleType, data) {
    try {
      let title, message;
      
      if (scheduleType === 'weekly_summary') {
        title = '📊 Haftalık Özetiniz';
        message = `Bu hafta ${data.viewedProducts} ürün görüntülediniz. Favorilerinizi kontrol edin.`;
      } else if (scheduleType === 'monthly_report') {
        title = '📈 Aylık Raporunuz';
        message = `Bu ay ${data.orders} sipariş verdiniz. Toplam harcama: ${data.totalSpent} TL`;
      } else if (scheduleType === 'birthday_wish') {
        title = '🎂 Doğum Gününüz Kutlu Olsun!';
        message = 'Özel indirim kodunuz: BIRTHDAY2024';
      } else if (scheduleType === 'anniversary') {
        title = '🎉 Üyelik Yıldönümünüz!';
        message = `${data.years} yıldır bizimlesiniz! Özel teşekkür indirimi.`;
      }

      await this.createNotification(tenantId, userId, 'scheduled', title, message, {
        scheduleType,
        ...data
      });

      console.log(`📱 Scheduled notification sent: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Scheduled notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Genel bildirim oluşturma
  static async createNotification(tenantId, userId, type, title, message, data = {}) {
    try {
      await poolWrapper.execute(
        'INSERT INTO user_notifications (tenantId, userId, type, title, message, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tenantId, userId, type, title, message, JSON.stringify(data), new Date().toISOString()]
      );
      
      return { success: true };
    } catch (error) {
      console.error('❌ Create notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Toplu bildirim gönderme
  static async sendBulkNotification(tenantId, userIds, type, title, message, data = {}) {
    try {
      const promises = userIds.map(userId => 
        this.createNotification(tenantId, userId, type, title, message, data)
      );
      
      await Promise.all(promises);
      console.log(`📱 Bulk notification sent to ${userIds.length} users: ${title}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Bulk notification failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { NotificationService };
