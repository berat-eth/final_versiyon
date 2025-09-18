import { userDataService } from './UserDataService';

export interface ShareData {
  userId: number;
  contentType: 'product' | 'article' | 'campaign' | 'review' | 'wishlist';
  contentId: string;
  contentTitle: string;
  sharePlatform: 'facebook' | 'instagram' | 'twitter' | 'whatsapp' | 'telegram' | 'copy_link' | 'other';
  shareMethod: 'button' | 'menu' | 'gesture' | 'auto';
  shareTimestamp: number;
  shareSuccess: boolean;
  shareError?: string;
}

export interface ReviewData {
  userId: number;
  productId: number;
  productName: string;
  reviewType: 'rating' | 'text' | 'photo' | 'video';
  rating: number;
  reviewText?: string;
  reviewLength?: number;
  hasPhotos: boolean;
  hasVideos: boolean;
  reviewTimestamp: number;
  helpfulVotes: number;
  reportCount: number;
}

export interface SocialMediaEngagementData {
  userId: number;
  platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'tiktok';
  engagementType: 'like' | 'comment' | 'share' | 'follow' | 'mention';
  contentId: string;
  contentType: 'post' | 'story' | 'reel' | 'video' | 'ad';
  engagementValue: number;
  engagementTimestamp: number;
}

export interface ContentConsumptionData {
  userId: number;
  contentId: string;
  contentType: 'blog' | 'news' | 'guide' | 'tutorial' | 'video' | 'image' | 'infographic';
  contentTitle: string;
  contentCategory: string;
  consumptionType: 'viewed' | 'read' | 'watched' | 'downloaded' | 'bookmarked';
  consumptionDuration: number; // seconds
  consumptionPercentage: number; // 0-100
  interactionCount: number;
  contentTimestamp: number;
}

export interface CommunityInteractionData {
  userId: number;
  interactionType: 'question' | 'answer' | 'comment' | 'like' | 'report' | 'follow_user';
  targetUserId?: number;
  targetContentId?: string;
  interactionText?: string;
  interactionLength?: number;
  isHelpful: boolean;
  interactionTimestamp: number;
}

export interface InfluencerEngagementData {
  userId: number;
  influencerId: string;
  influencerName: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter';
  engagementType: 'follow' | 'like' | 'comment' | 'share' | 'mention' | 'collaboration';
  contentId?: string;
  engagementValue: number;
  engagementTimestamp: number;
}

export interface UserGeneratedContentData {
  userId: number;
  contentType: 'photo' | 'video' | 'review' | 'story' | 'post';
  contentId: string;
  contentTitle: string;
  contentDescription?: string;
  contentTags: string[];
  contentCategory: string;
  isPublic: boolean;
  isPromoted: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  creationTimestamp: number;
}

class SocialContentAnalytics {
  private static instance: SocialContentAnalytics;
  private userId: number | null = null;

  static getInstance(): SocialContentAnalytics {
    if (!SocialContentAnalytics.instance) {
      SocialContentAnalytics.instance = new SocialContentAnalytics();
    }
    return SocialContentAnalytics.instance;
  }

  setUserId(userId: number) {
    this.userId = userId;
  }

  // Paylaşım analizi
  logShare(contentType: string, contentId: string, contentTitle: string, sharePlatform: string, shareMethod: string, shareSuccess: boolean, shareError?: string): void {
    if (!this.userId) return;

    const data: ShareData = {
      userId: this.userId,
      contentType: contentType as any,
      contentId,
      contentTitle,
      sharePlatform: sharePlatform as any,
      shareMethod: shareMethod as any,
      shareTimestamp: Date.now(),
      shareSuccess,
      shareError
    };

    this.logShareData(data);
  }

  // Değerlendirme analizi
  logReview(productId: number, productName: string, reviewType: string, rating: number, reviewText?: string, hasPhotos: boolean = false, hasVideos: boolean = false): void {
    if (!this.userId) return;

    const data: ReviewData = {
      userId: this.userId,
      productId,
      productName,
      reviewType: reviewType as any,
      rating,
      reviewText,
      reviewLength: reviewText?.length || 0,
      hasPhotos,
      hasVideos,
      reviewTimestamp: Date.now(),
      helpfulVotes: 0,
      reportCount: 0
    };

    this.logReviewData(data);
  }

