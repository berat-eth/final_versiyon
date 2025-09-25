import { CartModel } from '../models/Cart';
import { ProductController } from './ProductController';
import { CartItem, ProductVariationOption } from '../utils/types';
import { apiService } from '../utils/api-service';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from '../utils/database';
import { detailedActivityLogger } from '../services/DetailedActivityLogger';

export class CartController {
  static async addToCart(
    userId: number, 
    productId: number, 
    quantity: number = 1,
    selectedVariations?: { [key: string]: ProductVariationOption }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Cihaz bazlı misafir sepet izolasyonu
    let deviceId: string | undefined = undefined;
    
    try {
      // Adding to cartn
      
      // Stok kontrolü
      const hasStock = await ProductController.checkStock(productId, quantity, selectedVariations);
      if (!hasStock) {
        return { success: false, message: 'Ürün stokta yok veya yetersiz stok' };
      }

      // API'ye sepete ekleme isteği gönder
      const variationString = selectedVariations ? 
        Object.entries(selectedVariations)
          .map(([key, option]) => `${key}: ${option.value}`)
          .join(', ') : '';
      if (userId === 1) {
        try {
          const { DiscountWheelController } = require('./DiscountWheelController');
          deviceId = await DiscountWheelController.getDeviceId();
        } catch (e) {
          // deviceId alınamadı, misafir sepet izolasyonu zayıflar
        }
      }

      const cartData = {
        userId,
        productId,
        quantity,
        variationString,
        selectedVariations,
        deviceId
      };

      const response = await apiService.addToCart(cartData);

      if (response.success) {
        // Product added to cart successfully
        
        // Detaylı sepet ekleme logu
        try {
          const product = await ProductController.getProductById(productId);
          if (product) {
            await detailedActivityLogger.logCartItemAdded({
              productId: product.id,
              productName: product.name,
              productPrice: product.price,
              quantity: quantity,
              variations: selectedVariations ? this.extractVariationsFromSelected(selectedVariations) : undefined,
              variationString: this.createVariationString(selectedVariations),
              totalPrice: product.price * quantity,
              cartItemId: (response.data as any)?.cartItemId?.toString(),
              discountAmount: product.discountAmount,
              originalPrice: product.originalPrice,
              finalPrice: product.finalPrice || product.price,
              action: 'added'
            });
          }
        } catch (logError) {
          console.warn('⚠️ Cart add logging failed:', logError);
        }
        
        return { success: true, message: 'Ürün sepete eklendi' };
      } else {
        // Failed to add to cart
        return { success: false, message: response.message || 'Ürün sepete eklenemedi' };
      }
    } catch (error) {
      console.error('❌ CartController - addToCart error:', error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue('/cart', 'POST', {
          userId,
          productId,
          quantity,
          selectedVariations,
          deviceId: deviceId || undefined
        });
        return { success: false, message: 'Çevrimdışı mod - ürün ekleme isteği kuyruğa eklendi' };
      }
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async removeFromCart(cartItemId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Removing from cart
      
      const response = await apiService.removeFromCart(cartItemId);
      
      if (response.success) {
        // Product removed from cart successfully
        
        // Detaylı sepet çıkarma logu
        try {
          // Cart item bilgilerini al (response'dan veya cache'den)
          const cartItem = (response.data as any)?.cartItem;
          if (cartItem) {
            await detailedActivityLogger.logCartItemRemoved({
              productId: cartItem.productId,
              productName: cartItem.productName || 'Bilinmeyen Ürün',
              productPrice: cartItem.productPrice || 0,
              quantity: cartItem.quantity || 1,
              variations: cartItem.variations,
              variationString: cartItem.variationString || '',
              totalPrice: (cartItem.productPrice || 0) * (cartItem.quantity || 1),
              cartItemId: cartItemId.toString(),
              action: 'removed'
            });
          }
        } catch (logError) {
          console.warn('⚠️ Cart remove logging failed:', logError);
        }
        
        return { success: true, message: 'Ürün sepetten kaldırıldı' };
      } else {
        // Failed to remove from cart
        return { success: false, message: response.message || 'Ürün sepetten kaldırılamadı' };
      }
    } catch (error) {
      console.error('❌ CartController - removeFromCart error:', error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue(`/cart/${cartItemId}`, 'DELETE');
        return { success: false, message: 'Çevrimdışı mod - ürün kaldırma isteği kuyruğa eklendi' };
      }
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async updateQuantity(cartItemId: number, quantity: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Updating cart quantity
      
      if (quantity < 0) {
        return { success: false, message: 'Miktar negatif olamaz' };
      }

      if (quantity === 0) {
        // Miktar 0 ise ürünü sepetten kaldır
        return await this.removeFromCart(cartItemId);
      }

      const response = await apiService.updateCartQuantity(cartItemId, quantity);
      
      if (response.success) {
        // Cart quantity updated successfully
        
        // Detaylı sepet güncelleme logu
        try {
          const cartItem = (response.data as any)?.cartItem;
          if (cartItem) {
            await detailedActivityLogger.logCartItemUpdated({
              productId: cartItem.productId,
              productName: cartItem.productName || 'Bilinmeyen Ürün',
              productPrice: cartItem.productPrice || 0,
              quantity: quantity,
              variations: cartItem.variations,
              variationString: cartItem.variationString || '',
              totalPrice: (cartItem.productPrice || 0) * quantity,
              cartItemId: cartItemId.toString(),
              action: 'updated'
            });
          }
        } catch (logError) {
          console.warn('⚠️ Cart update logging failed:', logError);
        }
        
        return { success: true, message: 'Miktar güncellendi' };
      } else {
        // Failed to update quantity
        return { success: false, message: response.message || 'Miktar güncellenemedi' };
      }
    } catch (error) {
      console.error('❌ CartController - updateQuantity error:', error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue(`/cart/${cartItemId}/quantity`, 'PUT', { quantity });
        return { success: false, message: 'Çevrimdışı mod - miktar güncelleme isteği kuyruğa eklendi' };
      }
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async getCartItems(userId: number): Promise<CartItem[]> {
    try {
      // Getting cart items for user
      
      const response = await apiService.getCartItems(userId);
      if (response.success && response.data && Array.isArray(response.data)) {
        // Retrieved cart items
        const cartItems = response.data.map((apiCartItem: any) => this.mapApiCartItemToAppCartItem(apiCartItem));
        
        // Validate cart items and remove invalid ones
        const validCartItems = cartItems.filter(item => item.productId && item.quantity > 0);
        
        if (validCartItems.length !== cartItems.length) {
          // Found invalid cart items
        }
        
        return validCartItems;
      }
      
      console.log('📱 No cart items found, API failed, or invalid response format');
      return [];
    } catch (error) {
      console.error('❌ CartController - getCartItems error:', error);
      
      // If offline, try to get from offline queue
      if (error && typeof error === 'object' && 'isOffline' in error) {
        try {
          const offlineQueue = await getOfflineQueue();
          const cartAdditions = offlineQueue.filter(item => 
            item.endpoint === '/cart' && item.method === 'POST'
          );
          
          if (cartAdditions.length > 0) {
            console.log(`📱 Found ${cartAdditions.length} offline cart additions`);
            // Convert offline additions to cart items (simplified)
            return cartAdditions.map(item => ({
              id: item.id,
              userId: item.body?.userId || 0,
              productId: item.body?.productId || 0,
              quantity: item.body?.quantity || 1,
              variationString: item.body?.variationString || '',
              selectedVariations: item.body?.selectedVariations || undefined,
              product: undefined // Would need to fetch product details
            }));
          }
        } catch (queueError) {
          console.error('❌ Failed to get offline queue:', queueError);
        }
      }
      
      return [];
    }
  }

  static async getCartTotal(userId: number): Promise<number> {
    try {
      console.log(`💰 Getting cart total for user: ${userId}`);
      
      const response = await apiService.getCartTotal(userId);
      if (response.success && response.data !== undefined) {
        console.log(`✅ Cart total: ${response.data}`);
        return response.data;
      }
      
      // Fallback: calculate from cart items
      console.log('🔄 API failed, calculating total from cart items');
      const cartItems = await this.getCartItems(userId);
      const total = this.calculateSubtotal(cartItems);
      
      console.log(`✅ Calculated cart total: ${total}`);
      return total;
    } catch (error) {
      console.error('❌ CartController - getCartTotal error:', error);
      
      // Fallback: calculate from cart items
      try {
        const cartItems = await this.getCartItems(userId);
        const total = this.calculateSubtotal(cartItems);
        console.log(`📱 Fallback cart total: ${total}`);
        return total;
      } catch (fallbackError) {
        console.error('❌ Fallback calculation also failed:', fallbackError);
        return 0;
      }
    }
  }

  static async getCartItemCount(userId: number): Promise<number> {
    try {
      const cartItems = await this.getCartItems(userId);
      const count = cartItems.reduce((total, item) => total + item.quantity, 0);
      console.log(`📊 Cart item count: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ CartController - getCartItemCount error:', error);
      return 0;
    }
  }

  static async clearCart(userId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Clearing cart for user: ${userId}`);
      
      const response = await apiService.clearCart(userId);
      
      if (response.success) {
        console.log(`✅ Cart cleared successfully for user: ${userId}`);
        return true;
      } else {
        console.log(`❌ Failed to clear cart: ${response.message}`);
        return false;
      }
    } catch (error) {
      console.error('❌ CartController - clearCart error:', error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue(`/cart/user/${userId}`, 'DELETE');
        console.log('📱 Cart clear request queued for offline processing');
        return true; // Assume success for offline operations
      }
      
      return false;
    }
  }

  static async increaseQuantity(cartItemId: number, currentQuantity: number): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log(`➕ Increasing quantity for cart item: ${cartItemId}`);
    return await this.updateQuantity(cartItemId, currentQuantity + 1);
  }

  static async decreaseQuantity(cartItemId: number, currentQuantity: number): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log(`➖ Decreasing quantity for cart item: ${cartItemId}`);
    if (currentQuantity <= 1) {
      return await this.removeFromCart(cartItemId);
    }
    return await this.updateQuantity(cartItemId, currentQuantity - 1);
  }

  // Enhanced price calculation with better validation
  static calculateSubtotal(items: CartItem[]): number {
    try {
      const subtotal = items.reduce((total, item) => {
        if (item.product) {
          let itemPrice = item.product.price;
          
          // Add variation price modifiers
          if (item.selectedVariations && Object.keys(item.selectedVariations).length > 0) {
            Object.values(item.selectedVariations).forEach(option => {
              if (option && typeof option.priceModifier === 'number') {
                itemPrice += option.priceModifier;
              }
            });
          }
          
          return total + (itemPrice * item.quantity);
        }
        return total;
      }, 0);
      
      // Ensure positive value
      return Math.max(0, subtotal);
    } catch (error) {
      console.error('❌ Error calculating subtotal:', error);
      return 0;
    }
  }

  static calculateShipping(subtotal: number): number {
    // 500 TL üzeri ücretsiz kargo
    const shipping = subtotal >= 500 ? 0 : 29.90;
    return shipping;
  }

  static calculateTotal(subtotal: number, shipping: number): number {
    const total = subtotal + shipping;
    return total;
  }

  // Process offline cart operations when back online
  static async processOfflineCartOperations(): Promise<void> {
    try {
      console.log('🔄 Processing offline cart operations...');
      
      const offlineQueue = await getOfflineQueue();
      const cartOperations = offlineQueue.filter(item => 
        item.endpoint.startsWith('/cart')
      );
      
      if (cartOperations.length === 0) {
        console.log('📱 No offline cart operations to process');
        return;
      }
      
      console.log(`📱 Processing ${cartOperations.length} offline cart operations`);
      
      for (const operation of cartOperations) {
        try {
          // Process each operation based on its type
          if (operation.method === 'POST') {
            // Add to cart
            await apiService.addToCart(operation.body);
          } else if (operation.method === 'PUT') {
            // Update quantity
            const itemId = operation.endpoint.split('/')[2];
            await apiService.updateCartQuantity(parseInt(itemId), operation.body.quantity);
          } else if (operation.method === 'DELETE') {
            // Remove from cart
            const itemId = operation.endpoint.split('/')[2];
            await apiService.removeFromCart(parseInt(itemId));
          }
          
          // Remove from offline queue
          await removeFromOfflineQueue(operation.id);
          console.log(`✅ Processed offline cart operation: ${operation.method} ${operation.endpoint}`);
          
        } catch (operationError) {
          console.error(`❌ Failed to process offline cart operation: ${operation.method} ${operation.endpoint}`, operationError);
          // Keep in queue for retry
        }
      }
      
      console.log('✅ Offline cart operations processing completed');
    } catch (error) {
      console.error('❌ Error processing offline cart operations:', error);
    }
  }

  // Enhanced API cart item mapping with better error handling
  private static mapApiCartItemToAppCartItem(apiCartItem: any): CartItem {
    try {
      return {
        id: parseInt(apiCartItem.id) || 0,
        userId: parseInt(apiCartItem.userId) || 0,
        productId: parseInt(apiCartItem.productId) || 0,
        quantity: parseInt(apiCartItem.quantity) || 1,
        variationString: apiCartItem.variationString || '',
        selectedVariations: apiCartItem.selectedVariations ? 
          (typeof apiCartItem.selectedVariations === 'string' ? 
            JSON.parse(apiCartItem.selectedVariations) : 
            apiCartItem.selectedVariations) : undefined,
        product: apiCartItem.name ? {
          id: parseInt(apiCartItem.productId) || 0,
          name: apiCartItem.name || 'Unknown Product',
          price: parseFloat(apiCartItem.price) || 0,
          image: apiCartItem.image || '',
          stock: parseInt(apiCartItem.stock) || 0,
          brand: apiCartItem.brand || '',
          description: '',
          category: '',
          rating: 0,
          reviewCount: 0,
          hasVariations: false
        } : undefined
      };
    } catch (error) {
      console.error('❌ Error mapping API cart item:', error, apiCartItem);
      // Return a safe fallback cart item
      return {
        id: 0,
        userId: 0,
        productId: 0,
        quantity: 1,
        variationString: '',
        selectedVariations: undefined,
        product: undefined
      };
    }
  }

  // Helper function to extract variations from selected variations
  private static extractVariationsFromSelected(selectedVariations: { [key: string]: ProductVariationOption }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    Object.keys(selectedVariations).forEach(key => {
      const variation = selectedVariations[key];
      if (variation && variation.name && variation.value) {
        result[variation.name.toLowerCase()] = variation.value;
      }
    });

    return result;
  }

  // Helper function to create variation string
  private static createVariationString(selectedVariations?: { [key: string]: ProductVariationOption }): string {
    if (!selectedVariations) return '';

    const variations: string[] = [];
    Object.keys(selectedVariations).forEach(key => {
      const variation = selectedVariations[key];
      if (variation && variation.name && variation.value) {
        variations.push(`${variation.name}: ${variation.value}`);
      }
    });

    return variations.join(', ');
  }
}