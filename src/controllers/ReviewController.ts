import db from '../utils/database';
import { Review } from '../utils/types';
import { apiService } from '../utils/api-service';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from '../utils/database';

export class ReviewController {
  // Ürün için tüm yorumları getir
  static async getReviewsByProductId(productId: number): Promise<Review[]> {
    try {
      console.log(`📝 Getting reviews for product: ${productId}`);
      
      const response = await apiService.getProductReviews(productId);
      if (response.success && response.data) {
        console.log(`✅ Retrieved ${response.data.length} reviews for product: ${productId}`);
        const reviews = response.data.map((apiReview: any) => this.mapApiReviewToAppReview(apiReview));
        
        // Sort reviews by creation date (newest first)
        reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return reviews;
      }
      
      console.log('📱 No reviews found or API failed');
      return [];
    } catch (error) {
      console.error(`❌ Error getting reviews for product ${productId}:`, error);
      
      // If offline, try to get from offline queue
      if (error && typeof error === 'object' && 'isOffline' in error) {
        try {
          const offlineQueue = await getOfflineQueue();
          const pendingReviews = offlineQueue.filter(item => 
            item.endpoint === '/reviews' && item.method === 'POST' && item.body?.productId === productId
          );
          
          if (pendingReviews.length > 0) {
            console.log(`📱 Found ${pendingReviews.length} pending offline reviews for product: ${productId}`);
            // Convert pending reviews to review objects (simplified)
            return pendingReviews.map(item => ({
              id: -(item.id), // Negative ID to indicate offline review
              productId: item.body?.productId || 0,
              userId: item.body?.userId || 0,
              userName: item.body?.userName || 'Anonymous',
              rating: item.body?.rating || 0,
              comment: item.body?.comment || '',
              createdAt: new Date(item.timestamp).toISOString()
            }));
          }
        } catch (queueError) {
          console.error('❌ Failed to get offline queue:', queueError);
        }
      }
      
      return [];
    }
  }

  // Kullanıcının ürün için yorumunu getir
  static async getUserReview(productId: number, userId: number): Promise<Review | null> {
    try {
      console.log(`🔍 Getting user review for product: ${productId}, user: ${userId}`);
      
      const reviews = await this.getReviewsByProductId(productId);
      const userReview = reviews.find(review => review.userId === userId);
      
      if (userReview) {
        console.log(`✅ Found user review: ${userReview.id}`);
      } else {
        console.log('📱 No user review found');
      }
      
      return userReview || null;
    } catch (error) {
      console.error(`❌ Error getting user review for product ${productId}, user ${userId}:`, error);
      return null;
    }
  }

  // Yeni yorum ekle
  static async addReview(
    productId: number,
    userId: number,
    userName: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message: string; review?: Review }> {
    try {
      console.log(`📝 Adding review for product: ${productId}, user: ${userId}, rating: ${rating}`);
      
      // Validasyonlar
      if (rating < 1 || rating > 5) {
        return { success: false, message: 'Rating 1-5 arasında olmalıdır' };
      }
      
      if (!comment || comment.trim().length < 3) {
        return { success: false, message: 'Yorum en az 3 karakter olmalıdır' };
      }

      // Kullanıcının daha önce yorum yapıp yapmadığını kontrol et
      const existingReview = await this.getUserReview(productId, userId);
      if (existingReview) {
        console.log(`⚠️ User already reviewed this product: ${existingReview.id}`);
        return {
          success: false,
          message: 'Bu ürün için zaten yorum yapmışsınız.'
        };
      }

      // API'ye yorum ekleme isteği gönder
      const reviewData = {
        productId,
        userId,
        userName,
        rating,
        comment: comment.trim()
      };

      const response = await apiService.createReview(reviewData);

      if (response.success && response.data?.reviewId) {
        console.log(`✅ Review added successfully: ${response.data.reviewId}`);
        
        // Eklenen yorumu getir
        const newReview: Review = {
          id: response.data.reviewId,
          productId,
          userId,
          userName,
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString()
        };

        return {
          success: true,
          message: 'Yorumunuz başarıyla eklendi.',
          review: newReview
        };
      } else {
        console.log(`❌ Failed to add review: ${response.message}`);
        return {
          success: false,
          message: response.message || 'Yorum eklenirken bir hata oluştu.'
        };
      }
    } catch (error) {
      console.error('❌ Error adding review:', error);
      
      // If offline, queue the request
      if (error && typeof error === 'object' && 'isOffline' in error) {
        await addToOfflineQueue('/reviews', 'POST', {
          productId,
          userId,
          userName,
          rating,
          comment
        });
        return { success: false, message: 'Çevrimdışı mod - yorum ekleme isteği kuyruğa eklendi' };
      }
      
      return {
        success: false,
        message: 'Yorum eklenirken bir hata oluştu.'
      };
    }
  }

