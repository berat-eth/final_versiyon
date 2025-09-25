/**
 * Güvenlik Monitoring Sistemi
 * Gerçek zamanlı güvenlik tehditlerini izler ve raporlar
 */

const fs = require('fs');
const path = require('path');

class SecurityMonitor {
  constructor() {
    this.alerts = [];
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousActivities: 0,
      attackAttempts: 0,
      failedLogins: 0,
      successfulLogins: 0
    };
    
    this.thresholds = {
      maxFailedLogins: 5,
      maxSuspiciousActivities: 10,
      maxAttackAttempts: 3,
      maxRequestsPerMinute: 100
    };
    
    this.alertChannels = [];
    this.monitoringInterval = null;
    this.logFile = path.join(__dirname, '../logs/security.log');
    
    // Log dizinini oluştur
    this.ensureLogDirectory();
    
    // Monitoring'i başlat
    this.startMonitoring();
  }

  /**
   * Log dizinini oluştur
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Güvenlik event'ini kaydet
   */
  logSecurityEvent(event) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: event.level || 'INFO',
      type: event.type,
      message: event.message,
      ip: event.ip,
      userAgent: event.userAgent,
      userId: event.userId,
      details: event.details || {},
      severity: event.severity || 'low'
    };

    // Console'a yazdır
    console.log(`🔍 [${logEntry.level}] ${logEntry.type}: ${logEntry.message}`, {
      ip: logEntry.ip,
      userId: logEntry.userId,
      severity: logEntry.severity
    });

    // Dosyaya yaz
    this.writeToLogFile(logEntry);

    // Metrikleri güncelle
    this.updateMetrics(event);

    // Alert kontrolü
    this.checkAlerts(event);

    // Alert'leri temizle
    this.cleanupAlerts();
  }

  /**
   * Log dosyasına yaz
   */
  writeToLogFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Log dosyasına yazılamadı:', error);
    }
  }

  /**
   * Metrikleri güncelle
   */
  updateMetrics(event) {
    this.metrics.totalRequests++;
    
    switch (event.type) {
      case 'BLOCKED_REQUEST':
        this.metrics.blockedRequests++;
        break;
      case 'SUSPICIOUS_ACTIVITY':
        this.metrics.suspiciousActivities++;
        break;
      case 'ATTACK_ATTEMPT':
        this.metrics.attackAttempts++;
        break;
      case 'FAILED_LOGIN':
        this.metrics.failedLogins++;
        break;
      case 'SUCCESSFUL_LOGIN':
        this.metrics.successfulLogins++;
        break;
    }
  }

  /**
   * Alert kontrolü
   */
  checkAlerts(event) {
    const alerts = [];

    // Başarısız giriş alerti
    if (event.type === 'FAILED_LOGIN' && this.metrics.failedLogins >= this.thresholds.maxFailedLogins) {
      alerts.push({
        type: 'HIGH_FAILED_LOGINS',
        message: `Yüksek başarısız giriş sayısı: ${this.metrics.failedLogins}`,
        severity: 'high',
        data: { failedLogins: this.metrics.failedLogins }
      });
    }

    // Şüpheli aktivite alerti
    if (event.type === 'SUSPICIOUS_ACTIVITY' && this.metrics.suspiciousActivities >= this.thresholds.maxSuspiciousActivities) {
      alerts.push({
        type: 'HIGH_SUSPICIOUS_ACTIVITY',
        message: `Yüksek şüpheli aktivite: ${this.metrics.suspiciousActivities}`,
        severity: 'high',
        data: { suspiciousActivities: this.metrics.suspiciousActivities }
      });
    }

    // Saldırı girişimi alerti
    if (event.type === 'ATTACK_ATTEMPT' && this.metrics.attackAttempts >= this.thresholds.maxAttackAttempts) {
      alerts.push({
        type: 'ATTACK_DETECTED',
        message: `Saldırı tespit edildi: ${this.metrics.attackAttempts}`,
        severity: 'critical',
        data: { attackAttempts: this.metrics.attackAttempts }
      });
    }

    // Rate limit aşımı alerti
    if (event.type === 'RATE_LIMIT_EXCEEDED') {
      alerts.push({
        type: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit aşıldı: ${event.ip}`,
        severity: 'medium',
        data: { ip: event.ip, path: event.details?.path }
      });
    }

    // Alert'leri işle
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Alert'i işle
   */
  processAlert(alert) {
    // Alert'i kaydet
    this.alerts.push({
      ...alert,
      timestamp: new Date().toISOString(),
      id: this.generateAlertId()
    });

    // Alert kanallarına gönder
    this.sendAlert(alert);

    // Console'a yazdır
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  /**
   * Alert gönder
   */
  sendAlert(alert) {
    this.alertChannels.forEach(channel => {
      try {
        channel.send(alert);
      } catch (error) {
        console.error('Alert gönderilemedi:', error);
      }
    });
  }

  /**
   * Alert kanalı ekle
   */
  addAlertChannel(channel) {
    this.alertChannels.push(channel);
  }

  /**
   * Monitoring başlat
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.generateSecurityReport();
      this.cleanupOldData();
    }, 60000); // Her dakika
  }

  /**
   * Monitoring durdur
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Güvenlik raporu oluştur
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(-10), // Son 10 alert
      securityScore: this.calculateSecurityScore(),
      recommendations: this.generateRecommendations()
    };

    // Yüksek risk varsa alert gönder
    if (report.securityScore < 70) {
      this.processAlert({
        type: 'LOW_SECURITY_SCORE',
        message: `Düşük güvenlik skoru: ${report.securityScore}`,
        severity: 'high',
        data: { securityScore: report.securityScore }
      });
    }

    return report;
  }

  /**
   * Güvenlik skoru hesapla
   */
  calculateSecurityScore() {
    let score = 100;
    
    // Başarısız girişler
    score -= Math.min(this.metrics.failedLogins * 2, 20);
    
    // Şüpheli aktiviteler
    score -= Math.min(this.metrics.suspiciousActivities * 3, 30);
    
    // Saldırı girişimleri
    score -= Math.min(this.metrics.attackAttempts * 10, 40);
    
    // Engellenen istekler
    score -= Math.min(this.metrics.blockedRequests * 0.5, 10);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Öneriler oluştur
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.failedLogins > this.thresholds.maxFailedLogins) {
      recommendations.push({
        type: 'AUTHENTICATION',
        message: 'Başarısız giriş sayısı yüksek. Brute force korumasını güçlendirin.',
        priority: 'high'
      });
    }
    
    if (this.metrics.suspiciousActivities > this.thresholds.maxSuspiciousActivities) {
      recommendations.push({
        type: 'MONITORING',
        message: 'Şüpheli aktivite tespit edildi. IP engelleme kurallarını gözden geçirin.',
        priority: 'medium'
      });
    }
    
    if (this.metrics.attackAttempts > this.thresholds.maxAttackAttempts) {
      recommendations.push({
        type: 'SECURITY',
        message: 'Saldırı girişimi tespit edildi. Güvenlik duvarı kurallarını güncelleyin.',
        priority: 'critical'
      });
    }
    
    return recommendations;
  }

  /**
   * Eski verileri temizle
   */
  cleanupOldData() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Eski alert'leri temizle
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > oneDayAgo
    );
    
    // Metrikleri sıfırla (günlük)
    if (new Date().getHours() === 0 && new Date().getMinutes() === 0) {
      this.resetDailyMetrics();
    }
  }

  /**
   * Günlük metrikleri sıfırla
   */
  resetDailyMetrics() {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousActivities: 0,
      attackAttempts: 0,
      failedLogins: 0,
      successfulLogins: 0
    };
  }

  /**
   * Alert'leri temizle
   */
  cleanupAlerts() {
    // 100'den fazla alert varsa eski olanları sil
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Alert ID oluştur
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * IP bazlı analiz
   */
  analyzeIP(ip) {
    const ipEvents = this.alerts.filter(alert => alert.data?.ip === ip);
    
    return {
      ip,
      totalEvents: ipEvents.length,
      highSeverityEvents: ipEvents.filter(e => e.severity === 'high').length,
      criticalEvents: ipEvents.filter(e => e.severity === 'critical').length,
      lastActivity: ipEvents[ipEvents.length - 1]?.timestamp,
      riskLevel: this.calculateIPRiskLevel(ipEvents)
    };
  }

  /**
   * IP risk seviyesi hesapla
   */
  calculateIPRiskLevel(events) {
    if (events.length === 0) return 'low';
    
    const criticalCount = events.filter(e => e.severity === 'critical').length;
    const highCount = events.filter(e => e.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (events.length > 5) return 'medium';
    
    return 'low';
  }

  /**
   * Güvenlik durumu
   */
  getSecurityStatus() {
    const score = this.calculateSecurityScore();
    
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'critical';
  }

  /**
   * Detaylı rapor
   */
  getDetailedReport() {
    return {
      status: this.getSecurityStatus(),
      score: this.calculateSecurityScore(),
      metrics: this.metrics,
      recentAlerts: this.alerts.slice(-20),
      topIPs: this.getTopIPs(),
      recommendations: this.generateRecommendations(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * En aktif IP'ler
   */
  getTopIPs() {
    const ipCounts = {};
    
    this.alerts.forEach(alert => {
      if (alert.data?.ip) {
        ipCounts[alert.data.ip] = (ipCounts[alert.data.ip] || 0) + 1;
      }
    });
    
    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count, analysis: this.analyzeIP(ip) }));
  }
}

module.exports = SecurityMonitor;
