/**
 * API Şifreleme Katmanı
 * Hassas verilerin güvenli şekilde iletilmesi
 */

const crypto = require('crypto');

class APIEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    // Ana şifreleme anahtarı
    this.masterKey = process.env.API_ENCRYPTION_KEY || this.generateMasterKey();
    
    // Her tenant için ayrı anahtar
    this.tenantKeys = new Map();
    
    // Anahtar rotasyon sistemi
    this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 saat
    this.lastKeyRotation = Date.now();
  }

  /**
   * Master key oluştur
   */
  generateMasterKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Tenant için özel anahtar oluştur
   */
  generateTenantKey(tenantId) {
    const key = crypto.randomBytes(this.keyLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Master key ile tenant key'i şifrele
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    let encryptedKey = cipher.update(key, null, 'hex');
    encryptedKey += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    this.tenantKeys.set(tenantId, {
      key: encryptedKey,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      createdAt: Date.now()
    });
    
    return key;
  }

  /**
   * Tenant anahtarını al
   */
  getTenantKey(tenantId) {
    const encryptedKeyData = this.tenantKeys.get(tenantId);
    
    if (!encryptedKeyData) {
      return this.generateTenantKey(tenantId);
    }
    
    // Şifreli anahtarı çöz
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
    decipher.setAuthTag(Buffer.from(encryptedKeyData.tag, 'hex'));
    
    let decryptedKey = decipher.update(encryptedKeyData.key, 'hex', null);
    decryptedKey += decipher.final(null);
    
    return decryptedKey;
  }

  /**
   * Veriyi şifrele
   */
  encryptData(data, tenantId = null) {
    try {
      const key = tenantId ? this.getTenantKey(tenantId) : this.masterKey;
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('huglu-api', 'utf8'));
      
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      let encrypted = cipher.update(dataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Şifreli veriyi çöz
   */
  decryptData(encryptedData, tenantId = null) {
    try {
      const key = tenantId ? this.getTenantKey(tenantId) : this.masterKey;
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from('huglu-api', 'utf8'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // JSON ise parse et
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hassas alanları şifrele
   */
  encryptSensitiveFields(data, fields = ['password', 'email', 'phone', 'ssn', 'creditCard']) {
    if (!data || typeof data !== 'object') return data;
    
    const encrypted = { ...data };
    
    fields.forEach(field => {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encryptData(encrypted[field]);
      }
    });
    
    return encrypted;
  }

  /**
   * Şifreli alanları çöz
   */
  decryptSensitiveFields(data, fields = ['password', 'email', 'phone', 'ssn', 'creditCard']) {
    if (!data || typeof data !== 'object') return data;
    
    const decrypted = { ...data };
    
    fields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'object' && decrypted[field].encrypted) {
        try {
          decrypted[field] = this.decryptData(decrypted[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error.message);
        }
      }
    });
    
    return decrypted;
  }

  /**
   * API Response şifreleme middleware
   */
  createResponseEncryptionMiddleware(options = {}) {
    const { 
      encryptFields = ['password', 'email', 'phone'],
      tenantIdField = 'tenantId',
      enabled = true 
    } = options;

    return (req, res, next) => {
      if (!enabled) return next();
      
      const originalSend = res.send;
      
      res.send = function(data) {
        try {
          if (data && typeof data === 'object') {
            const tenantId = req.tenant?.id || req.body?.[tenantIdField];
            
            // Hassas alanları şifrele
            if (data.data && typeof data.data === 'object') {
              data.data = this.encryptSensitiveFields(data.data, encryptFields);
            }
            
            // Tüm response'u şifrele (opsiyonel)
            if (process.env.ENCRYPT_RESPONSES === 'true') {
              data = this.encryptData(data, tenantId);
            }
          }
          
          originalSend.call(this, data);
        } catch (error) {
          console.error('Response encryption failed:', error);
          originalSend.call(this, data);
        }
      }.bind(this);
      
      next();
    };
  }

  /**
   * API Request şifre çözme middleware
   */
  createRequestDecryptionMiddleware(options = {}) {
    const { 
      decryptFields = ['password', 'email', 'phone'],
      tenantIdField = 'tenantId',
      enabled = true 
    } = options;

    return (req, res, next) => {
      if (!enabled) return next();
      
      try {
        if (req.body && typeof req.body === 'object') {
          const tenantId = req.tenant?.id || req.body?.[tenantIdField];
          
          // Şifreli alanları çöz
          req.body = this.decryptSensitiveFields(req.body, decryptFields);
          
          // Tüm request'i çöz (opsiyonel)
          if (process.env.DECRYPT_REQUESTS === 'true' && req.body.encrypted) {
            req.body = this.decryptData(req.body, tenantId);
          }
        }
        
        next();
      } catch (error) {
        console.error('Request decryption failed:', error);
        res.status(400).json({
          success: false,
          message: 'Invalid encrypted data'
        });
      }
    };
  }

  /**
   * Hash oluştur (şifreleme değil, hash)
   */
  createHash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * HMAC oluştur
   */
  createHMAC(data, secret = this.masterKey) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Veri bütünlüğü kontrolü
   */
  verifyIntegrity(data, hash, algorithm = 'sha256') {
    const calculatedHash = this.createHash(data, algorithm);
    return calculatedHash === hash;
  }

  /**
   * HMAC doğrulama
   */
  verifyHMAC(data, signature, secret = this.masterKey) {
    const calculatedSignature = this.createHMAC(data, secret);
    return calculatedSignature === signature;
  }

  /**
   * Anahtar rotasyonu
   */
  rotateKeys() {
    const now = Date.now();
    
    if (now - this.lastKeyRotation > this.keyRotationInterval) {
      console.log('🔄 Rotating encryption keys...');
      
      // Yeni master key oluştur
      this.masterKey = this.generateMasterKey();
      
      // Tüm tenant key'lerini yenile
      for (const [tenantId] of this.tenantKeys) {
        this.generateTenantKey(tenantId);
      }
      
      this.lastKeyRotation = now;
      console.log('✅ Encryption keys rotated successfully');
    }
  }

  /**
   * Güvenlik raporu
   */
  getSecurityReport() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      tenantKeysCount: this.tenantKeys.size,
      lastKeyRotation: new Date(this.lastKeyRotation).toISOString(),
      nextRotation: new Date(this.lastKeyRotation + this.keyRotationInterval).toISOString(),
      encryptionEnabled: process.env.ENCRYPT_RESPONSES === 'true',
      decryptionEnabled: process.env.DECRYPT_REQUESTS === 'true'
    };
  }

  /**
   * Test şifreleme/çözme
   */
  testEncryption(data = 'test data') {
    try {
      const encrypted = this.encryptData(data);
      const decrypted = this.decryptData(encrypted);
      
      return {
        success: true,
        original: data,
        encrypted: encrypted.encrypted,
        decrypted,
        match: data === decrypted
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = APIEncryption;
