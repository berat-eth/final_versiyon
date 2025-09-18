const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256-bit key
    this.ivLength = 16; // 128-bit IV
    this.tagLength = 16; // 128-bit auth tag
  }

  // Anahtar oluştur
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  // IV oluştur
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  // Veriyi şifrele
  encrypt(data, key) {
    try {
      const iv = this.generateIV();
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('huglu-mobil-app', 'utf8')); // Additional authenticated data
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();
      
      // IV + Tag + Encrypted data
      const result = {
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted
      };
      
      return Buffer.from(JSON.stringify(result)).toString('base64');
      
    } catch (error) {
      console.error('❌ Server encryption error:', error);
      throw new Error('Server encryption failed');
    }
  }

  // Veriyi şifre çöz
  decrypt(encryptedData, key) {
    try {
      const parsed = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from('huglu-mobil-app', 'utf8'));
      decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
      
      let decrypted = decipher.update(parsed.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
      
    } catch (error) {
      console.error('❌ Server decryption error:', error);
      throw new Error('Server decryption failed');
    }
  }

  // Hassas veriyi maskele (loglar için)
  maskSensitiveData(data, fields = ['password', 'email', 'phone', 'cardNumber', 'cvc', 'identityNumber']) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = { ...data };

    fields.forEach(field => {
      if (masked[field]) {
        if (field === 'email') {
          const [username, domain] = masked[field].split('@');
          masked[field] = `${username.substring(0, 2)}***@${domain}`;
        } else if (field === 'phone') {
          masked[field] = masked[field].replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
        } else if (field === 'cardNumber') {
          masked[field] = masked[field].replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
        } else if (field === 'identityNumber') {
          masked[field] = masked[field].replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
        } else {
          masked[field] = '***';
        }
      }
    });

    return masked;
  }

  // Veri bütünlüğü için hash oluştur
  createHash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Şifreleme anahtarını al
  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      console.warn('⚠️ ENCRYPTION_KEY not set, using default key (NOT SECURE FOR PRODUCTION)');
      return 'huglu-server-encryption-key-32-chars'; // 32 karakter - mobil ile aynı
    }
    return key;
  }

  // Veri bütünlüğünü kontrol et
  verifyHash(data, hash) {
    const calculatedHash = this.createHash(data);
    return calculatedHash === hash;
  }

  // Güvenli rastgele string oluştur
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Password hash oluştur (bcrypt alternatifi)
  async hashPassword(password) {
    const bcrypt = require('bcrypt');
    const saltRounds = 12; // Yüksek güvenlik için
    return await bcrypt.hash(password, saltRounds);
  }

  // Password doğrula
  async verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  // JWT token oluştur
  createJWT(payload, secret) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, secret, { 
      expiresIn: '24h',
      algorithm: 'HS256'
    });
  }

  // JWT token doğrula
  verifyJWT(token, secret) {
    const jwt = require('jsonwebtoken');
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new EncryptionService();
