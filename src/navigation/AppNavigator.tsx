import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, ActivityIndicator, View, Image, TouchableOpacity, StyleSheet, Animated, Modal, Pressable, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import { HomeScreen } from '../views/HomeScreen';
import { ProductListScreen } from '../views/ProductListScreen';
import { ProductDetailScreen } from '../views/ProductDetailScreen';
import { CartScreen } from '../views/CartScreen';
import { ProfileScreen } from '../views/ProfileScreen';
import DealershipApplicationScreen from '../views/DealershipApplicationScreen';
import DealershipApplicationsScreen from '../views/DealershipApplicationsScreen';
import DealershipApplicationDetailScreen from '../views/DealershipApplicationDetailScreen';
import OrderScreen from '../views/OrderScreen';
import { OrdersScreen } from '../views/OrdersScreen';
import OrderDetailScreen from '../views/OrderDetailScreen';
import NfcScanScreen from '../views/NfcScanScreen';

import { WalletScreen } from '../views/WalletScreen';
import { ShippingTrackingScreen } from '../views/ShippingTrackingScreen';
import { AddressesScreen } from '../views/AddressesScreen';
import { FavoritesScreen } from '../views/FavoritesScreen';
import { SettingsScreen } from '../views/SettingsScreen';
import { BiometricLoginScreen } from '../views/BiometricLoginScreen';
import { ForgotPasswordScreen } from '../views/ForgotPasswordScreen';
import { ReturnRequestsScreen } from '../views/ReturnRequestsScreen';
import { FAQScreen } from '../views/FAQScreen';
import { SupportScreen } from '../views/SupportScreen';
import { AnythingLLMSettingsScreen } from '../views/AnythingLLMSettingsScreen';
import EditProfileScreen from '../views/EditProfileScreen';
import ChangePasswordScreen from '../views/ChangePasswordScreen';
import { NotificationScreen } from '../views/NotificationScreen';
import PaymentScreen from '../views/PaymentScreen';
import { CustomProductionScreen } from '../views/CustomProductionScreen';
import { CustomProductionRequestsScreen } from '../views/CustomProductionRequestsScreen';
import { CustomProductionRequestDetailScreen } from '../views/CustomProductionRequestDetailScreen';
import { AllCategoriesScreen } from '../views/AllCategoriesScreen';
import MyCampaignsScreen from '../views/MyCampaignsScreen';
import MyDiscountCodesScreen from '../views/MyDiscountCodesScreen';
import StoreLocatorScreen from '../views/StoreLocatorScreen';
import ReferralScreen from '../views/ReferralScreen';
import { UserLevelScreen } from '../views/UserLevelScreen';
import InvoicesScreen from '../views/InvoicesScreen';

// Components
import { HamburgerMenu } from '../components/HamburgerMenu';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { BackendErrorProvider, BackendErrorService } from '../services/BackendErrorService';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CartController } from '../controllers/CartController';
import { ProductController } from '../controllers/ProductController';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Dev-time screen validator to catch undefined imports causing require('undefined')
function debugValidateScreens() {
  if (!__DEV__) return;
  const screens: Record<string, any> = {
    HomeScreen,
    ProductListScreen,
    ProductDetailScreen,
    CartScreen,
    ProfileScreen,
    DealershipApplicationScreen,
    DealershipApplicationsScreen,
    DealershipApplicationDetailScreen,
    OrderScreen,
    OrdersScreen,
    OrderDetailScreen,
    NfcScanScreen,
    WalletScreen,
    ShippingTrackingScreen,
    AddressesScreen,
    FavoritesScreen,
    SettingsScreen,
    BiometricLoginScreen,
    ForgotPasswordScreen,
    ReturnRequestsScreen,
    FAQScreen,
    SupportScreen,
    AnythingLLMSettingsScreen,
    EditProfileScreen,
    ChangePasswordScreen,
    NotificationScreen,
    PaymentScreen,
    CustomProductionScreen,
    CustomProductionRequestsScreen,
    CustomProductionRequestDetailScreen,
    AllCategoriesScreen,
    MyCampaignsScreen,
    MyDiscountCodesScreen,
    StoreLocatorScreen,
    ReferralScreen,
    UserLevelScreen,
  };
  const undefinedScreens = Object.entries(screens)
    .filter(([, comp]) => !comp)
    .map(([name]) => name);
  if (undefinedScreens.length > 0) {
    // eslint-disable-next-line no-console
    console.error('🚫 Tanımsız ekran(lar) bulundu:', undefinedScreens.join(', '));
  }
}

