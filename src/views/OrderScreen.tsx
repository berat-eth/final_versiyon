import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { CartController } from '../controllers/CartController';
import { OrderController } from '../controllers/OrderController';
import { UserController } from '../controllers/UserController';
import { CartItem } from '../utils/types';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { useAppContext } from '../contexts/AppContext';
import { StatusBar } from 'expo-status-bar';
import PaymentService from '../services/PaymentService';
import EFT_DETAILS from '../utils/payment-config';
import NfcCardService, { NfcCardData } from '../services/NfcCardService';
import * as Clipboard from 'expo-clipboard';

interface OrderScreenProps {
  navigation: any;
  route: {
    params: {
      cartItems: CartItem[];
      subtotal: number;
      shipping: number;
      total: number;
    };
  };
}

export const OrderScreen: React.FC<OrderScreenProps> = ({ navigation, route }) => {
  const { cartItems, subtotal, shipping, total } = route.params;
  const { updateCart } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form states
  const [deliveryInfo, setDeliveryInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'eft' | 'nfc'>('credit_card');
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
  });
  const [nfcSupported, setNfcSupported] = useState<boolean>(false);

  const steps = [
    { title: 'Teslimat Bilgileri', icon: 'location-on' },
    { title: 'Ödeme Yöntemi', icon: 'payment' },
    { title: 'Sipariş Özeti', icon: 'receipt' },
  ];

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);
  // NFC desteğini kontrol et
  React.useEffect(() => {
    (async () => {
      try {
        console.log('🔍 OrderScreen: NFC desteği kontrol ediliyor...');
        const supported = await NfcCardService.isSupported();
        console.log('📱 OrderScreen: NFC desteği sonucu:', supported);
        setNfcSupported(supported);
        
        if (supported) {
          console.log('🔧 OrderScreen: NFC Manager başlatılıyor...');
          const initResult = await NfcCardService.init();
          console.log('✅ OrderScreen: NFC Manager başlatma sonucu:', initResult);
        } else {
          console.log('⚠️ OrderScreen: NFC desteklenmiyor veya etkin değil');
        }
      } catch (error) {
        console.error('❌ OrderScreen: NFC kontrol hatası:', error);
        setNfcSupported(false);
      }
    })();
  }, []);

  const handleReadCardViaNfc = useCallback(async () => {
    try {
      console.log('📱 NFC kart okuma ekranına gidiliyor...');
      navigation.navigate('NfcScan', {
        onResult: (data: NfcCardData | null) => {
          if (!data || !data.pan) {
            return;
          }
          const formattedPan = data.pan.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
          const expiry = data.expiryMonth && data.expiryYear
            ? `${data.expiryMonth}/${data.expiryYear.slice(-2)}`
            : undefined;
          setCardInfo(prev => ({
            ...prev,
            cardNumber: formattedPan || prev.cardNumber,
            expiryDate: expiry || prev.expiryDate,
          }));
          setPaymentMethod('credit_card');
        }
      });
    } catch (error) {
      console.error('❌ NFC okuma navigasyon hatası:', error);
    }
  }, [navigation]);

  const handleCopy = useCallback(async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Kopyalandı', `${label} kopyalandı.`);
    } catch {}
  }, []);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const validateDeliveryInfo = useCallback(() => {
    const { firstName, lastName, phone, address, city, district } = deliveryInfo;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !address.trim() || !city.trim() || !district.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun.');
      return false;
    }
    if (phone.length < 10) {
      Alert.alert('Geçersiz Telefon', 'Lütfen geçerli bir telefon numarası girin.');
      return false;
    }
    return true;
  }, [deliveryInfo]);

  const validatePaymentInfo = useCallback(() => {
    if (paymentMethod === 'credit_card') {
      const { cardNumber, expiryDate, cvv, cardHolder } = cardInfo;
      if (!cardNumber.trim() || !expiryDate.trim() || !cvv.trim() || !cardHolder.trim()) {
        Alert.alert('Eksik Bilgi', 'Lütfen tüm kart bilgilerini doldurun.');
        return false;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        Alert.alert('Geçersiz Kart', 'Lütfen geçerli bir kart numarası girin.');
        return false;
      }
    }
    return true;
  }, [paymentMethod, cardInfo]);

  const handleCompleteOrder = useCallback(async () => {
    setLoading(true);
    try {
      const fullAddress = `${deliveryInfo.address}, ${deliveryInfo.district}, ${deliveryInfo.city} ${deliveryInfo.postalCode}`;
      const shippingAddress = `${deliveryInfo.firstName} ${deliveryInfo.lastName}\n${deliveryInfo.phone}\n${fullAddress}`;
      
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      
      // Creating order with data
      
      const result = await OrderController.createOrder(
        userId,
        shippingAddress,
        paymentMethod,
        deliveryInfo.city,
        deliveryInfo.district,
        fullAddress
      );

      if (result.success) {
        // Order created successfully
        if (paymentMethod === 'credit_card') {
          // Process payment via İyzico
          const [expMonthRaw, expYearRaw] = (cardInfo.expiryDate || '').split('/')
            .map(part => (part || '').replace(/\D/g, ''));
          const expireMonth = (expMonthRaw || '').padStart(2, '0');
          const expireYear = (expYearRaw && expYearRaw.length === 2) ? `20${expYearRaw}` : (expYearRaw || '');

          const paymentResponse = await PaymentService.processPayment({
            orderId: result.orderId!,
            paymentCard: {
              cardHolderName: cardInfo.cardHolder.trim(),
              cardNumber: cardInfo.cardNumber.replace(/\s/g, ''),
              expireMonth,
              expireYear,
              cvc: cardInfo.cvv
            },
            buyer: {
              id: userId,
              name: deliveryInfo.firstName || 'Müşteri',
              surname: deliveryInfo.lastName || 'Müşteri',
              gsmNumber: deliveryInfo.phone || '',
              email: deliveryInfo.email || '',
              registrationAddress: fullAddress,
              city: deliveryInfo.city || '',
              country: 'Turkey',
              zipCode: deliveryInfo.postalCode || '34000'
            },
            shippingAddress: {
              contactName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`.trim(),
              city: deliveryInfo.city || '',
              country: 'Turkey',
              address: fullAddress,
              zipCode: deliveryInfo.postalCode || '34000'
            },
            billingAddress: {
              contactName: `${deliveryInfo.firstName} ${deliveryInfo.lastName}`.trim(),
              city: deliveryInfo.city || '',
              country: 'Turkey',
              address: fullAddress,
              zipCode: deliveryInfo.postalCode || '34000'
            }
          });

          if (!paymentResponse.success) {
            Alert.alert('Ödeme Hatası', paymentResponse.message || 'Kart ödemesi başarısız. Lütfen tekrar deneyin.');
            return; // Sepeti temizleme ve yönlendirme yapma
          }
        }

        // Clear cart after successful order (and payment if credit card)
        await CartController.clearCart(userId);
        updateCart({
          items: [],
          total: 0,
          itemCount: 0,
          lastUpdated: new Date().toISOString(),
        });

        Alert.alert(
          'Sipariş Başarılı!',
          `Siparişiniz başarıyla oluşturuldu. Sipariş No: #${result.orderId}`,
          [
            {
              text: 'Siparişlerim',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
                navigation.navigate('Orders');
              }
            },
            {
              text: 'Ana Sayfa',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              }
            }
          ]
        );
      } else {
        // Order creation failed
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('❌ Order creation error:', error);
      Alert.alert('Hata', 'Sipariş oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [deliveryInfo, paymentMethod, navigation, updateCart]);

  const renderHeader = useCallback(() => null, []);

  const renderDeliveryStep = useCallback(() => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Teslimat Bilgileri</Text>
        
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Ad *</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryInfo.firstName}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, firstName: text }))}
              placeholder="Adınız"
              placeholderTextColor="#999999"
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Soyad *</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryInfo.lastName}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, lastName: text }))}
              placeholder="Soyadınız"
              placeholderTextColor="#999999"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Telefon *</Text>
          <TextInput
            style={styles.textInput}
            value={deliveryInfo.phone}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, phone: text }))}
            placeholder="0555 123 45 67"
            placeholderTextColor="#999999"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>E-posta</Text>
          <TextInput
            style={styles.textInput}
            value={deliveryInfo.email}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, email: text }))}
            placeholder="ornek@email.com"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Adres *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={deliveryInfo.address}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, address: text }))}
            placeholder="Mahalle, sokak, bina no, daire no"
            placeholderTextColor="#999999"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Şehir *</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryInfo.city}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, city: text }))}
              placeholder="İstanbul"
              placeholderTextColor="#999999"
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>İlçe *</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryInfo.district}
              onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, district: text }))}
              placeholder="Kadıköy"
              placeholderTextColor="#999999"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Posta Kodu</Text>
          <TextInput
            style={styles.textInput}
            value={deliveryInfo.postalCode}
            onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, postalCode: text }))}
            placeholder="34000"
            placeholderTextColor="#999999"
            keyboardType="numeric"
          />
        </View>
      </View>
    </ScrollView>
  ), [deliveryInfo]);

  const renderPaymentStep = useCallback(() => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Ödeme Yöntemi</Text>
        
        {/* Payment Method Selection */}
        <View style={styles.paymentMethods}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'credit_card' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('credit_card')}
          >
            <Icon name="credit-card" size={24} color={Colors.primary} />
            <Text style={styles.paymentOptionText}>Kredi/Banka Kartı</Text>
            <Icon 
              name={paymentMethod === 'credit_card' ? 'radio-button-checked' : 'radio-button-unchecked'} 
              size={20} 
              color={paymentMethod === 'credit_card' ? Colors.primary : '#CCCCCC'} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'eft' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('eft')}
          >
            <Icon name="account-balance" size={24} color={Colors.primary} />
            <Text style={styles.paymentOptionText}>EFT/Havale</Text>
            <Icon 
              name={paymentMethod === 'eft' ? 'radio-button-checked' : 'radio-button-unchecked'} 
              size={20} 
              color={paymentMethod === 'eft' ? Colors.primary : '#CCCCCC'} 
            />
          </TouchableOpacity>

          {nfcSupported && (
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'nfc' && styles.paymentOptionSelected
              ]}
              onPress={() => {
                console.log('📱 NFC ödeme seçeneği seçildi');
                setPaymentMethod('nfc');
              }}
            >
              <Icon name="nfc" size={24} color={Colors.primary} />
              <Text style={styles.paymentOptionText}>Temassız (NFC)</Text>
              <Icon 
                name={paymentMethod === 'nfc' ? 'radio-button-checked' : 'radio-button-unchecked'} 
                size={20} 
                color={paymentMethod === 'nfc' ? Colors.primary : '#CCCCCC'} 
              />
            </TouchableOpacity>
          )}
          
          {/* Debug: NFC durumu göster */}
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              NFC Durumu: {nfcSupported ? '✅ Destekleniyor' : '❌ Desteklenmiyor'}
            </Text>
          </View>
        </View>

        {/* Credit Card Form */}
        {(paymentMethod === 'credit_card') && (
          <View style={styles.cardForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Kart Üzerindeki İsim *</Text>
              <TextInput
                style={styles.textInput}
                value={cardInfo.cardHolder}
                onChangeText={(text) => setCardInfo(prev => ({ ...prev, cardHolder: text.toUpperCase() }))}
                placeholder="Ahmet Yılmaz"
                placeholderTextColor="#999999"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Kart Numarası *</Text>
              <TextInput
                style={styles.textInput}
                value={cardInfo.cardNumber}
                onChangeText={(text) => {
                  // Format card number with spaces
                  const formatted = text.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                  if (formatted.length <= 19) {
                    setCardInfo(prev => ({ ...prev, cardNumber: formatted }));
                  }
                }}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Son Kullanma *</Text>
                <TextInput
                  style={styles.textInput}
                  value={cardInfo.expiryDate}
                  onChangeText={(text) => {
                    // Format MM/YY
                    const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                    if (formatted.length <= 5) {
                      setCardInfo(prev => ({ ...prev, expiryDate: formatted }));
                    }
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>CVV *</Text>
                <TextInput
                  style={styles.textInput}
                  value={cardInfo.cvv}
                  onChangeText={(text) => {
                    if (text.length <= 3) {
                      setCardInfo(prev => ({ ...prev, cvv: text }));
                    }
                  }}
                  placeholder="123"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            {nfcSupported && (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity onPress={handleReadCardViaNfc} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F3F4F6' }}>
                  <Text style={{ color: '#1F2937', fontWeight: '600' }}>NFC ile kartı tara</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>Kartı telefonun arkasına yaklaştırın.</Text>
              </View>
            )}
          </View>
        )}

        {/* NFC Payment Panel */}
        {paymentMethod === 'nfc' && (
          <View style={styles.cardForm}>
            <Text style={styles.inputLabel}>Temassız Ödeme</Text>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 10 }}>
              Kartınızı telefonun arkasına yaklaştırın ve okutun. Bu sürümde NFC okutma sonrası kart verileri otomatik doldurulmaz; okutma onayı sonrasında kartlı ödeme akışı kullanılır.
            </Text>
            <TouchableOpacity onPress={handleReadCardViaNfc} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1A1A2E' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>NFC ile Tara</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EFT/Havale Bilgileri */}
        {paymentMethod === 'eft' && (
          <View style={styles.cardForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Banka Bilgileri</Text>
              <View style={{ backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 14, color: '#333333', marginBottom: 2 }}>Hesap Adı</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A2E' }}>{EFT_DETAILS.accountName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleCopy(EFT_DETAILS.accountName, 'Hesap adı')} style={{ padding: 8 }}>
                    <Icon name="content-copy" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 14, color: '#333333', marginBottom: 2 }}>IBAN</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.primary }}>{EFT_DETAILS.iban}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleCopy(EFT_DETAILS.iban, 'IBAN')} style={{ padding: 8 }}>
                    <Icon name="content-copy" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#666666', marginTop: 8 }}>
                Lütfen havale açıklamasına sipariş numaranızı yazınız. Ödeme onaylandığında siparişiniz işleme alınacaktır.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  ), [paymentMethod, cardInfo]);

  const renderSummaryStep = useCallback(() => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sipariş Özeti</Text>
        
        {/* Order Items */}
        <View style={styles.orderItems}>
          {cartItems.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>
                {item.product?.name || 'Ürün'}
              </Text>
              <Text style={styles.orderItemDetails}>
                {item.quantity} adet × {(Number(item.product?.price) || 0).toFixed(0)} TL
              </Text>
              <Text style={styles.orderItemTotal}>
                {((Number(item.product?.price) || 0) * item.quantity).toFixed(0)} TL
              </Text>
            </View>
          ))}
        </View>

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Ara Toplam</Text>
            <Text style={styles.priceValue}>{(Number(subtotal) || 0).toFixed(0)} TL</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Kargo</Text>
            <Text style={styles.priceValue}>{(Number(shipping) || 0).toFixed(0)} TL</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>Toplam</Text>
            <Text style={styles.priceTotalValue}>{(Number(total) || 0).toFixed(0)} TL</Text>
          </View>
        </View>

        {/* Delivery Info Summary */}
        <View style={styles.infoSummary}>
          <Text style={styles.infoSummaryTitle}>Teslimat Bilgileri</Text>
          <Text style={styles.infoSummaryText}>
            {deliveryInfo.firstName} {deliveryInfo.lastName}
          </Text>
          <Text style={styles.infoSummaryText}>{deliveryInfo.phone}</Text>
          <Text style={styles.infoSummaryText}>
            {deliveryInfo.address}, {deliveryInfo.city}
          </Text>
        </View>

        {/* Payment Method Summary */}
        <View style={styles.infoSummary}>
          <Text style={styles.infoSummaryTitle}>Ödeme Yöntemi</Text>
          <Text style={styles.infoSummaryText}>
            {paymentMethod === 'credit_card' ? 'Kredi/Banka Kartı' : 'EFT/Havale'}
          </Text>
          {paymentMethod === 'credit_card' && (
            <Text style={styles.infoSummaryText}>
              **** **** **** {cardInfo.cardNumber.slice(-4)}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  ), [cartItems, subtotal, shipping, total, deliveryInfo, paymentMethod, cardInfo]);

  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 0:
        return renderDeliveryStep();
      case 1:
        return renderPaymentStep();
      case 2:
        return renderSummaryStep();
      default:
        return renderDeliveryStep();
    }
  }, [currentStep, renderDeliveryStep, renderPaymentStep, renderSummaryStep]);

  const handleStepAction = useCallback(() => {
    if (currentStep === 0) {
      if (validateDeliveryInfo()) {
        handleNextStep();
      }
    } else if (currentStep === 1) {
      if (validatePaymentInfo()) {
        handleNextStep();
      }
    } else if (currentStep === 2) {
      handleCompleteOrder();
    }
  }, [currentStep, validateDeliveryInfo, validatePaymentInfo, handleNextStep, handleCompleteOrder]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* header kaldırıldı */}
        
        <View style={styles.content}>
          {renderStepContent()}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePrevStep}
            >
              <Text style={styles.backButtonText}>Geri</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, currentStep === 0 && styles.nextButtonFull]}
            onPress={handleStepAction}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'İşleniyor...' : 
               currentStep === 2 ? 'Siparişi Onayla' : 'Devam Et'}
            </Text>
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
    paddingBottom: Spacing.lg,
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

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontWeight: '400',
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '50%',
    right: '-50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },

  // Content
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: Spacing.md,
  },

  // Form Styles
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Payment Methods
  paymentMethods: {
    marginBottom: Spacing.lg,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F8F9FF',
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginLeft: Spacing.md,
  },
  cardForm: {
    marginTop: Spacing.md,
  },

  // Order Summary
  orderItems: {
    marginBottom: Spacing.lg,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderItemName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  orderItemDetails: {
    flex: 1,
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
    minWidth: 80,
  },

  // Price Summary
  priceSummary: {
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: Spacing.sm,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Info Summary
  infoSummary: {
    marginBottom: Spacing.lg,
  },
  infoSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: Spacing.xs,
  },
  infoSummaryText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
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
  backButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  nextButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    ...Shadows.medium,
  },
  nextButtonFull: {
    flex: 1,
    marginRight: 0,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default OrderScreen;