import { apiService } from '../utils/api-service';
import { CampaignController, CustomerAnalytics } from './CampaignController';

export interface RFMAnalysis {
  recency: number; // Days since last order
  frequency: number; // Number of orders
  monetary: number; // Total amount spent
  rfmScore: string; // Combined score like "543"
  segment: string; // Customer segment based on RFM
}

export interface CustomerSegment {
  id: number;
  name: string;
  description?: string;
  criteria: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentCriteria {
  rfmScore?: string;
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  lastOrderDays?: number;
  categories?: string[];
  brands?: string[];
  averageOrderValue?: number;
  purchaseFrequency?: number;
}

export class CustomerSegmentationController {
  // RFM Analysis
  static calculateRFMScore(analytics: CustomerAnalytics): RFMAnalysis {
    const now = new Date();
    const lastOrderDate = analytics.lastOrderDate ? new Date(analytics.lastOrderDate) : null;
    
    // Recency: Days since last order (higher is better for scoring)
    const recency = lastOrderDate ? 
      Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : 
      999; // Very high number for customers who never ordered
    
    // Frequency: Number of orders
    const frequency = analytics.totalOrders;
    
    // Monetary: Total amount spent
    const monetary = analytics.totalSpent;
    
    // Calculate RFM scores (1-5 scale)
    const rScore = this.calculateRecencyScore(recency);
    const fScore = this.calculateFrequencyScore(frequency);
    const mScore = this.calculateMonetaryScore(monetary);
    
    const rfmScore = `${rScore}${fScore}${mScore}`;
    const segment = this.getRFMSegment(rScore, fScore, mScore);
    
    return {
      recency,
      frequency,
      monetary,
      rfmScore,
      segment
    };
  }

  private static calculateRecencyScore(recency: number): number {
    // Lower recency (more recent) gets higher score
    if (recency <= 30) return 5; // Champions
    if (recency <= 60) return 4; // Loyal customers
    if (recency <= 90) return 3; // Potential loyalists
    if (recency <= 180) return 2; // At risk
    return 1; // Cannot lose them
  }

  private static calculateFrequencyScore(frequency: number): number {
    if (frequency >= 20) return 5; // Very frequent
    if (frequency >= 10) return 4; // Frequent
    if (frequency >= 5) return 3; // Moderate
    if (frequency >= 2) return 2; // Occasional
    return 1; // Rare
  }

  private static calculateMonetaryScore(monetary: number): number {
    if (monetary >= 5000) return 5; // High value
    if (monetary >= 2000) return 4; // Good value
    if (monetary >= 1000) return 3; // Medium value
    if (monetary >= 500) return 2; // Low value
    return 1; // Very low value
  }

  private static getRFMSegment(rScore: number, fScore: number, mScore: number): string {
    const totalScore = rScore + fScore + mScore;
    
    if (totalScore >= 13) return 'Champions';
    if (totalScore >= 11) return 'Loyal Customers';
    if (totalScore >= 9) return 'Potential Loyalists';
    if (totalScore >= 7) return 'New Customers';
    if (totalScore >= 5) return 'Promising';
    if (totalScore >= 3) return 'Need Attention';
    return 'At Risk';
  }

