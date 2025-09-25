import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricStorage } from '../utils/biometric-storage';
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../contexts/LanguageContext';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { AgreementModal } from '../components/AgreementModal';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '../utils/privacyPolicy';
import { UserController } from '../controllers/UserController';


interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { mode: themeMode, isDark, colors, setThemeMode } = useTheme();
  
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    smsNotifications: false,
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    locationServices: true,
    biometricLogin: false,
    autoLogin: true,
  });

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [dataModalVisible, setDataModalVisible] = useState(false);
  const [userSnapshot, setUserSnapshot] = useState<any>(null);

  // Biyometrik giriş durumunu kontrol et
  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricSettings();
    (async () => {
      try {
        // Önce cache'ten hızlı oku, sonra arka planda güncelle
        const cached = await UserController.getCachedUserQuick();
        if (cached) setUserSnapshot(cached);
        UserController.getCurrentUser().then(fresh => {
          if (fresh) setUserSnapshot(fresh);
        }).catch(() => {});
      } catch {}
    })();
  }, []);

  const loadBiometricSettings = async () => {
    try {
      const isEnabled = await BiometricStorage.getBiometricEnabled();
      setSettings(prev => ({
        ...prev,
        biometricLogin: isEnabled,
      }));
    } catch (error) {
      console.error('Biyometrik ayarlar yüklenemedi:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Biyometrik durum kontrol hatası:', error);
      setIsBiometricAvailable(false);
    }
  };

  const handleToggleSetting = (key: keyof typeof settings) => {
    if (key === 'biometricLogin') {
      handleBiometricToggle();
    } else {
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const handleBiometricToggle = async () => {
    if (settings.biometricLogin) {
      // Biyometrik girişi kapat
      setSettings(prev => ({
        ...prev,
        biometricLogin: false,
      }));
      await BiometricStorage.setBiometricEnabled(false);
      Alert.alert('Biyometrik Giriş', 'Biyometrik giriş devre dışı bırakıldı.');
    } else {
      // Biyometrik girişi aç
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (!hasHardware) {
          Alert.alert('Hata', 'Bu cihaz biyometrik kimlik doğrulamayı desteklemiyor.');
          return;
        }
        
        if (!isEnrolled) {
          Alert.alert('Hata', 'Biyometrik kimlik doğrulama henüz kurulmamış. Lütfen cihaz ayarlarından parmak izi veya yüz tanıma ekleyin.');
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Biyometrik kimlik doğrulama ile giriş yapın',
          fallbackLabel: 'Şifre kullan',
          cancelLabel: 'İptal',
        });

        if (result.success) {
          setSettings(prev => ({
            ...prev,
            biometricLogin: true,
          }));
          await BiometricStorage.setBiometricEnabled(true);
          Alert.alert('Başarılı', 'Biyometrik giriş aktif edildi!');
        } else {
          // Kullanıcı iptal etti veya kimlik doğrulama başarısız
          // Hiçbir şey yapma, ayar değişmez
        }
      } catch (error) {
        console.error('Biyometrik kimlik doğrulama hatası:', error);
        Alert.alert('Hata', 'Biyometrik kimlik doğrulama sırasında bir hata oluştu.');
      }
    }
  };

  

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      'Bu işlem geri alınamaz. Hesabınızı silmek istediğinize emin misiniz?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('common.success'), 'Hesabınız başarıyla silindi.');
          },
        },
      ]
    );
  };

  const handleLanguageSelect = async (languageCode: SupportedLanguage) => {
    try {
      await changeLanguage(languageCode);
      setLanguageModalVisible(false);
      
      // Wait a bit for the context to update before showing the alert
      setTimeout(() => {
        const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
        Alert.alert('Success / Başarılı', `Language changed to ${selectedLang?.name} / Dil ${selectedLang?.name} olarak değiştirildi`);
      }, 100);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert('Error / Hata', 'Language change failed / Dil değiştirilirken bir hata oluştu');
    }
  };

  const handleThemeSelect = async (theme: ThemeMode) => {
    try {
      await setThemeMode(theme);
      setThemeModalVisible(false);
      
      setTimeout(() => {
        const themeNames: Record<ThemeMode, string> = {
          light: 'Light / Açık',
          dark: 'Dark / Koyu', 
          system: 'System / Sistem'
        };
        Alert.alert('Theme Changed / Tema Değişti', `Theme set to ${themeNames[theme]} / Tema ${themeNames[theme]} olarak ayarlandı`);
      }, 100);
    } catch (error) {
      console.error('Error changing theme:', error);
      Alert.alert('Error / Hata', 'Theme change failed / Tema değiştirilirken bir hata oluştu');
    }
  };

  const getThemeDisplayName = (theme: ThemeMode) => {
    switch (theme) {
      case 'light':
        return t('settings.lightTheme');
      case 'dark':
        return t('settings.darkTheme');
      case 'system':
        return t('settings.systemTheme');
      default:
        return t('settings.lightTheme');
    }
  };





  const renderSettingItem = (
    title: string,
    subtitle: string,
    type: 'toggle' | 'button',
    key?: keyof typeof settings,
    onPress?: () => void,
    disabled?: boolean
  ) => (
    <View style={[
      styles.settingItem, 
      { backgroundColor: colors.card },
      disabled && styles.disabledItem
    ]}>
      <View style={styles.settingInfo}>
        <Text style={[
          styles.settingTitle, 
          { color: colors.text },
          disabled && styles.disabledText
        ]}>{title}</Text>
        <Text style={[
          styles.settingSubtitle, 
          { color: colors.textSecondary },
          disabled && styles.disabledText
        ]}>{subtitle}</Text>
      </View>
      {type === 'toggle' && key && (
        <Switch
          value={settings[key]}
          onValueChange={() => handleToggleSetting(key)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={settings[key] ? colors.textOnPrimary : colors.surface}
          disabled={disabled}
        />
      )}
      {type === 'button' && (
        <TouchableOpacity onPress={onPress} disabled={disabled}>
          <Text style={[styles.settingArrow, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.modernContainer, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Account Settings */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: colors.text }]}>{t('profile.accountSettings')}</Text>
          

          <TouchableOpacity
            style={[styles.modernSettingItem, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.modernSettingIcon}>
              <Icon name="lock" size={20} color={colors.primary} />
            </View>
            <View style={styles.modernSettingInfo}>
              <Text style={[styles.modernSettingTitle, { color: colors.text }]}>{t('profile.changePassword')}</Text>
              <Text style={[styles.modernSettingSubtitle, { color: colors.textSecondary }]}>Hesap güvenliğinizi artırın</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {renderSettingItem(
            t('settings.autoLogin') || 'Otomatik Giriş',
            'Uygulamayı açtığınızda otomatik giriş yapın',
            'toggle',
            'autoLogin'
          )}

                     {renderSettingItem(
             t('settings.biometricLogin') || 'Biyometrik Giriş',
             isBiometricAvailable 
               ? 'Parmak izi veya yüz tanıma ile giriş yapın'
               : 'Biyometrik kimlik doğrulama mevcut değil',
             'toggle',
             'biometricLogin',
             undefined,
             !isBiometricAvailable
           )}
        </View>

        {/* App Preferences */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: colors.text }]}>{t('settings.title')}</Text>
          
          <TouchableOpacity
            style={[styles.modernSettingItem, { backgroundColor: colors.card }]}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={styles.modernSettingIcon}>
              <Icon name="language" size={20} color={colors.primary} />
            </View>
            <View style={styles.modernSettingInfo}>
              <Text style={[styles.modernSettingTitle, { color: colors.text }]}>{t('settings.language')}</Text>
              <Text style={[styles.modernSettingSubtitle, { color: colors.textSecondary }]}>
                {SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage)?.name}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modernSettingItem, { backgroundColor: colors.card }]}
            onPress={() => setThemeModalVisible(true)}
          >
            <View style={styles.modernSettingIcon}>
              <Icon name={isDark ? "dark-mode" : "light-mode"} size={20} color={colors.primary} />
            </View>
            <View style={styles.modernSettingInfo}>
              <Text style={[styles.modernSettingTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
              <Text style={[styles.modernSettingSubtitle, { color: colors.textSecondary }]}>
                {getThemeDisplayName(themeMode)}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.notifications')}</Text>
          
          {renderSettingItem(
            t('settings.pushNotifications') || 'Push Bildirimleri',
            'Anlık bildirimler alın',
            'toggle',
            'pushNotifications'
          )}

          {renderSettingItem(
            t('settings.emailNotifications') || 'E-posta Bildirimleri',
            'Önemli güncellemeleri e-posta ile alın',
            'toggle',
            'emailNotifications'
          )}

          {renderSettingItem(
            t('settings.smsNotifications') || 'SMS Bildirimleri',
            'Kargo takibi için SMS alın',
            'toggle',
            'smsNotifications'
          )}

          {renderSettingItem(
            'Sipariş Güncellemeleri',
            'Sipariş durumu değişikliklerini öğrenin',
            'toggle',
            'orderUpdates'
          )}

          {renderSettingItem(
            'Promosyon Bildirimleri',
            'İndirim ve kampanya haberlerini alın',
            'toggle',
            'promotions'
          )}

          {renderSettingItem(
            'Bülten',
            'Haftalık ürün bültenini alın',
            'toggle',
            'newsletter'
          )}
        </View>

        {/* Privacy & Security */}
        <View style={styles.modernSection}>
          <Text style={styles.modernSectionTitle}>Gizlilik ve Güvenlik</Text>

          <TouchableOpacity
            style={styles.modernSettingItem}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <View style={styles.modernSettingIcon}>
              <Icon name="policy" size={20} color={'#1A1A2E'} />
            </View>
            <View style={styles.modernSettingInfo}>
              <Text style={styles.modernSettingTitle}>Gizlilik Politikası</Text>
              <Text style={styles.modernSettingSubtitle}>Veri kullanımı hakkında bilgi alın</Text>
            </View>
            <Icon name="chevron-right" size={20} color={'#9ca3af'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modernSettingItem}
            onPress={() => setTermsModalVisible(true)}
          >
            <View style={styles.modernSettingIcon}>
              <Icon name="gavel" size={20} color={'#1A1A2E'} />
            </View>
            <View style={styles.modernSettingInfo}>
              <Text style={styles.modernSettingTitle}>Kullanım Şartları</Text>
              <Text style={styles.modernSettingSubtitle}>Hizmet şartlarını okuyun</Text>
            </View>
            <Icon name="chevron-right" size={20} color={'#9ca3af'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modernSettingItem}
            onPress={() => setDataModalVisible(true)}
          >
            <View style={styles.modernSettingIcon}>
              <Icon name="visibility" size={20} color={'#1A1A2E'} />
            </View>
            <View style={styles.modernSettingInfo}>
              <Text style={styles.modernSettingTitle}>Verilerimi Göster</Text>
              <Text style={styles.modernSettingSubtitle}>Topladığımız kişisel veriler</Text>
            </View>
            <Icon name="chevron-right" size={20} color={'#9ca3af'} />
          </TouchableOpacity>

          {renderSettingItem(
            t('settings.locationServices') || 'Konum Servisleri',
            'Size yakın mağazaları görmek için konum erişimi',
            'toggle',
            'locationServices'
          )}
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama Tercihleri</Text>
          
          {renderSettingItem(
            'Karanlık Mod',
            'Karanlık tema kullanın',
            'toggle',
            'darkMode'
          )}

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Dil Seçimi', 'Dil seçimi özelliği yakında!')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dil</Text>
              <Text style={styles.settingSubtitle}>Türkçe</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Para Birimi', 'Para birimi seçimi yakında!')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Para Birimi</Text>
              <Text style={styles.settingSubtitle}>TL (₺)</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support & About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek ve Hakkında</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Yardım Merkezi', 'Yardım merkezi yakında!')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Yardım Merkezi</Text>
              <Text style={styles.settingSubtitle}>Sık sorulan sorular ve destek</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('İletişim', 'Bize ulaşın: info@hugluoutdoor.com\nTelefon/WhatsApp: 0530 312 58 13')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>İletişim</Text>
              <Text style={styles.settingSubtitle}>Bizimle iletişime geçin</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Uygulama Hakkında', 'Outdoor Store v1.0.0')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Uygulama Hakkında</Text>
              <Text style={styles.settingSubtitle}>Versiyon 1.0.0</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap İşlemleri</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Veri İndir', 'Veri indirme özelliği yakında!')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Verilerimi İndir</Text>
              <Text style={styles.settingSubtitle}>Hesap verilerinizi indirin</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Hesabı Dondur', 'Hesap dondurma özelliği yakında!')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Hesabı Dondur</Text>
              <Text style={styles.settingSubtitle}>Geçici olarak hesabınızı dondurun</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>



        {/* Account Delete */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.settingItem, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, styles.deleteText]}>Hesabı Sil</Text>
              <Text style={[styles.settingSubtitle, styles.deleteText]}>
                Hesabınızı kalıcı olarak silin
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Privacy/Terms/Data Modals */}
      <AgreementModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        title="Gizlilik Sözleşmesi"
        content={PRIVACY_POLICY_TEXT}
      />

      <AgreementModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        title="Kullanım Sözleşmesi"
        content={TERMS_OF_SERVICE_TEXT}
      />

      <AgreementModal
        visible={dataModalVisible}
        onClose={() => setDataModalVisible(false)}
        title="Topladığımız Veriler"
        content={(function(){
          const u = userSnapshot || {};
          const lines = [
            'Kullanıcı verilerinizin özeti:',
            '',
            `- Ad Soyad: ${u.name || '-'}`,
            `- E-posta: ${u.email || '-'}`,
            `- Telefon: ${u.phone || '-'}`,
            `- Cinsiyet: ${u.gender || '-'}`,
            `- Doğum Tarihi: ${u.birthDate || '-'}`,
            `- Adres: ${u.address || '-'}`,
            '',
            'Diğer kayıtlar:',
            '- Pazarlama izin tercihleri (varsa hesap ayarlarında saklanır)',
            '- Sipariş ve ödeme kayıtları (işlemsel amaçlı)',
            '- Cihaz bilgisi (misafir sepet senkronizasyonu için)',
            '',
            'Bu veriler; hesabınızı oluşturmak, siparişlerinizi işlemek, müşteri desteği sağlamak ve tercihlerinize göre bilgilendirme yapmak amacıyla işlenir.'
          ];
          return lines.join('\n');
        })()}
      />

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.language')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    { backgroundColor: currentLanguage === item.code ? colors.primary + '20' : 'transparent' }
                  ]}
                  onPress={() => handleLanguageSelect(item.code)}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={[styles.languageName, { color: colors.text }]}>{item.name}</Text>
                  {currentLanguage === item.code && (
                    <Icon name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {(['light', 'dark', 'system'] as ThemeMode[]).map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.themeItem,
                  { backgroundColor: themeMode === theme ? colors.primary + '20' : 'transparent' }
                ]}
                onPress={() => handleThemeSelect(theme)}
              >
                <Icon 
                  name={theme === 'dark' ? 'dark-mode' : theme === 'light' ? 'light-mode' : 'settings-brightness'} 
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={[styles.themeName, { color: colors.text }]}>
                  {getThemeDisplayName(theme)}
                </Text>
                {themeMode === theme && (
                  <Icon name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  settingArrow: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FFF3E0',
  },
  logoutText: {
    color: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteText: {
    color: '#F44336',
  },
  adminButton: {
    backgroundColor: '#E0F2F7', // A light blue background
  },
  adminText: {
    color: '#007BFF', // A blue text color
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999999',
  },
  
  // Modern Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernSection: {
    marginBottom: 24,
  },
  modernSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  modernSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernSettingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modernSettingInfo: {
    flex: 1,
  },
  modernSettingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  modernSettingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  
  // Language modal styles
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Theme modal styles
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },

});
