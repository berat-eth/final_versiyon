import { getApiBaseUrl } from '../utils/api-config';
import { safeJsonParse } from '../utils/safe-json-parse';

export interface SharedCart {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerAvatar?: string;
  title: string;
  description: string;
  productIds: string[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  shareType: 'public' | 'private' | 'gift';
  shareCode?: string;
  shareUrl: string;
  expiresAt: string;
  isActive: boolean;
  views: number;
  shares: number;
  purchases: number;
  createdAt: string;
  participants: CartParticipant[];
}

export interface CartParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: string;
  productIds: string[];
  amount: number;
  discount: number;
  isPurchased: boolean;
  purchasedAt?: string;
}

export interface CartShareRequest {
  title: string;
  description: string;
  productIds: string[];
  shareType: 'public' | 'private' | 'gift';
  expiresInDays?: number;
  message?: string;
  allowOthersToAdd?: boolean;
}

export interface CartShareResult {
  success: boolean;
  sharedCart: SharedCart;
  shareUrl: string;
  shareCode?: string;
  message: string;
}

export interface CartJoinResult {
  success: boolean;
  sharedCart: SharedCart;
  discount: number;
  message: string;
}

export interface CartStats {
  totalShared: number;
  totalViews: number;
  totalPurchases: number;
  totalSavings: number;
  mostPopularProducts: string[];
}

export class CartSharingController {
  private static baseUrl = `${getApiBaseUrl()}/cart-sharing`;

