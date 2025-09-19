import { apiService } from '../utils/api-service';
import { NtfyService } from './NtfyService';

export class NotificationService {
  private static ntfyService = new NtfyService();

  // Sipariş durumu bildirimleri
  static async sendOrderStatusNotification(
    userId: number, 
    orderId: number, 
    status: string, 
    orderDetails?: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Backend'e bildirim gönder
      const response = await apiService.sendOrderStatusNotification(userId, orderId, status, orderDetails);
      
      if (response.success) {
        // Push notification gönder
        let title, message;
        
        switch (status) {
          case 'confirmed':
            title = '✅ Siparişiniz Onaylandı!';
            message = `Sipariş #${orderId} onaylandı ve hazırlanıyor.`;
            break;
          case 'shipped':
            title = '🚚 Siparişiniz Kargoya Verildi!';
            message = `Sipariş #${orderId} kargoya verildi.`;
            break;
          case 'delivered':
            title = '📦 Siparişiniz Teslim Edildi!';
            message = `Sipariş #${orderId} başarıyla teslim edildi.`;
            break;
          case 'cancelled':
            title = '❌ Siparişiniz İptal Edildi';
            message = `Sipariş #${orderId} iptal edildi.`;
            break;
          default:
            title = '📋 Sipariş Durumu Güncellendi';
            message = `Sipariş #${orderId} durumu güncellendi.`;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Order status notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Stok bildirimleri
  static async sendStockNotification(
    userId: number, 
    productId: number, 
    productName: string, 
    stockType: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendStockNotification(userId, productId, productName, stockType);
      
      if (response.success) {
        let title, message;
        
        if (stockType === 'low_stock') {
          title = '⚠️ Favori Ürününüz Stokta Kaldı!';
          message = `${productName} stokta kaldı! Hemen sipariş verin.`;
        } else if (stockType === 'back_in_stock') {
          title = '🎉 Favori Ürününüz Tekrar Stokta!';
          message = `${productName} tekrar stokta! Kaçırmayın.`;
        } else if (stockType === 'out_of_stock') {
          title = '😔 Ürün Stokta Yok';
          message = `${productName} stokta kalmadı.`;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Stock notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Fiyat bildirimleri
  static async sendPriceNotification(
    userId: number, 
    productId: number, 
    productName: string, 
    priceChange: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendPriceNotification(userId, productId, productName, priceChange);
      
      if (response.success) {
        let title, message;
        
        if (priceChange.type === 'decreased') {
          title = '💰 Fiyat Düştü!';
          message = `${productName} fiyatı %${priceChange.percentage} düştü!`;
        } else if (priceChange.type === 'increased') {
          title = '📈 Fiyat Artacak!';
          message = `${productName} fiyatı yarın artacak!`;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Price notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Kampanya bildirimleri
  static async sendCampaignNotification(
    userId: number, 
    campaign: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendCampaignNotification(userId, campaign);
      
      if (response.success) {
        let title, message;
        
        if (campaign.type === 'new_campaign') {
          title = '🎯 Yeni Kampanya!';
          message = campaign.name;
        } else if (campaign.type === 'ending_soon') {
          title = '⏰ Kampanya Son Saatler!';
          message = `${campaign.name} son ${campaign.timeLeft}!`;
        } else if (campaign.type === 'personal_offer') {
          title = '🎁 Özel Teklifiniz!';
          message = campaign.name;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Campaign notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Cüzdan bildirimleri
  static async sendWalletNotification(
    userId: number, 
    walletAction: string, 
    amount: number, 
    balance: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendWalletNotification(userId, walletAction, amount, balance);
      
      if (response.success) {
        let title, message;
        
        if (walletAction === 'deposit') {
          title = '💳 Cüzdanınıza Para Yüklendi!';
          message = `${amount} TL yüklendi. Bakiye: ${balance} TL`;
        } else if (walletAction === 'withdraw') {
          title = '💸 Cüzdanınızdan Para Çekildi';
          message = `${amount} TL çekildi. Kalan: ${balance} TL`;
        } else if (walletAction === 'payment') {
          title = '🛒 Ödeme Yapıldı';
          message = `${amount} TL ödeme yapıldı. Kalan: ${balance} TL`;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Wallet notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Güvenlik bildirimleri
  static async sendSecurityNotification(
    userId: number, 
    securityEvent: string, 
    details?: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendSecurityNotification(userId, securityEvent, details);
      
      if (response.success) {
        let title, message;
        
        switch (securityEvent) {
          case 'new_login':
            title = '🔐 Yeni Giriş';
            message = `Hesabınıza ${details?.device || 'yeni cihazdan'} giriş yapıldı.`;
            break;
          case 'password_changed':
            title = '🔑 Şifre Değiştirildi';
            message = 'Şifreniz başarıyla değiştirildi.';
            break;
          case 'suspicious_activity':
            title = '⚠️ Şüpheli Aktivite';
            message = 'Hesabınızda şüpheli aktivite tespit edildi.';
            break;
          case 'account_locked':
            title = '🔒 Hesap Kilitlendi';
            message = 'Güvenlik nedeniyle hesabınız kilitlendi.';
            break;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Security notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Kişiselleştirilmiş öneriler
  static async sendPersonalizedNotification(
    userId: number, 
    recommendation: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendPersonalizedNotification(userId, recommendation);
      
      if (response.success) {
        let title, message;
        
        if (recommendation.type === 'similar_products') {
          title = '👀 Bu Ürünü Beğendiniz Mi?';
          message = `${recommendation.productName} benzeri ürünler için tıklayın.`;
        } else if (recommendation.type === 'complementary_products') {
          title = '🛍️ Bu Ürünle Birlikte Alınan';
          message = `${recommendation.productName} ile birlikte alınan ürünler.`;
        } else if (recommendation.type === 'trending_products') {
          title = '🔥 Trend Ürünler';
          message = 'Bu hafta en çok beğenilen ürünleri keşfedin!';
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Personalized notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Zamanlanmış bildirimler
  static async sendScheduledNotification(
    userId: number, 
    scheduleType: string, 
    data: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendScheduledNotification(userId, scheduleType, data);
      
      if (response.success) {
        let title, message;
        
        if (scheduleType === 'weekly_summary') {
          title = '📊 Haftalık Özetiniz';
          message = `Bu hafta ${data.viewedProducts} ürün görüntülediniz.`;
        } else if (scheduleType === 'monthly_report') {
          title = '📈 Aylık Raporunuz';
          message = `Bu ay ${data.orders} sipariş verdiniz.`;
        } else if (scheduleType === 'birthday_wish') {
          title = '🎂 Doğum Gününüz Kutlu Olsun!';
          message = 'Özel indirim kodunuz: BIRTHDAY2024';
        } else if (scheduleType === 'anniversary') {
          title = '🎉 Üyelik Yıldönümünüz!';
          message = `${data.years} yıldır bizimlesiniz!`;
        }

        await this.ntfyService.presentLocalNotification(title, message);
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Scheduled notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }

  // Toplu bildirim gönderme
  static async sendBulkNotification(
    userIds: number[], 
    type: string, 
    title: string, 
    message: string, 
    data?: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiService.sendBulkNotification(userIds, type, title, message, data);
      
      if (response.success) {
        // Her kullanıcıya push notification gönder
        for (const userId of userIds) {
          await this.ntfyService.presentLocalNotification(title, message);
        }
        return { success: true };
      }
      
      return { success: false, message: 'Bildirim gönderilemedi' };
    } catch (error) {
      console.error('❌ Bulk notification failed:', error);
      return { success: false, message: 'Bildirim gönderilemedi' };
    }
  }
}
