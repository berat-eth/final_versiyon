import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
  Image,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from '../components/ui/ModernCard';
import { ModernButton } from '../components/ui/ModernButton';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ReturnController, ReturnRequest, ReturnableOrder } from '../controllers/ReturnController';
import { UserController } from '../controllers/UserController';

interface ReturnRequestsScreenProps {
  navigation: any;
}

export const ReturnRequestsScreen: React.FC<ReturnRequestsScreenProps> = ({ navigation }) => {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [returnableOrders, setReturnableOrders] = useState<ReturnableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showOrderSelectionModal, setShowOrderSelectionModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');

  const returnReasons = ReturnController.getReturnReasons();

  useEffect(() => {
    loadReturnRequests();
    const unsubscribe = navigation.addListener('focus', () => {
      loadReturnRequests();
    });
    return unsubscribe;
  }, [navigation]);

  const loadReturnRequests = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await UserController.getCurrentUserId();
      const requests = await ReturnController.getUserReturnRequests(userId);
      console.log('🔄 Return requests loaded:', { count: requests.length, requests });
      setReturnRequests(requests);
    } catch (error) {
      console.error('Error loading return requests:', error);
      Alert.alert('Hata', 'İade talepleri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadReturnableOrders = useCallback(async () => {
    try {
      const userId = await UserController.getCurrentUserId();
      const orders = await ReturnController.getReturnableOrders(userId);
      console.log('📦 Returnable orders loaded:', { count: orders.length, orders });
      setReturnableOrders(orders);
    } catch (error) {
      console.error('Error loading returnable orders:', error);
      Alert.alert('Hata', 'İade edilebilir siparişler yüklenirken bir hata oluştu.');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadReturnRequests();
  }, [loadReturnRequests]);

  const getStatusColor = (status: string) => ReturnController.getStatusColor(status);
  const getStatusText = (status: string) => ReturnController.getStatusText(status);

  const handleNewRequest = useCallback(async () => {
    if (!selectedReason || !selectedOrderItem) {
      Alert.alert('Uyarı', 'Lütfen iade nedenini seçin ve ürün seçin');
      return;
    }

    try {
      const result = await ReturnController.createReturnRequest(
        selectedOrderItem.orderId,
        selectedOrderItem.orderItemId,
        selectedReason,
        description
      );

      if (result.success) {
        Alert.alert('Başarılı', result.message, [
          { text: 'Tamam', onPress: () => {
            setShowNewRequestModal(false);
            loadReturnRequests(); // Refresh the list
          }}
        ]);
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error creating return request:', error);
      Alert.alert('Hata', 'İade talebi oluşturulurken bir hata oluştu');
    }
    
    setSelectedReason('');
    setDescription('');
    setSelectedOrderItem(null);
  }, [selectedReason, selectedOrderItem, description, loadReturnRequests]);

  const handleCancelRequest = useCallback(async (returnRequestId: number) => {
    Alert.alert(
      'İade Talebini İptal Et',
      'Bu iade talebini iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        { 
          text: 'Evet, İptal Et', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ReturnController.cancelReturnRequest(returnRequestId);
              if (result.success) {
                Alert.alert('Başarılı', result.message);
                loadReturnRequests(); // Refresh the list
              } else {
                Alert.alert('Hata', result.message);
              }
            } catch (error) {
              console.error('Error cancelling return request:', error);
              Alert.alert('Hata', 'İade talebi iptal edilirken bir hata oluştu');
            }
          }
        }
      ]
    );
  }, [loadReturnRequests]);

  const handleStartNewRequest = useCallback(() => {
    loadReturnableOrders();
    setShowOrderSelectionModal(true);
  }, [loadReturnableOrders]);

  const renderReturnRequest = ({ item }: { item: ReturnRequest }) => (
    <ModernCard style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <Text style={styles.requestId}>Talep #{item.id}</Text>
          <Text style={styles.orderId}>Sipariş #{item.orderId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.productInfo}>
        <Image source={{ uri: item.productImage }} style={styles.productImage} />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.reason}>Neden: {item.reason}</Text>
          <Text style={styles.amount}>₺{(Number(item.refundAmount) || 0).toFixed(2)}</Text>
          <Text style={styles.requestDate}>{ReturnController.formatRequestDate(item.requestDate)}</Text>
        </View>
      </View>

      {item.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionLabel}>Açıklama:</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      )}

      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={styles.detailButton}
          onPress={() => Alert.alert('Detay', 'İade detayları burada gösterilecek')}
        >
          <Text style={styles.detailButtonText}>Detayları Gör</Text>
        </TouchableOpacity>
        
        {ReturnController.canCancelRequest(item.status) && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => handleCancelRequest(item.id)}
          >
            <Text style={styles.cancelButtonText}>İptal Et</Text>
          </TouchableOpacity>
        )}
      </View>
    </ModernCard>
  );

  const renderNewRequestModal = () => (
    <Modal
      visible={showNewRequestModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowNewRequestModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Yeni İade Talebi</Text>
          <TouchableOpacity
            onPress={() => setShowNewRequestModal(false)}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedOrderItem && (
            <View style={styles.selectedProductContainer}>
              <Text style={styles.sectionTitle}>Seçilen Ürün</Text>
              <View style={styles.selectedProductInfo}>
                <Image 
                  source={{ uri: selectedOrderItem.productImage || 'https://via.placeholder.com/50' }} 
                  style={styles.selectedProductImage} 
                />
                <View style={styles.selectedProductDetails}>
                  <Text style={styles.selectedProductName}>{selectedOrderItem.productName}</Text>
                  <Text style={styles.selectedProductPrice}>
                    {selectedOrderItem.quantity} adet × ₺{(Number(selectedOrderItem.price) || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          <Text style={styles.sectionTitle}>İade Nedeni</Text>
          {returnReasons.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonOption,
                selectedReason === reason && styles.reasonOptionSelected
              ]}
              onPress={() => setSelectedReason(reason)}
            >
              <Text style={[
                styles.reasonText,
                selectedReason === reason && styles.reasonTextSelected
              ]}>
                {reason}
              </Text>
              {selectedReason === reason && (
                <Icon name="check" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
            Açıklama (İsteğe Bağlı)
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="İade nedeninizi detaylı olarak açıklayın..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <ModernButton
            title="İade Talebi Oluştur"
            onPress={handleNewRequest}
            style={{ marginTop: Spacing.xl }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İade Taleplerim</Text>
        <TouchableOpacity
          onPress={handleStartNewRequest}
          style={styles.addButton}
        >
          <Icon name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {returnRequests.length > 0 ? (
        <FlatList
          data={returnRequests}
          renderItem={renderReturnRequest}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
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
      ) : (
        <View style={styles.emptyState}>
          <Icon name="assignment-return" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyStateTitle}>İade Talebiniz Yok</Text>
          <Text style={styles.emptyStateDescription}>
            Henüz hiç iade talebiniz bulunmuyor. Bir ürünü iade etmek istiyorsanız yeni talep oluşturabilirsiniz.
          </Text>
          <ModernButton
            title="Yeni İade Talebi"
            onPress={handleStartNewRequest}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      )}

      {renderNewRequestModal()}
      {renderOrderSelectionModal()}
    </SafeAreaView>
  );

  function renderOrderSelectionModal() {
    return (
      <Modal
        visible={showOrderSelectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderSelectionModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ürün Seçin</Text>
            <TouchableOpacity
              onPress={() => setShowOrderSelectionModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>İade Edilebilir Ürünler</Text>
            <Text style={styles.infoText}>
              Sadece teslim edilmiş siparişlerdeki ürünleri iade edebilirsiniz.
            </Text>

            {returnableOrders.length === 0 ? (
              <View style={styles.emptyOrdersContainer}>
                <Icon name="info-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyOrdersText}>
                  İade edilebilir ürün bulunamadı
                </Text>
                <Text style={styles.emptyOrdersSubtext}>
                  Sadece teslim edilmiş siparişlerdeki ürünler iade edilebilir.
                </Text>
              </View>
            ) : (
              returnableOrders.map((order) => (
                <View key={order.orderId} style={styles.orderContainer}>
                  <Text style={styles.orderTitle}>
                    Sipariş #{order.orderId} - {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                  </Text>
                  {order.items.map((item) => (
                    <TouchableOpacity
                      key={item.orderItemId}
                      style={[
                        styles.orderItemContainer,
                        !item.canReturn && styles.orderItemDisabled
                      ]}
                      onPress={() => {
                        if (item.canReturn) {
                          setSelectedOrderItem({
                            orderId: order.orderId,
                            orderItemId: item.orderItemId,
                            productName: item.productName,
                            productImage: item.productImage,
                            price: item.price,
                            quantity: item.quantity
                          });
                          setShowOrderSelectionModal(false);
                          setShowNewRequestModal(true);
                        }
                      }}
                      disabled={!item.canReturn}
                    >
                      <Image 
                        source={{ uri: item.productImage || 'https://via.placeholder.com/50' }} 
                        style={styles.orderItemImage} 
                      />
                      <View style={styles.orderItemDetails}>
                        <Text style={[
                          styles.orderItemName,
                          !item.canReturn && styles.orderItemNameDisabled
                        ]}>
                          {item.productName}
                        </Text>
                        <Text style={styles.orderItemPrice}>
                          {item.quantity} adet × ₺{(Number(item.price) || 0).toFixed(2)}
                        </Text>
                        {item.returnStatus && (
                          <Text style={styles.returnStatusText}>
                            İade durumu: {getStatusText(item.returnStatus)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.orderItemAction}>
                        {item.canReturn ? (
                          <Icon name="chevron-right" size={20} color={Colors.primary} />
                        ) : (
                          <Text style={styles.cannotReturnText}>İade edilemez</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  addButton: {
    padding: Spacing.sm,
  },
  listContainer: {
    padding: Spacing.lg,
  },
  requestCard: {
    marginBottom: Spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestId: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  orderId: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  productInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  productDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  descriptionContainer: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 16,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  detailButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textOnPrimary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  reasonOptionSelected: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.text,
  },
  reasonTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 100,
  },
  // Order selection modal styles
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyOrdersContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyOrdersText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyOrdersSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  orderContainer: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  orderItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  orderItemDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.surface,
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  orderItemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  orderItemNameDisabled: {
    color: Colors.textMuted,
  },
  orderItemPrice: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  returnStatusText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
  },
  orderItemAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  cannotReturnText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // Selected product styles
  selectedProductContainer: {
    marginBottom: Spacing.lg,
  },
  selectedProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  selectedProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  selectedProductDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    color: Colors.textLight,
  },
});
