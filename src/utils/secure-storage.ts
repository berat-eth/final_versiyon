import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

// Encryption key - in production, this should be more secure
const ENCRYPTION_KEY = 'huglu_secure_key_2024';

/**
 * Secure storage utility for sensitive data
 * Uses Expo SecureStore with additional encryption layer
 */
export class SecureStorage {
  
  /**
   * Store sensitive data securely
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      // Encrypt the value before storing
      const encryptedValue = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
      
      // Store in secure store
      await SecureStore.setItemAsync(key, encryptedValue);
    } catch (error) {
      console.error('❌ Error storing secure data:', error);
      throw new Error('Failed to store secure data');
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      // Get encrypted value from secure store
      const encryptedValue = await SecureStore.getItemAsync(key);
      
      if (!encryptedValue) {
        return null;
      }
      
      // Decrypt the value
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
      const decryptedValue = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      return decryptedValue;
    } catch (error) {
      console.error('❌ Error retrieving secure data:', error);
      return null;
    }
  }

  /**
   * Remove secure data
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('❌ Error removing secure data:', error);
    }
  }

  /**
   * Store user credentials securely
   */
  static async storeUserCredentials(email: string, password: string, apiKey?: string): Promise<void> {
    try {
      const defaultApiKey = 'huglu_f22635b61189c2cea13eec242465148d890fef5206ec8a1b0263bf279f4ba6ad';
      await Promise.all([
        this.setItem('user_email', email),
        this.setItem('user_password', password),
        this.setItem('api_key', apiKey || defaultApiKey)
      ]);
    } catch (error) {
      console.error('❌ Error storing user credentials:', error);
      throw error;
    }
  }

  /**
   * Retrieve user credentials
   */
  static async getUserCredentials(): Promise<{
    email: string | null;
    password: string | null;
    apiKey: string | null;
  }> {
    try {
      const [email, password, apiKey] = await Promise.all([
        this.getItem('user_email'),
        this.getItem('user_password'),
        this.getItem('api_key')
      ]);

      return { email, password, apiKey };
    } catch (error) {
      console.error('❌ Error retrieving user credentials:', error);
      return { email: null, password: null, apiKey: null };
    }
  }

  /**
   * Clear all user data
   */
  static async clearUserData(): Promise<void> {
    try {
      await Promise.all([
        this.removeItem('user_email'),
        this.removeItem('user_password'),
        this.removeItem('api_key'),
        this.removeItem('user_profile'),
        this.removeItem('tenant_info')
      ]);
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
    }
  }

  /**
   * Store user profile data securely
   */
  static async storeUserProfile(profile: any): Promise<void> {
    try {
      const profileString = JSON.stringify(profile);
      await this.setItem('user_profile', profileString);
    } catch (error) {
      console.error('❌ Error storing user profile:', error);
      throw error;
    }
  }

  /**
   * Retrieve user profile data
   */
  static async getUserProfile(): Promise<any | null> {
    try {
      const profileString = await this.getItem('user_profile');
      if (!profileString) return null;
      
      return JSON.parse(profileString);
    } catch (error) {
      console.error('❌ Error retrieving user profile:', error);
      return null;
    }
  }

  /**
   * Store tenant information
   */
  static async storeTenantInfo(tenantInfo: any): Promise<void> {
    try {
      const tenantString = JSON.stringify(tenantInfo);
      await this.setItem('tenant_info', tenantString);
    } catch (error) {
      console.error('❌ Error storing tenant info:', error);
      throw error;
    }
  }

  /**
   * Retrieve tenant information
   */
  static async getTenantInfo(): Promise<any | null> {
    try {
      const tenantString = await this.getItem('tenant_info');
      if (!tenantString) return null;
      
      return JSON.parse(tenantString);
    } catch (error) {
      console.error('❌ Error retrieving tenant info:', error);
      return null;
    }
  }

  /**
   * Check if user is logged in
   */
  static async isLoggedIn(): Promise<boolean> {
    try {
      const credentials = await this.getUserCredentials();
      return !!(credentials.email && credentials.password && credentials.apiKey);
    } catch (error) {
      console.error('❌ Error checking login status:', error);
      return false;
    }
  }

  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return CryptoJS.SHA256(timestamp + random).toString();
  }

  /**
   * Hash password for local validation (not for server)
   */
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default SecureStorage;
