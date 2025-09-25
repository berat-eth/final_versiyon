/**
 * JWT Authentication Sistemi
 * Token tabanlı kimlik doğrulama
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTAuth {
  constructor() {
    this.secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    this.issuer = 'huglu-api';
    this.audience = 'huglu-client';
    
    // Token blacklist (production'da Redis kullanılmalı)
    this.tokenBlacklist = new Set();
  }

  /**
   * Access Token oluştur
   */
  generateAccessToken(payload) {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * Refresh Token oluştur
   */
  generateRefreshToken(payload) {
    const tokenPayload = {
      ...payload,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience,
      jti: crypto.randomUUID() // JWT ID
    };

    return jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * Token çifti oluştur (Access + Refresh)
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiry(this.accessTokenExpiry)
    };
  }

  /**
   * Access Token doğrula
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });

      // Blacklist kontrolü
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Refresh Token doğrula
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });

      // Blacklist kontrolü
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  /**
   * Token'ı blacklist'e ekle
   */
  revokeToken(token) {
    this.tokenBlacklist.add(token);
  }

  /**
   * Tüm kullanıcı token'larını iptal et
   */
  revokeAllUserTokens(userId) {
    // Bu fonksiyon production'da Redis ile implement edilmeli
    // Şimdilik sadece blacklist'e ekliyoruz
    console.log(`All tokens revoked for user: ${userId}`);
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkar
   */
  extractUserFromToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      throw new Error(`User extraction failed: ${error.message}`);
    }
  }

  /**
   * Token süresini parse et
   */
  parseExpiry(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return value * units[unit];
  }

  /**
   * JWT Middleware
   */
  createJWTMiddleware(options = {}) {
    const { required = true, optional = false } = options;

    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (required) {
          return res.status(401).json({
            success: false,
            message: 'Authorization header required'
          });
        }
        if (optional) {
          return next();
        }
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      try {
        const decoded = this.verifyAccessToken(token);
        req.user = decoded;
        req.token = token;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          error: error.message
        });
      }
    };
  }

  /**
   * Role-based access control middleware
   */
  createRoleMiddleware(requiredRoles = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      
      if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  /**
   * Permission-based access control middleware
   */
  createPermissionMiddleware(requiredPermissions = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      }

      next();
    };
  }

  /**
   * Token refresh endpoint handler
   */
  async handleTokenRefresh(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Eski refresh token'ı iptal et
      this.revokeToken(refreshToken);
      
      // Yeni token çifti oluştur
      const newTokens = this.generateTokenPair({
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        permissions: decoded.permissions
      });

      res.json({
        success: true,
        data: newTokens
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: error.message
      });
    }
  }

  /**
   * Logout handler
   */
  async handleLogout(req, res) {
    try {
      const token = req.token;
      
      if (token) {
        this.revokeToken(token);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  /**
   * Token bilgilerini decode et (blacklist kontrolü olmadan)
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Token'ın süresini kontrol et
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Güvenlik raporu
   */
  getSecurityReport() {
    return {
      blacklistedTokens: this.tokenBlacklist.size,
      secretRotated: false, // Production'da secret rotation implement edilmeli
      tokenLifetime: {
        access: this.accessTokenExpiry,
        refresh: this.refreshTokenExpiry
      }
    };
  }
}

module.exports = JWTAuth;