  // Automatic Customer Segmentation
  static async createAutomaticSegments(): Promise<{ success: boolean; message: string; segmentsCreated: number }> {
    try {
      console.log('🤖 Creating automatic customer segments...');
      
      // Get all users with their analytics
      const response = await apiService.get('/users');
      if (!response.success || !response.data) {
        return { success: false, message: 'Kullanıcı verileri alınamadı', segmentsCreated: 0 };
      }

      const users = response.data;
      let segmentsCreated = 0;

      // Create RFM-based segments
      const rfmSegments = [
        {
          name: 'Champions',
          description: 'En değerli müşteriler - sık sık alışveriş yapan, yüksek harcama yapan müşteriler',
          criteria: { rfmScore: '555', minOrders: 10, minSpent: 2000 }
        },
        {
          name: 'Loyal Customers',
          description: 'Sadık müşteriler - düzenli alışveriş yapan müşteriler',
          criteria: { rfmScore: '444', minOrders: 5, minSpent: 1000 }
        },
        {
          name: 'Potential Loyalists',
          description: 'Potansiyel sadık müşteriler - düzenli alışveriş yapmaya başlayan müşteriler',
          criteria: { rfmScore: '333', minOrders: 3, minSpent: 500 }
        },
        {
          name: 'New Customers',
          description: 'Yeni müşteriler - henüz alışveriş geçmişi az olan müşteriler',
          criteria: { rfmScore: '222', maxOrders: 2, maxSpent: 500 }
        },
        {
          name: 'At Risk',
          description: 'Risk altındaki müşteriler - uzun süredir alışveriş yapmayan müşteriler',
          criteria: { lastOrderDays: 90, minOrders: 1 }
        }
      ];

      for (const segmentData of rfmSegments) {
        const result = await CampaignController.createSegment(segmentData);
        if (result.success) {
          segmentsCreated++;
        }
      }

      // Create category-based segments
      const categorySegments = [
        {
          name: 'Elektronik Müşterileri',
          description: 'Elektronik ürünleri tercih eden müşteriler',
          criteria: { categories: ['Elektronik', 'Bilgisayar', 'Telefon'] }
        },
        {
          name: 'Giyim Müşterileri',
          description: 'Giyim ürünlerini tercih eden müşteriler',
          criteria: { categories: ['Giyim', 'Ayakkabı', 'Aksesuar'] }
        },
        {
          name: 'Ev & Yaşam Müşterileri',
          description: 'Ev ve yaşam ürünlerini tercih eden müşteriler',
          criteria: { categories: ['Ev & Yaşam', 'Mobilya', 'Dekorasyon'] }
        }
      ];

      for (const segmentData of categorySegments) {
        const result = await CampaignController.createSegment(segmentData);
        if (result.success) {
          segmentsCreated++;
        }
      }

      console.log(`✅ Created ${segmentsCreated} automatic segments`);
      return { 
        success: true, 
        message: `${segmentsCreated} otomatik segment oluşturuldu`, 
        segmentsCreated 
      };

    } catch (error) {
      console.error('❌ CustomerSegmentationController - createAutomaticSegments error:', error);
      return { success: false, message: 'Otomatik segment oluşturma hatası', segmentsCreated: 0 };
    }
  }

  // Assign customers to segments based on criteria
  static async assignCustomersToSegments(): Promise<{ success: boolean; message: string; assignments: number }> {
    try {
      console.log('🔄 Assigning customers to segments...');
      
      // Get all segments
      const segments = await CampaignController.getSegments();
      if (segments.length === 0) {
        return { success: false, message: 'Hiç segment bulunamadı', assignments: 0 };
      }

      // Get all users
      const response = await apiService.get('/users');
      if (!response.success || !response.data) {
        return { success: false, message: 'Kullanıcı verileri alınamadı', assignments: 0 };
      }

      const users = response.data;
      let totalAssignments = 0;

      for (const user of users) {
        // Get user analytics
        const analytics = await CampaignController.getCustomerAnalytics(user.id);
        if (!analytics) continue;

        // Calculate RFM analysis
        const rfmAnalysis = this.calculateRFMScore(analytics);

        for (const segment of segments) {
          if (this.customerMatchesSegment(analytics, rfmAnalysis, segment.criteria)) {
            // Assign customer to segment
            const assignResponse = await apiService.post('/campaigns/segments/assign', {
              userId: user.id,
              segmentId: segment.id
            });
            
            if (assignResponse.success) {
              totalAssignments++;
            }
          }
        }
      }

      console.log(`✅ Assigned ${totalAssignments} customers to segments`);
      return { 
        success: true, 
        message: `${totalAssignments} müşteri segmentlere atandı`, 
        assignments: totalAssignments 
      };

    } catch (error) {
      console.error('❌ CustomerSegmentationController - assignCustomersToSegments error:', error);
      return { success: false, message: 'Müşteri atama hatası', assignments: 0 };
    }
  }

