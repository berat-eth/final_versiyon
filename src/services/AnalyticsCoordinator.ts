import { behaviorAnalytics } from './BehaviorAnalytics';
import { ecommerceAnalytics } from './EcommerceAnalytics';
import { performanceAnalytics } from './PerformanceAnalytics';
import { socialContentAnalytics } from './SocialContentAnalytics';
import { detailedActivityLogger } from './DetailedActivityLogger';

export interface AnalyticsConfig {
  enableBehaviorAnalytics: boolean;
  enableEcommerceAnalytics: boolean;
  enablePerformanceAnalytics: boolean;
  enableSocialContentAnalytics: boolean;
  enableDetailedLogging: boolean;
  flushInterval: number; // milliseconds
  batchSize: number;
  enableOfflineMode: boolean;
  enableDebugMode: boolean;
}

export interface UserSession {
  userId: number;
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalEvents: number;
  screensVisited: string[];
  totalClicks: number;
  totalScrolls: number;
  totalErrors: number;
  totalCrashes: number;
}

class AnalyticsCoordinator {
  private static instance: AnalyticsCoordinator;
  private config: AnalyticsConfig;
  private currentSession: UserSession | null = null;
  private eventQueue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enableBehaviorAnalytics: true,
      enableEcommerceAnalytics: true,
      enablePerformanceAnalytics: true,
      enableSocialContentAnalytics: true,
      enableDetailedLogging: true,
      flushInterval: 30000, // 30 saniye
      batchSize: 50,
      enableOfflineMode: true,
      enableDebugMode: false
    };
  }

  static getInstance(): AnalyticsCoordinator {
    if (!AnalyticsCoordinator.instance) {
      AnalyticsCoordinator.instance = new AnalyticsCoordinator();
    }
    return AnalyticsCoordinator.instance;
  }

  // Konfigürasyon ayarlama
  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Kullanıcı oturumu başlatma
  startUserSession(userId: number): void {
    this.currentSession = {
      userId,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      totalEvents: 0,
      screensVisited: [],
      totalClicks: 0,
      totalScrolls: 0,
      totalErrors: 0,
      totalCrashes: 0
    };

    // Tüm analytics servislerini başlat
    if (this.config.enableBehaviorAnalytics) {
      behaviorAnalytics.setUserId(userId);
      behaviorAnalytics.startSession();
    }

    if (this.config.enableEcommerceAnalytics) {
      ecommerceAnalytics.setUserId(userId);
    }

    if (this.config.enablePerformanceAnalytics) {
      performanceAnalytics.setUserId(userId);
      performanceAnalytics.startPerformanceMonitoring();
    }

    if (this.config.enableSocialContentAnalytics) {
      socialContentAnalytics.setUserId(userId);
    }

    if (this.config.enableDetailedLogging) {
      detailedActivityLogger.setUserId(userId);
    }

    // Periyodik veri gönderimini başlat
    this.startPeriodicFlush();
  }

  // Kullanıcı oturumu bitirme
  endUserSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      
      // Tüm analytics servislerini durdur
      if (this.config.enableBehaviorAnalytics) {
        behaviorAnalytics.endSession();
      }

      if (this.config.enablePerformanceAnalytics) {
        performanceAnalytics.logAppStability();
      }

      // Son veri gönderimini yap
      this.flushAllData();

      this.currentSession = null;
    }

    // Periyodik veri gönderimini durdur
    this.stopPeriodicFlush();
  }

  // Ekran görüntüleme
  trackScreenView(screenName: string): void {
    if (!this.currentSession) return;

    this.currentSession.screensVisited.push(screenName);
    this.currentSession.totalEvents++;

    if (this.config.enableBehaviorAnalytics) {
      behaviorAnalytics.startPageView(screenName);
      behaviorAnalytics.visitScreen(screenName);
    }

    if (this.config.enableDetailedLogging) {
      detailedActivityLogger.logScreenViewed(screenName);
    }
  }

  // Ekran görüntüleme bitirme
  endScreenView(screenName: string): void {
    if (this.config.enableBehaviorAnalytics) {
      behaviorAnalytics.endPageView(screenName);
    }
  }

  // Tıklama takibi
  trackClick(elementType: string, elementId?: string, elementText?: string, x?: number, y?: number): void {
    if (!this.currentSession) return;

    this.currentSession.totalClicks++;
    this.currentSession.totalEvents++;

    if (this.config.enableBehaviorAnalytics) {
      behaviorAnalytics.logClick(elementType, elementId, elementText, x, y);
      behaviorAnalytics.incrementClickCount();
    }
  }

  // Scroll takibi
  trackScroll(): void {
    if (!this.currentSession) return;

    this.currentSession.totalScrolls++;
    this.currentSession.totalEvents++;

    if (this.config.enableBehaviorAnalytics) {
      behaviorAnalytics.incrementScrollCount();
    }
  }

  // Hata takibi
  trackError(errorType: string, errorMessage: string, errorStack?: string, screenName?: string, userAction?: string): void {
    if (!this.currentSession) return;

    this.currentSession.totalErrors++;
    this.currentSession.totalEvents++;

    if (this.config.enablePerformanceAnalytics) {
      performanceAnalytics.logError(errorType, errorMessage, errorStack, screenName, userAction);
    }

    if (this.config.enableDetailedLogging) {
      detailedActivityLogger.logErrorOccurred(errorMessage, screenName || 'unknown', userAction);
    }
  }

  // Çökme takibi
  trackCrash(crashInfo: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalCrashes++;
    this.currentSession.totalEvents++;

    if (this.config.enablePerformanceAnalytics) {
      performanceAnalytics.logError('crash', crashInfo.message || 'App crashed', crashInfo.stack);
    }
  }

  // E-ticaret olayları
  trackEcommerceEvent(eventType: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    if (this.config.enableEcommerceAnalytics) {
      switch (eventType) {
        case 'cart_abandonment':
          ecommerceAnalytics.abandonCart(eventData.userId);
          break;
        case 'product_comparison':
          ecommerceAnalytics.startProductComparison(eventData.userId, eventData.productId, eventData.productName, eventData.price, eventData.category, eventData.brand);
          break;
        case 'price_sensitivity':
          ecommerceAnalytics.logPriceSensitivity(eventData.productId, eventData.productName, eventData.originalPrice, eventData.newPrice, eventData.userReaction, eventData.actionTaken, eventData.timeToReact);
          break;
        case 'campaign_engagement':
          ecommerceAnalytics.logCampaignEngagement(eventData.campaignId, eventData.campaignName, eventData.campaignType, eventData.engagementType, eventData.engagementDuration, eventData.conversionValue);
          break;
        case 'wishlist_action':
          ecommerceAnalytics.logWishlistAction(eventData.productId, eventData.productName, eventData.price, eventData.category, eventData.action, eventData.wishlistSize);
          break;
      }
    }
  }

  // Sosyal medya olayları
  trackSocialEvent(eventType: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    if (this.config.enableSocialContentAnalytics) {
      switch (eventType) {
        case 'share':
          socialContentAnalytics.logShare(eventData.contentType, eventData.contentId, eventData.contentTitle, eventData.sharePlatform, eventData.shareMethod, eventData.shareSuccess, eventData.shareError);
          break;
        case 'review':
          socialContentAnalytics.logReview(eventData.productId, eventData.productName, eventData.reviewType, eventData.rating, eventData.reviewText, eventData.hasPhotos, eventData.hasVideos);
          break;
        case 'social_engagement':
          socialContentAnalytics.logSocialMediaEngagement(eventData.platform, eventData.engagementType, eventData.contentId, eventData.contentType, eventData.engagementValue);
          break;
        case 'content_consumption':
          socialContentAnalytics.logContentConsumption(eventData.contentId, eventData.contentType, eventData.contentTitle, eventData.contentCategory, eventData.consumptionType, eventData.consumptionDuration, eventData.consumptionPercentage, eventData.interactionCount);
          break;
        case 'community_interaction':
          socialContentAnalytics.logCommunityInteraction(eventData.interactionType, eventData.targetUserId, eventData.targetContentId, eventData.interactionText, eventData.isHelpful);
          break;
      }
    }
  }

  // Performans olayları
  trackPerformanceEvent(eventType: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    if (this.config.enablePerformanceAnalytics) {
      switch (eventType) {
        case 'screen_performance':
          performanceAnalytics.logScreenPerformance(eventData.screenName, eventData.loadTime, eventData.renderTime);
          break;
        case 'network_request':
          performanceAnalytics.logNetworkRequest(eventData.url, eventData.method, eventData.responseTime, eventData.responseSize, eventData.statusCode);
          break;
        case 'device_metrics':
          performanceAnalytics.logDeviceMetrics();
          break;
      }
    }
  }

  // Özel olay takibi
  trackCustomEvent(eventName: string, eventData: any): void {
    if (!this.currentSession) return;

    this.currentSession.totalEvents++;

    if (this.config.enableDetailedLogging) {
      detailedActivityLogger.logUserActivity(eventName, eventData);
    }
  }

  // Veri gönderimi
  private startPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushAllData();
    }, this.config.flushInterval);
  }

  private stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private flushAllData(): void {
    // Tüm analytics servislerinin verilerini gönder
    if (this.config.enableBehaviorAnalytics) {
      behaviorAnalytics.startPeriodicFlush(1000); // 1 saniye
    }
  }

  // Debug modu
  enableDebugMode(): void {
    this.config.enableDebugMode = true;
    console.log('🔍 Analytics Debug Mode Enabled');
  }

  disableDebugMode(): void {
    this.config.enableDebugMode = false;
    console.log('🔍 Analytics Debug Mode Disabled');
  }

  // Mevcut oturum bilgilerini al
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  // Konfigürasyon bilgilerini al
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }
}

export const analyticsCoordinator = AnalyticsCoordinator.getInstance();
