import { userDataService } from './UserDataService';

export interface PageViewData {
  screenName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  scrollDepth: number;
  maxScrollDepth: number;
  scrollPercentage: number;
  viewportHeight: number;
  contentHeight: number;
}

export interface ClickHeatmapData {
  screenName: string;
  elementType: string; // button, link, image, product, etc.
  elementId?: string;
  elementText?: string;
  x: number;
  y: number;
  timestamp: number;
  clickCount: number;
}

export interface ScrollBehaviorData {
  screenName: string;
  scrollEvents: Array<{
    timestamp: number;
    scrollTop: number;
    scrollPercentage: number;
  }>;
  totalScrollTime: number;
  averageScrollSpeed: number;
}

export interface AppUsageData {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  screensVisited: string[];
  totalClicks: number;
  totalScrolls: number;
  appVersion: string;
  deviceInfo: {
    platform: string;
    model: string;
    osVersion: string;
    screenSize: string;
  };
}

class BehaviorAnalytics {
  private static instance: BehaviorAnalytics;
  private currentPageViews: Map<string, PageViewData> = new Map();
  private clickHeatmap: ClickHeatmapData[] = [];
  private scrollBehaviors: Map<string, ScrollBehaviorData> = new Map();
  private currentSession: AppUsageData | null = null;
  private userId: number | null = null;

  static getInstance(): BehaviorAnalytics {
    if (!BehaviorAnalytics.instance) {
      BehaviorAnalytics.instance = new BehaviorAnalytics();
    }
    return BehaviorAnalytics.instance;
  }

  setUserId(userId: number) {
    this.userId = userId;
  }

  // Sayfa görüntüleme başlatma
  startPageView(screenName: string): void {
    const pageView: PageViewData = {
      screenName,
      startTime: Date.now(),
      scrollDepth: 0,
      maxScrollDepth: 0,
      scrollPercentage: 0,
      viewportHeight: window.innerHeight || 0,
      contentHeight: document.body.scrollHeight || 0
    };
    
    this.currentPageViews.set(screenName, pageView);
    
    // Scroll listener ekle
    this.addScrollListener(screenName);
  }

  // Sayfa görüntüleme bitirme
  endPageView(screenName: string): void {
    const pageView = this.currentPageViews.get(screenName);
    if (pageView) {
      pageView.endTime = Date.now();
      pageView.duration = pageView.endTime - pageView.startTime;
      pageView.scrollPercentage = (pageView.maxScrollDepth / pageView.contentHeight) * 100;
      
      // Veriyi sunucuya gönder
      this.logPageView(pageView);
      
      // Local storage'dan kaldır
      this.currentPageViews.delete(screenName);
    }
  }

  // Tıklama verisi toplama
  logClick(elementType: string, elementId?: string, elementText?: string, x?: number, y?: number): void {
    const clickData: ClickHeatmapData = {
      screenName: this.getCurrentScreen(),
      elementType,
      elementId,
      elementText,
      x: x || 0,
      y: y || 0,
      timestamp: Date.now(),
      clickCount: 1
    };

    this.clickHeatmap.push(clickData);
    
    // Her 10 tıklamada bir sunucuya gönder
    if (this.clickHeatmap.length >= 10) {
      this.flushClickData();
    }
  }

  // Scroll davranışı toplama
  private addScrollListener(screenName: string): void {
    let scrollData = this.scrollBehaviors.get(screenName);
    if (!scrollData) {
      scrollData = {
        screenName,
        scrollEvents: [],
        totalScrollTime: 0,
        averageScrollSpeed: 0
      };
      this.scrollBehaviors.set(screenName, scrollData);
    }

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercentage = (scrollTop / (document.body.scrollHeight - window.innerHeight)) * 100;
      
      scrollData!.scrollEvents.push({
        timestamp: Date.now(),
        scrollTop,
        scrollPercentage
      });

      // Sayfa görüntüleme verisini güncelle
      const pageView = this.currentPageViews.get(screenName);
      if (pageView) {
        pageView.scrollDepth = scrollTop;
        pageView.maxScrollDepth = Math.max(pageView.maxScrollDepth, scrollTop);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Cleanup için listener'ı sakla
    (scrollData as any).scrollListener = handleScroll;
  }

  // Uygulama oturumu başlatma
  startSession(): void {
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      screensVisited: [],
      totalClicks: 0,
      totalScrolls: 0,
      appVersion: '1.0.0',
      deviceInfo: this.getDeviceInfo()
    };
  }

  // Uygulama oturumu bitirme
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;
      
      // Oturum verisini sunucuya gönder
      this.logAppUsage(this.currentSession);
      
      this.currentSession = null;
    }
  }

  // Ekran ziyaret etme
  visitScreen(screenName: string): void {
    if (this.currentSession) {
      this.currentSession.screensVisited.push(screenName);
    }
  }

  // Tıklama sayısını artır
  incrementClickCount(): void {
    if (this.currentSession) {
      this.currentSession.totalClicks++;
    }
  }

  // Scroll sayısını artır
  incrementScrollCount(): void {
    if (this.currentSession) {
      this.currentSession.totalScrolls++;
    }
  }

  // Mevcut ekranı al
  private getCurrentScreen(): string {
    // React Navigation'dan mevcut ekranı al
    return 'unknown';
  }

  // Cihaz bilgilerini al
  private getDeviceInfo() {
    return {
      platform: 'mobile',
      model: 'Unknown',
      osVersion: 'Unknown',
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  // Verileri sunucuya gönderme
  private async logPageView(data: PageViewData) {
    if (!this.userId) return;

    try {
      await userDataService.logUserActivity({
        userId: this.userId,
        activityType: 'page_view_analytics',
        activityData: {
          ...data,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('⚠️ Page view analytics logging failed:', error);
    }
  }

  private async flushClickData() {
    if (!this.userId || this.clickHeatmap.length === 0) return;

    try {
      await userDataService.logUserActivity({
        userId: this.userId,
        activityType: 'click_heatmap',
        activityData: {
          clicks: this.clickHeatmap,
          timestamp: new Date().toISOString()
        }
      });

      this.clickHeatmap = [];
    } catch (error) {
      console.warn('⚠️ Click heatmap logging failed:', error);
    }
  }

  private async logScrollBehavior(screenName: string) {
    if (!this.userId) return;

    const scrollData = this.scrollBehaviors.get(screenName);
    if (!scrollData) return;

    try {
      await userDataService.logUserActivity({
        userId: this.userId,
        activityType: 'scroll_behavior',
        activityData: {
          ...scrollData,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('⚠️ Scroll behavior logging failed:', error);
    }
  }

  private async logAppUsage(data: AppUsageData) {
    if (!this.userId) return;

    try {
      await userDataService.logUserActivity({
        userId: this.userId,
        activityType: 'app_usage_session',
        activityData: {
          ...data,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('⚠️ App usage logging failed:', error);
    }
  }

  // Periyodik veri gönderimi
  startPeriodicFlush(intervalMs: number = 30000) {
    setInterval(() => {
      this.flushClickData();
      this.flushScrollBehaviors();
    }, intervalMs);
  }

  private flushScrollBehaviors() {
    this.scrollBehaviors.forEach((data, screenName) => {
      this.logScrollBehavior(screenName);
    });
    this.scrollBehaviors.clear();
  }
}

export const behaviorAnalytics = BehaviorAnalytics.getInstance();