if (__DEV__) {
  try {
    debugValidateScreens();
  } catch (e) {
    // no-op
  }
}

// Tab Icons using assets
const TabIcons = {
  home: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/home.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  
  products: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/ürünler.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  
  cart: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/cart.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  
  profile: ({ color }: { color: string }) => (
    <Image 
      source={require('../../assets/profile.png')} 
      style={{ width: 24, height: 24, tintColor: color }}
      resizeMode="contain"
    />
  ),
  
  custom: ({ color }: { color: string }) => (
    <Icon name="build" size={24} color={color} />
  ),
};

// Custom Header Component
const CustomHeader = ({ navigation, categories }: { navigation: any; categories: string[] }) => {
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    setShowSearch(false);
    navigation.navigate('ProductList', { searchQuery: trimmed });
  };

  return (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#FFFFFF',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <HamburgerMenu navigation={navigation} categories={categories} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Image 
            source={require('../../assets/logo.jpg')} 
            style={{ width: 160, height: 80 }}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowSearch(true)}
          style={{ padding: 8, marginLeft: 8 }}
          activeOpacity={0.7}
        >
          <Icon name="search" size={24} color="#1A1A2E" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showSearch}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="search" size={20} color="#6C757D" style={{ marginRight: 8 }} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Ürün ara (isim, marka, SKU)"
                placeholderTextColor="#9AA0A6"
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
                style={{ flex: 1, fontSize: 16, color: '#1A1A2E', paddingVertical: 8 }}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 6 }}>
                  <Icon name="close" size={18} color="#9AA0A6" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowSearch(false)} style={{ paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 }}>
                <Text style={{ color: '#6C757D', fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={{ backgroundColor: '#1A1A2E', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Ara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Stack Navigator for Home
const HomeStack = () => {
  const [categories, setCategories] = React.useState<string[]>([]);

  React.useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await ProductController.getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]); // Fallback to empty array
    }
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#1A1A2E',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1A1A2E',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={({ navigation }) => ({
          headerTitle: '',
          header: () => <CustomHeader navigation={navigation} categories={categories} />,
        })}
      />
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen}
        options={{ title: 'Ürünler' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{ title: 'Ürün Detayı' }}
      />
      <Stack.Screen 
        name="StoreLocator" 
        component={StoreLocatorScreen}
        options={{ title: 'Mağazalar' }}
      />
      <Stack.Screen 
        name="AllCategories" 
        component={AllCategoriesScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator for Cart
const CartStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#1A1A2E',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1A1A2E',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="CartMain" 
        component={CartScreen} 
        options={{ title: 'Sepetim' }}
      />
      <Stack.Screen 
        name="Order" 
        component={OrderScreen as any}
        options={{ title: 'Sipariş' }}
      />
      <Stack.Screen 
        name="NfcScan" 
        component={NfcScanScreen as any}
        options={{ title: 'Temassız Ödeme', headerShown: true }}
      />
      <Stack.Screen 
        name="Addresses" 
        component={AddressesScreen as any} 
        options={{ title: 'Adreslerim', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator for Products
const ProductsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#1A1A2E',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1A1A2E',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="ProductsMain" 
        component={ProductListScreen} 
        options={{ title: 'Tüm Ürünler' }}
      />
      <Stack.Screen 
        name="StoreLocator" 
        component={StoreLocatorScreen}
        options={{ title: 'Mağazalar' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{ title: 'Ürün Detayı' }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator for Profile
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#1A1A2E',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#1A1A2E',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ title: 'Hesabım' }}
      />
      <Stack.Screen 
        name="DealershipApplications" 
        component={DealershipApplicationsScreen} 
        options={({ navigation }) => ({
          title: 'Bayilik Başvurularım',
          headerRight: () => (
            <TouchableOpacity
              style={{ padding: 8, marginRight: 8 }}
              onPress={() => navigation.navigate('DealershipApplication')}
            >
              <Icon name="add" size={24} color="#1e3c72" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen 
        name="DealershipApplication" 
        component={DealershipApplicationScreen} 
        options={{ title: 'Bayilik Başvurusu' }}
      />
      <Stack.Screen 
        name="DealershipApplicationDetail" 
        component={DealershipApplicationDetailScreen as any} 
        options={{ title: 'Başvuru Detayı' }}
      />
      <Stack.Screen 
        name="StoreLocator" 
        component={StoreLocatorScreen}
        options={{ title: 'Mağazada Bul' }}
      />
      <Stack.Screen 
        name="CustomRequests" 
        component={CustomProductionRequestsScreen} 
        options={{ title: 'Özel Üretim Taleplerim' }}
      />
      <Stack.Screen 
        name="CustomProductionRequestDetail" 
        component={CustomProductionRequestDetailScreen} 
        options={{ title: 'Talep Detayı' }}
      />
      <Stack.Screen 
        name="Wallet" 
        component={WalletScreen} 
        options={{ title: 'Cüzdanım' }}
      />
      <Stack.Screen 
        name="ShippingTracking" 
        component={ShippingTrackingScreen} 
        options={{ title: 'Kargo Takibi' }}
      />
      <Stack.Screen 
        name="Addresses" 
        component={AddressesScreen as any} 
        options={{ title: 'Adreslerim', headerShown: false }}
      />
      <Stack.Screen 
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ title: 'Favorilerim' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Ayarlar' }}
      />
      <Stack.Screen 
        name="Order" 
        component={OrderScreen as any}
        options={{ title: 'Sipariş' }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ title: 'Siparişlerim' }}
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen as any}
        options={{ title: 'Sipariş Detayı' }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ title: 'Parola Sıfırlama', headerShown: false }}
      />
      <Stack.Screen 
        name="ReturnRequests" 
        component={ReturnRequestsScreen}
        options={{ title: 'İade Taleplerim', headerShown: false }}
      />
      <Stack.Screen 
        name="FAQ" 
        component={FAQScreen}
        options={{ title: 'S.S.S.', headerShown: false }}
      />
      <Stack.Screen 
        name="Support" 
        component={SupportScreen}
        options={{ title: 'Destek', headerShown: false }}
      />
      <Stack.Screen 
        name="AnythingLLMSettings" 
        component={AnythingLLMSettingsScreen}
        options={{ title: 'AnythingLLM Ayarları', headerShown: false }}
      />
      <Stack.Screen 
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Hesap Düzenle', headerShown: false }}
      />
      <Stack.Screen 
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Şifre Değiştir', headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications"
        component={NotificationScreen}
        options={{ title: 'Bildirimler', headerShown: false }}
      />
      <Stack.Screen 
        name="Payment"
        component={PaymentScreen as any}
        options={{ title: 'Ödeme', headerShown: true }}
      />
      <Stack.Screen 
        name="MyCampaigns"
        component={MyCampaignsScreen as any}
        options={{ title: 'Bana Özel Kampanyalar', headerShown: true }}
      />
      <Stack.Screen 
        name="MyDiscountCodes"
        component={MyDiscountCodesScreen as any}
        options={{ title: 'İndirim Kodlarım', headerShown: true }}
      />
      <Stack.Screen 
        name="Referral"
        component={ReferralScreen as any}
        options={{ title: 'Referans Programı', headerShown: true }}
      />
      <Stack.Screen 
        name="UserLevel"
        component={UserLevelScreen}
        options={{ title: 'Seviye Sistemi', headerShown: true }}
      />
      <Stack.Screen 
        name="Invoices"
        component={InvoicesScreen as any}
        options={{ title: 'Faturalarım', headerShown: true }}
      />
    </Stack.Navigator>
  );
};

// Tab Navigator
const TabNavigator = () => {
  const { state, updateCart } = useAppContext();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const cartItemCount = state.cart.itemCount || 0;
  
  // TabNavigator cart state

  // Uygulama başladığında sepet state'ini yükle
  useEffect(() => {
    const loadInitialCart = async () => {
      try {
        const userId = 1; // Default guest user ID
        const cartItems = await CartController.getCartItems(userId);
        // Initial cart load
        
        // Sepet boş olsa bile context'i güncelle
        const subtotal = CartController.calculateSubtotal(cartItems || []);
        const itemCount = (cartItems || []).reduce((total, item) => total + item.quantity, 0);
        // Initial cart context update
        
        updateCart({
          items: cartItems || [],
          total: subtotal,
          itemCount,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error loading initial cart:', error);
      }
    };

    loadInitialCart();
  }, [updateCart]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1A1A2E',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 0,
          paddingTop: 4,
          height: 60,
          elevation: 20,
          shadowOpacity: 0.3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color, size }) => (
            <TabIcons.home color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsStack}
        options={{
          tabBarLabel: t('navigation.products'),
          tabBarIcon: ({ color, size }) => (
            <TabIcons.products color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartStack}
        options={{
          tabBarLabel: t('navigation.cart'),
          tabBarIcon: ({ color, size }) => (
            <TabIcons.cart color={color} />
          ),
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF6B6B',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
          },
        }}
      />
      <Tab.Screen
        name="Custom"
        component={CustomProductionScreen}
        options={{
          tabBarLabel: 'Özel Üretim',
          tabBarIcon: ({ color, size }) => (
            <TabIcons.custom color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => (
            <TabIcons.profile color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};


const AppNavigatorContent = () => {
  debugValidateScreens();
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const welcomeFadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeScaleAnim = useRef(new Animated.Value(0.7)).current;
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Check if user has disabled welcome popup
    const checkWelcomePopupPreference = async () => {
      try {
        const dontShow = await AsyncStorage.getItem('dont_show_welcome_popup');
        if (dontShow === 'true') {
          setDontShowAgain(true);
        }
      } catch (error) {
        console.error('Error checking welcome popup preference:', error);
      }
    };

    checkWelcomePopupPreference();

    // Splash screen animasyonları
    Animated.sequence([
      // Logo fade in ve scale
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Loading progress
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();

    // App initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Splash screen'den sonra welcome popup'ı göster (eğer kullanıcı devre dışı bırakmamışsa)
      setTimeout(() => {
        if (!dontShowAgain) {
          setShowWelcomePopup(true);
          // Welcome popup animasyonu
          Animated.parallel([
            Animated.timing(welcomeFadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.spring(welcomeScaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }, 300);
    }, 2200);

    return () => clearTimeout(timer);
  }, [dontShowAgain]);

  if (isLoading) {
    return (
      <View style={splashStyles.container}>
        {/* Background Gradient Effect */}
        <View style={splashStyles.backgroundPattern}>
          <View style={splashStyles.circle1} />
          <View style={splashStyles.circle2} />
          <View style={splashStyles.circle3} />
        </View>
        
        {/* Logo Container */}
        <Animated.View style={[
          splashStyles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <Image 
            source={require('../../assets/logo.jpg')} 
            style={splashStyles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* Loading Section */}
        <View style={splashStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A2E" style={splashStyles.loader} />
          <Text style={splashStyles.loadingText}>Yükleniyor...</Text>
          
          {/* Loading Bar */}
          <View style={splashStyles.loadingBar}>
            <Animated.View 
              style={[
                splashStyles.loadingProgress,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>
        </View>
        
        {/* Copyright Info */}
        <View style={splashStyles.copyrightContainer}>
          <Text style={splashStyles.copyrightText}>
            Huğlu Outdoor bir Huğlu av tüfekleri kooperatifi markasıdır
          </Text>
          <Text style={splashStyles.copyrightText}>
            Tüm hakları saklıdır
          </Text>
        </View>
        
        {/* Version Info */}
        <Text style={splashStyles.versionText}>v2.0.1</Text>
      </View>
    );
  }

  // Welcome popup'ı kapatma fonksiyonu
  const closeWelcomePopup = async (savePreference = false) => {
    if (savePreference) {
      try {
        await AsyncStorage.setItem('dont_show_welcome_popup', 'true');
        setDontShowAgain(true);
      } catch (error) {
        console.error('Error saving welcome popup preference:', error);
      }
    }

    Animated.parallel([
      Animated.timing(welcomeFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeScaleAnim, {
        toValue: 0.7,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowWelcomePopup(false);
    });
  };

  // Main navigation - simple tab navigator
  return (
    <AppProvider>
      <NavigationContainer ref={navigationRef}>
        <BackendErrorProvider navigation={navigationRef}>
          <TabNavigator />
        </BackendErrorProvider>
      </NavigationContainer>
      
      {/* Welcome Popup Modal */}
      {showWelcomePopup && (
        <Modal
          visible={showWelcomePopup}
          transparent={true}
          animationType="none"
          onRequestClose={() => closeWelcomePopup()}
        >
          <View style={welcomeStyles.overlay}>
            <Animated.View style={[
              welcomeStyles.popupContainer,
              {
                opacity: welcomeFadeAnim,
                transform: [{ scale: welcomeScaleAnim }]
              }
            ]}>
              {/* Close Button */}
              <TouchableOpacity 
                style={welcomeStyles.closeButton}
                onPress={() => closeWelcomePopup()}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>

              {/* Background Pattern */}
              <View style={welcomeStyles.backgroundPattern}>
                <View style={welcomeStyles.patternCircle1} />
                <View style={welcomeStyles.patternCircle2} />
                <View style={welcomeStyles.patternCircle3} />
              </View>
              
              {/* Logo */}
              <View style={welcomeStyles.logoContainer}>
                <Image 
                  source={require('../../assets/logo.jpg')} 
                  style={welcomeStyles.logo}
                  resizeMode="contain"
                />
                <View style={welcomeStyles.logoBadge}>
                  <Text style={welcomeStyles.logoBadgeText}>YENİ</Text>
                </View>
              </View>
              
              {/* Welcome Text */}
              <View style={welcomeStyles.textContainer}>
                <Text style={welcomeStyles.welcomeTitle}>
                  Hoş Geldiniz! 🎯
                </Text>
                
                <Text style={welcomeStyles.welcomeSubtitle}>
                  Huğlu Outdoor'a hoş geldiniz
                </Text>
                
                <Text style={welcomeStyles.welcomeDescription}>
                  Av tüfekleri ve outdoor ürünlerinde kalite ve güvenin adresi. 
                  En yeni ürünlerimizi keşfedin ve özel kampanyalarımızdan yararlanın.
                </Text>
              </View>
              
              {/* Features */}
              <View style={welcomeStyles.featuresContainer}>
                <View style={welcomeStyles.featureItem}>
                  <View style={welcomeStyles.featureIconContainer}>
                    <Icon name="security" size={24} color="#3b82f6" />
                  </View>
                  <Text style={welcomeStyles.featureText}>Kaliteli Ürünler</Text>
                </View>
                <View style={welcomeStyles.featureItem}>
                  <View style={welcomeStyles.featureIconContainer}>
                    <Icon name="local-shipping" size={24} color="#10b981" />
                  </View>
                  <Text style={welcomeStyles.featureText}>Hızlı Teslimat</Text>
                </View>
                <View style={welcomeStyles.featureItem}>
                  <View style={welcomeStyles.featureIconContainer}>
                    <Icon name="payment" size={24} color="#f59e0b" />
                  </View>
                  <Text style={welcomeStyles.featureText}>Güvenli Ödeme</Text>
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={welcomeStyles.buttonsContainer}>
                <TouchableOpacity 
                  style={welcomeStyles.continueButton}
                  onPress={() => closeWelcomePopup()}
                  activeOpacity={0.8}
                >
                  <Text style={welcomeStyles.continueButtonText}>
                    Keşfetmeye Başla
                  </Text>
                  <Icon name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={welcomeStyles.dontShowButton}
                  onPress={() => closeWelcomePopup(true)}
                  activeOpacity={0.7}
                >
                  <Icon name="visibility-off" size={16} color="#6b7280" />
                  <Text style={welcomeStyles.dontShowButtonText}>
                    Bir daha gösterme
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </AppProvider>
  );
};

// Modern Splash Screen Styles
const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    position: 'relative',
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(26, 26, 46, 0.03)',
    top: -50,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    bottom: 100,
    left: -30,
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(78, 205, 196, 0.04)',
    top: '40%',
    right: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loader: {
    marginBottom: 16,
    transform: [{ scale: 1.2 }],
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A2E',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  loadingBar: {
    width: 200,
    height: 3,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  copyrightContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  copyrightText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#ADB5BD',
    letterSpacing: 0.5,
  },
});

// Welcome Popup Styles
const welcomeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  patternCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(26, 26, 46, 0.03)',
    top: -30,
    right: -30,
  },
  patternCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    bottom: -20,
    left: -20,
  },
  patternCircle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(78, 205, 196, 0.04)',
    top: '50%',
    right: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  logoBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  dontShowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  dontShowButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export const AppNavigator = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppProvider>
          <AppNavigatorContent />
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};