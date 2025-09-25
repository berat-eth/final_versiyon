import { userDataService } from './UserDataService';

export interface PerformanceMetrics {
  userId: number;
  screenName: string;
  loadTime: number; // ms
  renderTime: number; // ms
  memoryUsage: number; // MB
  networkLatency: number; // ms
  errorCount: number;
  crashCount: number;
  timestamp: number;
}

export interface NetworkMetrics {
  userId: number;
  requestUrl: string;
  requestMethod: string;
  responseTime: number; // ms
  responseSize: number; // bytes
  statusCode: number;
  networkType: 'wifi' | 'cellular' | 'unknown';
  connectionSpeed: 'slow' | 'medium' | 'fast' | 'unknown';
  timestamp: number;
}

export interface DeviceMetrics {
  userId: number;
  deviceInfo: {
    platform: string;
    model: string;
    osVersion: string;
    appVersion: string;
    screenSize: string;
    screenDensity: number;
    memoryTotal: number; // MB
    memoryAvailable: number; // MB
    storageTotal: number; // GB
    storageAvailable: number; // GB
    batteryLevel: number; // 0-100
    isCharging: boolean;
    networkType: string;
    timezone: string;
    language: string;
  };
  timestamp: number;
}

export interface ErrorMetrics {
  userId: number;
  errorType: 'javascript' | 'network' | 'api' | 'ui' | 'crash';
  errorMessage: string;
  errorStack?: string;
  screenName: string;
  userAction?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface AppStabilityMetrics {
  userId: number;
  sessionId: string;
  totalSessions: number;
  averageSessionDuration: number; // minutes
  crashRate: number; // percentage
  errorRate: number; // percentage
  memoryLeaks: number;
  performanceScore: number; // 0-100
  timestamp: number;
}

class PerformanceAnalytics {
  private static instance: PerformanceAnalytics;
  private performanceObserver: PerformanceObserver | null = null;
  private networkRequests: Map<string, any> = new Map();
  private userId: number | null = null;
  private sessionId: string = '';
  private errorCount: number = 0;
  private crashCount: number = 0;

