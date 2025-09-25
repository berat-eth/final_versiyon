/**
 * Rate Limiting ve DDoS Koruması
 * API endpoint'lerini aşırı kullanımdan korur
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.blockedIPs = new Set();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Her dakika temizle
  }

  /**
   * Rate limit kontrolü
   */
  checkRateLimit(ip, endpoint, maxRequests = 100, windowMs = 60000) {
    const key = `${ip}_${endpoint}`;
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, firstRequest: now });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    const requestData = this.requests.get(key);
    
    // Zaman penceresi geçtiyse sıfırla
    if (now - requestData.firstRequest > windowMs) {
      this.requests.set(key, { count: 1, firstRequest: now });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    // Limit aşıldı mı?
    if (requestData.count >= maxRequests) {
      this.blockedIPs.add(ip);
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: requestData.firstRequest + windowMs 
      };
    }
    
    // İsteği say
    requestData.count++;
    this.requests.set(key, requestData);
    
    return { 
      allowed: true, 
      remaining: maxRequests - requestData.count 
    };
  }

  /**
   * IP engelleme kontrolü
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * IP engellemeyi kaldır
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
  }

  /**
   * Eski kayıtları temizle
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 saat
    
    for (const [key, data] of this.requests.entries()) {
      if (now - data.firstRequest > maxAge) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Rate limit middleware
   */
  middleware(options = {}) {
    const {
      maxRequests = 100,
      windowMs = 60000,
      endpoint = 'default',
      skipSuccessfulRequests = false
    } = options;

    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      
      if (this.isIPBlocked(ip)) {
        return res.status(429).json({
          success: false,
          message: 'IP blocked due to excessive requests',
          retryAfter: 3600 // 1 saat
        });
      }
      
      const result = this.checkRateLimit(ip, endpoint, maxRequests, windowMs);
      
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
      
      // Rate limit header'ları ekle
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });
      
      next();
    };
  }

  /**
   * Endpoint'e özel rate limit
   */
  endpointLimits = {
    '/api/users': { maxRequests: 5, windowMs: 300000 }, // 5 dakikada 5 istek
    '/api/users/login': { maxRequests: 3, windowMs: 300000 }, // 5 dakikada 3 istek
    '/api/products': { maxRequests: 100, windowMs: 60000 }, // 1 dakikada 100 istek
    '/api/cart': { maxRequests: 50, windowMs: 60000 }, // 1 dakikada 50 istek
    'default': { maxRequests: 100, windowMs: 60000 } // Varsayılan
  };

  /**
   * Endpoint'e göre rate limit uygula
   */
  getEndpointLimit(path) {
    for (const [endpoint, limit] of Object.entries(this.endpointLimits)) {
      if (path.startsWith(endpoint)) {
        return limit;
      }
    }
    return this.endpointLimits.default;
  }

  /**
   * İstatistikler
   */
  getStats() {
    return {
      activeConnections: this.requests.size,
      blockedIPs: this.blockedIPs.size,
      totalRequests: Array.from(this.requests.values())
        .reduce((sum, data) => sum + data.count, 0)
    };
  }
}

module.exports = RateLimiter;
