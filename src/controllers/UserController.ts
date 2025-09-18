import { UserModel } from '../models/User';
import { User } from '../utils/types';
import { apiService } from '../utils/api-service';
import { getDatabase } from '../utils/database';
import { validateBirthDate } from '../utils/ageValidation';
import { userDataService } from '../services/UserDataService';

export class UserController {
  // Simple local storage for user preferences
  private static userPreferences = new Map<string, any>();

  static async setUserPreference(key: string, value: any): Promise<void> {
    if (value === undefined) {
      // Remove if undefined passed
      this.userPreferences.delete(key);
    } else {
      this.userPreferences.set(key, value);
    }
    
    try {
      if (typeof localStorage !== 'undefined') {
        if (value === undefined || value === null) {
          localStorage.removeItem(`user_${key}`);
        } else {
          localStorage.setItem(`user_${key}`, JSON.stringify(value));
        }
      }
      
      // Also save to AsyncStorage for React Native
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (value === undefined || value === null) {
        await AsyncStorage.removeItem(key);
        console.log(`✅ Removed ${key} from storage`);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        console.log(`✅ Saved ${key} to storage:`, value);
      }
    } catch (error) {
      console.warn('⚠️ Could not save to storage:', error);
    }
  }

  private static async getUserPreference(key: string): Promise<any> {
    // Try memory first
    if (this.userPreferences.has(key)) {
      return this.userPreferences.get(key);
    }
    
    // Try AsyncStorage first (React Native)
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const value = JSON.parse(stored);
        this.userPreferences.set(key, value);
        console.log(`✅ Retrieved ${key} from AsyncStorage:`, value);
        return value;
      }
    } catch (error) {
      console.warn('⚠️ Could not read from AsyncStorage:', error);
    }
    
    // Fallback to localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`user_${key}`);
        if (stored) {
          const value = JSON.parse(stored);
          this.userPreferences.set(key, value);
          console.log(`✅ Retrieved ${key} from localStorage:`, value);
          return value;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not read from localStorage:', error);
    }
    
    return null;
  }

  static async register(userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    gender?: 'male' | 'female' | 'unspecified';
    birthDate: string; // DD-MM-YYYY format
    address?: string;
    privacyAccepted: boolean;
    termsAccepted: boolean;
    marketingEmail: boolean;
    marketingSms: boolean;
    marketingPhone: boolean;
  }): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      console.log('🔄 Registering new user:', userData.email);
      
      // Email validasyonu
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return { success: false, message: 'Geçerli bir email adresi giriniz' };
      }

      // Şifre validasyonu
      if (userData.password.length < 6) {
        return { success: false, message: 'Şifre en az 6 karakter olmalıdır' };
      }

      // Telefon zorunlu: basit doğrulama
      const phoneDigits = (userData.phone || '').replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        return { success: false, message: 'Geçerli bir telefon numarası giriniz' };
      }

      // Sözleşme kontrolleri
      if (!userData.privacyAccepted) {
        return { success: false, message: 'Gizlilik sözleşmesini kabul etmelisiniz' };
      }
      
      if (!userData.termsAccepted) {
        return { success: false, message: 'Kullanım sözleşmesini kabul etmelisiniz' };
      }

      // Doğum tarihi zorunlu ve geçerli (18 yaş kontrolü ile)
      const birthDateValidation = validateBirthDate(userData.birthDate);
      if (!birthDateValidation.isValid) {
        return { success: false, message: birthDateValidation.message };
      }

      // API'ye kayıt isteği gönder
      const response = await apiService.createUser({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        gender: userData.gender || 'unspecified',
        birthDate: userData.birthDate,
        address: userData.address || '',
        privacyAccepted: userData.privacyAccepted,
        termsAccepted: userData.termsAccepted,
        marketingEmail: userData.marketingEmail,
        marketingSms: userData.marketingSms,
        marketingPhone: userData.marketingPhone
      });

      if (response.success && response.data?.userId) {
        console.log(`✅ User registered successfully: ${response.data.userId}`);
        
        // Save user preferences locally
        await this.setUserPreference('user_id', response.data.userId);
        await this.setUserPreference('user_8digit_id', response.data.user_id);
        await this.setUserPreference('user_email', userData.email);
        await this.setUserPreference('user_name', userData.name);
        
        // Kullanıcı verilerini sunucuya kaydet
        try {
          await userDataService.saveUserData({
            userId: response.data.userId,
            name: userData.name,
            surname: userData.name.split(' ').slice(1).join(' ') || ''
          });
          
          // Kayıt aktivitesini logla
          await userDataService.logUserActivity({
            userId: response.data.userId,
            activityType: 'user_registered',
            activityData: {
              email: userData.email,
              phone: userData.phone,
              birthDate: userData.birthDate,
              privacyAccepted: userData.privacyAccepted,
              termsAccepted: userData.termsAccepted,
              marketingConsent: {
                email: userData.marketingEmail,
                sms: userData.marketingSms,
                phone: userData.marketingPhone
              }
            }
          });
        } catch (dataError) {
          console.warn('⚠️ Kullanıcı verisi sunucuya kaydedilemedi:', dataError);
        }
        
        return { success: true, message: 'Kayıt başarılı', userId: response.data.userId };
      } else {
        console.log(`❌ Registration failed: ${response.message}`);
        return { success: false, message: response.message || 'Kayıt sırasında bir hata oluştu' };
      }
    } catch (error) {
      console.error('❌ UserController - register error:', error);
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async login(email: string, password: string): Promise<{ 
    success: boolean; 
    message: string; 
    user?: User 
  }> {
    try {
      console.log('🔄 User login attempt:', email);
      
      // Email validasyonu
      if (!email || !password) {
        return { success: false, message: 'Email ve şifre gereklidir' };
      }

      const response = await apiService.loginUser(email, password);
      
      if (response.success && response.data) {
        const user = this.mapApiUserToAppUser(response.data);
        console.log(`✅ User login successful: ${user.id}`);
        
        // Yaş kontrolü - 18 yaşının altındaki kullanıcılar giriş yapamaz
        if (user.birthDate) {
          const validation = validateBirthDate(user.birthDate);
          if (!validation.isValid) {
            console.log(`❌ User under 18 years old: ${user.email}`);
            return { success: false, message: validation.message };
          }
        }
        
        // Save user data locally
        await this.setUserPreference('user_id', user.id);
        await this.setUserPreference('user_8digit_id', user.user_id);
        await this.setUserPreference('user_email', user.email);
        await this.setUserPreference('user_name', user.name);
        await this.setUserPreference('user_phone', user.phone);
        await this.setUserPreference('user_address', user.address);
        await this.setUserPreference('last_login', new Date().toISOString());
        
        // Kullanıcı verilerini sunucuya kaydet
        try {
          await userDataService.saveUserData({
            userId: user.id,
            name: user.name,
            surname: user.name.split(' ').slice(1).join(' ') || ''
          });
          
          // Giriş aktivitesini logla
          await userDataService.logUserActivity({
            userId: user.id,
            activityType: 'user_login',
            activityData: {
              email: user.email,
              phone: user.phone,
              loginTime: new Date().toISOString()
            }
          });
        } catch (dataError) {
          console.warn('⚠️ Kullanıcı verisi sunucuya kaydedilemedi:', dataError);
        }
        
        return { success: true, message: 'Giriş başarılı', user };
      } else {
        console.log(`❌ Login failed: ${response.message}`);
        return { success: false, message: response.message || 'Email veya şifre hatalı' };
      }
    } catch (error) {
      console.error('❌ UserController - login error:', error);
      
      return { success: false, message: 'Giriş sırasında bir hata oluştu' };
    }
  }

  static async logout(): Promise<boolean> {
    try {
      console.log('🔄 User logout');
      
      // Clear local user data
      await this.setUserPreference('user_id', null);
      await this.setUserPreference('user_email', null);
      await this.setUserPreference('user_name', null);
      await this.setUserPreference('user_phone', null);
      await this.setUserPreference('user_address', null);
      await this.setUserPreference('last_login', null);
      
      console.log('✅ User logged out successfully');
      return true;
    } catch (error) {
      console.error('❌ UserController - logout error:', error);
      return false;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      // Try to get user from local storage first
      const userId = await this.getUserPreference('user_id');
      if (!userId) {
        return null;
      }
      
      // Try to get fresh data from API
      try {
        const userInfo = await this.getUserInfo(userId);
        if (userInfo) {
          return userInfo;
        }
      } catch (apiError) {
        console.log('📱 API call failed, using cached user data');
      }
      
      // Fallback to cached data
      const cachedUser = await UserModel.getCurrentUser();
      if (cachedUser) {
        return cachedUser;
      }
      
      // Build user from preferences
      const userEmail = await this.getUserPreference('user_email');
      const userName = await this.getUserPreference('user_name');
      const userPhone = await this.getUserPreference('user_phone');
      const userAddress = await this.getUserPreference('user_address');
      
      if (userEmail && userName) {
        const user: User = {
          id: userId,
          name: userName,
          email: userEmail,
          password: '', // Don't store password in preferences
          phone: userPhone || '',
          address: userAddress || '',
          createdAt: new Date().toISOString()
        };
        
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('❌ UserController - getCurrentUser error:', error);
      return null;
    }
  }

  // Quick snapshot from local preferences without network calls
  static async getCachedUserQuick(): Promise<Partial<User> | null> {
    try {
      const id = await this.getUserPreference('user_id');
      const name = await this.getUserPreference('user_name');
      const email = await this.getUserPreference('user_email');
      const phone = await this.getUserPreference('user_phone');
      const address = await this.getUserPreference('user_address');
      const birthDate = await this.getUserPreference('user_birthDate');
      const gender = await this.getUserPreference('user_gender');
      if (!id && !email && !name) return null;
      return {
        id: id || 0,
        name: name || '',
        email: email || '',
        phone: phone || '',
        address: address || '',
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        createdAt: new Date().toISOString(),
        password: ''
      } as Partial<User>;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get current user ID or return guest user ID (1)
   */
  static async getCurrentUserId(): Promise<number> {
    try {
      // Try to get user ID directly from preferences first
      const userId = await this.getUserPreference('user_id');
      if (userId && userId > 0) {
        console.log(`👤 Direct user ID from storage: ${userId}`);
        return userId;
      }
      
      // Fallback to getCurrentUser
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id) {
        console.log(`👤 Current user ID from getCurrentUser: ${currentUser.id} (${currentUser.name})`);
        return currentUser.id;
      } else {
        console.log('👤 No logged in user, using guest ID: 1');
        return 1; // Guest user ID
      }
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return 1; // Fallback to guest user
    }
  }

  static async updateProfile(userId: number, data: {
    name?: string;
    phone?: string;
    address?: string;
    password?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 Updating profile for user: ${userId}`);
      
      // Validasyonlar
      if (data.password && data.password.length < 6) {
        return { success: false, message: 'Şifre en az 6 karakter olmalıdır' };
      }

      const response = await apiService.updateUser(userId, data);
      
      if (response.success) {
        console.log(`✅ Profile updated successfully for user: ${userId}`);
        
        // Update local preferences
        if (data.name) await this.setUserPreference('user_name', data.name);
        if (data.phone) await this.setUserPreference('user_phone', data.phone);
        if (data.address) await this.setUserPreference('user_address', data.address);
        
        return { success: true, message: 'Profil güncellendi' };
      } else {
        console.log(`❌ Profile update failed: ${response.message}`);
        return { success: false, message: response.message || 'Güncelleme başarısız' };
      }
    } catch (error) {
      console.error(`❌ UserController - updateProfile error for user ${userId}:`, error);
      
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async getUserInfo(userId: number): Promise<User | null> {
    try {
      console.log(`🔄 Getting user info for user: ${userId}`);
      
      const response = await apiService.getUserById(userId);
      if (response.success && response.data) {
        console.log(`✅ User info retrieved successfully: ${response.data.name}`);
        const user = this.mapApiUserToAppUser(response.data);
        
        // Update local preferences with fresh data
        await this.setUserPreference('user_name', user.name);
        await this.setUserPreference('user_phone', user.phone);
        await this.setUserPreference('user_address', user.address);
        
        return user;
      }
      
      console.log(`❌ Failed to get user info: ${response.message}`);
      return null;
    } catch (error) {
      console.error(`❌ UserController - getUserInfo error for user ${userId}:`, error);
      return null;
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 6) {
      return { valid: false, message: 'Şifre en az 6 karakter olmalıdır' };
    }
    
    // Additional password validation
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Şifre en az bir büyük harf içermelidir' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Şifre en az bir küçük harf içermelidir' };
    }
    
    if (!/\d/.test(password)) {
      return { valid: false, message: 'Şifre en az bir rakam içermelidir' };
    }
    
    return { valid: true };
  }

  // Check if user is currently logged in
  static async isLoggedIn(): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      return currentUser !== null;
    } catch (error) {
      console.error('❌ UserController - isLoggedIn error:', error);
      return false;
    }
  }

  // Get user session info
  static async getSessionInfo(): Promise<{
    isLoggedIn: boolean;
    userId?: number;
    lastLogin?: string;
    isOffline: boolean;
  }> {
    try {
      const isLoggedIn = await this.isLoggedIn();
      const userId = await this.getUserPreference('user_id');
      const lastLogin = await this.getUserPreference('last_login');
      const isOffline = !(await apiService.checkNetworkStatus());
      
      return {
        isLoggedIn,
        userId: userId || undefined,
        lastLogin: lastLogin || undefined,
        isOffline
      };
    } catch (error) {
      console.error('❌ UserController - getSessionInfo error:', error);
      return {
        isLoggedIn: false,
        isOffline: true
      };
    }
  }

  // Enhanced API user mapping with better error handling
  private static mapApiUserToAppUser(apiUser: any): User {
    try {
      return {
        id: parseInt(apiUser.id) || 0,
        user_id: apiUser.user_id || undefined,
        name: apiUser.name || 'Unknown User',
        email: apiUser.email || '',
        password: apiUser.password || '',
        phone: apiUser.phone || '',
        address: apiUser.address || '',
        birthDate: apiUser.birthDate || apiUser.birth_date || undefined,
        createdAt: apiUser.createdAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error mapping API user:', error, apiUser);
      // Return a safe fallback user
      return {
        id: 0,
        name: 'Error Loading User',
        email: '',
        password: '',
        phone: '',
        address: '',
        createdAt: new Date().toISOString()
      };
    }
  }

  // User Profile Management Methods
  static async getUserAddresses(userId: number): Promise<any[]> {
    try {
      const db = await getDatabase();
      const addresses = await db.getAllAsync(
        'SELECT * FROM user_addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt DESC',
        [userId]
      );
      return addresses || [];
    } catch (error) {
      console.error('❌ Error getting user addresses:', error);
      return [];
    }
  }

  static async addUserAddress(userId: number, addressData: {
    title: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district?: string;
    postalCode?: string;
    isDefault?: boolean;
    type?: 'home' | 'work' | 'other';
  }): Promise<boolean> {
    try {
      const db = await getDatabase();
      
      // If this is default address, remove default from others
      if (addressData.isDefault) {
        await db.runAsync(
          'UPDATE user_addresses SET isDefault = 0 WHERE userId = ?',
          [userId]
        );
      }

      await db.runAsync(
        `INSERT INTO user_addresses (userId, fullName, phone, address, city, state, postalCode, isDefault, addressType)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          addressData.fullName,
          addressData.phone,
          addressData.address,
          addressData.city,
          addressData.district || '',
          addressData.postalCode || '',
          addressData.isDefault ? 1 : 0,
          addressData.type || 'shipping'
        ]
      );
      
      console.log('✅ User address added successfully');
      return true;
    } catch (error) {
      console.error('❌ Error adding user address:', error);
      return false;
    }
  }

  static async updateUserAddress(addressId: number, addressData: any): Promise<boolean> {
    try {
      const db = await getDatabase();
      
      await db.runAsync(
        `UPDATE user_addresses 
         SET fullName = ?, phone = ?, address = ?, city = ?, state = ?, postalCode = ?, isDefault = ?
         WHERE id = ?`,
        [
          addressData.fullName,
          addressData.phone,
          addressData.address,
          addressData.city,
          addressData.district || '',
          addressData.postalCode || '',
          addressData.isDefault ? 1 : 0,
          addressId
        ]
      );
      
      console.log('✅ User address updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating user address:', error);
      return false;
    }
  }

  static async deleteUserAddress(addressId: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM user_addresses WHERE id = ?', [addressId]);
      console.log('✅ User address deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting user address:', error);
      return false;
    }
  }

  // User Wallet Management
  static async getUserWallet(userId: number): Promise<{ balance: number; currency: string }> {
    try {
      const db = await getDatabase();
      const wallet = await db.getFirstAsync(
        'SELECT balance, currency FROM user_wallet_v2 WHERE userId = ?',
        [userId.toString()]
      );
      
      if (wallet) {
        return { balance: wallet.balance, currency: wallet.currency };
      } else {
        // Create default wallet if doesn't exist
        await db.runAsync(
          'INSERT INTO user_wallet_v2 (userId, balance, currency) VALUES (?, 0.0, ?)',
          [userId.toString(), 'TRY']
        );
        return { balance: 0.0, currency: 'TRY' };
      }
    } catch (error) {
      console.error('❌ Error getting user wallet:', error);
      return { balance: 0.0, currency: 'TRY' };
    }
  }

  static async updateUserWallet(userId: number, balance: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE user_wallet_v2 SET balance = ?, lastUpdated = CURRENT_TIMESTAMP WHERE userId = ?',
        [balance, userId.toString()]
      );
      console.log('✅ User wallet updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating user wallet:', error);
      return false;
    }
  }

  // User Favorites Management
  static async getUserFavorites(userId: number): Promise<any[]> {
    try {
      const db = await getDatabase();
      const favorites = await db.getAllAsync(
        `SELECT f.*, f.productData 
         FROM user_favorites_v2 f 
         WHERE f.userId = ? 
         ORDER BY f.createdAt DESC`,
        [userId.toString()]
      );
      return favorites || [];
    } catch (error) {
      console.error('❌ Error getting user favorites:', error);
      return [];
    }
  }

  static async addToFavorites(userId: number, productId: number, productData?: any): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT OR REPLACE INTO user_favorites_v2 (userId, productId, productData, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId.toString(), productId.toString(), JSON.stringify(productData || {})]
      );
      console.log('✅ Product added to favorites');
      return true;
    } catch (error) {
      console.error('❌ Error adding to favorites:', error);
      return false;
    }
  }

  static async removeFromFavorites(userId: number, productId: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'DELETE FROM user_favorites_v2 WHERE userId = ? AND productId = ?',
        [userId.toString(), productId.toString()]
      );
      console.log('✅ Product removed from favorites');
      return true;
    } catch (error) {
      console.error('❌ Error removing from favorites:', error);
      return false;
    }
  }

  static async isProductFavorite(userId: number, productId: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync(
        'SELECT id FROM user_favorites_v2 WHERE userId = ? AND productId = ?',
        [userId.toString(), productId.toString()]
      );
      return !!result;
    } catch (error) {
      console.error('❌ Error checking favorite status:', error);
      return false;
    }
  }

  // User Settings Management
  static async getUserSetting(userId: number, key: string): Promise<string | null> {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync(
        'SELECT settingValue FROM user_settings_v2 WHERE userId = ? AND settingKey = ?',
        [userId.toString(), key]
      );
      return result ? result.settingValue : null;
    } catch (error) {
      console.error('❌ Error getting user setting:', error);
      return null;
    }
  }

  static async setUserSetting(userId: number, key: string, value: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO user_settings_v2 (userId, settingKey, settingValue, updatedAt) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId.toString(), key, value]
      );
      console.log('✅ User setting updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error setting user setting:', error);
      return false;
    }
  }

  // User Notifications Management
  static async getUserNotifications(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const db = await getDatabase();
      const notifications = await db.getAllAsync(
        'SELECT * FROM user_notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
        [userId, limit]
      );
      return notifications || [];
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      return [];
    }
  }

  static async addUserNotification(userId: number, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO user_notifications (userId, type, title, message, data) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          notification.type,
          notification.title,
          notification.message,
          notification.data ? JSON.stringify(notification.data) : null
        ]
      );
      console.log('✅ User notification added successfully');
      return true;
    } catch (error) {
      console.error('❌ Error adding user notification:', error);
      return false;
    }
  }

  static async markNotificationAsRead(userId: number, notificationId: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE user_notifications SET isRead = 1 WHERE id = ? AND userId = ?',
        [notificationId, userId]
      );
      console.log('✅ Notification marked as read');
      return true;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }
  }

  static async deleteUserNotification(userId: number, notificationId: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'DELETE FROM user_notifications WHERE id = ? AND userId = ?',
        [notificationId, userId]
      );
      console.log('✅ Notification deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      return false;
    }
  }

  static async clearUserNotifications(userId: number): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'DELETE FROM user_notifications WHERE userId = ?',
        [userId]
      );
      console.log('✅ All user notifications cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
      return false;
    }
  }

  // User Activity Logging
  static async logUserActivity(userId: number, action: string, details?: any, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Check if user exists before logging activity
      const userExists = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', [userId]);
      if (!userExists) {
        // Silently skip logging for non-existent users
        return;
      }
      
      await db.runAsync(
        `INSERT INTO user_activity_log (userId, activityType, activityData, ipAddress, userAgent) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          action,
          details ? JSON.stringify(details) : null,
          ipAddress || null,
          userAgent || null
        ]
      );

      // Aktiviteyi sunucuya da gönder
      try {
        await userDataService.logUserActivity({
          userId: userId,
          activityType: action,
          activityData: {
            ...details,
            ipAddress: ipAddress,
            userAgent: userAgent
          }
        });
      } catch (serverError) {
        console.warn('⚠️ Aktivite sunucuya gönderilemedi:', serverError);
      }
    } catch (error) {
      console.error('❌ Error logging user activity:', error);
      // Don't throw the error to prevent app crashes
    }
  }

  static async getUserActivityLog(userId: number, limit: number = 100): Promise<any[]> {
    try {
      const db = await getDatabase();
      
      // Check if user exists
      const userExists = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', [userId]);
      if (!userExists) {
        // Silently return empty array for non-existent users
        return [];
      }
      
      const activities = await db.getAllAsync(
        'SELECT * FROM user_activity_log WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
        [userId, limit]
      );
      return activities || [];
    } catch (error) {
      console.error('❌ Error getting user activity log:', error);
      return [];
    }
  }

  // New methods for profile management
  static async updateProfileNew(data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    birthDate?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('👤 Updating profile with data:', data);
      
      // Doğum tarihi yaş kontrolü (eğer doğum tarihi güncelleniyorsa)
      if (data.birthDate) {
        const birthDateValidation = validateBirthDate(data.birthDate);
        if (!birthDateValidation.isValid) {
          return { success: false, message: birthDateValidation.message };
        }
      }
      
      // Get current user ID
      const currentUser = await this.getCurrentUser();
      const userId = currentUser?.id || 1; // Default to guest user
      
      const response = await apiService.updateProfile(userId, data);
      
      if (response.success) {
        // Update local cache
        if (data.name) await this.setUserPreference('user_name', data.name);
        if (data.email) await this.setUserPreference('user_email', data.email);
        if (data.phone) await this.setUserPreference('user_phone', data.phone);
        if (data.address) await this.setUserPreference('user_address', data.address);
        
        await UserModel.updateUser(userId, data);
        
        console.log('✅ Profile updated successfully');
        return { success: true, message: 'Profil güncellendi' };
      } else {
        console.log('❌ Profile update failed:', response.message);
        return { success: false, message: response.message || 'Profil güncellenemedi' };
      }
    } catch (error) {
      console.error('❌ UserController - updateProfile error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }

  static async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔒 Changing password');
      
      // Get current user ID
      const currentUser = await this.getCurrentUser();
      const userId = currentUser?.id || 1; // Default to guest user
      
      const response = await apiService.changePassword(userId, data);
      
      if (response.success) {
        console.log('✅ Password changed successfully');
        return { success: true, message: 'Şifre başarıyla değiştirildi' };
      } else {
        console.log('❌ Password change failed:', response.message);
        return { success: false, message: response.message || 'Şifre değiştirilemedi' };
      }
    } catch (error) {
      console.error('❌ UserController - changePassword error:', error);
      return { success: false, message: 'Bir hata oluştu' };
    }
  }
}