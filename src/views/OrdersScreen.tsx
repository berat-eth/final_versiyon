import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderController } from '../controllers/OrderController';
import { UserController } from '../controllers/UserController';
import { Order } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';

interface OrdersScreenProps {
  navigation: any;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
    const unsubscribe = navigation.addListener('focus', () => {
      loadOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      const userOrders = await OrderController.getUserOrders(userId);
      // Orders loaded
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

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
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // İç başlık kaldırıldı; üst başlık navigator tarafından yönetiliyor

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Sipariş #{item.id}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Icon name={getStatusIcon(item.status)} size={16} color="#FFFFFF" />
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderRow}>
          <Icon name="shopping-bag" size={18} color="#666666" />
          <Text style={styles.orderDetailText}>
            {item.items?.length || 0} ürün
          </Text>
        </View>
        <View style={styles.orderRow}>
          <Icon name="location-on" size={18} color="#666666" />
          <Text style={styles.orderDetailText} numberOfLines={1}>
            {item.shippingAddress}
          </Text>
        </View>
        <View style={styles.orderRow}>
          <Icon name="payment" size={18} color="#666666" />
          <Text style={styles.orderDetailText}>
            {item.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'EFT/Havale'}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{(Number(item.totalAmount) || 0).toFixed(0)} TL</Text>
        <Icon name="chevron-right" size={20} color="#CCCCCC" />
      </View>
    </TouchableOpacity>
  ), [navigation, formatDate, getStatusColor, getStatusText, getStatusIcon]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="receipt-long" size={80} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Henüz Siparişiniz Yok</Text>
        <Text style={styles.emptyMessage}>
          İlk siparişinizi vererek{'\n'}
          alışveriş deneyiminizi başlatın!
        </Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Products')}
        >
          <Text style={styles.shopButtonText}>Alışverişe Başla</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [navigation]);

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
      
      {orders.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
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
      )}
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
    padding: Spacing.md,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },

  // Order Details
  orderDetails: {
    marginBottom: Spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: Spacing.sm,
    flex: 1,
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
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
});

export default OrdersScreen;