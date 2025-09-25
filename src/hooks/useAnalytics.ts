import { useEffect, useRef, useCallback } from 'react';
import { analyticsCoordinator } from '../services/AnalyticsCoordinator';
import { behaviorAnalytics } from '../services/BehaviorAnalytics';
import { ecommerceAnalytics } from '../services/EcommerceAnalytics';
import { performanceAnalytics } from '../services/PerformanceAnalytics';
import { socialContentAnalytics } from '../services/SocialContentAnalytics';

export interface UseAnalyticsOptions {
  userId?: number;
  enableBehaviorTracking?: boolean;
  enableEcommerceTracking?: boolean;
  enablePerformanceTracking?: boolean;
  enableSocialTracking?: boolean;
  enableDebugMode?: boolean;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const {
    userId,
    enableBehaviorTracking = true,
    enableEcommerceTracking = true,
    enablePerformanceTracking = true,
    enableSocialTracking = true,
    enableDebugMode = false
  } = options;

  const screenStartTime = useRef<number>(0);
  const currentScreen = useRef<string>('');

  // Analytics'i başlat
  useEffect(() => {
    if (userId) {
      analyticsCoordinator.configure({
        enableBehaviorAnalytics: enableBehaviorTracking,
        enableEcommerceAnalytics: enableEcommerceTracking,
        enablePerformanceAnalytics: enablePerformanceTracking,
        enableSocialContentAnalytics: enableSocialTracking,
        enableDebugMode
      });

      analyticsCoordinator.startUserSession(userId);

      if (enableDebugMode) {
        analyticsCoordinator.enableDebugMode();
      }
    }

    return () => {
      analyticsCoordinator.endUserSession();
    };
  }, [userId, enableBehaviorTracking, enableEcommerceTracking, enablePerformanceTracking, enableSocialTracking, enableDebugMode]);

  // Ekran görüntüleme takibi
  const trackScreenView = useCallback((screenName: string) => {
    if (currentScreen.current) {
      analyticsCoordinator.endScreenView(currentScreen.current);
    }

    currentScreen.current = screenName;
    screenStartTime.current = Date.now();
    analyticsCoordinator.trackScreenView(screenName);
  }, []);

  // Ekran görüntüleme bitirme
  const endScreenView = useCallback(() => {
    if (currentScreen.current) {
      const duration = Date.now() - screenStartTime.current;
      analyticsCoordinator.endScreenView(currentScreen.current);
      
      if (enablePerformanceTracking) {
        performanceAnalytics.logScreenPerformance(
          currentScreen.current,
          duration,
          duration * 0.8 // Render time tahmini
        );
      }
    }
  }, [enablePerformanceTracking]);

  // Tıklama takibi
  const trackClick = useCallback((elementType: string, elementId?: string, elementText?: string, x?: number, y?: number) => {
    analyticsCoordinator.trackClick(elementType, elementId, elementText, x, y);
  }, []);

  // Scroll takibi
  const trackScroll = useCallback(() => {
    analyticsCoordinator.trackScroll();
  }, []);

  // Hata takibi
  const trackError = useCallback((errorType: string, errorMessage: string, errorStack?: string, userAction?: string) => {
    analyticsCoordinator.trackError(errorType, errorMessage, errorStack, currentScreen.current, userAction);
  }, []);

  // E-ticaret olayları
  const trackEcommerceEvent = useCallback((eventType: string, eventData: any) => {
    analyticsCoordinator.trackEcommerceEvent(eventType, eventData);
  }, []);

  // Sosyal medya olayları
  const trackSocialEvent = useCallback((eventType: string, eventData: any) => {
    analyticsCoordinator.trackSocialEvent(eventType, eventData);
  }, []);

  // Performans olayları
  const trackPerformanceEvent = useCallback((eventType: string, eventData: any) => {
    analyticsCoordinator.trackPerformanceEvent(eventType, eventData);
  }, []);

  // Özel olay takibi
  const trackCustomEvent = useCallback((eventName: string, eventData: any) => {
    analyticsCoordinator.trackCustomEvent(eventName, eventData);
  }, []);

