import { apiService } from '../utils/api-service';
import { CampaignController, ProductRecommendation, CustomerAnalytics } from './CampaignController';
import { Product } from '../utils/types';

export interface PersonalizedOffer {
  id: string;
  type: 'discount' | 'free_shipping' | 'bundle' | 'loyalty' | 'seasonal' | 'birthday';
  title: string;
  description: string;
  discountAmount?: number;
  discountPercentage?: number;
  discountType?: 'percentage' | 'fixed';
  minOrderAmount?: number;
  validUntil?: string;
  applicableProducts?: number[];
  priority: number; // Higher number = higher priority
  reason: string; // Why this offer was selected
}

export interface PersonalizedContent {
  greeting: string;
  recommendedProducts: Product[];
  personalizedOffers: PersonalizedOffer[];
  categorySuggestions: string[];
  brandSuggestions: string[];
  nextBestAction: string;
}

export class PersonalizationController {
  // Generate personalized content for a user
  static async generatePersonalizedContent(userId: number): Promise<PersonalizedContent> {
    try {
      console.log('🎨 Generating personalized content for user:', userId);
      
      // Get user analytics
      const analytics = await CampaignController.getCustomerAnalytics(userId);
      
      // Get product recommendations
      const recommendations = await CampaignController.getProductRecommendations(userId, { limit: 8 });
      
      // Get available campaigns
      const campaigns = await CampaignController.getAvailableCampaigns(userId);
      
      // Generate personalized offers
      const personalizedOffers = await this.generatePersonalizedOffers(userId, analytics, campaigns);
      
      // Generate personalized greeting
      const greeting = this.generatePersonalizedGreeting(analytics);
      
      // Get category and brand suggestions
      const categorySuggestions = this.getCategorySuggestions(analytics);
      const brandSuggestions = this.getBrandSuggestions(analytics);
      
      // Get next best action
      const nextBestAction = this.getNextBestAction(analytics, recommendations);
      
      // Convert recommendations to products (this would need actual product data)
      const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
      const recommendedProducts: Product[] = safeRecommendations.map(rec => ({
        id: rec.productId,
        name: rec.name || 'Ürün',
        price: rec.price || 0,
        image: rec.image || '',
        category: rec.category || '',
        brand: rec.brand || '',
        description: rec.reason || '',
        stock: 0,
        rating: 0,
        reviewCount: 0,
        hasVariations: false,
        variations: [],
        images: []
      }));

      return {
        greeting,
        recommendedProducts,
        personalizedOffers,
        categorySuggestions,
        brandSuggestions,
        nextBestAction
      };

    } catch (error) {
      console.error('❌ PersonalizationController - generatePersonalizedContent error:', error);
      return {
        greeting: 'Hoş geldiniz!',
        recommendedProducts: [],
        personalizedOffers: [],
        categorySuggestions: [],
        brandSuggestions: [],
        nextBestAction: 'Ürünleri keşfedin'
      };
    }
  }

