/**
 * Gelişmiş API Güvenlik Modülü
 * Kapsamlı güvenlik katmanları sağlar
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

class AdvancedSecurity {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.suspiciousIPs = new Map();
    this.attackPatterns = new Map();
    this.securityEvents = [];
  }

  /**
   * JWT Token oluşturma
   */
  generateJWT(payload, expiresIn = '24h') {
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn,
      issuer: 'huglu-api',
      audience: 'huglu-client'
    });
  }

  /**
   * JWT Token doğrulama
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'huglu-api',
        audience: 'huglu-client'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Veri şifreleme
   */
  encryptData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('huglu-api', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Veri şifre çözme
   */
  decryptData(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('huglu-api', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Gelişmiş Rate Limiting
   */
  createAdvancedRateLimit(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 dakika
      max = 100,
      message = 'Too many requests',
      standardHeaders = true,
      legacyHeaders = false,
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return rateLimit({
      windowMs,
      max,
      message: { success: false, message },
      standardHeaders,
      legacyHeaders,
      skipSuccessfulRequests,
      skipFailedRequests,
      handler: (req, res) => {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', req.ip, {
          path: req.path,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  /**
   * Slow Down Middleware (Progressive Rate Limiting)
   */
  createSlowDown(options = {}) {
    const {
      windowMs = 15 * 60 * 1000,
      delayAfter = 50,
      delayMs = 500,
      maxDelayMs = 20000
    } = options;

    return slowDown({
      windowMs,
      delayAfter,
      delayMs,
      maxDelayMs,
      onLimitReached: (req, res, options) => {
        this.logSecurityEvent('SLOW_DOWN_TRIGGERED', req.ip, {
          path: req.path,
          delayMs: options.delayMs
        });
      }
    });
  }

  /**
   * IP Reputation Kontrolü
   */
  checkIPReputation(ip) {
    const reputation = this.suspiciousIPs.get(ip) || { score: 0, lastSeen: Date.now() };
    
    // IP skorunu hesapla
    if (reputation.score > 100) {
      return { blocked: true, reason: 'High risk IP' };
    }
    
    if (reputation.score > 50) {
      return { warning: true, reason: 'Suspicious IP' };
    }
    
    return { allowed: true };
  }

  /**
   * Saldırı Paterni Tespiti
   */
  detectAttackPattern(req) {
    // Güvenli parametreler whitelist'i
    const safeParams = ['deviceId', 'userId', 'tenantId', 'page', 'limit', 'offset', 'sort', 'order'];
    const safeParamPattern = new RegExp(`(${safeParams.join('|')})=[^&]*`, 'gi');
    
    // URL'den güvenli parametreleri çıkar
    let cleanUrl = req.url;
    cleanUrl = cleanUrl.replace(safeParamPattern, '');
    
    // DeviceId pattern'ini daha spesifik kontrol et
    const deviceIdPattern = /deviceId=android_[0-9]+_[a-zA-Z0-9]+/gi;
    if (deviceIdPattern.test(req.url)) {
      cleanUrl = cleanUrl.replace(deviceIdPattern, '');
    }
    
    const patterns = [
      { name: 'SQL_INJECTION', regex: /('|(\\')|(;)|(\\;)|(union)|(select)|(drop)|(insert)|(update)|(delete))/gi },
      { name: 'XSS_ATTACK', regex: /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/gi },
      { name: 'PATH_TRAVERSAL', regex: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi },
      { name: 'COMMAND_INJECTION', regex: /[;&|`$()]/g },
      { name: 'LDAP_INJECTION', regex: /\([^)]*\)|=\*|!\(|&\(|\|\(/g }
    ];

    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    const headers = JSON.stringify(req.headers || {});

    for (const pattern of patterns) {
      if (pattern.regex.test(cleanUrl + body + query + headers)) {
        this.logSecurityEvent('ATTACK_PATTERN_DETECTED', req.ip, {
          pattern: pattern.name,
          url: req.url,
          cleanUrl,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        
        return { detected: true, pattern: pattern.name };
      }
    }

    return { detected: false };
  }

  /**
   * Request Size Limiting
   */
  createRequestSizeLimit(maxSize = '10mb') {
    return (req, res, next) => {
      const contentLength = parseInt(req.get('content-length') || '0');
      const maxBytes = this.parseSize(maxSize);
      
      if (contentLength > maxBytes) {
        this.logSecurityEvent('REQUEST_TOO_LARGE', req.ip, {
          contentLength,
          maxSize,
          path: req.path
        });
        
        return res.status(413).json({
          success: false,
          message: 'Request too large'
        });
      }
      
      next();
    };
  }

  /**
   * Size string'ini byte'a çevir
   */
  parseSize(size) {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
    
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return Math.floor(value * units[unit]);
  }

  /**
   * Güvenlik Event Loglama
   */
  logSecurityEvent(eventType, ip, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      eventType,
      ip,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getEventSeverity(eventType)
    };

    this.securityEvents.push(event);
    
    // Event'i veritabanına kaydet
    this.saveSecurityEvent(event);
    
    // Console'a log
    console.log(`🚨 SECURITY_EVENT: ${eventType} from ${ip}`, details);
    
    // Event sayısını sınırla
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }
  }

  /**
   * Event severity belirleme
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'RATE_LIMIT_EXCEEDED': 'medium',
      'SLOW_DOWN_TRIGGERED': 'low',
      'ATTACK_PATTERN_DETECTED': 'high',
      'REQUEST_TOO_LARGE': 'medium',
      'SUSPICIOUS_ACTIVITY': 'high',
      'UNAUTHORIZED_ACCESS': 'high',
      'BRUTE_FORCE_ATTEMPT': 'high'
    };
    
    return severityMap[eventType] || 'low';
  }

  /**
   * Güvenlik event'ini veritabanına kaydet
   */
  async saveSecurityEvent(event) {
    try {
      // Bu fonksiyon veritabanı bağlantısı gerektirir
      // Şimdilik sadece log olarak tutuyoruz
    } catch (error) {
      console.error('Security event kaydedilemedi:', error);
    }
  }

  /**
   * IP Skorunu Artır
   */
  increaseIPScore(ip, points = 10) {
    const current = this.suspiciousIPs.get(ip) || { score: 0, lastSeen: Date.now() };
    current.score += points;
    current.lastSeen = Date.now();
    this.suspiciousIPs.set(ip, current);
  }

  /**
   * Güvenlik Raporu
   */
  getSecurityReport() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > last24h
    );
    
    const highSeverityEvents = recentEvents.filter(event => 
      event.severity === 'high'
    );
    
    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      highSeverityEvents: highSeverityEvents.length,
      suspiciousIPs: this.suspiciousIPs.size,
      topAttackPatterns: this.getTopAttackPatterns(),
      securityScore: this.calculateSecurityScore()
    };
  }

  /**
   * En çok tespit edilen saldırı paterni
   */
  getTopAttackPatterns() {
    const patterns = {};
    
    this.securityEvents.forEach(event => {
      if (event.eventType === 'ATTACK_PATTERN_DETECTED') {
        const pattern = event.details.pattern;
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
    });
    
    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Güvenlik skoru hesapla
   */
  calculateSecurityScore() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > last24h
    );
    
    const highSeverityCount = recentEvents.filter(event => 
      event.severity === 'high'
    ).length;
    
    // Skor hesaplama (0-100 arası, 100 en güvenli)
    let score = 100;
    score -= highSeverityCount * 10; // Her yüksek riskli event -10 puan
    score -= recentEvents.length * 0.5; // Her event -0.5 puan
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Güvenlik middleware'ini oluştur
   */
  createSecurityMiddleware() {
    return (req, res, next) => {
      // IP reputation kontrolü
      const ipReputation = this.checkIPReputation(req.ip);
      if (ipReputation.blocked) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: High risk IP'
        });
      }

      // Saldırı paterni tespiti
      const attackDetection = this.detectAttackPattern(req);
      if (attackDetection.detected) {
        this.increaseIPScore(req.ip, 20);
        return res.status(400).json({
          success: false,
          message: 'Suspicious request detected'
        });
      }

      // Warning varsa logla
      if (ipReputation.warning) {
        this.logSecurityEvent('SUSPICIOUS_ACTIVITY', req.ip, {
          path: req.path,
          reason: ipReputation.reason
        });
      }

      next();
    };
  }
}

module.exports = AdvancedSecurity;