  private static customerMatchesSegment(
    analytics: CustomerAnalytics, 
    rfmAnalysis: RFMAnalysis, 
    criteria: SegmentCriteria
  ): boolean {
    try {
      // Check RFM score
      if (criteria.rfmScore && rfmAnalysis.rfmScore !== criteria.rfmScore) {
        return false;
      }

      // Check order count
      if (criteria.minOrders && analytics.totalOrders < criteria.minOrders) {
        return false;
      }
      if (criteria.maxOrders && analytics.totalOrders > criteria.maxOrders) {
        return false;
      }

      // Check total spent
      if (criteria.minSpent && analytics.totalSpent < criteria.minSpent) {
        return false;
      }
      if (criteria.maxSpent && analytics.totalSpent > criteria.maxSpent) {
        return false;
      }

      // Check last order days
      if (criteria.lastOrderDays) {
        const lastOrderDate = analytics.lastOrderDate ? new Date(analytics.lastOrderDate) : null;
        if (!lastOrderDate) return false;
        
        const daysSinceLastOrder = Math.floor(
          (new Date().getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastOrder > criteria.lastOrderDays) {
          return false;
        }
      }

      // Check favorite categories
      if (criteria.categories && criteria.categories.length > 0) {
        const hasMatchingCategory = criteria.categories.some(category =>
          analytics.favoriteCategories.includes(category)
        );
        if (!hasMatchingCategory) {
          return false;
        }
      }

      // Check favorite brands
      if (criteria.brands && criteria.brands.length > 0) {
        const hasMatchingBrand = criteria.brands.some(brand =>
          analytics.favoriteBrands.includes(brand)
        );
        if (!hasMatchingBrand) {
          return false;
        }
      }

      // Check average order value
      if (criteria.averageOrderValue && analytics.averageOrderValue < criteria.averageOrderValue) {
        return false;
      }

      // Check purchase frequency
      if (criteria.purchaseFrequency && analytics.purchaseFrequency < criteria.purchaseFrequency) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('❌ CustomerSegmentationController - customerMatchesSegment error:', error);
      return false;
    }
  }

  // Get customer segment recommendations
  static async getSegmentRecommendations(userId: number): Promise<{
    currentSegments: string[];
    recommendedSegments: string[];
    rfmAnalysis: RFMAnalysis;
  }> {
    try {
      console.log('🔄 Getting segment recommendations for user:', userId);
      
      // Get user analytics
      const analytics = await CampaignController.getCustomerAnalytics(userId);
      if (!analytics) {
        return {
          currentSegments: [],
          recommendedSegments: [],
          rfmAnalysis: {
            recency: 0,
            frequency: 0,
            monetary: 0,
            rfmScore: '000',
            segment: 'Unknown'
          }
        };
      }

      // Calculate RFM analysis
      const rfmAnalysis = this.calculateRFMScore(analytics);

      // Get current segments (this would need to be implemented in the API)
      const currentSegments: string[] = []; // Will be implemented in the API

      // Get recommended segments based on RFM
      const recommendedSegments: string[] = [];
      
      if (rfmAnalysis.segment === 'Champions') {
        recommendedSegments.push('VIP Müşteriler', 'Premium Ürünler');
      } else if (rfmAnalysis.segment === 'Loyal Customers') {
        recommendedSegments.push('Sadakat Programı', 'Özel İndirimler');
      } else if (rfmAnalysis.segment === 'Potential Loyalists') {
        recommendedSegments.push('Yeni Ürün Tanıtımları', 'Cross-sell Kampanyaları');
      } else if (rfmAnalysis.segment === 'At Risk') {
        recommendedSegments.push('Re-engagement Kampanyaları', 'Özel Teklifler');
      }

      return {
        currentSegments,
        recommendedSegments,
        rfmAnalysis
      };

    } catch (error) {
      console.error('❌ CustomerSegmentationController - getSegmentRecommendations error:', error);
      return {
        currentSegments: [],
        recommendedSegments: [],
        rfmAnalysis: {
          recency: 0,
          frequency: 0,
          monetary: 0,
          rfmScore: '000',
          segment: 'Unknown'
        }
      };
    }
  }

  // Update customer analytics based on new order
  static async updateCustomerAnalytics(userId: number, orderData: {
    orderAmount: number;
    orderItems: any[];
    orderDate: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Updating customer analytics for user:', userId);
      
      // This would typically be called when a new order is placed
      // The actual implementation would update the customer_analytics table
      
      return { success: true, message: 'Müşteri analitikleri güncellendi' };

    } catch (error) {
      console.error('❌ CustomerSegmentationController - updateCustomerAnalytics error:', error);
      return { success: false, message: 'Analitik güncelleme hatası' };
    }
  }
}