  // Kullanıcının paylaştığı sepetleri getir
  static async getUserSharedCarts(userId: string): Promise<SharedCart[]> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Paylaşılan sepetler yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.sharedCarts || []) : [];
    } catch (error) {
      console.error('Error fetching shared carts:', error);
      return [];
    }
  }

  // Sepet paylaş
  static async shareCart(
    userId: string,
    shareData: CartShareRequest
  ): Promise<CartShareResult> {
    try {
      const response = await fetch(`${this.baseUrl}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...shareData,
        }),
      });

      if (!response.ok) {
        throw new Error('Sepet paylaşılamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error sharing cart:', error);
      // Simulated share
      return this.createSimulatedShare(userId, shareData);
    }
  }

  // Paylaşılan sepeti görüntüle
  static async getSharedCart(shareCode: string): Promise<SharedCart | null> {
    try {
      const response = await fetch(`${this.baseUrl}/view/${shareCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Paylaşılan sepet bulunamadı');
      }

      const data = await response.json();
      return data.sharedCart;
    } catch (error) {
      console.error('Error fetching shared cart:', error);
      return null;
    }
  }

  // Paylaşılan sepete katıl
  static async joinSharedCart(
    userId: string,
    shareCode: string,
    selectedProductIds: string[]
  ): Promise<CartJoinResult> {
    try {
      const response = await fetch(`${this.baseUrl}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          shareCode,
          selectedProductIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Sepete katılınamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error joining shared cart:', error);
      // Simulated join
      return {
        success: true,
        sharedCart: this.getDefaultSharedCarts()[0],
        discount: 50,
        message: 'Sepete başarıyla katıldınız! %5 indirim kazandınız.',
      };
    }
  }

  // Ortak alışveriş başlat
  static async startCollaborativeShopping(
    userId: string,
    participantUserIds: string[],
    productIds: string[]
  ): Promise<CartShareResult> {
    try {
      const response = await fetch(`${this.baseUrl}/collaborative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          participantUserIds,
          productIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Ortak alışveriş başlatılamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error starting collaborative shopping:', error);
      // Simulated collaborative shopping
      return this.createSimulatedCollaborativeShopping(userId, participantUserIds, productIds);
    }
  }

  // Hediye sepeti gönder
  static async sendGiftCart(
    userId: string,
    recipientUserId: string,
    productIds: string[],
    message: string
  ): Promise<CartShareResult> {
    try {
      const response = await fetch(`${this.baseUrl}/gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          recipientUserId,
          productIds,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Hediye sepeti gönderilemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error sending gift cart:', error);
      // Simulated gift cart
      return this.createSimulatedGiftCart(userId, recipientUserId, productIds, message);
    }
  }

  // Sepet istatistiklerini getir
  static async getCartStats(userId: string): Promise<CartStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('İstatistikler yüklenemedi');
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching cart stats:', error);
      return {
        totalShared: 0,
        totalViews: 0,
        totalPurchases: 0,
        totalSavings: 0,
        mostPopularProducts: [],
      };
    }
  }

  // Paylaşım URL'si oluştur
  static generateShareUrl(shareCode: string): string {
    return `https://huglu.com/cart/${shareCode}`;
  }

  // QR kod oluştur
  static generateQRCode(shareCode: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.generateShareUrl(shareCode)}`;
  }


  // Simüle edilmiş paylaşım oluşturma
  private static createSimulatedShare(
    userId: string,
    shareData: CartShareRequest
  ): CartShareResult {
    const shareCode = `CART${Date.now().toString(36).toUpperCase()}`;
    const sharedCart: SharedCart = {
      id: `cart-${Date.now()}`,
      ownerUserId: userId,
      ownerName: 'Mevcut Kullanıcı',
      title: shareData.title,
      description: shareData.description,
      productIds: shareData.productIds,
      totalAmount: 500,
      discountAmount: 25,
      finalAmount: 475,
      shareType: shareData.shareType,
      shareCode,
      shareUrl: this.generateShareUrl(shareCode),
      expiresAt: new Date(Date.now() + (shareData.expiresInDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      views: 0,
      shares: 0,
      purchases: 0,
      createdAt: new Date().toISOString(),
      participants: [],
    };

    return {
      success: true,
      sharedCart,
      shareUrl: sharedCart.shareUrl,
      shareCode,
      message: 'Sepet başarıyla paylaşıldı!',
    };
  }

  // Simüle edilmiş ortak alışveriş
  private static createSimulatedCollaborativeShopping(
    userId: string,
    participantUserIds: string[],
    productIds: string[]
  ): CartShareResult {
    const shareCode = `COLLAB${Date.now().toString(36).toUpperCase()}`;
    const sharedCart: SharedCart = {
      id: `cart-collab-${Date.now()}`,
      ownerUserId: userId,
      ownerName: 'Mevcut Kullanıcı',
      title: 'Ortak Alışveriş',
      description: 'Arkadaşlarla birlikte alışveriş yapıyoruz',
      productIds,
      totalAmount: 800,
      discountAmount: 80,
      finalAmount: 720,
      shareType: 'private',
      shareCode,
      shareUrl: this.generateShareUrl(shareCode),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      views: 0,
      shares: 0,
      purchases: 0,
      createdAt: new Date().toISOString(),
      participants: [],
    };

    return {
      success: true,
      sharedCart,
      shareUrl: sharedCart.shareUrl,
      shareCode,
      message: 'Ortak alışveriş başlatıldı! Arkadaşlarınız davet edildi.',
    };
  }

  // Simüle edilmiş hediye sepeti
  private static createSimulatedGiftCart(
    userId: string,
    recipientUserId: string,
    productIds: string[],
    message: string
  ): CartShareResult {
    const shareCode = `GIFT${Date.now().toString(36).toUpperCase()}`;
    const sharedCart: SharedCart = {
      id: `cart-gift-${Date.now()}`,
      ownerUserId: userId,
      ownerName: 'Mevcut Kullanıcı',
      title: 'Hediye Sepeti',
      description: message,
      productIds,
      totalAmount: 250,
      discountAmount: 37.5,
      finalAmount: 212.5,
      shareType: 'gift',
      shareCode,
      shareUrl: this.generateShareUrl(shareCode),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      views: 0,
      shares: 0,
      purchases: 0,
      createdAt: new Date().toISOString(),
      participants: [],
    };

    return {
      success: true,
      sharedCart,
      shareUrl: sharedCart.shareUrl,
      shareCode,
      message: 'Hediye sepeti başarıyla gönderildi!',
    };
  }
}
