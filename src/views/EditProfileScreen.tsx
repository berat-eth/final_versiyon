import React, { useState, useEffect, useCallback } from 'react';
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
import { User } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { StatusBar } from 'expo-status-bar';

interface EditProfileScreenProps {
  navigation: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await UserController.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        });
      } else {
        // Guest user için default değerler
        setFormData({
          name: 'Misafir Kullanıcı',
          email: 'guest@huglu.com',
          phone: '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
    };

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Ad soyad gereklidir';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Ad soyad en az 2 karakter olmalıdır';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Geçerli bir e-posta adresi girin';
      }
    }

    // Phone validation (optional)
    if (formData.phone.trim() && formData.phone.trim().length < 10) {
      newErrors.phone = 'Telefon numarası en az 10 haneli olmalıdır';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const result = await UserController.updateProfileNew({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      });

      if (result.success) {
        Alert.alert(
          'Başarılı',
          'Profil bilgileriniz güncellendi.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      } else {
        Alert.alert('Hata', result.message || 'Profil güncellenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
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
        <Text style={styles.headerTitle}>Hesap Düzenle</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Icon name="check" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  ), [navigation, handleSave, saving]);

  const renderFormField = useCallback((
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
    error?: string,
    autoCapitalize: 'none' | 'sentences' | 'words' | 'characters' = 'sentences'
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, error && styles.textInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999999"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!saving}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  ), [saving]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

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
            <Text style={styles.formTitle}>Kişisel Bilgiler</Text>
            <Text style={styles.formSubtitle}>
              Profil bilgilerinizi güncelleyebilirsiniz
            </Text>

            {renderFormField(
              'Ad Soyad *',
              formData.name,
              (text) => setFormData(prev => ({ ...prev, name: text })),
              'Adınız ve soyadınız',
              'default',
              errors.name,
              'words'
            )}

            {renderFormField(
              'E-posta *',
              formData.email,
              (text) => setFormData(prev => ({ ...prev, email: text })),
              'ornek@email.com',
              'email-address',
              errors.email,
              'none'
            )}

            {renderFormField(
              'Telefon',
              formData.phone,
              (text) => setFormData(prev => ({ ...prev, phone: text })),
              '0555 123 45 67',
              'phone-pad',
              errors.phone
            )}

            <View style={styles.infoBox}>
              <Icon name="info" size={20} color="#0EA5E9" />
              <Text style={styles.infoText}>
                E-posta adresiniz giriş yapmak için kullanılacaktır.
              </Text>
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
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.savingContainer}>
                <Icon name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Kaydet</Text>
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
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: Spacing.xs,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    marginLeft: Spacing.sm,
    lineHeight: 20,
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

export default EditProfileScreen;
