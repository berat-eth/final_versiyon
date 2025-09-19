#!/usr/bin/env node

/**
 * Güvenlik Test Çalıştırıcı
 * API güvenlik testlerini çalıştırır ve rapor oluşturur
 */

const SecurityTests = require('./security/security-tests');
const fs = require('fs');
const path = require('path');

async function runSecurityTests() {
  console.log('🔒 Huglu API Güvenlik Testleri Başlatılıyor...\n');
  
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
  const securityTests = new SecurityTests(baseURL);
  
  try {
    const report = await securityTests.runAllTests();
    
    // Raporu dosyaya kaydet
    const reportPath = path.join(__dirname, 'security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Konsola özet yazdır
    console.log('\n📊 GÜVENLİK TEST RAPORU');
    console.log('========================');
    console.log(`Toplam Test: ${report.summary.totalTests}`);
    console.log(`Başarılı: ${report.summary.passedTests}`);
    console.log(`Başarısız: ${report.summary.failedTests}`);
    console.log(`Başarı Oranı: ${report.summary.successRate}`);
    console.log('\n🔍 GÜVENLİK AÇIKLARI');
    console.log('====================');
    console.log(`Toplam: ${report.vulnerabilities.total}`);
    console.log(`Kritik: ${report.vulnerabilities.critical}`);
    console.log(`Yüksek: ${report.vulnerabilities.high}`);
    console.log(`Orta: ${report.vulnerabilities.medium}`);
    console.log(`Düşük: ${report.vulnerabilities.low}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 ÖNERİLER');
      console.log('============');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log(`\n📄 Detaylı rapor: ${reportPath}`);
    
    // Kritik açık varsa exit code 1
    if (report.vulnerabilities.critical > 0) {
      console.log('\n❌ Kritik güvenlik açıkları tespit edildi!');
      process.exit(1);
    }
    
    console.log('\n✅ Güvenlik testleri tamamlandı.');
    
  } catch (error) {
    console.error('❌ Güvenlik testleri başarısız:', error.message);
    process.exit(1);
  }
}

// Script çalıştırılıyorsa testleri başlat
if (require.main === module) {
  runSecurityTests();
}

module.exports = runSecurityTests;
