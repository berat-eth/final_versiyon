import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductController } from '../controllers/ProductController';
import { OrderController } from '../controllers/OrderController';
import { UserController } from '../controllers/UserController';
import { Order, OrderStatus } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';

interface ShippingTrackingScreenProps {
  navigation: any;
}

interface Shipment {
  id: number;
  orderId: number;
  trackingNumber: string;
  status: 'preparing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered';
  carrier: string;
  estimatedDelivery: string;
  currentLocation: string;
  items: string[];
  timeline: {
    id: number;
    status: string;
    description: string;
    date: string;
    time: string;
    completed: boolean;
  }[];
}

export const ShippingTrackingScreen: React.FC<ShippingTrackingScreenProps> = ({ navigation }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shippedOrders, setShippedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShippedOrders();
    const unsubscribe = navigation.addListener('focus', () => {
      loadShippedOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const loadShippedOrders = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await UserController.getCurrentUserId();
      const userOrders = await OrderController.getUserOrders(userId);
      
      // Sadece kargoda olan siparişleri filtrele
      const shipped = userOrders.filter(order => order.status === OrderStatus.SHIPPED);
      console.log('🚚 Shipped orders loaded:', { count: shipped.length, orders: shipped });
      setShippedOrders(shipped);
      
      // Mock shipment data'yı gerçek verilerle güncelle
      const mockShipments: Shipment[] = shipped.map(order => ({
        id: order.id,
        orderId: order.id,
        trackingNumber: `TK${order.id.toString().padStart(6, '0')}`,
        status: 'shipped' as const,
        carrier: 'Aras Kargo',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
        currentLocation: 'Ankara Aktarma Merkezi',
        items: order.items?.map(item => item.productName || `Ürün #${item.productId}`) || [],
        timeline: [
          {
            id: 1,
            status: 'Sipariş Alındı',
            description: 'Siparişiniz başarıyla alındı',
            date: new Date(order.createdAt).toLocaleDateString('tr-TR'),
            time: new Date(order.createdAt).toLocaleTimeString('tr-TR'),
            completed: true
          },
          {
            id: 2,
            status: 'Hazırlanıyor',
            description: 'Siparişiniz hazırlanıyor',
            date: new Date(order.createdAt).toLocaleDateString('tr-TR'),
            time: '14:30',
            completed: true
          },
          {
            id: 3,
            status: 'Kargoya Verildi',
            description: 'Siparişiniz kargoya verildi',
            date: new Date().toLocaleDateString('tr-TR'),
            time: new Date().toLocaleTimeString('tr-TR'),
            completed: true
          },
          {
            id: 4,
            status: 'Teslim Edilecek',
            description: 'Siparişiniz teslim edilecek',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
            time: '09:00',
            completed: false
          }
        ]
      }));
      
      setShipments(mockShipments);
    } catch (error) {
      console.error('Error loading shipped orders:', error);
      Alert.alert('Hata', 'Kargo bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadShippedOrders();
  }, [loadShippedOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing':
        return '#FF9800';
      case 'shipped':
        return '#2196F3';
      case 'in_transit':
        return '#9C27B0';
      case 'out_for_delivery':
        return '#FF5722';
      case 'delivered':
        return '#4CAF50';
      default:
        return '#666666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'Hazırlanıyor';
      case 'shipped':
        return 'Kargoya Verildi';
      case 'in_transit':
        return 'Yolda';
      case 'out_for_delivery':
        return 'Dağıtıma Çıktı';
      case 'delivered':
        return 'Teslim Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing':
        return '📦';
      case 'shipped':
        return '🚚';
      case 'in_transit':
        return '✈️';
      case 'out_for_delivery':
        return '🚛';
      case 'delivered':
        return '✅';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.modernContainer}>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.modernContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        {/* Header Stats */}
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{shipments.length}</Text>
            <Text style={styles.statLabel}>Aktif Kargo</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {shipments.filter(s => s.status === 'delivered').length}
            </Text>
            <Text style={styles.statLabel}>Teslim Edilen</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {shipments.filter(s => s.status === 'out_for_delivery').length}
            </Text>
            <Text style={styles.statLabel}>Dağıtımda</Text>
          </View>
        </View>

        {/* Shipments List */}
        <View style={styles.shipmentsContainer}>
          {shipments.map((shipment) => (
            <View key={shipment.id} style={styles.shipmentCard}>
              {/* Shipment Header */}
              <View style={styles.shipmentHeader}>
                <View style={styles.shipmentInfo}>
                  <Text style={styles.orderId}>Sipariş #{shipment.orderId}</Text>
                  <Text style={styles.trackingNumber}>
                    Takip No: {shipment.trackingNumber}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusIcon}>
                    {getStatusIcon(shipment.status)}
                  </Text>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(shipment.status) }
                  ]}>
                    {getStatusText(shipment.status)}
                  </Text>
                </View>
              </View>

              {/* Carrier Info */}
              <View style={styles.carrierInfo}>
                <Text style={styles.carrierName}>{shipment.carrier}</Text>
                <Text style={styles.estimatedDelivery}>
                  Tahmini Teslimat: {new Date(shipment.estimatedDelivery).toLocaleDateString('tr-TR')}
                </Text>
              </View>

              {/* Current Location */}
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Mevcut Konum:</Text>
                <Text style={styles.locationText}>{shipment.currentLocation}</Text>
              </View>

              {/* Items */}
              <View style={styles.itemsContainer}>
                <Text style={styles.itemsLabel}>Ürünler:</Text>
                {shipment.items.map((item, index) => (
                  <Text key={index} style={styles.itemText}>• {item}</Text>
                ))}
              </View>

              {/* Timeline */}
              <View style={styles.timelineContainer}>
                <Text style={styles.timelineTitle}>Kargo Durumu</Text>
                {shipment.timeline.map((step, index) => (
                  <View key={step.id} style={styles.timelineStep}>
                    <View style={styles.timelineDot}>
                      <View style={[
                        styles.dot,
                        { backgroundColor: step.completed ? '#4CAF50' : '#E0E0E0' }
                      ]} />
                      {index < shipment.timeline.length - 1 && (
                        <View style={[
                          styles.timelineLine,
                          { backgroundColor: step.completed ? '#4CAF50' : '#E0E0E0' }
                        ]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[
                        styles.timelineStatus,
                        { color: step.completed ? '#1A1A2E' : '#666666' }
                      ]}>
                        {step.status}
                      </Text>
                      <Text style={styles.timelineDescription}>
                        {step.description}
                      </Text>
                      <Text style={styles.timelineDate}>
                        {new Date(step.date).toLocaleDateString('tr-TR')} - {step.time}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.shipmentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => Alert.alert('Kargo Detayı', 'Detaylı bilgi yakında!')}
                >
                  <Text style={styles.actionButtonText}>Detayları Gör</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => Alert.alert('Kargo Takip', 'Kargo firması web sitesine yönlendiriliyorsunuz...')}
                >
                  <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                    Kargo Firması
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* No Shipments */}
        {shipments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateTitle}>Aktif Kargo Yok</Text>
            <Text style={styles.emptyStateDescription}>
              Şu anda takip edilecek kargonuz bulunmuyor.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  shipmentsContainer: {
    paddingHorizontal: 20,
  },
  shipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shipmentInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  trackingNumber: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  carrierInfo: {
    marginBottom: 16,
  },
  carrierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#666666',
  },
  locationInfo: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  itemsContainer: {
    marginBottom: 20,
  },
  itemsLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#1A1A2E',
    marginBottom: 2,
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    alignItems: 'center',
    marginRight: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  timelineLine: {
    width: 2,
    height: 40,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: '#999999',
  },
  shipmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1A1A2E',
  },
  secondaryButtonText: {
    color: '#1A1A2E',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  
  // Modern Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
