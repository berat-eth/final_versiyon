import apiService from '../utils/api-service';
import { Order, OrderItem, OrderStatus } from '../utils/types';
import { CartModel } from './Cart';
import { ProductModel } from './Product';

export class OrderModel {
  static async create(
    userId: number, 
    shippingAddress: string, 
    paymentMethod: string
  ): Promise<number | null> {
    try {
      // Sepet öğelerini al
      const cartItems = await CartModel.getCartItems(userId);
      if (cartItems.length === 0) return null;

      // Toplam tutarı hesapla
      const totalAmount = await CartModel.getCartTotal(userId);

      // Siparişi oluştur
      const orderResponse = await apiService.createOrder({
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress,
        paymentMethod
      });

      if (!orderResponse.success || !orderResponse.data) {
        return null;
      }

      const orderId = orderResponse.data.orderId;

      // Sipariş öğelerini ekle
      // Will be implemented in API
      for (const item of cartItems) {
        if (item.product) {
          // Stok güncelle
          await ProductModel.updateStock(item.productId, item.quantity);
        }
      }

      // Sepeti temizle
      await CartModel.clearCart(userId);

      return orderId;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  }

  static async getByUserId(userId: number): Promise<Order[]> {
    try {
      const response = await apiService.getUserOrders(userId);
      if (!response.success || !response.data) {
        return [];
      }
      
      const orders = response.data;

      if (!orders) return [];

      // Her sipariş için öğeleri al
      for (const order of orders) {
        // Will be implemented in API
        const items: any[] = [];

        order.items = items?.map(item => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: {
            id: item.productId,
            name: item.name,
            description: '',
            price: item.price,
            category: '',
            image: item.image,
            stock: 0,
            brand: '',
            rating: 0,
            reviewCount: 0
          }
        })) || [];
      }

      return orders;
    } catch (error) {
      console.error('Error getting user orders:', error);
      return [];
    }
  }

  static async getById(id: number): Promise<Order | null> {
    try {
      const response = await apiService.getOrderById(id);
      if (!response.success || !response.data) {
        return null;
      }
      
      const order = response.data;

      if (!order) return null;

      // Will be implemented in API
      const items: any[] = [];

      order.items = items?.map(item => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.productId,
          name: item.name,
          description: '',
          price: item.price,
          category: '',
          image: item.image,
          stock: 0,
          brand: item.brand,
          rating: 0,
          reviewCount: 0
        }
      })) || [];

      return order;
    } catch (error) {
      console.error('Error getting order by id:', error);
      return null;
    }
  }

  static async updateStatus(id: number, status: OrderStatus): Promise<boolean> {
    try {
      const response = await apiService.updateOrderStatus(id, status);
      return response.success;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  }

  static async cancel(id: number): Promise<boolean> {
    try {
      const order = await this.getById(id);
      if (!order || order.status !== OrderStatus.PENDING) {
        return false;
      }

      // Stokları geri yükle
      // Will be implemented in API
      for (const item of order.items) {
        // For now, just log the action
        console.log(`Restoring ${item.quantity} items to product ${item.productId}`);
      }

      // Sipariş durumunu güncelle
      return await this.updateStatus(id, OrderStatus.CANCELLED);
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }
}