  // Sosyal medya etkileşimi
  logSocialMediaEngagement(platform: string, engagementType: string, contentId: string, contentType: string, engagementValue: number): void {
    if (!this.userId) return;

    const data: SocialMediaEngagementData = {
      userId: this.userId,
      platform: platform as any,
      engagementType: engagementType as any,
      contentId,
      contentType: contentType as any,
      engagementValue,
      engagementTimestamp: Date.now()
    };

    this.logSocialMediaEngagementData(data);
  }

  // İçerik tüketimi
  logContentConsumption(contentId: string, contentType: string, contentTitle: string, contentCategory: string, consumptionType: string, consumptionDuration: number, consumptionPercentage: number, interactionCount: number): void {
    if (!this.userId) return;

    const data: ContentConsumptionData = {
      userId: this.userId,
      contentId,
      contentType: contentType as any,
      contentTitle,
      contentCategory,
      consumptionType: consumptionType as any,
      consumptionDuration,
      consumptionPercentage,
      interactionCount,
      contentTimestamp: Date.now()
    };

    this.logContentConsumptionData(data);
  }

  // Topluluk etkileşimi
  logCommunityInteraction(interactionType: string, targetUserId?: number, targetContentId?: string, interactionText?: string, isHelpful: boolean = false): void {
    if (!this.userId) return;

    const data: CommunityInteractionData = {
      userId: this.userId,
      interactionType: interactionType as any,
      targetUserId,
      targetContentId,
      interactionText,
      interactionLength: interactionText?.length || 0,
      isHelpful,
      interactionTimestamp: Date.now()
    };

    this.logCommunityInteractionData(data);
  }

  // Influencer etkileşimi
  logInfluencerEngagement(influencerId: string, influencerName: string, platform: string, engagementType: string, contentId?: string, engagementValue: number = 1): void {
    if (!this.userId) return;

    const data: InfluencerEngagementData = {
      userId: this.userId,
      influencerId,
      influencerName,
      platform: platform as any,
      engagementType: engagementType as any,
      contentId,
      engagementValue,
      engagementTimestamp: Date.now()
    };

    this.logInfluencerEngagementData(data);
  }

  // Kullanıcı tarafından oluşturulan içerik
  logUserGeneratedContent(contentType: string, contentId: string, contentTitle: string, contentDescription?: string, contentTags: string[] = [], contentCategory: string, isPublic: boolean = true, isPromoted: boolean = false): void {
    if (!this.userId) return;

    const data: UserGeneratedContentData = {
      userId: this.userId,
      contentType: contentType as any,
      contentId,
      contentTitle,
      contentDescription,
      contentTags,
      contentCategory,
      isPublic,
      isPromoted,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      creationTimestamp: Date.now()
    };

    this.logUserGeneratedContentData(data);
  }

  // İçerik etkileşim istatistiklerini güncelle
  updateContentStats(contentId: string, statType: 'view' | 'like' | 'comment' | 'share', increment: number = 1): void {
    if (!this.userId) return;

    const data = {
      userId: this.userId,
      contentId,
      statType,
      increment,
      timestamp: Date.now()
    };

    this.logContentStatsUpdate(data);
  }

  // Veri gönderme fonksiyonları
  private async logShareData(data: ShareData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'content_share',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Share data logging failed:', error);
    }
  }

  private async logReviewData(data: ReviewData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'product_review',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Review data logging failed:', error);
    }
  }

  private async logSocialMediaEngagementData(data: SocialMediaEngagementData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'social_media_engagement',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Social media engagement logging failed:', error);
    }
  }

  private async logContentConsumptionData(data: ContentConsumptionData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'content_consumption',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Content consumption logging failed:', error);
    }
  }

  private async logCommunityInteractionData(data: CommunityInteractionData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'community_interaction',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Community interaction logging failed:', error);
    }
  }

  private async logInfluencerEngagementData(data: InfluencerEngagementData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'influencer_engagement',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Influencer engagement logging failed:', error);
    }
  }

  private async logUserGeneratedContentData(data: UserGeneratedContentData) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'user_generated_content',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ User generated content logging failed:', error);
    }
  }

  private async logContentStatsUpdate(data: any) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'content_stats_update',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Content stats update logging failed:', error);
    }
  }
}

export const socialContentAnalytics = SocialContentAnalytics.getInstance();
