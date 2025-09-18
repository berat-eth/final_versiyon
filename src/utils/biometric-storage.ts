import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_login_enabled';
const BIOMETRIC_LAST_USED_KEY = 'biometric_last_used';

export const BiometricStorage = {
  // Biyometrik girişin aktif olup olmadığını kaydet
  setBiometricEnabled: async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, JSON.stringify(enabled));
    } catch (error) {
      console.error('Biyometrik durum kaydedilemedi:', error);
    }
  },

  // Biyometrik girişin aktif olup olmadığını al
  getBiometricEnabled: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value ? JSON.parse(value) : false;
    } catch (error) {
      console.error('Biyometrik durum alınamadı:', error);
      return false;
    }
  },

  // Son biyometrik giriş zamanını kaydet
  setLastBiometricUsed: async (): Promise<void> => {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(BIOMETRIC_LAST_USED_KEY, timestamp.toString());
    } catch (error) {
      console.error('Son biyometrik giriş zamanı kaydedilemedi:', error);
    }
  },

  // Son biyometrik giriş zamanını al
  getLastBiometricUsed: async (): Promise<number> => {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_LAST_USED_KEY);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Son biyometrik giriş zamanı alınamadı:', error);
      return 0;
    }
  },

  // Biyometrik girişin ne kadar süre önce kullanıldığını kontrol et
  shouldShowBiometric: async (maxIdleTime: number = 5 * 60 * 1000): Promise<boolean> => {
    try {
      const isEnabled = await BiometricStorage.getBiometricEnabled();
      if (!isEnabled) return false;

      const lastUsed = await BiometricStorage.getLastBiometricUsed();
      const now = Date.now();
      const timeSinceLastUse = now - lastUsed;

      // Eğer son kullanımdan bu yana maxIdleTime'dan fazla zaman geçtiyse biyometrik göster
      return timeSinceLastUse > maxIdleTime;
    } catch (error) {
      console.error('Biyometrik kontrol hatası:', error);
      return false;
    }
  },

  // Tüm biyometrik verileri temizle
  clearBiometricData: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([BIOMETRIC_ENABLED_KEY, BIOMETRIC_LAST_USED_KEY]);
    } catch (error) {
      console.error('Biyometrik veriler temizlenemedi:', error);
    }
  },
};
