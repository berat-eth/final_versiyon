import { userDataService } from './UserDataService';

export interface CartAbandonmentData {
  cartId: string;
  userId: number;
  abandonedAt: number;
  timeInCart: number; // dakika
  cartValue: number;
  itemCount: number;
  lastAction: string;
  abandonmentStage: 'view' | 'add_item' | 'remove_item' | 'quantity_change' | 'checkout_start';
  products: Array<{
    productId: number;
    productName: string;
    price: number;
    quantity: number;
    variations?: { [key: string]: string };
  }>;
}

export interface ProductComparisonData {
  userId: number;
  comparedProducts: Array<{
    productId: number;
    productName: string;
    price: number;
    category: string;
    brand: string;
    comparisonReason?: string;
  }>;
  comparisonDuration: number;
  decisionMade: boolean;
  selectedProductId?: number;
  comparisonTimestamp: number;
}

export interface PriceSensitivityData {
  userId: number;
  productId: number;
  productName: string;
  originalPrice: number;
  newPrice: number;
  priceChangePercentage: number;
  userReaction: 'positive' | 'negative' | 'neutral';
  actionTaken: 'purchased' | 'added_to_cart' | 'removed_from_cart' | 'viewed' | 'ignored';
  timeToReact: number; // saniye
  timestamp: number;
}

export interface CampaignEngagementData {
  userId: number;
  campaignId: string;
  campaignName: string;
  campaignType: 'discount' | 'banner' | 'popup' | 'email' | 'push';
  engagementType: 'viewed' | 'clicked' | 'interacted' | 'converted';
  engagementDuration: number;
  conversionValue?: number;
  timestamp: number;
}

export interface ProductRecommendationData {
  userId: number;
  recommendationType: 'similar_products' | 'frequently_bought_together' | 'trending' | 'personalized';
  recommendedProducts: Array<{
    productId: number;
    productName: string;
    price: number;
    position: number;
  }>;
  userAction: 'viewed' | 'clicked' | 'added_to_cart' | 'purchased' | 'ignored';
  clickedProductId?: number;
  timestamp: number;
}

export interface WishlistData {
  userId: number;
  productId: number;
  productName: string;
  price: number;
  category: string;
  action: 'added' | 'removed' | 'moved_to_cart' | 'purchased';
  wishlistSize: number;
  timestamp: number;
}

class EcommerceAnalytics {
  private static instance: EcommerceAnalytics;
  private cartSessions: Map<number, any> = new Map();
  private productComparisons: Map<number, ProductComparisonData> = new Map();
  private userId: number | null = null;

  static getInstance(): EcommerceAnalytics {
    if (!EcommerceAnalytics.instance) {
      EcommerceAnalytics.instance = new EcommerceAnalytics();
    }
    return EcommerceAnalytics.instance;
  }

  setUserId(userId: number) {
    this.userId = userId;
  }

  // Sepet terk etme analizi
  startCartSession(userId: number, cartId: string): void {
    this.cartSessions.set(userId, {
      cartId,
      userId,
      startTime: Date.now(),
      lastAction: 'started',
      products: [],
      actions: []
    });
  }

  addToCartSession(userId: number, productId: number, productName: string, price: number, quantity: number, variations?: { [key: string]: string }): void {
    const session = this.cartSessions.get(userId);
    if (session) {
      session.products.push({ productId, productName, price, quantity, variations });
      session.lastAction = 'add_item';
      session.actions.push({
        type: 'add_item',
        timestamp: Date.now(),
        productId,
        productName
      });
    }
  }

  removeFromCartSession(userId: number, productId: number): void {
    const session = this.cartSessions.get(userId);
    if (session) {
      session.products = session.products.filter((p: any) => p.productId !== productId);
      session.lastAction = 'remove_item';
      session.actions.push({
        type: 'remove_item',
        timestamp: Date.now(),
        productId
      });
    }
  }

  updateQuantitySession(userId: number, productId: number, newQuantity: number): void {
    const session = this.cartSessions.get(userId);
    if (session) {
      const product = session.products.find((p: any) => p.productId === productId);
      if (product) {
        product.quantity = newQuantity;
      }
      session.lastAction = 'quantity_change';
      session.actions.push({
        type: 'quantity_change',
        timestamp: Date.now(),
        productId,
        newQuantity
      });
    }
  }

  checkoutStartedSession(userId: number): void {
    const session = this.cartSessions.get(userId);
    if (session) {
      session.lastAction = 'checkout_start';
      session.actions.push({
        type: 'checkout_start',
        timestamp: Date.now()
      });
    }
  }

