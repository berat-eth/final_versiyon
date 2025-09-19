import { apiService } from '../utils/api-service';
// Cache devre dışı: Hesabım sayfası için her zaman taze veri çekilecek

export interface CustomProductionRequest {
  id: number;
  requestNumber: string;
  status: 'pending' | 'review' | 'design' | 'production' | 'shipped' | 'completed' | 'cancelled';
  totalQuantity: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  // Teklif alanları (admin panelden gönderilen)
  quoteAmount?: number | null;
  quoteCurrency?: string | null;
  quoteStatus?: 'sent' | 'accepted' | 'rejected' | string | null;
  quoteNotes?: string | null;
  quotedAt?: string | null;
  quoteValidUntil?: string | null;
  items: CustomProductionItem[];
}

export interface CustomProductionItem {
  id: number;
  productId: number;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  quantity: number;
  customizations: {
    text: string;
    logo: string | null;
    color: string;
    position: 'front' | 'back' | 'left' | 'right';
    logoTransform?: {
      x: number;
      y: number;
      scale: number;
    };
    logoSize?: {
      width: number; // cm
      height: number; // cm
    };
  };
}

export interface CreateCustomProductionRequestData {
  userId: number;
  items: Array<{
    productId: number;
    productPrice: number;
    quantity: number;
    customizations: {
      text: string;
      logo: string | null;
      color: string;
      position: 'front' | 'back' | 'left' | 'right';
      logoTransform?: {
        x: number;
        y: number;
        scale: number;
      };
      logoSize?: {
        width: number; // cm
        height: number; // cm
      };
    };
  }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export class CustomProductionController {
  // Get all custom production requests for a user
  static async getCustomProductionRequests(
    userId: number,
    options: { limit?: number; offset?: number; status?: string; forceRefresh?: boolean } = {}
  ): Promise<CustomProductionRequest[]> {
    try {
      console.log(`🎨 Fetching custom production requests for user: ${userId}`);
      
      const { limit = 50, offset = 0, status, forceRefresh = false } = options;
      
      // Cache devre dışı

      // Try API
      const response = await apiService.getCustomProductionRequests(userId, { limit, offset, status, forceRefresh });
      if (response.success && response.data) {
        console.log(`✅ API returned ${response.data.length} custom production requests`);
        return response.data;
      }
      
      console.log('❌ No custom production requests found');
      return [];
    } catch (error) {
      console.error('❌ CustomProductionController - getCustomProductionRequests error:', error);
      return [];
    }
  }

  // Get single custom production request
  static async getCustomProductionRequest(
    userId: number, 
    requestId: number
  ): Promise<CustomProductionRequest | null> {
    try {
      console.log(`🎨 Fetching custom production request: ${requestId} for user: ${userId}`);
      
      // Cache devre dışı

      // Try API
      const response = await apiService.getCustomProductionRequest(userId, requestId);
      if (response.success && response.data) {
        console.log(`✅ API returned custom production request: ${response.data.requestNumber}`);
        return response.data;
      }
      
      console.log('❌ Custom production request not found');
      return null;
    } catch (error) {
      console.error('❌ CustomProductionController - getCustomProductionRequest error:', error);
      return null;
    }
  }

  // Create custom production request
  static async createCustomProductionRequest(
    data: CreateCustomProductionRequestData
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log(`🎨 Creating custom production request for user: ${data.userId}`);
      
      // Validate minimum quantity (100 units)
      const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity < 100) {
        return {
          success: false,
          message: `Minimum order quantity is 100 units. Current total: ${totalQuantity} units.`
        };
      }

      // Try API
      const response = await apiService.createCustomProductionRequest(data);
      if (response.success) {
        console.log(`✅ Custom production request created: ${response.data?.requestNumber}`);
        
        // Invalidate user's custom requests cache
        await this.invalidateUserCache(data.userId);
        
        return response;
      }
      
      return {
        success: false,
        message: response.message || 'Failed to create custom production request'
      };
    } catch (error) {
      console.error('❌ CustomProductionController - createCustomProductionRequest error:', error);
      return {
        success: false,
        message: 'Error creating custom production request'
      };
    }
  }

  // Update custom production request status (admin only)
  static async updateCustomProductionRequestStatus(
    requestId: number,
    status: string,
    options: {
      estimatedDeliveryDate?: string;
      actualDeliveryDate?: string;
      notes?: string;
    } = {}
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🎨 Updating custom production request status: ${requestId} to ${status}`);
      
      // Try API
      const response = await apiService.updateCustomProductionRequestStatus(requestId, status, options);
      if (response.success) {
        console.log(`✅ Custom production request status updated: ${requestId}`);
        
        // Invalidate all custom requests cache (since we don't know the userId)
        await this.invalidateAllCustomRequestsCache();
        
        return response;
      }
      
      return {
        success: false,
        message: response.message || 'Failed to update status'
      };
    } catch (error) {
      console.error('❌ CustomProductionController - updateCustomProductionRequestStatus error:', error);
      return {
        success: false,
        message: 'Error updating status'
      };
    }
  }

  // Get status text in Turkish
  static getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Talep Alındı',
      'review': 'Değerlendirme',
      'design': 'Tasarım',
      'production': 'Üretimde',
      'shipped': 'Kargolandı',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };
    
    return statusMap[status] || 'Bilinmiyor';
  }

  // Get status color
  static getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'pending': '#3B82F6',      // Blue
      'review': '#F59E0B',       // Yellow
      'design': '#8B5CF6',       // Purple
      'production': '#10B981',   // Green
      'shipped': '#06B6D4',      // Cyan
      'completed': '#059669',    // Dark Green
      'cancelled': '#EF4444'     // Red
    };
    
    return colorMap[status] || '#6B7280'; // Gray
  }

  // Cache invalidation helpers
  private static async invalidateUserCache(userId: number): Promise<void> {
    try {
      // Remove all cache entries for this user's custom requests
      const patterns = [
        `cache:custom_requests:${userId}:*`,
        `cache:custom_request:${userId}:*`
      ];
      
      // Note: AsyncStorage doesn't support pattern deletion, so we'll just let them expire
      // In a real implementation, you might want to maintain a list of cache keys
      console.log(`🧹 Invalidated cache for user ${userId} custom requests`);
    } catch (error) {
      console.error('❌ Error invalidating user cache:', error);
    }
  }

  private static async invalidateAllCustomRequestsCache(): Promise<void> {
    try {
      // In a real implementation, you would remove all custom request cache entries
      console.log(`🧹 Invalidated all custom requests cache`);
    } catch (error) {
      console.error('❌ Error invalidating all custom requests cache:', error);
    }
  }
}
