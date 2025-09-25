import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserController } from '../controllers/UserController';
import { OrderController } from '../controllers/OrderController';
import { ProductController } from '../controllers/ProductController';
import { UserLevelController } from '../controllers/UserLevelController';
import { User, Order } from '../utils/types';
import { UserLevelProgress } from '../models/UserLevel';
import { useAppContext } from '../contexts/AppContext';
import { UserLevelCard } from '../components/UserLevelCard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { RealTimeStatusBar } from '../components/RealTimeStatusBar';
import { SecureStorage } from '../utils/secure-storage';
import { DatePicker } from '../components/DatePicker';
import { validateBirthDate } from '../utils/ageValidation';
import { Checkbox } from '../components/Checkbox';
import { AgreementModal } from '../components/AgreementModal';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '../utils/privacyPolicy';

interface ProfileScreenProps {
  navigation: any;
}

// Profile Icons using assets
const ProfileIcons = {
  user: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/profile-user.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  orders: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/order-delivery.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  address: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/adress.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  wallet: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/wallet.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  tracking: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/tracking-delivery.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  settings: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/setting.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  refer: ({ color }: { color: string }) => (
    <Icon name="group-add" size={24} color={color} />
  ),
  store: ({ color }: { color: string }) => (
    <Icon name="store" size={24} color={color} />
  ),
  heart: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/favorite.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  logout: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/log-out_8944313.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  returns: ({ color }: { color: string }) => (
    <Icon name="assignment-return" size={24} color={color} />
  ),
  faq: ({ color }: { color: string }) => (
    <Icon name="help-outline" size={24} color={color} />
  ),
  support: ({ color }: { color: string }) => (
    <Icon name="support-agent" size={24} color={color} />
  ),
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { logout } = useAppContext();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [activeOrders, setActiveOrders] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userLevel, setUserLevel] = useState<UserLevelProgress | null>(null);

  // Real-time updates hook
  const { networkStatus, checkNetworkStatus } = useRealTimeUpdates();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('unspecified');
  const [birthDate, setBirthDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  
  // Sözleşme ve izin state'leri
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingSms, setMarketingSms] = useState(false);
  const [marketingPhone, setMarketingPhone] = useState(false);
  
  // Modal state'leri
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [dataModalVisible, setDataModalVisible] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      await loadUserData();
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const user = await UserController.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await loadUserOrders(user.id);
        
        // Load user profile data from database
        await loadUserProfileData(user.id);
        
        // Load user level data
        await loadUserLevelData(user.id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserProfileData = async (userId: number) => {
    try {
      // Load user addresses
      const addresses = await UserController.getUserAddresses(userId);
      
      // Load user wallet
      const wallet = await UserController.getUserWallet(userId);
      setWalletBalance(wallet.balance);
      
      // Load user orders first
      const userOrders = await OrderController.getUserOrders(userId);
      setOrders(userOrders);
      
      // Load user favorites
      const favorites = await UserController.getUserFavorites(userId);
      setFavoriteCount(favorites.length);
      
      // Calculate active orders (shipped orders)
      const shippedOrdersCount = userOrders.filter(order => 
        order.status === 'shipped' || order.status === 'processing'
      ).length;
      setActiveOrders(shippedOrdersCount);
      
      // Log user activity (fire-and-forget; UI'yi bloklama, hata sessiz)
      (async () => {
        try {
          await UserController.logUserActivity(userId, 'profile_viewed', {
            timestamp: new Date().toISOString(),
            screen: 'ProfileScreen',
          });
        } catch {}
      })();
      
    } catch (error) {
      console.error('Error loading user profile data:', error);
    }
  };

  const loadUserOrders = async (userId: number) => {
    try {
      const userOrders = await OrderController.getUserOrders(userId);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadUserLevelData = async (userId: number) => {
    try {
      const levelData = await UserLevelController.getUserLevel(userId.toString());
      setUserLevel(levelData);
    } catch (error) {
      console.error('Error loading user level data:', error);
    }
  };

  const handleLogin = async () => {
    const result = await UserController.login(email, password);
    if (result.success && result.user) {
      // Giriş yapan kullanıcının yaş kontrolü
      if (result.user && 'birthDate' in result.user && result.user.birthDate) {
        const validation = validateBirthDate(result.user.birthDate);
        if (!validation.isValid) {
          Alert.alert('Erişim Engellendi', validation.message);
          await UserController.logout(); // Kullanıcıyı çıkış yaptır
          return;
        }
      }
      
      await loadUserData();
      setEmail('');
      setPassword('');
      Alert.alert('Başarılı', result.message);
    } else {
      Alert.alert('Hata', result.message);
    }
  };

  const handleRegister = async () => {
    // Zorunlu sözleşme kontrolleri
    if (!privacyAccepted) {
      Alert.alert('Hata', 'Gizlilik sözleşmesini kabul etmelisiniz');
      return;
    }
    
    if (!termsAccepted) {
      Alert.alert('Hata', 'Kullanım sözleşmesini kabul etmelisiniz');
      return;
    }

    // Doğum tarihi yaş kontrolü
    if (birthDate) {
      const validation = validateBirthDate(birthDate);
      if (!validation.isValid) {
        Alert.alert('Hata', validation.message);
        return;
      }
    }

    const result = await UserController.register({
      name,
      email,
      password,
      phone,
      gender,
      birthDate,
      address,
      privacyAccepted,
      termsAccepted,
      marketingEmail,
      marketingSms,
      marketingPhone,
    });

    if (result.success) {
      Alert.alert('Başarılı', result.message);
      setIsLogin(true);
      setName('');
      setPhone('');
      setAddress('');
      setBirthDate('');
      setPrivacyAccepted(false);
      setTermsAccepted(false);
      setMarketingEmail(false);
      setMarketingSms(false);
      setMarketingPhone(false);
    } else {
      Alert.alert('Hata', result.message);
    }
  };

  const handleBirthDateUpdate = async (newBirthDate: string) => {
    // Yaş kontrolü yap
    const validation = validateBirthDate(newBirthDate);
    if (!validation.isValid) {
      Alert.alert('Hata', validation.message);
      return;
    }

    // Kayıt olma sırasında sadece state'i güncelle
    if (!isLogin) {
      setBirthDate(newBirthDate);
      return;
    }

    // Giriş yapmış kullanıcı için profil güncelleme
    try {
      const result = await UserController.updateProfileNew({
        birthDate: newBirthDate
      });

      if (result.success) {
        setBirthDate(newBirthDate);
        Alert.alert('Başarılı', 'Doğum tarihi güncellendi');
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Doğum tarihi güncelleme hatası:', error);
      Alert.alert('Hata', 'Doğum tarihi güncellenirken bir hata oluştu');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      setSocialLoading(true);
      
      console.log(`${provider} ile giriş yapılıyor...`);
      
      // Simulated social login - gerçek implementasyon için provider SDK'ları gerekli
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo için başarılı giriş simülasyonu
      const mockUser = {
        id: Math.floor(Math.random() * 1000),
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        email: `user@${provider}.com`,
        phone: '',
        address: ''
      };
      
      await AsyncStorage.setItem('userToken', 'authenticated');
      await AsyncStorage.setItem('userEmail', mockUser.email);
      await AsyncStorage.setItem('userName', mockUser.name);
      
      // Kullanıcı verilerini yenile
      await loadUserData();
      
      Alert.alert('Başarılı', `${provider} ile giriş yapıldı`);
      
    } catch (error) {
      console.error(`${provider} login error:`, error);
      Alert.alert('Hata', `${provider} ile giriş yapılırken bir hata oluştu`);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use AppContext logout which includes cart check
              await logout();
              
              // Clear user controller data
              await UserController.logout();
              
              // Clear all user related async storage
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userEmail');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('currentUser');
              
              // Clear component state
              setCurrentUser(null);
              setOrders([]);
              setActiveOrders(0);
              setFavoriteCount(0);
              setWalletBalance(0);
              
              // Clear secure storage
              try {
                await SecureStorage.clearUserData();
              } catch (error) {
                console.warn('Could not clear secure storage:', error);
              }
              
              // User logged out successfully
              
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Hata', 'Çıkış yaparken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  // Giriş yapmamış kullanıcı ekranı - Modern Tasarım
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.modernContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modernKeyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.modernScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo and Header */}
              <View style={styles.modernHeader}>
                <View style={styles.modernLogoContainer}>
                  <Icon name="account-circle" size={80} color="#1e3c72" />
                </View>
                <Text style={styles.modernTitle}>
                  {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluşturun'}
              </Text>
                <Text style={styles.modernSubtitle}>
                  {isLogin ? 'Hesabınıza giriş yapın' : 'Huğlu Outdoor ailesine katılın'}
                </Text>
              </View>

              {/* Auth Form Card */}
              <View style={styles.modernFormCard}>
                <View style={styles.modernForm}>
                  {/* Full Name Input - Only for Register */}
              {!isLogin && (
                    <View style={styles.modernInputContainer}>
                      <View style={styles.modernInputWrapper}>
                        <Icon name="person" size={20} color="#6b7280" style={styles.modernInputIcon} />
                <TextInput
                          style={styles.modernInput}
                          placeholder="Ad Soyadınız"
                          placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                          autoCapitalize="words"
                          autoCorrect={false}
                />
                      </View>
                    </View>
              )}

                  {/* Email Input */}
                  <View style={styles.modernInputContainer}>
                    <View style={styles.modernInputWrapper}>
                      <Icon name="email" size={20} color="#6b7280" style={styles.modernInputIcon} />
              <TextInput
                        style={styles.modernInput}
                        placeholder="E-posta adresiniz"
                        placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                        autoCorrect={false}
              />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.modernInputContainer}>
                    <View style={styles.modernInputWrapper}>
                      <Icon name="lock" size={20} color="#6b7280" style={styles.modernInputIcon} />
              <TextInput
                        style={styles.modernInput}
                        placeholder="Şifreniz"
                        placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.modernEyeIcon}
                      >
                        <Icon 
                          name={showPassword ? 'visibility' : 'visibility-off'} 
                          size={20} 
                          color="#6b7280" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Forgot Password Link - Only for Login */}
                  {isLogin && (
                    <View style={styles.modernForgotPasswordContainer}>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('ForgotPassword')}
                      >
                        <Text style={styles.modernForgotPasswordText}>Şifrenizi mi unuttunuz?</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Additional Fields for Register */}
              {!isLogin && (
                <>
                      <View style={styles.modernInputContainer}>
                        <View style={styles.modernInputWrapper}>
                          <Icon name="phone" size={20} color="#6b7280" style={styles.modernInputIcon} />
                          <TextInput
                            style={styles.modernInput}
                            placeholder="Telefon (Zorunlu)"
                            placeholderTextColor="#9ca3af"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>

                      <DatePicker
                        value={birthDate}
                        onDateChange={handleBirthDateUpdate}
                        placeholder="Gün-Ay-Yıl seçin - Zorunlu"
                      />

                      {/* Gender Selection */}
                      <View style={styles.modernInputContainer}>
                        <Text style={{ color: '#374151', marginBottom: 8, fontWeight: '600' }}>Cinsiyet</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity onPress={() => setGender('male')} style={[styles.choicePill, gender === 'male' && styles.choicePillActive]}>
                            <Text style={[styles.choicePillText, gender === 'male' && styles.choicePillTextActive]}>Erkek</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setGender('female')} style={[styles.choicePill, gender === 'female' && styles.choicePillActive]}>
                            <Text style={[styles.choicePillText, gender === 'female' && styles.choicePillTextActive]}>Kadın</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setGender('unspecified')} style={[styles.choicePill, gender === 'unspecified' && styles.choicePillActive]}>
                            <Text style={[styles.choicePillText, gender === 'unspecified' && styles.choicePillTextActive]}>Belirtmek İstemiyorum</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.modernInputContainer}>
                        <View style={[styles.modernInputWrapper, styles.modernTextAreaWrapper]}>
                          <Icon name="location-on" size={20} color="#6b7280" style={styles.modernInputIcon} />
                          <TextInput
                            style={[styles.modernInput, styles.modernTextArea]}
                            placeholder="Adres (Opsiyonel)"
                            placeholderTextColor="#9ca3af"
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={3}
                          />
                        </View>
                      </View>

                      {/* Sözleşme ve İzinler */}
                      <View style={styles.agreementsContainer}>
                        <Text style={styles.agreementsTitle}>Sözleşme ve İzinler</Text>
                        
                        <Checkbox
                          checked={privacyAccepted}
                          onPress={() => setPrivacyAccepted(!privacyAccepted)}
                          label="Gizlilik Sözleşmesi'ni okudum ve kabul ediyorum"
                          required={true}
                          linkText="Gizlilik Sözleşmesi'ni oku"
                          onLinkPress={() => setPrivacyModalVisible(true)}
                        />

                        <Checkbox
                          checked={termsAccepted}
                          onPress={() => setTermsAccepted(!termsAccepted)}
                          label="Kullanım Sözleşmesi'ni okudum ve kabul ediyorum"
                          required={true}
                          linkText="Kullanım Sözleşmesi'ni oku"
                          onLinkPress={() => setTermsModalVisible(true)}
                        />

                        <Text style={styles.marketingTitle}>Pazarlama İzinleri</Text>
                        <Text style={styles.marketingSubtitle}>
                          Aşağıdaki seçeneklerden istediğinizi işaretleyerek pazarlama iletişimlerini alabilirsiniz:
                        </Text>

                        <Checkbox
                          checked={marketingEmail}
                          onPress={() => setMarketingEmail(!marketingEmail)}
                          label="E-posta ile pazarlama iletişimlerini almak istiyorum"
                        />

                        <Checkbox
                          checked={marketingSms}
                          onPress={() => setMarketingSms(!marketingSms)}
                          label="SMS ile pazarlama iletişimlerini almak istiyorum"
                        />

                        <Checkbox
                          checked={marketingPhone}
                          onPress={() => setMarketingPhone(!marketingPhone)}
                          label="Telefon ile pazarlama iletişimlerini almak istiyorum"
                        />
                      </View>
                </>
              )}

                  {/* Main Action Button */}
              <TouchableOpacity
                    style={styles.modernAuthButton}
                onPress={isLogin ? handleLogin : handleRegister}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#9ca3af', '#6b7280'] : ['#1e3c72', '#2a5298']}
                      style={styles.modernAuthButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.modernAuthButtonText}>
                          {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
                </Text>
                      )}
                    </LinearGradient>
              </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.modernDivider}>
                    <View style={styles.modernDividerLine} />
                    <Text style={styles.modernDividerText}>veya</Text>
                    <View style={styles.modernDividerLine} />
                  </View>

                  {/* Social Login Buttons */}
                  <View style={styles.modernSocialContainer}>
              <TouchableOpacity
                      style={styles.modernSocialButton}
                      onPress={() => handleSocialLogin('google')}
                      disabled={socialLoading}
                    >
                      <Icon name="g-mobiledata" size={24} color="#DB4437" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.modernSocialButton}
                      onPress={() => handleSocialLogin('facebook')}
                      disabled={socialLoading}
                    >
                      <Icon name="facebook" size={24} color="#4267B2" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.modernSocialButton}
                      onPress={() => handleSocialLogin('apple')}
                      disabled={socialLoading}
                    >
                      <Icon name="apple" size={24} color="#000000" />
                    </TouchableOpacity>
                  </View>

                  {/* Switch Login/Register */}
                  <View style={styles.modernSwitchContainer}>
                    <Text style={styles.modernSwitchText}>
                      {isLogin ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
                    </Text>
                    <TouchableOpacity
                onPress={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setName('');
                  setPhone('');
                  setAddress('');
                        setShowPassword(false);
                      }}
                    >
                      <Text style={styles.modernSwitchLink}>
                        {isLogin ? 'Kayıt Olun' : 'Giriş Yapın'}
                </Text>
              </TouchableOpacity>
                  </View>
                </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        
        {/* Sözleşme Modal'ları */}
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

        {/* Verilerimi Göster Modal */}
        <AgreementModal
          visible={dataModalVisible}
          onClose={() => setDataModalVisible(false)}
          title="Topladığımız Veriler"
          content={`Kullanıcıdan toplanan veriler:\n\n- Ad Soyad\n- E-posta\n- Telefon\n- Cinsiyet (opsiyonel)\n- Doğum Tarihi\n- Adres\n- Pazarlama izin tercihleri\n- Sipariş ve ödeme kayıtları (işlemsel)\n- Cihaz bilgisi (guest sepet için)\n\nBu veriler; hesabınızı oluşturmak, siparişlerinizi işlemek, müşteri desteği sağlamak ve kampanya/bildirim tercihlerinize göre iletişim kurmak amacıyla işlenir.`}
        />
      </SafeAreaView>
    );
  }

  // Giriş yapmış kullanıcı ekranı - Modern Tasarım
  return (
    <SafeAreaView style={styles.modernProfileContainer}>
      {/* Real-time status bar */}
      <RealTimeStatusBar />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.modernScrollView}>
        {/* Modern Header with Simple Background */}
        <View style={styles.modernProfileHeader}>
          <View style={styles.modernProfileContent}>
            <View style={styles.modernProfileAvatar}>
              <Text style={styles.modernAvatarText}>
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
            <View style={styles.modernProfileInfo}>
              <Text style={styles.modernProfileName}>{currentUser.name}</Text>
              <Text style={styles.modernProfileEmail}>{currentUser.email}</Text>
              <Text style={styles.modernProfileUserId}>
                Kullanıcı ID: {currentUser.user_id || currentUser.id}
              </Text>
              <View style={styles.modernProfileBadge}>
                <Icon name="verified" size={16} color="#10b981" />
                <Text style={styles.modernProfileBadgeText}>Doğrulanmış Hesap</Text>
          </View>
        </View>
            <View style={styles.modernHeaderActions}>
              <TouchableOpacity 
                style={styles.modernNotificationButton}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="notifications-none" size={20} color="#6b7280" />
                <View style={styles.modernNotificationBadge} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* User Level Card */}
        {userLevel && (
          <View style={styles.levelCardContainer}>
            <UserLevelCard 
              levelProgress={userLevel} 
              compact={true}
              onPress={() => {
                // Seviye detay sayfasına yönlendirme
                try {
                  navigation.navigate('UserLevel');
                } catch (error) {
                  console.error('Navigation error:', error);
                  // Fallback: parent navigator'ı dene
                  const parent = navigation.getParent?.();
                  if (parent?.navigate) {
                    parent.navigate('Profile', { screen: 'UserLevel' });
                  }
                }
              }}
            />
          </View>
        )}

        {/* Simple Stats Cards */}
        <View style={styles.modernStatsContainer}>
          <View style={styles.modernStatCard}>
            <View style={styles.simpleStatIcon}>
              <Icon name="shopping-bag" size={24} color="#6b7280" />
          </View>
            <Text style={styles.modernStatNumber}>{activeOrders}</Text>
            <Text style={styles.modernStatLabel}>Aktif Sipariş</Text>
          </View>
          
          <View style={styles.modernStatCard}>
            <View style={styles.simpleStatIcon}>
              <Icon name="favorite" size={24} color="#6b7280" />
          </View>
            <Text style={styles.modernStatNumber}>{favoriteCount}</Text>
            <Text style={styles.modernStatLabel}>Favori</Text>
        </View>

          <View style={styles.modernStatCard}>
            <View style={styles.simpleStatIcon}>
              <Icon name="receipt" size={24} color="#6b7280" />
            </View>
            <Text style={styles.modernStatNumber}>{orders.length}</Text>
            <Text style={styles.modernStatLabel}>Toplam Sipariş</Text>
            </View>
        </View>

        {/* Modern Menu Cards */}
        <View style={styles.modernMenuContainer}>
          {/* Cüzdanım */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Wallet')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.wallet color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Cüzdanım</Text>
              <Text style={styles.modernMenuSubtitle}>{ProductController.formatPrice(walletBalance)} bakiye</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Siparişlerim */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Orders')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.orders color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Siparişlerim</Text>
              <Text style={styles.modernMenuSubtitle}>{orders.length} sipariş</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Faturalarım */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Invoices')}>
            <View style={styles.simpleMenuIcon}>
              <Icon name="receipt-long" size={24} color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Faturalarım</Text>
              <Text style={styles.modernMenuSubtitle}>Geçmiş faturaları görüntüle</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Kargo Takibi */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('ShippingTracking')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.tracking color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Kargo Takibi</Text>
              <Text style={styles.modernMenuSubtitle}>{activeOrders} aktif kargo</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Bayilik Başvurusu */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('DealershipApplications')}>
            <View style={styles.simpleMenuIcon}>
              <Icon name="business" size={24} color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Bayilik Başvurularım</Text>
              <Text style={styles.modernMenuSubtitle}>Başvurularınızı görüntüleyin</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Bana Özel Kampanyalar */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('MyCampaigns')}>
            <View style={styles.simpleMenuIcon}>
              <Icon name="local-offer" size={24} color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Bana Özel Kampanyalar</Text>
              <Text style={styles.modernMenuSubtitle}>Kişiselleştirilmiş teklifler</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* İndirim Kodlarım */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('MyDiscountCodes')}>
            <View style={styles.simpleMenuIcon}>
              <Icon name="local-offer" size={24} color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>İndirim Kodlarım</Text>
              <Text style={styles.modernMenuSubtitle}>Kazanılan indirim kodları</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Özel Üretim Taleplerim */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('CustomRequests')}>
            <View style={styles.simpleMenuIcon}>
              <Icon name="build" size={24} color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Özel Üretim Taleplerim</Text>
              <Text style={styles.modernMenuSubtitle}>Taleplerinizi ve aşamaları takip edin</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Adreslerim */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Addresses')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.address color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Adreslerim</Text>
              <Text style={styles.modernMenuSubtitle}>Teslimat adresleri</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Favorilerim */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Favorites')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.heart color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Favorilerim</Text>
              <Text style={styles.modernMenuSubtitle}>{favoriteCount} ürün</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* İade Taleplerim */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('ReturnRequests')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.returns color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>İade Taleplerim</Text>
              <Text style={styles.modernMenuSubtitle}>İade ve değişim talepleri</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* S.S.S. */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('FAQ')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.faq color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Sıkça Sorulan Sorular</Text>
              <Text style={styles.modernMenuSubtitle}>Merak ettiğiniz soruların cevapları</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Destek */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Support')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.support color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Destek</Text>
              <Text style={styles.modernMenuSubtitle}>Yardım ve iletişim</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Referans Programı */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Referral')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.refer color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Referans Programı</Text>
              <Text style={styles.modernMenuSubtitle}>Kod oluştur, paylaş ve kazan</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Mağazada Bul */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('StoreLocator', {})}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.store color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Fiziki Mağazalarımız</Text>
              <Text style={styles.modernMenuSubtitle}>Yakın mağazaları görüntüle</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Ayarlar */}
          <TouchableOpacity style={styles.modernMenuItem} onPress={() => navigation.navigate('Settings')}>
            <View style={styles.simpleMenuIcon}>
              <ProfileIcons.settings color="#6b7280" />
            </View>
            <View style={styles.modernMenuContent}>
              <Text style={styles.modernMenuTitle}>Ayarlar</Text>
              <Text style={styles.modernMenuSubtitle}>Hesap ve bildirim ayarları</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {/* Gizlilik/Kullanım/Verilerimi Göster artık Ayarlar'da gösteriliyor */}
        </View>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <View style={styles.recentOrders}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Siparişler</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {orders.slice(0, 3).map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Sipariş #{order.id}</Text>
                  <Text
                    style={[
                      styles.orderStatus,
                      { color: OrderController.getStatusColor(order.status) }
                    ]}
                  >
                    {OrderController.getStatusText(order.status)}
                  </Text>
                </View>
                <Text style={styles.orderDate}>
                  {OrderController.formatOrderDate(order.createdAt)}
                </Text>
                <Text style={styles.orderTotal}>
                  {ProductController.formatPrice(order.totalAmount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Simple Logout Button */}
        <TouchableOpacity style={styles.simpleLogoutButton} onPress={handleLogout}>
          <ProfileIcons.logout color="#ef4444" />
          <Text style={styles.simpleLogoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  authButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 16,
    color: '#1A1A2E',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  menuArrow: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  recentOrders: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  
  // Modern Auth Styles
  modernContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modernKeyboardView: {
    flex: 1,
  },
  modernScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modernHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modernLogoContainer: {
    marginBottom: 20,
  },
  modernTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3c72',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modernFormCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modernForm: {
    padding: 24,
  },
  modernInputContainer: {
    marginBottom: 20,
  },
  modernInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 56,
  },
  modernTextAreaWrapper: {
    height: 'auto',
    minHeight: 80,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  modernInputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  modernTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modernEyeIcon: {
    padding: 4,
  },
  modernAuthButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  modernAuthButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernAuthButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  choicePill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  choicePillActive: {
    backgroundColor: '#1e3c72',
    borderColor: '#1e3c72',
  },
  choicePillText: {
    color: '#374151',
    fontWeight: '600',
  },
  choicePillTextActive: {
    color: 'white',
  },
  modernDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modernDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  modernDividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  modernSocialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  modernSocialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  modernSwitchText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modernSwitchLink: {
    fontSize: 14,
    color: '#1e3c72',
    fontWeight: '600',
  },
  modernForgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  modernForgotPasswordText: {
    fontSize: 14,
    color: '#1e3c72',
    fontWeight: '500',
  },
  
  // Modern Profile Styles
  modernProfileContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernScrollView: {
    flex: 1,
  },
  modernProfileHeader: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  modernProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  modernAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#374151',
  },
  modernProfileInfo: {
    flex: 1,
  },
  modernProfileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  modernProfileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  modernProfileUserId: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  modernProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  modernProfileBadgeText: {
    fontSize: 12,
    color: '#15803d',
    marginLeft: 4,
    fontWeight: '500',
  },
  levelCardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modernHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernNotificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  modernNotificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
  },
  modernStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    marginTop: -20,
  },
  modernStatCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modernStatGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modernStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  modernMenuContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modernMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modernMenuContent: {
    flex: 1,
  },
  modernMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  modernMenuSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modernLogoutButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modernLogoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modernLogoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  
  // Agreements and Marketing Styles
  agreementsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  agreementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  marketingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  marketingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  
  // Simple Styles
  simpleStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  simpleMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  simpleLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  simpleLogoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});