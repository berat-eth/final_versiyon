import apiService from '../utils/api-service';
import { CartItem, Product, ProductVariationOption } from '../utils/types';

export class CartModel {
  static async addItem(
    userId: number, 
    productId: number, 
    quantity: number,
    selectedVariations?: { [key: string]: ProductVariationOption }
  ): Promise<boolean> {
    try {
      // Create variation string for comparison
      const variationString = selectedVariations ? 
        Object.entries(selectedVariations)
          .map(([key, option]) => `${key}:${option.value}`)
          .sort()
          .join('|') : '';

      // Check if item with same variations exists
      // Will be implemented in the API
      const existingItem = null;

      // Add new item with variations
      const response = await apiService.addToCart({
        userId,
        productId,
        quantity,
        variationString,
        selectedVariations: selectedVariations || {}
      });
      
      return response.success;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return false;
    }
  }

  static async removeItem(id: number): Promise<boolean> {
    try {
      const response = await apiService.removeFromCart(id);
      return response.success;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return false;
    }
  }

  static async updateQuantity(id: number, quantity: number): Promise<boolean> {
    try {
      if (quantity <= 0) {
        return await this.removeItem(id);
      }
      
      const response = await apiService.updateCartQuantity(id, quantity);
      return response.success;
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      return false;
    }
  }

  static async getCartItems(userId: number): Promise<CartItem[]> {
    try {
      const response = await apiService.getCartItems(userId);
      if (!response.success || !response.data) {
        return [];
      }
      
      const items = response.data;

      return items?.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        userId: item.userId,
        selectedVariations: item.selectedVariations && item.selectedVariations !== 'undefined' ? JSON.parse(item.selectedVariations) : undefined,
        variationString: item.variationString,
        product: {
          id: item.productId,
          name: item.name,
          description: '',
          price: item.price,
          category: '',
          image: item.image,
          stock: item.stock,
          brand: item.brand,
          rating: 0,
          reviewCount: 0
        }
      })) || [];
    } catch (error) {
      console.error('Error getting cart items:', error);
      return [];
    }
  }

  static async clearCart(userId: number): Promise<boolean> {
    try {
      const response = await apiService.clearCart(userId);
      return response.success;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  static async getCartTotal(userId: number): Promise<number> {
    try {
      const response = await apiService.getCartTotal(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return 0;
    } catch (error) {
      console.error('Error getting cart total:', error);
      return 0;
    }
  }

  static async getCartItemCount(userId: number): Promise<number> {
    try {
      // Will be implemented in API
      // For now, get cart items and sum quantities
      const items = await this.getCartItems(userId);
      return items.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      console.error('Error getting cart item count:', error);
      return 0;
    }
  }
}