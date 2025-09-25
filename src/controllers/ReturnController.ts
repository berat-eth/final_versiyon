import { apiService } from '../utils/api-service';
import { UserController } from './UserController';

export interface ReturnRequest {
  id: number;
  orderId: number;
  orderItemId: number;
  productName: string;
  productImage: string;
  reason: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  requestDate: string;
  refundAmount: number;
  originalPrice: number;
  quantity: number;
}

export interface ReturnableOrderItem {
  orderItemId: number;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  returnStatus?: string;
  canReturn: boolean;
}

export interface ReturnableOrder {
  orderId: number;
  orderDate: string;
  orderStatus: string;
  items: ReturnableOrderItem[];
}

export class ReturnController {
  static async getUserReturnRequests(userId: number): Promise<ReturnRequest[]> {
    try {
      console.log(`📋 Getting return requests for user: ${userId}`);
      
      const response = await apiService.getReturnRequests(userId);
      if (response.success && response.data) {
        console.log(`✅ Retrieved ${response.data.length} return requests for user: ${userId}`);
        return response.data.map((apiRequest: any) => this.mapApiReturnRequest(apiRequest));
      }
      
      console.log('📱 No return requests found or API failed');
      return [];
    } catch (error) {
      console.error('❌ ReturnController - getUserReturnRequests error:', error);
      return [];
    }
  }

  static async createReturnRequest(
    orderId: number,
    orderItemId: number,
    reason: string,
    description?: string
  ): Promise<{
    success: boolean;
    message: string;
    returnRequestId?: number;
  }> {
    try {
      console.log(`🔄 Creating return request for order item: ${orderItemId}`);
      
      const userId = await UserController.getCurrentUserId();
      
      const requestData = {
        userId,
        orderId,
        orderItemId,
        reason,
        description
      };

      console.log(`🚀 Sending return request data:`, requestData);

      const response = await apiService.createReturnRequest(requestData);

      if (response.success && response.data?.returnRequestId) {
        console.log(`✅ Return request created successfully: ${response.data.returnRequestId}`);
        return { 
          success: true, 
          message: response.message || 'İade talebi başarıyla oluşturuldu',
          returnRequestId: response.data.returnRequestId
        };
      } else {
        console.log(`❌ Return request creation failed: ${response.message}`);
        return { success: false, message: response.message || 'İade talebi oluşturulamadı' };
      }
    } catch (error) {
      console.error('❌ ReturnController - createReturnRequest error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async cancelReturnRequest(returnRequestId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log(`❌ Cancelling return request: ${returnRequestId}`);
      
      const userId = await UserController.getCurrentUserId();
      const response = await apiService.cancelReturnRequest(returnRequestId, userId);
      
      if (response.success) {
        console.log(`✅ Return request cancelled successfully: ${returnRequestId}`);
        return { success: true, message: response.message || 'İade talebi iptal edildi' };
      } else {
        console.log(`❌ Failed to cancel return request: ${response.message}`);
        return { 
          success: false, 
          message: response.message || 'İade talebi iptal edilemedi' 
        };
      }
    } catch (error) {
      console.error(`❌ ReturnController - cancelReturnRequest error for request ${returnRequestId}:`, error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async getReturnableOrders(userId: number): Promise<ReturnableOrder[]> {
    try {
      console.log(`📦 Getting returnable orders for user: ${userId}`);
      
      const response = await apiService.getReturnableOrders(userId);
      if (response.success && response.data) {
        console.log(`✅ Retrieved ${response.data.length} returnable orders for user: ${userId}`);
        return response.data.map((apiOrder: any) => this.mapApiReturnableOrder(apiOrder));
      }
      
      console.log('📱 No returnable orders found or API failed');
      return [];
    } catch (error) {
      console.error('❌ ReturnController - getReturnableOrders error:', error);
      return [];
    }
  }

  static getStatusText(status: string): string {
    const statusTexts = {
      'pending': 'Beklemede',
      'approved': 'Onaylandı',
      'rejected': 'Reddedildi',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  static getStatusColor(status: string): string {
    const statusColors = {
      'pending': '#FF9800',
      'approved': '#2196F3',
      'rejected': '#F44336',
      'completed': '#4CAF50',
      'cancelled': '#757575'
    };
    return statusColors[status as keyof typeof statusColors] || '#757575';
  }

  static canCancelRequest(status: string): boolean {
    return status === 'pending';
  }

  static formatRequestDate(date: string): string {
    try {
      const requestDate = new Date(date);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return requestDate.toLocaleDateString('tr-TR', options);
    } catch (error) {
      console.error('❌ Error formatting request date:', error);
      return 'Tarih bilgisi yok';
    }
  }

  static getReturnReasons(): string[] {
    return [
      'Hasarlı ürün',
      'Yanlış ürün',
      'Beğenmedim',
      'Eksik parça',
      'Boyut problemi',
      'Kalite sorunu',
      'Diğer'
    ];
  }

  // Enhanced API mapping with better error handling
  private static mapApiReturnRequest(apiRequest: any): ReturnRequest {
    try {
      return {
        id: parseInt(apiRequest.id) || 0,
        orderId: parseInt(apiRequest.orderId) || 0,
        orderItemId: parseInt(apiRequest.orderItemId) || 0,
        productName: apiRequest.productName || 'Bilinmeyen Ürün',
        productImage: apiRequest.productImage || '',
        reason: apiRequest.reason || '',
        description: apiRequest.description || '',
        status: apiRequest.status || 'pending',
        requestDate: apiRequest.createdAt || new Date().toISOString(),
        refundAmount: parseFloat(apiRequest.refundAmount) || 0,
        originalPrice: parseFloat(apiRequest.originalPrice) || 0,
        quantity: parseInt(apiRequest.quantity) || 1
      };
    } catch (error) {
      console.error('❌ Error mapping API return request:', error, apiRequest);
      // Return a safe fallback return request
      return {
        id: 0,
        orderId: 0,
        orderItemId: 0,
        productName: 'Hata: Ürün bilgisi yüklenemedi',
        productImage: '',
        reason: 'Bilinmiyor',
        status: 'pending',
        requestDate: new Date().toISOString(),
        refundAmount: 0,
        originalPrice: 0,
        quantity: 1
      };
    }
  }

  private static mapApiReturnableOrder(apiOrder: any): ReturnableOrder {
    try {
      return {
        orderId: parseInt(apiOrder.orderId) || 0,
        orderDate: apiOrder.orderDate || new Date().toISOString(),
        orderStatus: apiOrder.orderStatus || 'unknown',
        items: (apiOrder.items || []).map((item: any) => ({
          orderItemId: parseInt(item.orderItemId) || 0,
          productName: item.productName || 'Bilinmeyen Ürün',
          productImage: item.productImage || '',
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          returnStatus: item.returnStatus || null,
          canReturn: Boolean(item.canReturn)
        }))
      };
    } catch (error) {
      console.error('❌ Error mapping API returnable order:', error, apiOrder);
      return {
        orderId: 0,
        orderDate: new Date().toISOString(),
        orderStatus: 'error',
        items: []
      };
    }
  }
}
