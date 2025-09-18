import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricLoginScreenProps {
  navigation: any;
  onLoginSuccess: () => void;
}

export const BiometricLoginScreen: React.FC<BiometricLoginScreenProps> = ({ 
  navigation, 
  onLoginSuccess 
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAndLogin();
  }, []);

  const checkBiometricAndLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      setIsBiometricAvailable(hasHardware && isEnrolled);
      
      if (hasHardware && isEnrolled) {
        // Otomatik olarak biyometrik giriş dene
        setTimeout(() => {
          authenticateUser();
        }, 1000); // 1 saniye bekle
      } else {
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Biyometrik kontrol hatası:', error);
      setIsBiometricAvailable(false);
      setIsChecking(false);
    }
  };

  const authenticateUser = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Güvenli giriş için biyometrik kimlik doğrulama yapın',
        fallbackLabel: 'Şifre kullan',
        cancelLabel: 'İptal',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onLoginSuccess();
      } else if (result.error === 'UserCancel') {
        // Kullanıcı iptal etti, ana ekrana yönlendir
        onLoginSuccess();
      } else {
        // Kimlik doğrulama başarısız, tekrar dene
        Alert.alert(
          'Kimlik Doğrulama Başarısız',
          'Lütfen tekrar deneyin veya şifre ile giriş yapın.',
          [
            { text: 'Tekrar Dene', onPress: authenticateUser },
            { text: 'Şifre ile Giriş', onPress: onLoginSuccess },
          ]
        );
      }
    } catch (error) {
      console.error('Biyometrik kimlik doğrulama hatası:', error);
      Alert.alert('Hata', 'Biyometrik kimlik doğrulama sırasında bir hata oluştu.');
      navigation.navigate('Login');
    }
  };

  const handleManualLogin = () => {
    onLoginSuccess();
  };

  if (isChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A2E" />
          <Text style={styles.loadingText}>Biyometrik giriş kontrol ediliyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isBiometricAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Biyometrik Giriş</Text>
          <Text style={styles.subtitle}>
            Bu cihaz biyometrik kimlik doğrulamayı desteklemiyor veya henüz kurulmamış.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleManualLogin}>
            <Text style={styles.loginButtonText}>Şifre ile Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Güvenli Giriş</Text>
        <Text style={styles.subtitle}>
          Parmak izi veya yüz tanıma ile giriş yapın
        </Text>
        
        <TouchableOpacity style={styles.biometricButton} onPress={authenticateUser}>
          <Text style={styles.biometricButtonText}>Biyometrik Giriş</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.manualButton} onPress={handleManualLogin}>
          <Text style={styles.manualButtonText}>Şifre ile Giriş</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  biometricButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A1A2E',
    width: '100%',
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
