import { getApiBaseUrl } from '../utils/api-config';
import { safeJsonParse } from '../utils/safe-json-parse';

export interface BuyTogetherOffer {
  id: string;
  name: string;
  description: string;
  discountPercentage: number;
  minParticipants: number;
  maxParticipants?: number;
  currentParticipants: number;
  products: BuyTogetherProduct[];
  totalOriginalPrice: number;
  totalDiscountedPrice: number;
  totalSavings: number;
  estimatedSavings: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  participants: BuyTogetherParticipant[];
  category: string;
  tags: string[];
}

export interface BuyTogetherProduct {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  image: string;
  category: string;
  isRequired: boolean;
  maxQuantity: number;
}

export interface BuyTogetherParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  selectedProducts: SelectedProduct[];
  totalAmount: number;
  savings: number;
  joinedAt: string;
  isPurchased: boolean;
  purchasedAt?: string;
}

export interface SelectedProduct {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateBuyTogetherRequest {
  name: string;
  description: string;
  productIds: string[];
  discountPercentage: number;
  minParticipants: number;
  maxParticipants?: number;
  endDate: string;
  category: string;
  tags?: string[];
}

export interface JoinBuyTogetherRequest {
  userId: string;
  offerId: string;
  selectedProducts: SelectedProduct[];
}

export interface BuyTogetherResult {
  success: boolean;
  offer: BuyTogetherOffer;
  savings: number;
  message: string;
}

export interface BuyTogetherStats {
  totalOffers: number;
  activeOffers: number;
  totalSavings: number;
  totalParticipants: number;
  mostPopularProducts: string[];
}

export class BuyTogetherController {
  private static baseUrl = `${getApiBaseUrl()}/buy-together`;

  // Aktif birlikte al tekliflerini getir
  static async getActiveOffers(userId: string): Promise<BuyTogetherOffer[]> {
    try {
      const response = await fetch(`${this.baseUrl}/active/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Birlikte al teklifleri yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.offers || []) : [];
    } catch (error) {
      console.error('Error fetching buy together offers:', error);
      return [];
    }
  }

  // Yeni birlikte al teklifi oluştur
  static async createOffer(
    userId: string,
    offerData: CreateBuyTogetherRequest
  ): Promise<BuyTogetherOffer> {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...offerData,
        }),
      });

      if (!response.ok) {
        throw new Error('Teklif oluşturulamadı');
      }

      const data = await response.json();
      return data.offer;
    } catch (error) {
      console.error('Error creating buy together offer:', error);
      // Simulated offer creation
      return this.createSimulatedOffer(offerData);
    }
  }

  // Birlikte al teklifine katıl
  static async joinOffer(
    joinData: JoinBuyTogetherRequest
  ): Promise<BuyTogetherResult> {
    try {
      const response = await fetch(`${this.baseUrl}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinData),
      });

      if (!response.ok) {
        throw new Error('Teklife katılınamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error joining buy together offer:', error);
      // Simulated join
      return {
        success: true,
        offer: this.getDefaultOffers()[0],
        savings: 110,
        message: 'Teklife başarıyla katıldınız!',
      };
    }
  }

  // Teklif detaylarını getir
  static async getOfferDetails(offerId: string): Promise<BuyTogetherOffer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/details/${offerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Teklif detayları yüklenemedi');
      }

      const data = await response.json();
      return data.offer;
    } catch (error) {
      console.error('Error fetching offer details:', error);
      return null;
    }
  }

  // Kullanıcının birlikte al geçmişini getir
  static async getUserHistory(userId: string): Promise<BuyTogetherOffer[]> {
    try {
      const response = await fetch(`${this.baseUrl}/history/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Geçmiş yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.offers || []) : [];
    } catch (error) {
      console.error('Error fetching user history:', error);
      return [];
    }
  }

  // Birlikte al istatistiklerini getir
  static async getStats(userId: string): Promise<BuyTogetherStats> {
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
      console.error('Error fetching stats:', error);
      return {
        totalOffers: 0,
        activeOffers: 0,
        totalSavings: 0,
        totalParticipants: 0,
        mostPopularProducts: [],
      };
    }
  }

  // Kategoriye göre teklifleri getir
  static async getOffersByCategory(
    category: string,
    userId: string
  ): Promise<BuyTogetherOffer[]> {
    try {
      const response = await fetch(`${this.baseUrl}/category/${category}/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Kategori teklifleri yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.offers || []) : [];
    } catch (error) {
      console.error('Error fetching offers by category:', error);
      return [];
    }
  }


  // Simüle edilmiş teklif oluşturma
  private static createSimulatedOffer(offerData: CreateBuyTogetherRequest): BuyTogetherOffer {
    return {
      id: `offer-${Date.now()}`,
      name: offerData.name,
      description: offerData.description,
      discountPercentage: offerData.discountPercentage,
      minParticipants: offerData.minParticipants,
      maxParticipants: offerData.maxParticipants,
      currentParticipants: 1,
      products: offerData.productIds.map((id, index) => ({
        id,
        name: `Ürün ${index + 1}`,
        originalPrice: 100 + index * 50,
        discountedPrice: (100 + index * 50) * (1 - offerData.discountPercentage / 100),
        image: `/images/product-${id}.jpg`,
        category: offerData.category,
        isRequired: index === 0,
        maxQuantity: 2,
      })),
      totalOriginalPrice: offerData.productIds.length * 150,
      totalDiscountedPrice: offerData.productIds.length * 150 * (1 - offerData.discountPercentage / 100),
      totalSavings: offerData.productIds.length * 150 * (offerData.discountPercentage / 100),
      estimatedSavings: offerData.productIds.length * 150 * (offerData.discountPercentage / 100) * offerData.minParticipants,
      startDate: new Date().toISOString(),
      endDate: offerData.endDate,
      isActive: true,
      participants: [],
      category: offerData.category,
      tags: offerData.tags || [],
    };
  }
}