  // Generate personalized offers based on user behavior
  private static async generatePersonalizedOffers(
    userId: number, 
    analytics: CustomerAnalytics | null, 
    campaigns: any[]
  ): Promise<PersonalizedOffer[]> {
    const offers: PersonalizedOffer[] = [];

    if (!analytics) {
      return offers;
    }

    // Analyze user behavior to create offers
    const totalSpent = analytics.totalSpent;
    const totalOrders = analytics.totalOrders;
    const averageOrderValue = analytics.averageOrderValue;
    const lastOrderDate = analytics.lastOrderDate;

    // High-value customer offers
    if (totalSpent > 2000 && totalOrders > 5) {
        offers.push({
          id: 'vip-discount',
          type: 'discount',
          title: 'VIP Müşteri İndirimi',
          description: 'Özel VIP müşteri indiriminiz!',
          discountAmount: 15,
          discountType: 'percentage',
          minOrderAmount: 100,
          priority: 10,
          reason: 'Yüksek değerli müşteri'
        });
    }

    // New customer offers
    if (totalOrders <= 2) {
      offers.push({
        id: 'new-customer',
        type: 'discount',
        title: 'Yeni Müşteri Hoş Geldin İndirimi',
        description: 'İlk alışverişinizde %20 indirim!',
        discountAmount: 20,
        discountType: 'percentage',
        minOrderAmount: 50,
        priority: 9,
        reason: 'Yeni müşteri'
      });
    }

    // Free shipping for frequent customers
    if (totalOrders > 3) {
      offers.push({
        id: 'free-shipping',
        type: 'free_shipping',
        title: 'Ücretsiz Kargo',
        description: 'Tüm siparişlerinizde ücretsiz kargo!',
        minOrderAmount: 100,
        priority: 8,
        reason: 'Sık alışveriş yapan müşteri'
      });
    }

    // Birthday offer: sadece kullanıcının doğum günü ise ekle
    try {
      const userInfoResponse = await apiService.getUserById(userId);
      const birthDateStr = (userInfoResponse.success && userInfoResponse.data && (userInfoResponse.data.birthDate || userInfoResponse.data.birth_date)) ? (userInfoResponse.data.birthDate || userInfoResponse.data.birth_date) : null;
      if (birthDateStr) {
        const today = new Date();
        const birth = new Date(birthDateStr);
        const isBirthday = birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth();
        if (isBirthday) {
          offers.push({
            id: 'birthday-special',
            type: 'birthday',
            title: 'Doğum Gününüz Kutlu Olsun!',
            description: 'Özel doğum günü indiriminiz hazır!'
            ,
            discountAmount: 25,
            discountType: 'percentage',
            minOrderAmount: 75,
            priority: 10,
            reason: 'Doğum günü özel teklifi'
          });
        }
      }
    } catch {}

    // Churn prevention offers
    if (lastOrderDate) {
      const daysSinceLastOrder = Math.floor(
        (new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastOrder > 30) {
        offers.push({
          id: 'comeback-offer',
          type: 'discount',
          title: 'Geri Dönüş İndirimi',
          description: 'Sizi özledik! Özel geri dönüş indiriminiz.',
          discountAmount: 20,
          discountType: 'percentage',
          minOrderAmount: 50,
          priority: 9,
          reason: 'Uzun süredir alışveriş yapmayan müşteri'
        });
      }
    }

    // Category-based offers
    if (analytics.favoriteCategories && analytics.favoriteCategories.length > 0) {
      const favoriteCategory = analytics.favoriteCategories[0];
      offers.push({
        id: `category-${favoriteCategory.toLowerCase()}`,
        type: 'discount',
        title: `${favoriteCategory} Kategorisi Özel İndirimi`,
        description: `En sevdiğiniz ${favoriteCategory} kategorisinde %15 indirim!`,
        discountAmount: 15,
        discountType: 'percentage',
        minOrderAmount: 75,
        priority: 7,
        reason: `Favori kategori: ${favoriteCategory}`
      });
    }

    // Sort by priority (highest first)
    return offers.sort((a, b) => b.priority - a.priority);

  }

  // Generate personalized greeting
  private static generatePersonalizedGreeting(analytics: CustomerAnalytics | null): string {
    if (!analytics) {
      return 'Hoş geldiniz!';
    }

    const totalOrders = analytics.totalOrders;
    const totalSpent = analytics.totalSpent;
    const lastOrderDate = analytics.lastOrderDate;

    if (totalOrders === 0) {
      return 'Hoş geldiniz! İlk alışverişinizde özel indirimler sizi bekliyor!';
    }

    if (totalOrders === 1) {
      return 'Tekrar hoş geldiniz! Size özel tekliflerimizi keşfedin.';
    }

    if (totalOrders > 10) {
      return `Değerli müşterimiz! ${totalOrders} siparişiniz için teşekkürler. Size özel VIP tekliflerimiz hazır!`;
    }

    if (totalSpent > 1000) {
      return 'Değerli müşterimiz! Yüksek harcama yaptığınız için özel indirimlerimiz sizi bekliyor.';
    }

    if (lastOrderDate) {
      const daysSinceLastOrder = Math.floor(
        (new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastOrder > 30) {
        return 'Sizi özledik! Yeni ürünlerimiz ve özel tekliflerimiz sizi bekliyor.';
      }
    }

    return 'Hoş geldiniz! Size özel önerilerimizi keşfedin.';
  }

  // Get category suggestions based on user preferences
  private static getCategorySuggestions(analytics: CustomerAnalytics | null): string[] {
    if (!analytics || !analytics.favoriteCategories) {
      return ['Popüler Kategoriler', 'Yeni Ürünler', 'İndirimli Ürünler'];
    }

    const suggestions = [...analytics.favoriteCategories];
    
    // Add complementary categories
    const complementaryCategories: Record<string, string[]> = {
      'Elektronik': ['Aksesuar', 'Kablo', 'Koruyucu'],
      'Giyim': ['Ayakkabı', 'Aksesuar', 'Çanta'],
      'Ev & Yaşam': ['Dekorasyon', 'Mutfak', 'Banyo'],
      'Spor': ['Giyim', 'Ayakkabı', 'Ekipman']
    };

    analytics.favoriteCategories.forEach(category => {
      if (complementaryCategories[category]) {
        suggestions.push(...complementaryCategories[category]);
      }
    });

    // Remove duplicates and limit to 5
    return [...new Set(suggestions)].slice(0, 5);
  }

  // Get brand suggestions based on user preferences
  private static getBrandSuggestions(analytics: CustomerAnalytics | null): string[] {
    if (!analytics || !analytics.favoriteBrands) {
      return ['Popüler Markalar', 'Yeni Markalar', 'İndirimli Markalar'];
    }

    const suggestions = [...analytics.favoriteBrands];
    
    // Add similar brands (this would be based on actual brand data)
    const similarBrands: Record<string, string[]> = {
      'Nike': ['Adidas', 'Puma', 'Reebok'],
      'Apple': ['Samsung', 'Huawei', 'Xiaomi'],
      'Zara': ['H&M', 'Mango', 'Pull & Bear']
    };

    analytics.favoriteBrands.forEach(brand => {
      if (similarBrands[brand]) {
        suggestions.push(...similarBrands[brand]);
      }
    });

    // Remove duplicates and limit to 5
    return [...new Set(suggestions)].slice(0, 5);
  }

  // Get next best action for the user
  private static getNextBestAction(analytics: CustomerAnalytics | null, recommendations: ProductRecommendation[]): string {
    if (!analytics) {
      return 'Ürünleri keşfedin';
    }

    const totalOrders = analytics.totalOrders;
    const totalSpent = analytics.totalSpent;
    const lastOrderDate = analytics.lastOrderDate;

    if (totalOrders === 0) {
      return 'İlk alışverişinizi yapın ve %20 indirim kazanın!';
    }

    if (totalOrders === 1) {
      return 'İkinci siparişinizde ücretsiz kargo kazanın!';
    }

    if (totalOrders < 5) {
      return '5 siparişe ulaşın ve VIP müşteri olun!';
    }

    if (totalSpent > 1000) {
      return 'Premium ürünlerimizi keşfedin!';
    }

    if (lastOrderDate) {
      const daysSinceLastOrder = Math.floor(
        (new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastOrder > 30) {
        return 'Yeni ürünlerimizi keşfedin ve özel indirim kazanın!';
      }
    }

    if (recommendations && recommendations.length > 0) {
      return 'Size özel önerilen ürünleri inceleyin!';
    }

    return 'Favori kategorilerinizi keşfedin!';
  }

  // Generate product recommendations based on user behavior
  static async generateProductRecommendations(
    userId: number, 
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    try {
      console.log('🔄 Generating product recommendations for user:', userId);
      
      // Get user analytics
      const analytics = await CampaignController.getCustomerAnalytics(userId);
      
      // Get existing recommendations
      let recommendations = await CampaignController.getProductRecommendations(userId, { limit });
      
      // If no recommendations exist, generate them
      if (recommendations.length === 0) {
        recommendations = await this.generateNewRecommendations(userId, analytics, limit);
      }

      return recommendations;

    } catch (error) {
      console.error('❌ PersonalizationController - generateProductRecommendations error:', error);
      return [];
    }
  }

  // Generate new product recommendations
  private static async generateNewRecommendations(
    userId: number, 
    analytics: CustomerAnalytics | null, 
    limit: number
  ): Promise<ProductRecommendation[]> {
    const recommendations: ProductRecommendation[] = [];

    if (!analytics) {
      // For new users, recommend popular products
      return this.getPopularProducts(userId, limit);
    }

    // Collaborative filtering based on similar users
    const collaborativeRecs = await this.getCollaborativeRecommendations(userId, limit / 2);
    recommendations.push(...collaborativeRecs);

    // Content-based filtering based on user preferences
    const contentBasedRecs = await this.getContentBasedRecommendations(analytics, limit / 2);
    recommendations.push(...contentBasedRecs);

    // Trending products
    const trendingRecs = await this.getTrendingProducts(userId, limit / 4);
    recommendations.push(...trendingRecs);

    // Remove duplicates and limit results
    const uniqueRecs = this.removeDuplicateRecommendations(recommendations);
    return uniqueRecs.slice(0, limit);

  }

  // Get popular products (fallback for new users)
  private static async getPopularProducts(userId: number, limit: number): Promise<ProductRecommendation[]> {
    try {
      // This would query the database for most popular products
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('❌ PersonalizationController - getPopularProducts error:', error);
      return [];
    }
  }

  // Get collaborative filtering recommendations
  private static async getCollaborativeRecommendations(userId: number, limit: number): Promise<ProductRecommendation[]> {
    try {
      // This would find users with similar purchase patterns
      // and recommend products they bought that this user hasn't
      return [];
    } catch (error) {
      console.error('❌ PersonalizationController - getCollaborativeRecommendations error:', error);
      return [];
    }
  }

  // Get content-based recommendations
  private static async getContentBasedRecommendations(analytics: CustomerAnalytics, limit: number): Promise<ProductRecommendation[]> {
    try {
      // This would recommend products similar to what the user has bought
      // based on categories, brands, and other attributes
      return [];
    } catch (error) {
      console.error('❌ PersonalizationController - getContentBasedRecommendations error:', error);
      return [];
    }
  }

  // Get trending products
  private static async getTrendingProducts(userId: number, limit: number): Promise<ProductRecommendation[]> {
    try {
      // This would get products that are currently trending
      return [];
    } catch (error) {
      console.error('❌ PersonalizationController - getTrendingProducts error:', error);
      return [];
    }
  }

  // Remove duplicate recommendations
  private static removeDuplicateRecommendations(recommendations: ProductRecommendation[]): ProductRecommendation[] {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.productId)) {
        return false;
      }
      seen.add(rec.productId);
      return true;
    });
  }

  // Update user preferences based on behavior
  static async updateUserPreferences(userId: number, behavior: {
    viewedProducts?: number[];
    addedToCart?: number[];
    purchased?: number[];
    searchedCategories?: string[];
    searchedBrands?: string[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Updating user preferences for user:', userId, behavior);
      
      // This would update the customer_analytics table
      // with the new behavior data
      
      return { success: true, message: 'Kullanıcı tercihleri güncellendi' };

    } catch (error) {
      console.error('❌ PersonalizationController - updateUserPreferences error:', error);
      return { success: false, message: 'Tercih güncelleme hatası' };
    }
  }
}