  // Sepet işlemleri
  const trackCartAction = useCallback((action: 'add' | 'remove' | 'update' | 'clear', productData: any) => {
    switch (action) {
      case 'add':
        ecommerceAnalytics.addToCartSession(
          productData.userId,
          productData.productId,
          productData.productName,
          productData.price,
          productData.quantity,
          productData.variations
        );
        break;
      case 'remove':
        ecommerceAnalytics.removeFromCartSession(productData.userId, productData.productId);
        break;
      case 'update':
        ecommerceAnalytics.updateQuantitySession(productData.userId, productData.productId, productData.quantity);
        break;
    }
  }, []);

  // Ürün karşılaştırma
  const trackProductComparison = useCallback((productData: any) => {
    ecommerceAnalytics.startProductComparison(
      productData.userId,
      productData.productId,
      productData.productName,
      productData.price,
      productData.category,
      productData.brand
    );
  }, []);

  // Fiyat hassasiyeti
  const trackPriceSensitivity = useCallback((productData: any) => {
    ecommerceAnalytics.logPriceSensitivity(
      productData.productId,
      productData.productName,
      productData.originalPrice,
      productData.newPrice,
      productData.userReaction,
      productData.actionTaken,
      productData.timeToReact
    );
  }, []);

  // Paylaşım takibi
  const trackShare = useCallback((shareData: any) => {
    socialContentAnalytics.logShare(
      shareData.contentType,
      shareData.contentId,
      shareData.contentTitle,
      shareData.sharePlatform,
      shareData.shareMethod,
      shareData.shareSuccess,
      shareData.shareError
    );
  }, []);

  // Değerlendirme takibi
  const trackReview = useCallback((reviewData: any) => {
    socialContentAnalytics.logReview(
      reviewData.productId,
      reviewData.productName,
      reviewData.reviewType,
      reviewData.rating,
      reviewData.reviewText,
      reviewData.hasPhotos,
      reviewData.hasVideos
    );
  }, []);

  // İçerik tüketimi
  const trackContentConsumption = useCallback((contentData: any) => {
    socialContentAnalytics.logContentConsumption(
      contentData.contentId,
      contentData.contentType,
      contentData.contentTitle,
      contentData.contentCategory,
      contentData.consumptionType,
      contentData.consumptionDuration,
      contentData.consumptionPercentage,
      contentData.interactionCount
    );
  }, []);

  // Cihaz bilgilerini logla
  const logDeviceInfo = useCallback(() => {
    if (enablePerformanceTracking) {
      performanceAnalytics.logDeviceMetrics();
    }
  }, [enablePerformanceTracking]);

  // Mevcut oturum bilgilerini al
  const getSessionInfo = useCallback(() => {
    return analyticsCoordinator.getCurrentSession();
  }, []);

  return {
    // Temel takip fonksiyonları
    trackScreenView,
    endScreenView,
    trackClick,
    trackScroll,
    trackError,
    
    // E-ticaret takip fonksiyonları
    trackEcommerceEvent,
    trackCartAction,
    trackProductComparison,
    trackPriceSensitivity,
    
    // Sosyal medya takip fonksiyonları
    trackSocialEvent,
    trackShare,
    trackReview,
    trackContentConsumption,
    
    // Performans takip fonksiyonları
    trackPerformanceEvent,
    logDeviceInfo,
    
    // Genel takip fonksiyonları
    trackCustomEvent,
    getSessionInfo
  };
};

// Özel hook'lar
export const useScreenTracking = (screenName: string) => {
  const { trackScreenView, endScreenView } = useAnalytics();

  useEffect(() => {
    trackScreenView(screenName);
    
    return () => {
      endScreenView();
    };
  }, [screenName, trackScreenView, endScreenView]);
};

export const useClickTracking = (elementType: string, elementId?: string) => {
  const { trackClick } = useAnalytics();

  const handleClick = useCallback((event?: any) => {
    trackClick(elementType, elementId, event?.target?.textContent);
  }, [trackClick, elementType, elementId]);

  return handleClick;
};

export const useErrorTracking = () => {
  const { trackError } = useAnalytics();

  const handleError = useCallback((error: Error, userAction?: string) => {
    trackError('javascript', error.message, error.stack, userAction);
  }, [trackError]);

  return handleError;
};
