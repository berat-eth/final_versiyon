import { OrderModel } from '../models/Order';
import { CartController } from './CartController';
import { UserController } from './UserController';
import { Order, OrderStatus } from '../utils/types';
import { apiService } from '../utils/api-service';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue, OfflineQueueItem } from '../utils/database';
import { detailedActivityLogger } from '../services/DetailedActivityLogger';

export class OrderController {
  static async createOrder(
    userId: number,
    shippingAddress: string,
    paymentMethod: string,
    city?: string,
    district?: string,
    fullAddress?: string
  ): Promise<{
    success: boolean;
    message: string;
    orderId?: number;
  }> {
    try {
      console.log(`🛒 Creating order for user: ${userId}`);
      
      // Sepet boş mu kontrol et
      const cartItems = await CartController.getCartItems(userId);
      if (cartItems.length === 0) {
        return { success: false, message: 'Sepetiniz boş' };
      }

      // Adres kontrolü
      if (!shippingAddress || shippingAddress.trim().length < 10) {
        return { success: false, message: 'Geçerli bir teslimat adresi giriniz' };
      }

      // Ödeme yöntemi kontrolü
      const validPaymentMethods = ['credit_card', 'debit_card', 'eft'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return { success: false, message: 'Geçersiz ödeme yöntemi' };
      }

      // Toplam tutarı hesapla
      const subtotal = CartController.calculateSubtotal(cartItems);
      const shipping = CartController.calculateShipping(subtotal);
      const totalAmount = CartController.calculateTotal(subtotal, shipping);

      console.log(`💰 Order calculation: subtotal ${subtotal}, shipping ${shipping}, total ${totalAmount}`);
      console.log(`📦 Order items: ${cartItems.length} items`);

      // Müşteri bilgilerini al
      const currentUser = await UserController.getCurrentUser();
      const customerInfo = {
        customerName: currentUser?.name || 'Misafir Kullanıcı',
        customerEmail: currentUser?.email || '',
        customerPhone: currentUser?.phone || ''
      };

      console.log(`👤 Customer info:`, customerInfo);

      // API'ye sipariş oluşturma isteği gönder
      const orderData = {
        userId,
        totalAmount,
        status: 'pending',
        shippingAddress,
        paymentMethod,
        city: city || '',
        district: district || '',
        fullAddress: fullAddress || shippingAddress,
        ...customerInfo, // Müşteri bilgilerini ekle
        items: cartItems.map(item => {
          const itemData = {
            productId: item.productId,
            quantity: item.quantity,
            price: item.product?.price || 0,
            // Ürün bilgilerini ekle
            productName: item.product?.name || `Ürün #${item.productId}`,
            productDescription: item.product?.description || '',
            productCategory: item.product?.category || '',
            productBrand: item.product?.brand || '',
            productImage: item.product?.image || ''
          };
          console.log(`📦 Order item with details:`, itemData);
          return itemData;
        })
      };

      console.log(`🚀 Sending order data:`, {
        ...orderData,
        itemsCount: orderData.items.length
      });

      const response = await apiService.createOrder(orderData);

      if (response.success && response.data?.orderId) {
        console.log(`✅ Order created successfully: ${response.data.orderId}`);
        
        // Detaylı sipariş oluşturma logu
        try {
          await detailedActivityLogger.logOrderStarted({
            orderId: response.data.orderId.toString(),
            orderNumber: (response.data as any).orderNumber,
            totalAmount: totalAmount,
            productCount: cartItems.length,
            products: cartItems.map(item => ({
              productId: item.productId,
              productName: item.product?.name || `Ürün #${item.productId}`,
              quantity: item.quantity,
              price: item.product?.price || 0,
              variations: item.selectedVariations ? this.extractVariationsFromCartItem(item) : undefined,
              variationString: item.variationString || ''
            })),
            paymentMethod: paymentMethod,
            paymentStatus: 'pending',
            orderStatus: 'pending',
            shippingAddress: shippingAddress,
            billingAddress: fullAddress || shippingAddress,
            action: 'started'
          });

          // Sipariş tamamlama logu
          await detailedActivityLogger.logOrderCompleted({
            orderId: response.data.orderId.toString(),
            orderNumber: (response.data as any).orderNumber,
            totalAmount: totalAmount,
            productCount: cartItems.length,
            products: cartItems.map(item => ({
              productId: item.productId,
              productName: item.product?.name || `Ürün #${item.productId}`,
              quantity: item.quantity,
              price: item.product?.price || 0,
              variations: item.selectedVariations ? this.extractVariationsFromCartItem(item) : undefined,
              variationString: item.variationString || ''
            })),
            paymentMethod: paymentMethod,
            paymentStatus: 'completed',
            orderStatus: 'confirmed',
            shippingAddress: shippingAddress,
            billingAddress: fullAddress || shippingAddress,
            action: 'completed'
          });
        } catch (logError) {
          console.warn('⚠️ Order logging failed:', logError);
        }
        
        // Sipariş oluşturulduktan sonra sepeti temizle
        // Kredi kartı ödemelerinde temizlik, ödeme başarıyla tamamlandıktan sonra UI katmanında yapılır
        if (paymentMethod !== 'credit_card') {
          await CartController.clearCart(userId);
        }
        
        return { 
          success: true, 
          message: 'Siparişiniz başarıyla oluşturuldu', 
          orderId: response.data.orderId
        };
      } else {
        console.log(`❌ Order creation failed: ${response.message}`);
        return { success: false, message: response.message || 'Sipariş oluşturulamadı' };
      }
    } catch (error) {
      console.error('❌ OrderController - createOrder error:', error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue('/orders', 'POST', {
          userId,
          shippingAddress,
          paymentMethod,
          city,
          district,
          fullAddress
        });
        return { success: false, message: 'Çevrimdışı mod - sipariş isteği kuyruğa eklendi' };
      }
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async getUserOrders(userId: number): Promise<Order[]> {
    try {
      console.log(`📋 Getting orders for user: ${userId}`);
      
      const response = await apiService.getUserOrders(userId);
      if (response.success && Array.isArray(response.data)) {
        console.log(`✅ Retrieved ${response.data.length} orders for user: ${userId}`);
        const orders = response.data.map((apiOrder: any) => this.mapApiOrderToAppOrder(apiOrder));
        
        // Sort orders by creation date (newest first)
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return orders;
      }
      
      console.log('📱 No orders found or API failed');
      return [];
    } catch (error) {
      console.error('❌ OrderController - getUserOrders error:', error);
      
      // If offline, try to get from offline queue
      if (error && typeof error === 'object' && 'isOffline' in error) {
        try {
          const offlineQueue = await getOfflineQueue();
          const pendingOrders = offlineQueue.filter((item: OfflineQueueItem) => 
            item.endpoint === '/orders' && item.method === 'POST'
          );
          
          if (pendingOrders.length > 0) {
            console.log(`📱 Found ${pendingOrders.length} pending offline orders`);
            // Convert pending orders to order objects (simplified)
            return pendingOrders.map((item: OfflineQueueItem, index: number) => ({
              id: -(index + 1), // Negative ID to indicate offline order
              userId: item.body?.userId || 0,
              totalAmount: 0, // Would need to calculate from cart
              status: OrderStatus.PENDING,
              createdAt: new Date(item.timestamp).toISOString(),
              shippingAddress: item.body?.shippingAddress || '',
              paymentMethod: item.body?.paymentMethod || '',
              items: []
            }));
          }
        } catch (queueError) {
          console.error('❌ Failed to get offline queue:', queueError);
        }
      }
      
      return [];
    }
  }

  static async getOrderById(orderId: number): Promise<Order | null> {
    try {
      console.log(`🔍 Getting order details for order: ${orderId}`);
      
      const response = await apiService.getOrderById(orderId);
      if (response.success && response.data) {
        console.log(`✅ Retrieved order details: ${response.data.id}`);
        return this.mapApiOrderToAppOrder(response.data);
      }
      
      console.log(`❌ Order not found: ${orderId}`);
      return null;
    } catch (error) {
      console.error(`❌ OrderController - getOrderById error for order ${orderId}:`, error);
      return null;
    }
  }

  static async getOrderDetails(orderId: number): Promise<Order | null> {
    try {
      return await this.getOrderById(orderId);
    } catch (error) {
      console.error(`❌ OrderController - getOrderDetails error for order ${orderId}:`, error);
      return null;
    }
  }

  static async cancelOrder(orderId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log(`❌ Cancelling order: ${orderId}`);
      
      const response = await apiService.cancelOrder(orderId);
      
      if (response.success) {
        console.log(`✅ Order cancelled successfully: ${orderId}`);
        return { success: true, message: 'Sipariş iptal edildi' };
      } else {
        console.log(`❌ Failed to cancel order: ${response.message}`);
        return { 
          success: false, 
          message: response.message || 'Sipariş iptal edilemedi. Sipariş zaten işlemde olabilir.' 
        };
      }
    } catch (error) {
      console.error(`❌ OrderController - cancelOrder error for order ${orderId}:`, error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue(`/orders/${orderId}/cancel`, 'PUT');
        return { success: false, message: 'Çevrimdışı mod - iptal isteği kuyruğa eklendi' };
      }
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async updateOrderStatus(orderId: number, status: OrderStatus): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log(`🔄 Updating order status: ${orderId} to ${status}`);
      
      const response = await apiService.updateOrderStatus(orderId, status);
      
      if (response.success) {
        console.log(`✅ Order status updated successfully: ${orderId} -> ${status}`);
        return { success: true, message: 'Sipariş durumu güncellendi' };
      } else {
        console.log(`❌ Failed to update order status: ${response.message}`);
        return { success: false, message: response.message || 'Sipariş durumu güncellenemedi' };
      }
    } catch (error) {
      console.error(`❌ OrderController - updateOrderStatus error for order ${orderId}:`, error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue(`/orders/${orderId}/status`, 'PUT', { status });
        return { success: false, message: 'Çevrimdışı mod - durum güncelleme isteği kuyruğa eklendi' };
      }
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static getStatusText(status: OrderStatus): string {
    const statusTexts = {
      [OrderStatus.PENDING]: 'Beklemede',
      [OrderStatus.PROCESSING]: 'İşleniyor',
      [OrderStatus.SHIPPED]: 'Kargoya Verildi',
      [OrderStatus.DELIVERED]: 'Teslim Edildi',
      [OrderStatus.CANCELLED]: 'İptal Edildi'
    };
    return statusTexts[status] || status;
  }

  static getStatusColor(status: OrderStatus): string {
    const statusColors = {
      [OrderStatus.PENDING]: '#FFA500',
      [OrderStatus.PROCESSING]: '#4169E1',
      [OrderStatus.SHIPPED]: '#9370DB',
      [OrderStatus.DELIVERED]: '#32CD32',
      [OrderStatus.CANCELLED]: '#DC143C'
    };
    return statusColors[status] || '#808080';
  }

  static getStatusTimeline(status: OrderStatus): Array<{
    title: string;
    description: string;
    completed: boolean;
  }> {
    const timeline = [
      {
        title: 'Sipariş Alındı',
        description: 'Siparişiniz başarıyla alındı',
        completed: true
      },
      {
        title: 'Hazırlanıyor',
        description: 'Siparişiniz hazırlanıyor',
        completed: status !== OrderStatus.PENDING
      },
      {
        title: 'Kargoya Verildi',
        description: 'Siparişiniz kargoya verildi',
        completed: status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED
      },
      {
        title: 'Teslim Edildi',
        description: 'Siparişiniz teslim edildi',
        completed: status === OrderStatus.DELIVERED
      }
    ];

    if (status === OrderStatus.CANCELLED) {
      timeline[1].title = 'İptal Edildi';
      timeline[1].description = 'Siparişiniz iptal edildi';
      timeline[1].completed = true;
      timeline[2].completed = false;
      timeline[3].completed = false;
    }

    return timeline;
  }

  static canCancelOrder(order: Order): boolean {
    return order.status === OrderStatus.PENDING;
  }

  static formatOrderDate(date: string): string {
    try {
      const orderDate = new Date(date);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return orderDate.toLocaleDateString('tr-TR', options);
    } catch (error) {
      console.error('❌ Error formatting order date:', error);
      return 'Tarih bilgisi yok';
    }
  }

  static getPaymentMethodText(method: string): string {
    const methods: { [key: string]: string } = {
      'credit_card': 'Kredi Kartı',
      'debit_card': 'Banka Kartı',
      'eft': 'EFT/Havale'
    };
    return methods[method] || method;
  }

  // Process offline order operations when back online
  static async processOfflineOrderOperations(): Promise<void> {
    try {
      console.log('🔄 Processing offline order operations...');
      
      const offlineQueue = await getOfflineQueue();
      const orderOperations = offlineQueue.filter((item: OfflineQueueItem) => 
        item.endpoint.startsWith('/orders')
      );
      
      if (orderOperations.length === 0) {
        console.log('📱 No offline order operations to process');
        return;
      }
      
      console.log(`📱 Processing ${orderOperations.length} offline order operations`);
      
      for (const operation of orderOperations) {
        try {
          // Process each operation based on its type
          if (operation.method === 'POST') {
            // Create order
            await apiService.createOrder(operation.body);
          } else if (operation.method === 'PUT') {
            if (operation.endpoint.includes('/status')) {
              // Update status
              const orderId = operation.endpoint.split('/')[2];
              await apiService.updateOrderStatus(parseInt(orderId), operation.body.status);
            } else if (operation.endpoint.includes('/cancel')) {
              // Cancel order
              const orderId = operation.endpoint.split('/')[2];
              await apiService.cancelOrder(parseInt(orderId));
            }
          }
          
          // Remove from offline queue
          await removeFromOfflineQueue(operation.id);
          console.log(`✅ Processed offline order operation: ${operation.method} ${operation.endpoint}`);
          
        } catch (operationError) {
          console.error(`❌ Failed to process offline order operation: ${operation.method} ${operation.endpoint}`, operationError);
          // Keep in queue for retry
        }
      }
      
      console.log('✅ Offline order operations processing completed');
    } catch (error) {
      console.error('❌ Error processing offline order operations:', error);
    }
  }

  // Get order statistics for user
  static async getOrderStats(userId: number): Promise<{
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  }> {
    try {
      const orders = await this.getUserOrders(userId);
      
      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
        processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
        shipped: orders.filter(o => o.status === OrderStatus.SHIPPED).length,
        delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
        cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length
      };
      
      console.log(`📊 Order stats for user ${userId}:`, stats);
      return stats;
    } catch (error) {
      console.error(`❌ Error getting order stats for user ${userId}:`, error);
      return {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      };
    }
  }

  // Enhanced API order mapping with better error handling
  private static mapApiOrderToAppOrder(apiOrder: any): Order {
    try {
      return {
        id: parseInt(apiOrder.id) || 0,
        userId: parseInt(apiOrder.userId) || 0,
        totalAmount: parseFloat(apiOrder.totalAmount) || 0,
        status: apiOrder.status as OrderStatus || OrderStatus.PENDING,
        createdAt: apiOrder.createdAt || new Date().toISOString(),
        shippingAddress: apiOrder.shippingAddress || '',
        paymentMethod: apiOrder.paymentMethod || '',
        items: (apiOrder.items || []).map((item: any) => ({
          id: parseInt(item.id) || 0,
          orderId: parseInt(item.orderId) || parseInt(apiOrder.id) || 0,
          productId: parseInt(item.productId) || 0,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          productName: item.productName || item.name || `Product ${item.productId}`,
          productDescription: item.productDescription || '',
          productCategory: item.productCategory || '',
          productBrand: item.productBrand || '',
          productImage: item.productImage || '',
          product: item.product || null
        })),
        customerName: apiOrder.customerName || '',
        customerEmail: apiOrder.customerEmail || '',
        customerPhone: apiOrder.customerPhone || ''
      };
    } catch (error) {
      console.error('❌ Error mapping API order:', error, apiOrder);
      // Return a safe fallback order
      return {
        id: 0,
        userId: 0,
        totalAmount: 0,
        status: OrderStatus.PENDING,
        createdAt: new Date().toISOString(),
        shippingAddress: 'Error loading address',
        paymentMethod: 'Unknown',
        items: []
      };
    }
  }

  // Helper function to extract variations from cart item
  private static extractVariationsFromCartItem(cartItem: any): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    if (cartItem.selectedVariations && typeof cartItem.selectedVariations === 'object') {
      Object.keys(cartItem.selectedVariations).forEach(key => {
        const variation = cartItem.selectedVariations[key];
        if (variation && variation.name && variation.value) {
          result[variation.name.toLowerCase()] = variation.value;
        }
      });
    }

    return result;
  }
}