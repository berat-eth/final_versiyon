import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { OrderController } from '../controllers/OrderController';
import { UserController } from '../controllers/UserController';
import { Order } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { StatusBar } from 'expo-status-bar';

interface OrderDetailScreenProps {
  navigation: any;
  route: {
    params: {
      orderId: number;
    };
  };
}

const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      const orders = await OrderController.getUserOrders(userId);
      const orderDetail = orders.find(o => o.id === orderId);
      
      if (orderDetail) {
        setOrder(orderDetail);
      } else {
        Alert.alert('Hata', 'Sipariş bulunamadı.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      Alert.alert('Hata', 'Sipariş detayı yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigation]);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'shipped':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Beklemede';
      case 'processing':
        return 'İşleniyor';
      case 'shipped':
        return 'Kargoda';
      case 'delivered':
        return 'Teslim Edildi';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'schedule';
      case 'processing':
        return 'autorenew';
      case 'shipped':
        return 'local-shipping';
      case 'delivered':
        return 'done-all';
      case 'cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

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
        <Text style={styles.headerTitle}>Sipariş Detayı</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="share" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  ), [navigation]);

  const renderStatusTracker = useCallback(() => {
    if (!order) return null;

    const statuses = [
      { key: 'pending', label: 'Sipariş Alındı', icon: 'receipt' },
      { key: 'confirmed', label: 'Onaylandı', icon: 'check-circle' },
      { key: 'shipped', label: 'Kargoya Verildi', icon: 'local-shipping' },
      { key: 'delivered', label: 'Teslim Edildi', icon: 'done-all' },
    ];

    const currentStatusIndex = statuses.findIndex(s => s.key === order.status.toLowerCase());

    return (
      <View style={styles.statusTracker}>
        <Text style={styles.sectionTitle}>Sipariş Durumu</Text>
        <View style={styles.statusContainer}>
          {statuses.map((status, index) => {
            const isActive = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            
            return (
              <View key={status.key} style={styles.statusStep}>
                <View style={styles.statusLine}>
                  {index > 0 && (
                    <View style={[
                      styles.statusLineFill,
                      isActive && styles.statusLineFillActive
                    ]} />
                  )}
                </View>
                <View style={[
                  styles.statusCircle,
                  isActive && styles.statusCircleActive,
                  isCurrent && styles.statusCircleCurrent
                ]}>
                  <Icon 
                    name={status.icon} 
                    size={16} 
                    color={isActive ? '#FFFFFF' : '#CCCCCC'} 
                  />
                </View>
                <Text style={[
                  styles.statusLabel,
                  isActive && styles.statusLabelActive
                ]}>
                  {status.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }, [order]);

  const renderOrderInfo = useCallback(() => {
    if (!order) return null;

    return (
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Sipariş Bilgileri</Text>
        
        <View style={styles.infoRow}>
          <Icon name="receipt" size={20} color="#666666" />
          <Text style={styles.infoLabel}>Sipariş Numarası</Text>
          <Text style={styles.infoValue}>#{order.id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="schedule" size={20} color="#666666" />
          <Text style={styles.infoLabel}>Sipariş Tarihi</Text>
          <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="payment" size={20} color="#666666" />
          <Text style={styles.infoLabel}>Ödeme Yöntemi</Text>
          <Text style={styles.infoValue}>
            {order.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'EFT/Havale'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="local-shipping" size={20} color="#666666" />
          <Text style={styles.infoLabel}>Teslimat Adresi</Text>
          <Text style={[styles.infoValue, styles.addressText]} numberOfLines={2}>
            {order.shippingAddress}
          </Text>
        </View>
      </View>
    );
  }, [order, formatDate]);

  const renderOrderItems = useCallback(() => {
    if (!order || !order.items || order.items.length === 0) return null;

    return (
      <View style={styles.itemsCard}>
        <Text style={styles.sectionTitle}>Sipariş İçeriği</Text>
        
        {order.items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName || `Ürün #${item.productId}`}
              </Text>
              <Text style={styles.itemQuantity}>
                {item.quantity} adet × {(Number(item.price) || 0).toFixed(0)} TL
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              {(item.quantity * (Number(item.price) || 0)).toFixed(0)} TL
            </Text>
          </View>
        ))}
      </View>
    );
  }, [order]);

  const renderPriceSummary = useCallback(() => {
    if (!order) return null;

    const subtotal = order.items?.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.price?.toString()) || 0)), 0) || 0;
    const shipping = order.totalAmount - subtotal;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Fiyat Özeti</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ara Toplam</Text>
          <Text style={styles.summaryValue}>{(Number(subtotal) || 0).toFixed(0)} TL</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Kargo</Text>
          <Text style={styles.summaryValue}>
            {Number(shipping) <= 0 ? 'Ücretsiz' : `${(Number(shipping) || 0).toFixed(0)} TL`}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Toplam</Text>
          <Text style={styles.summaryTotalValue}>{(Number(order.totalAmount) || 0).toFixed(0)} TL</Text>
        </View>
      </View>
    );
  }, [order]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.errorText}>Sipariş bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#1A1A2E" />
      {renderHeader()}
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStatusTracker()}
        {renderOrderInfo()}
        {renderOrderItems()}
        {renderPriceSummary()}
      </ScrollView>
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

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: Spacing.md,
  },

  // Status Tracker
  statusTracker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  statusLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: 0,
  },
  statusLineFill: {
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  statusLineFillActive: {
    backgroundColor: Colors.primary,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    zIndex: 1,
  },
  statusCircleActive: {
    backgroundColor: Colors.primary,
  },
  statusCircleCurrent: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.2 }],
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusLabelActive: {
    color: '#333333',
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginLeft: Spacing.sm,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'right',
    maxWidth: '50%',
  },
  addressText: {
    textAlign: 'right',
    lineHeight: 18,
  },

  // Items Card
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
    minWidth: 80,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
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
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});

export default OrderDetailScreen;