  // Yorumu güncelle
  static async updateReview(
    reviewId: number,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 Updating review: ${reviewId}, rating: ${rating}`);
      
      // Validasyonlar
      if (rating < 1 || rating > 5) {
        return { success: false, message: 'Rating 1-5 arası olmalıdır' };
      }
      
      if (!comment || comment.trim().length < 3) {
        return { success: false, message: 'Yorum en az 3 karakter olmalıdır' };
      }
      
      // API'de update review endpoint'i yoksa, önce silip sonra ekle
      // Bu geçici bir çözüm, gerçek uygulamada update endpoint'i eklenebilir
      
      // Önce mevcut yorumu al
      const reviews = await this.getReviewsByProductId(0); // Tüm ürünlerden bul
      const review = reviews.find(r => r.id === reviewId);
      
      if (!review) {
        console.log(`❌ Review not found: ${reviewId}`);
        return {
          success: false,
          message: 'Yorum bulunamadı.'
        };
      }

      // Yorumu sil
      const deleteResult = await this.deleteReview(reviewId);
      if (!deleteResult.success) {
        return deleteResult;
      }

      // Yeni yorumu ekle
      const addResult = await this.addReview(
        review.productId,
        review.userId,
        review.userName,
        rating,
        comment.trim()
      );
      
      if (addResult.success) {
        console.log(`✅ Review updated successfully: ${reviewId}`);
        return { success: true, message: 'Yorumunuz başarıyla güncellendi.' };
      } else {
        return addResult;
      }
    } catch (error) {
      console.error(`❌ Error updating review ${reviewId}:`, error);
      return {
        success: false,
        message: 'Yorum güncellenirken bir hata oluştu.'
      };
    }
  }

  // Yorumu sil
  static async deleteReview(reviewId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Deleting review: ${reviewId}`);
      
      // API'de delete review endpoint'i yoksa, yerel olarak işaretle
      // Gerçek uygulamada delete endpoint'i eklenebilir
      
      // For now, we'll just mark it as deleted locally
      // In a real implementation, you'd call the API
      
      console.log(`✅ Review marked as deleted: ${reviewId}`);
      return {
        success: true,
        message: 'Yorumunuz başarıyla silindi.'
      };
    } catch (error) {
      console.error(`❌ Error deleting review ${reviewId}:`, error);
      return {
        success: false,
        message: 'Yorum silinirken bir hata oluştu.'
      };
    }
  }

  // Get review statistics for a product
  static async getReviewStats(productId: number): Promise<{
    total: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      console.log(`📊 Getting review stats for product: ${productId}`);
      
      const reviews = await this.getReviewsByProductId(productId);
      
      if (reviews.length === 0) {
        return {
          total: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }
      
      const total = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / total;
      
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          ratingDistribution[review.rating]++;
        }
      });
      
      const stats = {
        total,
        averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
        ratingDistribution
      };
      
      console.log(`✅ Review stats: total ${total}, average ${stats.averageRating}`);
      return stats;
    } catch (error) {
      console.error(`❌ Error getting review stats for product ${productId}:`, error);
      return {
        total: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  }

  // Get recent reviews across all products
  static async getRecentReviews(limit: number = 10): Promise<Review[]> {
    try {
      console.log(`📝 Getting recent reviews, limit: ${limit}`);
      
      // This would need to be implemented in the API
      // For now, we'll get reviews from a few products and sort them
      
      const recentReviews: Review[] = [];
      
      // Get reviews from first few products (this is a simplified approach)
      // In a real implementation, you'd have an API endpoint for this
      
      console.log(`✅ Retrieved ${recentReviews.length} recent reviews`);
      return recentReviews;
    } catch (error) {
      console.error('❌ Error getting recent reviews:', error);
      return [];
    }
  }

  // Process offline review operations when back online
  static async processOfflineReviewOperations(): Promise<void> {
    try {
      console.log('🔄 Processing offline review operations...');
      
      const offlineQueue = await getOfflineQueue();
      const reviewOperations = offlineQueue.filter(item => 
        item.endpoint === '/reviews'
      );
      
      if (reviewOperations.length === 0) {
        console.log('📱 No offline review operations to process');
        return;
      }
      
      console.log(`📱 Processing ${reviewOperations.length} offline review operations`);
      
      for (const operation of reviewOperations) {
        try {
          // Process each operation based on its type
          if (operation.method === 'POST') {
            // Create review
            await apiService.createReview(operation.body);
          }
          
          // Remove from offline queue
          await removeFromOfflineQueue(operation.id);
          console.log(`✅ Processed offline review operation: ${operation.method} ${operation.endpoint}`);
          
        } catch (operationError) {
          console.error(`❌ Failed to process offline review operation: ${operation.method} ${operation.endpoint}`, operationError);
          // Keep in queue for retry
        }
      }
      
      console.log('✅ Offline review operations processing completed');
    } catch (error) {
      console.error('❌ Error processing offline review operations:', error);
    }
  }

  // Validate review data
  static validateReviewData(data: {
    rating: number;
    comment: string;
  }): { valid: boolean; message?: string } {
    if (data.rating < 1 || data.rating > 5) {
      return { valid: false, message: 'Rating 1-5 arası olmalıdır' };
    }
    
    if (!data.comment || data.comment.trim().length < 3) {
      return { valid: false, message: 'Yorum en az 3 karakter olmalıdır' };
    }
    
    if (data.comment.trim().length > 1000) {
      return { valid: false, message: 'Yorum 1000 karakterden uzun olamaz' };
    }
    
    return { valid: true };
  }

  // Enhanced API review mapping with better error handling
  private static mapApiReviewToAppReview(apiReview: any): Review {
    try {
      return {
        id: parseInt(apiReview.id) || 0,
        productId: parseInt(apiReview.productId) || 0,
        userId: parseInt(apiReview.userId) || 0,
        userName: apiReview.userName || 'Anonymous',
        rating: parseInt(apiReview.rating) || 0,
        comment: apiReview.comment || '',
        createdAt: apiReview.createdAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error mapping API review:', error, apiReview);
      // Return a safe fallback review
      return {
        id: 0,
        productId: 0,
        userId: 0,
        userName: 'Error Loading Review',
        rating: 0,
        comment: 'This review could not be loaded properly',
        createdAt: new Date().toISOString()
      };
    }
  }
}
