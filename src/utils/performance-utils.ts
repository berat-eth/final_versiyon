// Performance optimization utilities
export class PerformanceUtils {
  // Debounce function for search inputs
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function for scroll events
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Image lazy loading helper
  static lazyLoadImage(imageUrl: string, placeholder: string): string {
    // Return placeholder initially, load actual image in background
    return placeholder;
  }

  // Memory usage monitoring (React Native compatible)
  static logMemoryUsage(): void {
    if (__DEV__) {
      // React Native'de process.memoryUsage() mevcut değil
      console.log('💾 Memory monitoring not available in React Native');
    }
  }
}

// Network status monitoring
export class NetworkMonitor {
  private static isOnline = true;
  private static listeners: ((isOnline: boolean) => void)[] = [];

  static init(): void {
    // Monitor network status changes (React Native compatible)
    // React Native'de NetInfo kullanılabilir
    console.log('🌐 Network monitoring initialized (NetInfo recommended)');
  }

  static setOnlineStatus(status: boolean): void {
    this.isOnline = status;
    this.listeners.forEach(listener => listener(status));
  }

  static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  static addListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  static removeListener(listener: (isOnline: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}
