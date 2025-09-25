import { apiService } from '../utils/api-service';

export interface CustomerSegment {
  id: number;
  name: string;
  description?: string;
  criteria: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  type: 'discount' | 'free_shipping' | 'bundle' | 'loyalty' | 'seasonal' | 'birthday' | 'abandoned_cart';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetSegmentId?: number;
  segmentName?: string;
  discountType: 'percentage' | 'fixed' | 'buy_x_get_y';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  applicableProducts: number[];
  excludedProducts: number[];
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAnalytics {
  id: number;
  userId: number;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  favoriteCategories: string[];
  favoriteBrands: string[];
  purchaseFrequency: number;
  customerLifetimeValue: number;
  lastActivityDate: string;
}

export interface ProductRecommendation {
  id: number;
  userId: number;
  productId: number;
  recommendationType: 'collaborative' | 'content_based' | 'hybrid' | 'trending' | 'similar';
  score: number;
  reason?: string;
  createdAt: string;
  expiresAt?: string;
  name?: string;
  price?: number;
  image?: string;
  category?: string;
  brand?: string;
}

export class CampaignController {
  // Customer Segmentation
  static async createSegment(segmentData: {
    name: string;
    description?: string;
    criteria: any;
  }): Promise<{ success: boolean; message: string; segmentId?: number }> {
    try {
      console.log('🎯 Creating customer segment:', segmentData);
      
      const response = await apiService.post('/campaigns/segments', segmentData);
      
      if (response.success) {
        console.log('✅ Customer segment created successfully');
        return { success: true, message: 'Müşteri segmenti oluşturuldu', segmentId: response.data?.segmentId };
      } else {
        console.log('❌ Failed to create customer segment:', response.message);
        return { success: false, message: response.message || 'Müşteri segmenti oluşturulamadı' };
      }
    } catch (error) {
      console.error('❌ CampaignController - createSegment error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async getSegments(): Promise<CustomerSegment[]> {
    try {
      console.log('🔄 Fetching customer segments...');
      
      const response = await apiService.get('/campaigns/segments');
      
      if (response.success && response.data) {
        console.log(`✅ Retrieved ${response.data.length} customer segments`);
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ CampaignController - getSegments error:', error);
      return [];
    }
  }

  static async updateSegment(segmentId: number, segmentData: {
    name?: string;
    description?: string;
    criteria?: any;
    isActive?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Updating customer segment:', segmentId, segmentData);
      
      const response = await apiService.put(`/campaigns/segments/${segmentId}`, segmentData);
      
      if (response.success) {
        console.log('✅ Customer segment updated successfully');
        return { success: true, message: 'Müşteri segmenti güncellendi' };
      } else {
        console.log('❌ Failed to update customer segment:', response.message);
        return { success: false, message: response.message || 'Müşteri segmenti güncellenemedi' };
      }
    } catch (error) {
      console.error('❌ CampaignController - updateSegment error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  // Campaign Management
  static async createCampaign(campaignData: {
    name: string;
    description?: string;
    type: Campaign['type'];
    targetSegmentId?: number;
    discountType?: 'percentage' | 'fixed' | 'buy_x_get_y';
    discountValue?: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    applicableProducts?: number[];
    excludedProducts?: number[];
    startDate?: string;
    endDate?: string;
    usageLimit?: number;
  }): Promise<{ success: boolean; message: string; campaignId?: number }> {
    try {
      console.log('🎪 Creating campaign:', campaignData);
      
      const response = await apiService.post('/campaigns', campaignData);
      
      if (response.success) {
        console.log('✅ Campaign created successfully');
        return { success: true, message: 'Kampanya oluşturuldu', campaignId: response.data?.campaignId };
      } else {
        console.log('❌ Failed to create campaign:', response.message);
        return { success: false, message: response.message || 'Kampanya oluşturulamadı' };
      }
    } catch (error) {
      console.error('❌ CampaignController - createCampaign error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async getCampaigns(): Promise<Campaign[]> {
    try {
      if (__DEV__) console.log('🔄 Fetching campaigns...');
      
      const response = await apiService.get('/campaigns');
      
      if (response.success && response.data) {
        if (__DEV__) console.log(`✅ Retrieved ${response.data.length} campaigns`);
        return response.data;
      }
      
      return [];
    } catch (error) {
      if (__DEV__) console.error('❌ CampaignController - getCampaigns error:', error);
      return [];
    }
  }

  static async getAvailableCampaigns(userId: number): Promise<Campaign[]> {
    try {
      if (__DEV__) console.log('🔄 Fetching available campaigns for user:', userId);
      
      const response = await apiService.get(`/campaigns/available/${userId}`);
      
      if (response.success && response.data) {
        if (__DEV__) console.log(`✅ Retrieved ${response.data.length} available campaigns`);
        return response.data;
      }
      
      return [];
    } catch (error) {
      if (__DEV__) console.error('❌ CampaignController - getAvailableCampaigns error:', error);
      return [];
    }
  }

  static async updateCampaign(campaignId: number, campaignData: {
    name?: string;
    description?: string;
    status?: Campaign['status'];
    discountType?: 'percentage' | 'fixed' | 'buy_x_get_y';
    discountValue?: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    applicableProducts?: number[];
    excludedProducts?: number[];
    startDate?: string;
    endDate?: string;
    usageLimit?: number;
    isActive?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Updating campaign:', campaignId, campaignData);
      
      const response = await apiService.put(`/campaigns/${campaignId}`, campaignData);
      
      if (response.success) {
        console.log('✅ Campaign updated successfully');
        return { success: true, message: 'Kampanya güncellendi' };
      } else {
        console.log('❌ Failed to update campaign:', response.message);
        return { success: false, message: response.message || 'Kampanya güncellenemedi' };
      }
    } catch (error) {
      console.error('❌ CampaignController - updateCampaign error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  // Customer Analytics
  static async getCustomerAnalytics(userId: number): Promise<CustomerAnalytics | null> {
    try {
      console.log('🔄 Fetching customer analytics for user:', userId);
      
      const response = await apiService.get(`/campaigns/analytics/${userId}`);
      
      if (response.success && response.data) {
        console.log('✅ Retrieved customer analytics');
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ CampaignController - getCustomerAnalytics error:', error);
      return null;
    }
  }

  // Product Recommendations
  static async getProductRecommendations(
    userId: number, 
    options: { limit?: number; type?: ProductRecommendation['recommendationType'] } = {}
  ): Promise<ProductRecommendation[]> {
    try {
      console.log('🔄 Fetching product recommendations for user:', userId, options);
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.type) queryParams.append('type', options.type);
      
      const url = `/campaigns/recommendations/${userId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiService.get(url);
      
      if (response.success && response.data) {
        console.log(`✅ Retrieved ${response.data.length} product recommendations`);
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ CampaignController - getProductRecommendations error:', error);
      return [];
    }
  }

  // Campaign Usage Tracking
  static async trackCampaignUsage(usageData: {
    campaignId: number;
    userId: number;
    orderId?: number;
    discountAmount?: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📊 Tracking campaign usage:', usageData);
      
      const response = await apiService.post('/campaigns/usage', usageData);
      
      if (response.success) {
        console.log('✅ Campaign usage tracked successfully');
        return { success: true, message: 'Kampanya kullanımı kaydedildi' };
      } else {
        console.log('❌ Failed to track campaign usage:', response.message);
        return { success: false, message: response.message || 'Kampanya kullanımı kaydedilemedi' };
      }
    } catch (error) {
      console.error('❌ CampaignController - trackCampaignUsage error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  // Campaign Validation
  static validateCampaignForUser(campaign: Campaign, userOrderAmount: number, userCart: any[]): {
    isValid: boolean;
    reason?: string;
    discountAmount?: number;
  } {
    try {
      // Check if campaign is active
      if (!campaign.isActive || campaign.status !== 'active') {
        return { isValid: false, reason: 'Kampanya aktif değil' };
      }

      // Check date range
      const now = new Date();
      if (campaign.startDate && new Date(campaign.startDate) > now) {
        return { isValid: false, reason: 'Kampanya henüz başlamadı' };
      }
      if (campaign.endDate && new Date(campaign.endDate) < now) {
        return { isValid: false, reason: 'Kampanya süresi doldu' };
      }

      // Check usage limit
      if (campaign.usageLimit && campaign.usedCount >= campaign.usageLimit) {
        return { isValid: false, reason: 'Kampanya kullanım limiti doldu' };
      }

      // Check minimum order amount
      if (campaign.minOrderAmount && userOrderAmount < campaign.minOrderAmount) {
        return { 
          isValid: false, 
          reason: `Minimum sipariş tutarı ${campaign.minOrderAmount} TL olmalı` 
        };
      }

      // Check applicable products
      if (campaign.applicableProducts && campaign.applicableProducts.length > 0) {
        const hasApplicableProduct = userCart.some(item => 
          campaign.applicableProducts!.includes(item.productId)
        );
        if (!hasApplicableProduct) {
          return { isValid: false, reason: 'Kampanya bu ürünler için geçerli değil' };
        }
      }

      // Check excluded products
      if (campaign.excludedProducts && campaign.excludedProducts.length > 0) {
        const hasExcludedProduct = userCart.some(item => 
          campaign.excludedProducts!.includes(item.productId)
        );
        if (hasExcludedProduct) {
          return { isValid: false, reason: 'Sepetinizde kampanya dışı ürün bulunuyor' };
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (campaign.discountType === 'percentage') {
        discountAmount = (userOrderAmount * campaign.discountValue) / 100;
      } else if (campaign.discountType === 'fixed') {
        discountAmount = campaign.discountValue;
      }

      // Apply maximum discount limit
      if (campaign.maxDiscountAmount && discountAmount > campaign.maxDiscountAmount) {
        discountAmount = campaign.maxDiscountAmount;
      }

      return { 
        isValid: true, 
        discountAmount: Math.min(discountAmount, userOrderAmount) // Can't discount more than order amount
      };

    } catch (error) {
      console.error('❌ CampaignController - validateCampaignForUser error:', error);
      return { isValid: false, reason: 'Kampanya doğrulama hatası' };
    }
  }

  // Helper method to get campaign type display name
  static getCampaignTypeDisplayName(type: Campaign['type']): string {
    const typeNames: Record<Campaign['type'], string> = {
      discount: 'İndirim',
      free_shipping: 'Ücretsiz Kargo',
      bundle: 'Paket Kampanyası',
      loyalty: 'Sadakat Programı',
      seasonal: 'Mevsimsel',
      birthday: 'Doğum Günü',
      abandoned_cart: 'Terk Edilen Sepet'
    };
    return typeNames[type] || type;
  }

  // Helper method to get campaign status display name
  static getCampaignStatusDisplayName(status: Campaign['status']): string {
    const statusNames: Record<Campaign['status'], string> = {
      draft: 'Taslak',
      active: 'Aktif',
      paused: 'Duraklatıldı',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };
    return statusNames[status] || status;
  }
}