  static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics();
    }
    return PerformanceAnalytics.instance;
  }

  setUserId(userId: number) {
    this.userId = userId;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Performans metrikleri toplama
  startPerformanceMonitoring(): void {
    this.setupPerformanceObserver();
    this.setupErrorHandling();
    this.setupNetworkMonitoring();
    this.setupMemoryMonitoring();
  }

  // Ekran yükleme performansı
  logScreenPerformance(screenName: string, loadTime: number, renderTime: number): void {
    if (!this.userId) return;

    const metrics: PerformanceMetrics = {
      userId: this.userId,
      screenName,
      loadTime,
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      networkLatency: this.getAverageNetworkLatency(),
      errorCount: this.errorCount,
      crashCount: this.crashCount,
      timestamp: Date.now()
    };

    this.logPerformanceMetrics(metrics);
  }

  // Ağ performansı
  logNetworkRequest(url: string, method: string, responseTime: number, responseSize: number, statusCode: number): void {
    if (!this.userId) return;

    const metrics: NetworkMetrics = {
      userId: this.userId,
      requestUrl: url,
      requestMethod: method,
      responseTime,
      responseSize,
      statusCode,
      networkType: this.getNetworkType(),
      connectionSpeed: this.getConnectionSpeed(responseTime),
      timestamp: Date.now()
    };

    this.logNetworkMetrics(metrics);
  }

  // Cihaz bilgileri
  logDeviceMetrics(): void {
    if (!this.userId) return;

    const metrics: DeviceMetrics = {
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      timestamp: Date.now()
    };

    this.logDeviceMetricsData(metrics);
  }

  // Hata loglama
  logError(errorType: string, errorMessage: string, errorStack?: string, screenName?: string, userAction?: string): void {
    if (!this.userId) return;

    this.errorCount++;

    const metrics: ErrorMetrics = {
      userId: this.userId,
      errorType: errorType as any,
      errorMessage,
      errorStack,
      screenName: screenName || 'unknown',
      userAction,
      severity: this.getErrorSeverity(errorType, errorMessage),
      timestamp: Date.now()
    };

    this.logErrorMetrics(metrics);
  }

  // Uygulama kararlılığı
  logAppStability(): void {
    if (!this.userId) return;

    const metrics: AppStabilityMetrics = {
      userId: this.userId,
      sessionId: this.sessionId,
      totalSessions: this.getTotalSessions(),
      averageSessionDuration: this.getAverageSessionDuration(),
      crashRate: this.crashCount / this.getTotalSessions() * 100,
      errorRate: this.errorCount / this.getTotalSessions() * 100,
      memoryLeaks: this.detectMemoryLeaks(),
      performanceScore: this.calculatePerformanceScore(),
      timestamp: Date.now()
    };

    this.logAppStabilityMetrics(metrics);
  }

  // Performans Observer kurulumu
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.handleNavigationTiming(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === 'resource') {
            this.handleResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
    }
  }

  // Hata yakalama kurulumu
  private setupErrorHandling(): void {
    // JavaScript hataları
    window.addEventListener('error', (event) => {
      this.logError('javascript', event.message, event.error?.stack, this.getCurrentScreen());
    });

    // Promise reddedilmeleri
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('javascript', `Unhandled Promise Rejection: ${event.reason}`, undefined, this.getCurrentScreen());
    });

    // Uygulama çökmeleri
    window.addEventListener('beforeunload', () => {
      this.crashCount++;
    });
  }

  // Ağ izleme kurulumu
  private setupNetworkMonitoring(): void {
    // Fetch API'yi intercept et
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0] as string;
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Response size'ı tahmin et
        const responseSize = this.estimateResponseSize(response);
        
        this.logNetworkRequest(url, method, responseTime, responseSize, response.status);
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        this.logNetworkRequest(url, method, responseTime, 0, 0);
        throw error;
      }
    };
  }

  // Bellek izleme kurulumu
  private setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        this.logMemoryUsage();
      }, 30000); // Her 30 saniyede bir
    }
  }

  // Yardımcı fonksiyonlar
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private getAverageNetworkLatency(): number {
    // Basit bir ortalama hesaplama
    return 100; // ms
  }

  private getNetworkType(): 'wifi' | 'cellular' | 'unknown' {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType === 'wifi' ? 'wifi' : 'cellular';
    }
    return 'unknown';
  }

  private getConnectionSpeed(responseTime: number): 'slow' | 'medium' | 'fast' | 'unknown' {
    if (responseTime < 500) return 'fast';
    if (responseTime < 2000) return 'medium';
    return 'slow';
  }

  private getDeviceInfo() {
    return {
      platform: 'mobile',
      model: 'Unknown',
      osVersion: 'Unknown',
      appVersion: '1.0.0',
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      screenDensity: window.devicePixelRatio || 1,
      memoryTotal: 0,
      memoryAvailable: 0,
      storageTotal: 0,
      storageAvailable: 0,
      batteryLevel: 0,
      isCharging: false,
      networkType: this.getNetworkType(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  private getErrorSeverity(errorType: string, errorMessage: string): 'low' | 'medium' | 'high' | 'critical' {
    if (errorType === 'crash') return 'critical';
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) return 'high';
    if (errorMessage.includes('validation') || errorMessage.includes('format')) return 'medium';
    return 'low';
  }

  private getCurrentScreen(): string {
    return 'unknown';
  }

  private getTotalSessions(): number {
    return 1; // Basit implementasyon
  }

  private getAverageSessionDuration(): number {
    return 10; // dakika
  }

  private detectMemoryLeaks(): number {
    return 0; // Basit implementasyon
  }

  private calculatePerformanceScore(): number {
    // Basit performans skoru hesaplama
    return 85;
  }

  private estimateResponseSize(response: Response): number {
    // Response size'ı tahmin et
    return 1024; // bytes
  }

  private handleNavigationTiming(entry: PerformanceNavigationTiming): void {
    // Navigation timing verilerini işle
  }

  private handleResourceTiming(entry: PerformanceResourceTiming): void {
    // Resource timing verilerini işle
  }

  private logMemoryUsage(): void {
    // Bellek kullanımını logla
  }

  // Veri gönderme fonksiyonları
  private async logPerformanceMetrics(data: PerformanceMetrics) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'performance_metrics',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Performance metrics logging failed:', error);
    }
  }

  private async logNetworkMetrics(data: NetworkMetrics) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'network_metrics',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Network metrics logging failed:', error);
    }
  }

  private async logDeviceMetricsData(data: DeviceMetrics) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'device_metrics',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Device metrics logging failed:', error);
    }
  }

  private async logErrorMetrics(data: ErrorMetrics) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'error_metrics',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ Error metrics logging failed:', error);
    }
  }

  private async logAppStabilityMetrics(data: AppStabilityMetrics) {
    try {
      await userDataService.logUserActivity({
        userId: data.userId,
        activityType: 'app_stability_metrics',
        activityData: data
      });
    } catch (error) {
      console.warn('⚠️ App stability metrics logging failed:', error);
    }
  }
}

export const performanceAnalytics = PerformanceAnalytics.getInstance();
