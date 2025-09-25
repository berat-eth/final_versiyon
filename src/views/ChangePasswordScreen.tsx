import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserController } from '../controllers/UserController';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { StatusBar } from 'expo-status-bar';

interface ChangePasswordScreenProps {
  navigation: any;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ navigation }) => {
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validateForm = useCallback(() => {
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    // Current password validation
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Mevcut şifre gereklidir';
    }

    // New password validation
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'Yeni şifre gereklidir';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Şifre en az 6 karakter olmalıdır';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'Yeni şifre mevcut şifreden farklı olmalıdır';
    }

    // Password strength check
    if (formData.newPassword.length >= 6) {
      const hasUpperCase = /[A-Z]/.test(formData.newPassword);
      const hasLowerCase = /[a-z]/.test(formData.newPassword);
      const hasNumbers = /\d/.test(formData.newPassword);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        newErrors.newPassword = 'Şifre en az bir büyük harf, küçük harf ve rakam içermelidir';
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  }, [formData]);

  const getPasswordStrength = useCallback(() => {
    const password = formData.newPassword;
    if (password.length === 0) return { level: 0, text: '', color: '#E0E0E0' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { level: 1, text: 'Zayıf', color: '#EF4444' };
    if (score <= 4) return { level: 2, text: 'Orta', color: '#F59E0B' };
    return { level: 3, text: 'Güçlü', color: '#10B981' };
  }, [formData.newPassword]);

  const handleChangePassword = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const result = await UserController.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (result.success) {
        Alert.alert(
          'Başarılı',
          'Şifreniz başarıyla değiştirildi.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      } else {
        Alert.alert('Hata', result.message || 'Şifre değiştirilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Hata', 'Şifre değiştirilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  }, [formData, validateForm, navigation]);

  const renderHeader = useCallback(() => (
    <LinearGradient
      colors={['#1A1A2E', '#16213E']}
      style={styles.headerGradient}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Şifre Değiştir</Text>
        <View style={styles.headerButton} />
      </View>
    </LinearGradient>
  ), [navigation]);

  const renderPasswordField = useCallback((
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    showPassword: boolean,
    toggleShowPassword: () => void,
    error?: string
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, error && styles.textInputError]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          secureTextEntry={!showPassword}
          editable={!saving}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={toggleShowPassword}
        >
          <Icon 
            name={showPassword ? 'visibility-off' : 'visibility'} 
            size={20} 
            color="#666666" 
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  ), [saving]);

  const renderPasswordStrength = useCallback(() => {
    const strength = getPasswordStrength();
    if (formData.newPassword.length === 0) return null;

    return (
      <View style={styles.strengthContainer}>
        <Text style={styles.strengthLabel}>Şifre Gücü:</Text>
        <View style={styles.strengthBar}>
          <View 
            style={[
              styles.strengthFill, 
              { 
                width: `${(strength.level / 3) * 100}%`, 
                backgroundColor: strength.color 
              }
            ]} 
          />
        </View>
        <Text style={[styles.strengthText, { color: strength.color }]}>
          {strength.text}
        </Text>
      </View>
    );
  }, [formData.newPassword, getPasswordStrength]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderHeader()}
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Şifre Değiştir</Text>
            <Text style={styles.formSubtitle}>
              Hesap güvenliğiniz için güçlü bir şifre seçin
            </Text>

            {renderPasswordField(
              'Mevcut Şifre *',
              formData.currentPassword,
              (text) => setFormData(prev => ({ ...prev, currentPassword: text })),
              'Mevcut şifrenizi girin',
              showCurrentPassword,
              () => setShowCurrentPassword(!showCurrentPassword),
              errors.currentPassword
            )}

            {renderPasswordField(
              'Yeni Şifre *',
              formData.newPassword,
              (text) => setFormData(prev => ({ ...prev, newPassword: text })),
              'Yeni şifrenizi girin',
              showNewPassword,
              () => setShowNewPassword(!showNewPassword),
              errors.newPassword
            )}

            {renderPasswordStrength()}

            {renderPasswordField(
              'Yeni Şifre Tekrar *',
              formData.confirmPassword,
              (text) => setFormData(prev => ({ ...prev, confirmPassword: text })),
              'Yeni şifrenizi tekrar girin',
              showConfirmPassword,
              () => setShowConfirmPassword(!showConfirmPassword),
              errors.confirmPassword
            )}

            <View style={styles.securityTips}>
              <View style={styles.securityHeader}>
                <Icon name="security" size={20} color="#10B981" />
                <Text style={styles.securityTitle}>Güvenli Şifre İpuçları</Text>
              </View>
              <View style={styles.tipsList}>
                <Text style={styles.tipItem}>• En az 8 karakter uzunluğunda olsun</Text>
                <Text style={styles.tipItem}>• Büyük ve küçük harfler içersin</Text>
                <Text style={styles.tipItem}>• En az bir rakam bulundursun</Text>
                <Text style={styles.tipItem}>• Özel karakter kullanın (!@#$%)</Text>
                <Text style={styles.tipItem}>• Kişisel bilgilerinizi kullanmayın</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.savingContainer}>
                <Icon name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Değiştiriliyor...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Şifreyi Değiştir</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header Styles
  headerGradient: {
    paddingBottom: Spacing.sm,
    ...Shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: Spacing.xl,
  },

  // Form Fields
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: Spacing.xs,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: '#333333',
  },
  eyeButton: {
    padding: Spacing.md,
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: Spacing.xs,
  },

  // Password Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  strengthLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: Spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
  },

  // Security Tips
  securityTips: {
    backgroundColor: '#F0FDF4',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: Spacing.md,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginLeft: Spacing.sm,
  },
  tipsList: {
    marginLeft: Spacing.lg,
  },
  tipItem: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 2,
    lineHeight: 16,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    ...Shadows.medium,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  saveButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    ...Shadows.medium,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ChangePasswordScreen;
