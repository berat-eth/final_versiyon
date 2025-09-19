/**
 * Güvenlik Test Sistemi
 * API güvenlik açıklarını tespit eder
 */

const axios = require('axios');
const crypto = require('crypto');

class SecurityTests {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.testResults = [];
    this.vulnerabilities = [];
  }

  /**
   * Tüm güvenlik testlerini çalıştır
   */
  async runAllTests() {
    console.log('🔒 Güvenlik testleri başlatılıyor...\n');
    
    const tests = [
      { name: 'SQL Injection Test', method: this.testSQLInjection.bind(this) },
      { name: 'XSS Test', method: this.testXSS.bind(this) },
      { name: 'Authentication Bypass Test', method: this.testAuthBypass.bind(this) },
      { name: 'Rate Limiting Test', method: this.testRateLimiting.bind(this) },
      { name: 'Input Validation Test', method: this.testInputValidation.bind(this) },
      { name: 'CORS Test', method: this.testCORS.bind(this) },
      { name: 'Security Headers Test', method: this.testSecurityHeaders.bind(this) },
      { name: 'File Upload Test', method: this.testFileUpload.bind(this) },
      { name: 'Path Traversal Test', method: this.testPathTraversal.bind(this) },
      { name: 'Command Injection Test', method: this.testCommandInjection.bind(this) }
    ];

    for (const test of tests) {
      try {
        console.log(`🧪 ${test.name} çalıştırılıyor...`);
        const result = await test.method();
        this.testResults.push({ name: test.name, result, status: 'completed' });
        console.log(`✅ ${test.name} tamamlandı\n`);
      } catch (error) {
        console.log(`❌ ${test.name} başarısız: ${error.message}\n`);
        this.testResults.push({ name: test.name, error: error.message, status: 'failed' });
      }
    }

    return this.generateReport();
  }

  /**
   * SQL Injection testi
   */
  async testSQLInjection() {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#",
      "') OR ('1'='1",
      "1' AND '1'='1",
      "1' OR '1'='1' --",
      "1' OR '1'='1' #"
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/users/login', '/api/products', '/api/users'];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            email: payload,
            password: payload,
            search: payload
          }, { timeout: 5000 });

          if (this.isSQLInjectionResponse(response)) {
            vulnerabilities.push({
              endpoint,
              payload,
              response: response.data,
              severity: 'high'
            });
          }
        } catch (error) {
          // Hata durumunda da kontrol et
          if (this.isSQLInjectionError(error)) {
            vulnerabilities.push({
              endpoint,
              payload,
              error: error.message,
              severity: 'high'
            });
          }
        }
      }
    }

    return {
      test: 'SQL Injection',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * XSS testi
   */
  async testXSS() {
    const payloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>'
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/users', '/api/products', '/api/orders'];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            name: payload,
            description: payload,
            comment: payload
          }, { timeout: 5000 });

          if (this.isXSSResponse(response)) {
            vulnerabilities.push({
              endpoint,
              payload,
              response: response.data,
              severity: 'medium'
            });
          }
        } catch (error) {
          // XSS için hata durumu genellikle güvenli
        }
      }
    }

    return {
      test: 'XSS',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * Authentication bypass testi
   */
  async testAuthBypass() {
    const bypassAttempts = [
      { headers: {} }, // Header yok
      { headers: { 'x-api-key': 'invalid' } }, // Geçersiz key
      { headers: { 'x-api-key': '' } }, // Boş key
      { headers: { 'x-api-key': 'null' } }, // Null string
      { headers: { 'x-api-key': 'undefined' } }, // Undefined string
      { headers: { 'x-api-key': '0' } }, // Zero
      { headers: { 'x-api-key': 'false' } }, // False string
      { headers: { 'authorization': 'Bearer invalid' } }, // Geçersiz token
      { headers: { 'authorization': 'invalid' } }, // Geçersiz auth
      { headers: { 'x-api-key': 'admin' } } // Basit admin
    ];

    const vulnerabilities = [];
    const protectedEndpoints = ['/api/admin', '/api/users', '/api/orders'];

    for (const endpoint of protectedEndpoints) {
      for (const attempt of bypassAttempts) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`, {
            headers: attempt.headers,
            timeout: 5000
          });

          if (response.status === 200) {
            vulnerabilities.push({
              endpoint,
              headers: attempt.headers,
              response: response.data,
              severity: 'critical'
            });
          }
        } catch (error) {
          // 401/403 beklenen durum
          if (error.response && error.response.status !== 401 && error.response.status !== 403) {
            vulnerabilities.push({
              endpoint,
              headers: attempt.headers,
              error: error.message,
              severity: 'medium'
            });
          }
        }
      }
    }

    return {
      test: 'Authentication Bypass',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * Rate limiting testi
   */
  async testRateLimiting() {
    const endpoints = ['/api/users/login', '/api/admin', '/api/products'];
    const vulnerabilities = [];

    for (const endpoint of endpoints) {
      const requests = [];
      const maxRequests = 200; // Rate limit'i aşacak kadar

      // Hızlı istekler gönder
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          axios.get(`${this.baseURL}${endpoint}`, { timeout: 1000 })
            .catch(error => error.response)
        );
      }

      const responses = await Promise.all(requests);
      const successfulRequests = responses.filter(r => r && r.status === 200);

      if (successfulRequests.length > 100) { // 100'den fazla başarılı istek
        vulnerabilities.push({
          endpoint,
          successfulRequests: successfulRequests.length,
          severity: 'medium'
        });
      }
    }

    return {
      test: 'Rate Limiting',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * Input validation testi
   */
  async testInputValidation() {
    const testCases = [
      { field: 'email', value: 'invalid-email' },
      { field: 'email', value: 'test@' },
      { field: 'email', value: '@domain.com' },
      { field: 'phone', value: 'invalid-phone' },
      { field: 'phone', value: '123' },
      { field: 'name', value: '<script>alert("xss")</script>' },
      { field: 'name', value: 'A'.repeat(1000) }, // Çok uzun
      { field: 'age', value: -1 },
      { field: 'age', value: 'not-a-number' },
      { field: 'age', value: 999999 }
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/users', '/api/orders'];

    for (const endpoint of endpoints) {
      for (const testCase of testCases) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            [testCase.field]: testCase.value
          }, { timeout: 5000 });

          if (response.status === 200 && !this.isValidResponse(response, testCase)) {
            vulnerabilities.push({
              endpoint,
              field: testCase.field,
              value: testCase.value,
              response: response.data,
              severity: 'low'
            });
          }
        } catch (error) {
          // Hata durumu genellikle güvenli
        }
      }
    }

    return {
      test: 'Input Validation',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * CORS testi
   */
  async testCORS() {
    const origins = [
      'https://malicious-site.com',
      'http://localhost:3000',
      'https://evil.com',
      'null',
      'undefined'
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/users', '/api/products'];

    for (const endpoint of endpoints) {
      for (const origin of origins) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`, {
            headers: {
              'Origin': origin,
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type'
            },
            timeout: 5000
          });

          const corsHeaders = response.headers['access-control-allow-origin'];
          if (corsHeaders === '*' || corsHeaders === origin) {
            vulnerabilities.push({
              endpoint,
              origin,
              corsHeaders,
              severity: 'medium'
            });
          }
        } catch (error) {
          // CORS hatası beklenen durum
        }
      }
    }

    return {
      test: 'CORS',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * Security headers testi
   */
  async testSecurityHeaders() {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
      'referrer-policy'
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/users', '/api/products', '/'];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, { timeout: 5000 });
        const missingHeaders = requiredHeaders.filter(header => 
          !response.headers[header]
        );

        if (missingHeaders.length > 0) {
          vulnerabilities.push({
            endpoint,
            missingHeaders,
            severity: 'low'
          });
        }
      } catch (error) {
        // Hata durumu
      }
    }

    return {
      test: 'Security Headers',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * File upload testi
   */
  async testFileUpload() {
    const maliciousFiles = [
      { name: 'test.php', content: '<?php echo "hacked"; ?>' },
      { name: 'test.jsp', content: '<% out.println("hacked"); %>' },
      { name: 'test.asp', content: '<% Response.Write("hacked") %>' },
      { name: 'test.exe', content: 'MZ' },
      { name: 'test.sh', content: '#!/bin/bash\necho "hacked"' },
      { name: 'test.bat', content: '@echo off\necho hacked' }
    ];

    const vulnerabilities = [];
    const uploadEndpoints = ['/api/upload', '/api/users/avatar'];

    for (const endpoint of uploadEndpoints) {
      for (const file of maliciousFiles) {
        try {
          const formData = new FormData();
          formData.append('file', new Blob([file.content]), file.name);

          const response = await axios.post(`${this.baseURL}${endpoint}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 5000
          });

          if (response.status === 200) {
            vulnerabilities.push({
              endpoint,
              fileName: file.name,
              severity: 'high'
            });
          }
        } catch (error) {
          // Hata durumu genellikle güvenli
        }
      }
    }

    return {
      test: 'File Upload',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * Path traversal testi
   */
  async testPathTraversal() {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd'
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/files', '/api/download', '/api/images'];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}/${payload}`, { timeout: 5000 });

          if (this.isPathTraversalResponse(response)) {
            vulnerabilities.push({
              endpoint,
              payload,
              response: response.data,
              severity: 'high'
            });
          }
        } catch (error) {
          // Hata durumu genellikle güvenli
        }
      }
    }

    return {
      test: 'Path Traversal',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * Command injection testi
   */
  async testCommandInjection() {
    const payloads = [
      '; ls -la',
      '| whoami',
      '& dir',
      '` id `',
      '$(whoami)',
      '; cat /etc/passwd',
      '| type C:\\Windows\\System32\\drivers\\etc\\hosts',
      '& net user',
      '; ps aux',
      '| tasklist'
    ];

    const vulnerabilities = [];
    const endpoints = ['/api/system', '/api/exec', '/api/command'];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            command: payload,
            input: payload
          }, { timeout: 5000 });

          if (this.isCommandInjectionResponse(response)) {
            vulnerabilities.push({
              endpoint,
              payload,
              response: response.data,
              severity: 'critical'
            });
          }
        } catch (error) {
          // Hata durumu genellikle güvenli
        }
      }
    }

    return {
      test: 'Command Injection',
      vulnerabilities,
      status: vulnerabilities.length > 0 ? 'vulnerable' : 'secure'
    };
  }

  /**
   * SQL injection response kontrolü
   */
  isSQLInjectionResponse(response) {
    const sqlErrorPatterns = [
      /mysql/i,
      /sql syntax/i,
      /database error/i,
      /table.*doesn't exist/i,
      /column.*doesn't exist/i,
      /syntax error/i,
      /ORA-\d+/i,
      /Microsoft.*ODBC/i,
      /PostgreSQL.*ERROR/i,
      /Warning.*mysql_/i
    ];

    const responseText = JSON.stringify(response.data).toLowerCase();
    return sqlErrorPatterns.some(pattern => pattern.test(responseText));
  }

  /**
   * SQL injection error kontrolü
   */
  isSQLInjectionError(error) {
    if (!error.response) return false;
    return this.isSQLInjectionResponse(error.response);
  }

  /**
   * XSS response kontrolü
   */
  isXSSResponse(response) {
    const responseText = JSON.stringify(response.data);
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return xssPatterns.some(pattern => pattern.test(responseText));
  }

  /**
   * Path traversal response kontrolü
   */
  isPathTraversalResponse(response) {
    const responseText = JSON.stringify(response.data);
    const pathTraversalPatterns = [
      /root:/i,
      /bin:/i,
      /etc\/passwd/i,
      /windows\/system32/i,
      /hosts/i,
      /boot\.ini/i
    ];

    return pathTraversalPatterns.some(pattern => pattern.test(responseText));
  }

  /**
   * Command injection response kontrolü
   */
  isCommandInjectionResponse(response) {
    const responseText = JSON.stringify(response.data);
    const commandPatterns = [
      /uid=\d+/i,
      /gid=\d+/i,
      /groups=/i,
      /total \d+/i,
      /drwxr-xr-x/i,
      /Microsoft Windows/i,
      /Volume in drive/i,
      /Directory of/i
    ];

    return commandPatterns.some(pattern => pattern.test(responseText));
  }

  /**
   * Geçerli response kontrolü
   */
  isValidResponse(response, testCase) {
    // Bu fonksiyon test case'e göre response'un geçerli olup olmadığını kontrol eder
    // Örnek implementasyon
    return response.status === 400 || response.status === 422;
  }

  /**
   * Test raporu oluştur
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'completed' && t.result.status === 'secure').length;
    const failedTests = totalTests - passedTests;
    
    const vulnerabilities = this.testResults
      .filter(t => t.result && t.result.vulnerabilities)
      .flatMap(t => t.result.vulnerabilities);

    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowVulns = vulnerabilities.filter(v => v.severity === 'low').length;

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%'
      },
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: criticalVulns,
        high: highVulns,
        medium: mediumVulns,
        low: lowVulns
      },
      tests: this.testResults,
      recommendations: this.generateRecommendations(vulnerabilities),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Öneriler oluştur
   */
  generateRecommendations(vulnerabilities) {
    const recommendations = [];

    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('Kritik güvenlik açıkları tespit edildi. Acil müdahale gerekli.');
    }

    if (vulnerabilities.some(v => v.test === 'SQL Injection')) {
      recommendations.push('SQL Injection korumasını güçlendirin. Parametreli sorgular kullanın.');
    }

    if (vulnerabilities.some(v => v.test === 'XSS')) {
      recommendations.push('XSS korumasını güçlendirin. Input sanitization uygulayın.');
    }

    if (vulnerabilities.some(v => v.test === 'Authentication Bypass')) {
      recommendations.push('Authentication sistemini gözden geçirin. API key doğrulamasını güçlendirin.');
    }

    return recommendations;
  }
}

module.exports = SecurityTests;