  abandonCart(userId: number): void {
    const session = this.cartSessions.get(userId);
    if (session) {
      const abandonmentData: CartAbandonmentData = {
        cartId: session.cartId,
        userId: session.userId,
        abandonedAt: Date.now(),
        timeInCart: Math.round((Date.now() - session.startTime) / 60000), // dakika
        cartValue: session.products.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0),
        itemCount: session.products.length,
        lastAction: session.lastAction,
        abandonmentStage: this.getAbandonmentStage(session.lastAction),
        products: session.products
      };

      this.logCartAbandonment(abandonmentData);
      this.cartSessions.delete(userId);
    }
  }

  // Ürün karşılaştırma analizi
  startProductComparison(userId: number, productId: number, productName: string, price: number, category: string, brand: string): void {
    let comparison = this.productComparisons.get(userId);
    if (!comparison) {
      comparison = {
        userId,
        comparedProducts: [],
        comparisonDuration: 0,
        decisionMade: false,
        comparisonTimestamp: Date.now()
      };
      this.productComparisons.set(userId, comparison);
    }

    comparison.comparedProducts.push({
      productId,
      productName,
      price,
      category,
      brand
    });
  }

  endProductComparison(userId: number, selectedProductId?: number): void {
    const comparison = this.productComparisons.get(userId);
    if (comparison) {
      comparison.decisionMade = true;
      comparison.selectedProductId = selectedProductId;
      comparison.comparisonDuration = Date.now() - comparison.comparisonTimestamp;

      this.logProductComparison(comparison);
      this.productComparisons.delete(userId);
    }
  }

  // Fiyat hassasiyeti analizi
  logPriceSensitivity(productId: number, productName: string, originalPrice: number, newPrice: number, userReaction: string, actionTaken: string, timeToReact: number): void {
    if (!this.userId) return;

    const priceChangePercentage = ((newPrice - originalPrice) / originalPrice) * 100;
    
    const data: PriceSensitivityData = {
      userId: this.userId,
      productId,
      productName,
      originalPrice,
      newPrice,
      priceChangePercentage,
      userReaction: userReaction as any,
      actionTaken: actionTaken as any,
      timeToReact,
      timestamp: Date.now()
    };

    this.logPriceSensitivityData(data);
  }

  // Kampanya etkileşimi
  logCampaignEngagement(campaignId: string, campaignName: string, campaignType: string, engagementType: string, engagementDuration: number, conversionValue?: number): void {
    if (!this.userId) return;

    const data: CampaignEngagementData = {
      userId: this.userId,
      campaignId,
      campaignName,
      campaignType: campaignType as any,
      engagementType: engagementType as any,
      engagementDuration,
      conversionValue,
      timestamp: Date.now()
    };

    this.logCampaignEngagementData(data);
  }

  // Ürün önerisi etkileşimi
  logProductRecommendation(recommendationType: string, recommendedProducts: any[], userAction: string, clickedProductId?: number): void {
    if (!this.userId) return;

    const data: ProductRecommendationData = {
      userId: this.userId,
      recommendationType: recommendationType as any,
      recommendedProducts,
      userAction: userAction as any,
      clickedProductId,
      timestamp: Date.now()
    };

    this.logProductRecommendationData(data);
  }

  // İstek listesi etkileşimi
  logWishlistAction(productId: number, productName: string, price: number, category: string, action: string, wishlistSize: number): void {
    if (!this.userId) return;

    const data: WishlistData = {
      userId: this.userId,
      productId,
      productName,
      price,
      category,
      action: action as any,
      wishlistSize,
      timestamp: Date.now()
    };

    this.logWishlistData(data);
  }

  // Yardımcı fonksiyonlar
  private getAbandonmentStage(lastAction: string): 'view' | 'add_item' | 'remove_item' | 'quantity_change' | 'checkout_start' {
    switch (lastAction) {
      case 'add_item': return 'add_item';
      case 'remove_item': return 'remove_item';
      case 'quantity_change': return 'quantity_change';
      case 'checkout_start': return 'checkout_start';
      default: return 'view';
    }
  }

  // Veri gönderme fonksiyonları
  private async logCartAbandonment(data: CartAbandonmentData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'cart_abandonment',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Cart abandonment logging failed:', error);
    }
  }

  private async logProductComparison(data: ProductComparisonData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'product_comparison',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Product comparison logging failed:', error);
    }
  }

  private async logPriceSensitivityData(data: PriceSensitivityData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'price_sensitivity',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Price sensitivity logging failed:', error);
    }
  }

  private async logCampaignEngagementData(data: CampaignEngagementData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'campaign_engagement',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Campaign engagement logging failed:', error);
    }
  }

  private async logProductRecommendationData(data: ProductRecommendationData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'product_recommendation',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Product recommendation logging failed:', error);
    }
  }

  private async logWishlistData(data: WishlistData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'wishlist_action',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Wishlist action logging failed:', error);
    }
  }
}

export const ecommerceAnalytics = EcommerceAnalytics.getInstance();
