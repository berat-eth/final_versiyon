import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { CartItem } from '../utils/types';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { DiscountWheelController, DiscountCode } from '../controllers/DiscountWheelController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { useAppContext } from '../contexts/AppContext';
import { CartShareButtons } from '../components/CartShareButtons';
 

interface CartScreenProps {
  navigation: any;
}

interface DeliveryAddress {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state?: string;
  postalCode: string;
  isDefault: boolean;
  addressType?: string;
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { updateCart } = useAppContext();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    type: string;
    value: number;
  } | null>(null);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  

  useEffect(() => {
    loadCart();
    const unsubscribe = navigation.addListener('focus', () => {
      loadCart();
    });
    return unsubscribe;
  }, [navigation]);

  

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const userIdValue = await UserController.getCurrentUserId(); // Get current user ID
      const [items, codes] = await Promise.all([
        CartController.getCartItems(userIdValue),
        DiscountWheelController.getUserDiscountCodes(userIdValue)
      ]);
      // CartScreen loadCart
      setCartItems(items || []);
      setDiscountCodes(codes || []);
      
      // Update global context
      const subtotal = CartController.calculateSubtotal(items || []);
      const itemCount = (items || []).reduce((total, item) => total + item.quantity, 0);
      // CartScreen updating context
      updateCart({
        items: items || [],
        total: subtotal,
        itemCount,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Hata', 'Sepet yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateCart]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCart();
  }, [loadCart]);

  // Discount code functions
  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      Alert.alert('Hata', 'Lütfen bir indirim kodu girin');
      return;
    }

    try {
      const userId = await UserController.getCurrentUserId();
      const subtotal = CartController.calculateSubtotal(cartItems);
      
      const result = await DiscountWheelController.validateDiscountCode(
        discountCode.trim(),
        userId,
        subtotal
      );

      if (result.success && result.data) {
        setAppliedDiscount({
          code: discountCode.trim(),
          amount: result.data.discountAmount,
          type: result.data.discountType,
          value: result.data.discountValue
        });
        Alert.alert('Başarılı', `${result.data.discountAmount.toFixed(2)} TL indirim uygulandı!`);
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error applying discount code:', error);
      Alert.alert('Hata', 'İndirim kodu uygulanırken hata oluştu');
    }
  };

  const handleRemoveDiscountCode = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const calculateTotal = () => {
    const subtotal = CartController.calculateSubtotal(cartItems);
    const discount = appliedDiscount ? appliedDiscount.amount : 0;
    return Math.max(0, subtotal - discount);
  };

  const handleUpdateQuantity = useCallback(async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev.add(cartItemId)));
    
    try {
      const result = await CartController.updateQuantity(cartItemId, newQuantity);
      if (result.success) {
        await loadCart(); // Reload cart to get updated data
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Hata', 'Miktar güncellenirken bir hata oluştu');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartItemId);
        return newSet;
      });
    }
  }, [loadCart]);

  const handleRemoveFromCart = useCallback(async (cartItemId: number, productName: string) => {
    Alert.alert(
      'Ürünü Kaldır',
      `"${productName}" ürününü sepetinizden kaldırmak istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setUpdatingItems(prev => new Set(prev.add(cartItemId)));
            
            try {
              const result = await CartController.removeFromCart(cartItemId);
              if (result.success) {
                // Update cart context
                const userIdValue = await UserController.getCurrentUserId();
                const updatedItems = await CartController.getCartItems(userIdValue);
                const subtotal = CartController.calculateSubtotal(updatedItems || []);
                const itemCount = (updatedItems || []).reduce((total, item) => total + item.quantity, 0);
                updateCart({
                  items: updatedItems || [],
                  total: subtotal,
                  itemCount,
                  lastUpdated: new Date().toISOString(),
                });
                
                // Reload cart
                await loadCart();
                
                Alert.alert('Başarılı', 'Ürün sepetinizden kaldırıldı');
              } else {
                Alert.alert('Hata', result.message);
              }
            } catch (error) {
              console.error('Error removing from cart:', error);
              Alert.alert('Hata', 'Ürün kaldırılırken bir hata oluştu');
            } finally {
              setUpdatingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(cartItemId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [loadCart, updateCart]);


  const handleCheckout = useCallback(() => {
    if (cartItems.length === 0) return;
    
    const subtotal = CartController.calculateSubtotal(cartItems);
    const shipping = CartController.calculateShipping(subtotal);
    const total = CartController.calculateTotal(subtotal, shipping);
    
    navigation.navigate('Order', {
      cartItems,
      subtotal,
      shipping,
      total
    });
  }, [cartItems, navigation]);

  const cartSummary = useCallback(() => {
    const subtotal = CartController.calculateSubtotal(cartItems);
    const shipping = CartController.calculateShipping(subtotal);
    const discount = appliedDiscount ? appliedDiscount.amount : 0;
    const total = CartController.calculateTotal(subtotal, shipping) - discount;
    return { subtotal, shipping, discount, total };
  }, [cartItems, appliedDiscount]);

  const renderCartItem = useCallback(({ item }: { item: CartItem }) => {
    const isUpdating = updatingItems.has(item.id);
    const productPrice = item.product?.price || 0;
    
    return (
      <View style={styles.cartItemWrapper}>
        <View style={styles.cartItemRow}>
          {/* Product Image */}
          <View style={styles.productImageWrapper}>
            <Image 
              source={{ uri: item.product?.image || 'https://via.placeholder.com/150x150?text=No+Image' }} 
              style={styles.productImage}
              resizeMode="cover"
            />
            {isUpdating && (
              <View style={styles.loadingOverlay}>
                <Icon name="refresh" size={14} color={Colors.primary} />
              </View>
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productDetails}>
            <View style={styles.productHeader}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.product?.name || 'Ürün'}
              </Text>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFromCart(item.id, item.product?.name || 'Ürün')}
                disabled={isUpdating}
              >
                <Icon 
                  name="delete-outline" 
                  size={20} 
                  color={isUpdating ? Colors.textMuted : '#FF6B6B'} 
                />
              </TouchableOpacity>
            </View>
            
            {item.variationString && (
              <Text style={styles.productVariation}>
                {item.variationString}
              </Text>
            )}
            
            <Text style={styles.productPrice}>
              {(Number(productPrice) || 0).toFixed(0)} TL
            </Text>
          </View>

          {/* Quantity Controls */}
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.quantityBtn, item.quantity <= 1 && styles.quantityBtnDisabled]}
              onPress={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1 || isUpdating}
            >
              <Icon 
                name="remove" 
                size={16} 
                color={item.quantity <= 1 ? Colors.textMuted : Colors.primary} 
              />
            </TouchableOpacity>
            
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
              disabled={isUpdating}
            >
              <Icon name="add" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [updatingItems, handleUpdateQuantity]);

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
        <Text style={styles.headerTitle}>Sepetim</Text>
        <View style={styles.headerButton} />
      </View>
    </LinearGradient>
  ), [navigation]);

  const renderDiscountCodeSection = useCallback(() => {
    if (cartItems.length === 0) return null;

    return (
      <View style={styles.discountSection}>
        <View style={styles.discountHeader}>
          <Text style={styles.discountTitle}>🏷️ İndirim Kodu</Text>
          {discountCodes.length > 0 && (
            <TouchableOpacity
              style={styles.myCodesButton}
              onPress={() => setShowDiscountModal(true)}
            >
              <Text style={styles.myCodesText}>Kodlarım</Text>
            </TouchableOpacity>
          )}
        </View>

        {appliedDiscount ? (
          <View style={styles.appliedDiscountCard}>
            <View style={styles.appliedDiscountInfo}>
              <Icon name="check-circle" size={20} color="#28a745" />
              <Text style={styles.appliedDiscountCode}>{appliedDiscount.code}</Text>
              <Text style={styles.appliedDiscountAmount}>
                -{appliedDiscount.amount.toFixed(2)} TL
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeDiscountButton}
              onPress={handleRemoveDiscountCode}
            >
              <Icon name="close" size={16} color="#dc3545" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.discountInputContainer}>
            <View style={styles.discountInputWrapper}>
              <Icon name="local-offer" size={20} color="#666" style={styles.discountInputIcon} />
              <TextInput
                style={styles.discountInput}
                placeholder="İndirim kodunuzu girin"
                value={discountCode}
                onChangeText={setDiscountCode}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyDiscountCode}
            >
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [cartItems.length, discountCodes.length, appliedDiscount, discountCode, handleApplyDiscountCode, handleRemoveDiscountCode]);

  const renderSummary = useCallback(() => {
    const { subtotal, shipping, discount, total } = cartSummary();

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ara Toplam</Text>
            <Text style={styles.summaryValue}>{(Number(subtotal) || 0).toFixed(0)} TL</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kargo</Text>
            <Text style={styles.summaryValue}>
              {Number(shipping) === 0 ? 'Ücretsiz' : `${(Number(shipping) || 0).toFixed(0)} TL`}
            </Text>
          </View>
          
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>İndirim</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{(Number(discount) || 0).toFixed(0)} TL
              </Text>
            </View>
          )}
          
          <View style={styles.summaryDivider} />
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValue}>{(Number(total) || 0).toFixed(0)} TL</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.checkoutButton,
            (cartItems.length === 0) && styles.checkoutButtonDisabled
          ]}
          onPress={handleCheckout}
          disabled={cartItems.length === 0}
        >
          <LinearGradient
            colors={(cartItems.length === 0) 
              ? ['#6c757d', '#495057'] 
              : ['#667eea', '#764ba2']
            }
            style={styles.checkoutButtonGradient}
          >
            <Text style={styles.checkoutButtonText}>Siparişi Tamamla</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }, [cartSummary, cartItems.length, handleCheckout]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="shopping-cart" size={80} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Sepetiniz Boş</Text>
            <Text style={styles.emptyMessage}>
              Sepetinizde henüz ürün bulunmuyor.{'\n'}
              Hemen alışverişe başlayın!
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('Products')}
            >
              <Text style={styles.shopButtonText}>Alışverişe Başla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderHeader()}
      
      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />

      {renderDiscountCodeSection()}
      
      {/* Sepet Paylaşım Bölümü */}
      <CartShareButtons
        cartItems={cartItems.map(item => ({
          id: item.id,
          productName: item.product?.name || 'Ürün',
          price: item.product?.price || 0,
          quantity: item.quantity,
          image: item.product?.image,
        }))}
        totalAmount={calculateTotal()}
        onShareSuccess={(platform, expGained) => {
          console.log(`Sepet paylaşımı başarılı: ${platform}, +${expGained} EXP`);
        }}
      />
      
      {renderSummary()}
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

  // List Content
  listContent: {
    paddingVertical: Spacing.md,
    paddingBottom: 200,
  },

  // Cart Item Styles
  cartItemWrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.small,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    marginRight: Spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productVariation: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },

  // Quantity Controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...Shadows.small,
  },
  quantityBtnDisabled: {
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: Spacing.md,
    minWidth: 40,
    textAlign: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    backgroundColor: '#FFFFFF',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.md,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  shopButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    ...Shadows.medium,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Summary Styles
  summaryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    ...Shadows.large,
    maxHeight: '60%',
  },
  
  // Address Section Styles
  addressSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginLeft: 8,
  },
  selectedAddressContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedAddressGradient: {
    padding: 16,
  },
  selectedAddressContent: {
    // No additional styles needed, content will be styled individually
  },
  selectedAddressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
    lineHeight: 18,
  },
  selectedAddressPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  noAddressSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: Spacing.sm,
  },
  totalRow: {
    paddingVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Discount Code Styles
  discountSection: {
    backgroundColor: 'white',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.small,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  myCodesButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  myCodesText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  appliedDiscountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  appliedDiscountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedDiscountCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginLeft: 8,
    marginRight: 12,
  },
  appliedDiscountAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  removeDiscountButton: {
    padding: 4,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  discountInputIcon: {
    marginRight: 8,
  },
  discountInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  discountLabel: {
    color: '#28a745',
  },
  discountValue: {
    color: '#28a745',
    fontWeight: '600',
  },
});