import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from '../components/ui/ModernCard';
import { ModernButton } from '../components/ui/ModernButton';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { AddressService, Address, CreateAddressData } from '../services/AddressService';
import { UserController } from '../controllers/UserController';

interface AddressesScreenProps {
  navigation: any;
  route?: {
    params?: {
      selectMode?: boolean;
      addressType?: 'shipping' | 'billing';
      onAddressSelected?: (address: Address) => void;
    };
  };
}

export const AddressesScreen: React.FC<AddressesScreenProps> = ({ navigation, route }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [activeTab, setActiveTab] = useState<'shipping' | 'billing'>('shipping');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<CreateAddressData>({
    addressType: 'shipping',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    isDefault: false,
  });

  // Get params from navigation
  const selectMode = route?.params?.selectMode || false;
  const onAddressSelected = route?.params?.onAddressSelected;
  const initialAddressType = route?.params?.addressType || 'shipping';

  useEffect(() => {
    loadUserAddresses();
    setActiveTab(initialAddressType);
  }, []);

  const loadUserAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await UserController.getCurrentUserId();
      
      if (userId && userId > 0) {
        setCurrentUserId(userId);
        const userAddresses = await AddressService.getUserAddresses(userId);
        setAddresses(userAddresses);
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error('❌ Error loading addresses:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserAddresses();
  }, [loadUserAddresses]);

  const filteredAddresses = addresses.filter(addr => addr.addressType === activeTab);

  const openAddModal = useCallback(() => {
    setFormData({
      addressType: activeTab,
      fullName: '',
      phone: '',
      address: '',
      city: '',
      district: '',
      postalCode: '',
      isDefault: filteredAddresses.length === 0, // İlk adres otomatik default
    });
    setEditingAddress(null);
    setIsModalVisible(true);
  }, [activeTab, filteredAddresses.length]);

  const openEditModal = useCallback((address: Address) => {
    setFormData({
      addressType: address.addressType,
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      district: address.district || '',
      postalCode: address.postalCode || '',
      isDefault: address.isDefault,
    });
    setEditingAddress(address);
    setIsModalVisible(true);
  }, []);

  const handleSaveAddress = useCallback(async () => {
    if (!currentUserId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
      Alert.alert('Uyarı', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      if (editingAddress) {
        await AddressService.updateAddress({
          id: editingAddress.id,
          ...formData
        });
        Alert.alert('Başarılı', 'Adres güncellendi');
      } else {
        await AddressService.createAddress(currentUserId, formData);
        Alert.alert('Başarılı', 'Adres eklendi');
      }
      
      setIsModalVisible(false);
      loadUserAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Hata', 'Adres kaydedilirken bir hata oluştu');
    }
  }, [currentUserId, formData, editingAddress, loadUserAddresses]);

  const handleDeleteAddress = useCallback(async (address: Address) => {
    Alert.alert(
      'Adresi Sil',
      'Bu adresi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await AddressService.deleteAddress(address.id);
              Alert.alert('Başarılı', 'Adres silindi');
              loadUserAddresses();
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Hata', 'Adres silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  }, [loadUserAddresses]);

  const handleSetDefault = useCallback(async (address: Address) => {
    try {
      await AddressService.setDefaultAddress(address.id);
      Alert.alert('Başarılı', 'Varsayılan adres güncellendi');
      loadUserAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Hata', 'Varsayılan adres güncellenirken bir hata oluştu');
    }
  }, [loadUserAddresses]);

  const handleAddressSelect = useCallback((address: Address) => {
    if (selectMode && onAddressSelected) {
      onAddressSelected(address);
      navigation.goBack();
    }
  }, [selectMode, onAddressSelected, navigation]);

  const renderAddressItem = ({ item }: { item: Address }) => (
    <ModernCard style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressInfo}>
          <View style={styles.addressTypeContainer}>
            <Icon 
              name={AddressService.getAddressTypeIcon(item.addressType)} 
              size={20} 
              color={AddressService.getAddressTypeColor(item.addressType)} 
            />
            <Text style={[styles.addressTypeText, { color: AddressService.getAddressTypeColor(item.addressType) }]}>
              {AddressService.getAddressTypeText(item.addressType)}
            </Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Varsayılan</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressName}>{item.fullName}</Text>
          <Text style={styles.addressPhone}>{item.phone}</Text>
        </View>
        
        <View style={styles.addressActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Icon name="edit" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteAddress(item)}
          >
            <Icon name="delete" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addressContent}>
        <Text style={styles.addressText}>{item.address}</Text>
        <Text style={styles.addressLocation}>
          {item.district && `${item.district}, `}{item.city}
          {item.postalCode && ` ${item.postalCode}`}
        </Text>
      </View>

      <View style={styles.addressFooter}>
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.defaultButton}
            onPress={() => handleSetDefault(item)}
          >
            <Icon name="star" size={16} color={Colors.primary} />
            <Text style={styles.defaultButtonText}>Varsayılan Yap</Text>
          </TouchableOpacity>
        )}
        
        {selectMode && (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => handleAddressSelect(item)}
          >
            <Text style={styles.selectButtonText}>Seç</Text>
          </TouchableOpacity>
        )}
      </View>
    </ModernCard>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adreslerim</Text>
        <TouchableOpacity
          onPress={openAddModal}
          style={styles.addButton}
        >
          <Icon name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shipping' && styles.activeTab]}
          onPress={() => setActiveTab('shipping')}
        >
          <Icon name="local-shipping" size={20} color={activeTab === 'shipping' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'shipping' && styles.activeTabText]}>
            Teslimat ({addresses.filter(addr => addr.addressType === 'shipping').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'billing' && styles.activeTab]}
          onPress={() => setActiveTab('billing')}
        >
          <Icon name="receipt" size={20} color={activeTab === 'billing' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'billing' && styles.activeTabText]}>
            Fatura ({addresses.filter(addr => addr.addressType === 'billing').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Address List */}
      {filteredAddresses.length > 0 ? (
        <FlatList
          data={filteredAddresses}
          renderItem={renderAddressItem}
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
          <Icon 
            name={AddressService.getAddressTypeIcon(activeTab)} 
            size={64} 
            color={Colors.textMuted} 
          />
          <Text style={styles.emptyStateTitle}>
            {activeTab === 'shipping' ? 'Teslimat Adresiniz Yok' : 'Fatura Adresiniz Yok'}
          </Text>
          <Text style={styles.emptyStateDescription}>
            {activeTab === 'shipping' 
              ? 'İlk teslimat adresinizi ekleyerek hızlı teslimat avantajından yararlanın'
              : 'Fatura adresinizi ekleyerek siparişlerinizi kolayca tamamlayın'
            }
          </Text>
          <ModernButton
            title={`${activeTab === 'shipping' ? 'Teslimat' : 'Fatura'} Adresi Ekle`}
            onPress={openAddModal}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      )}

      {/* Add/Edit Address Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
            </Text>
            <TouchableOpacity
              onPress={handleSaveAddress}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adres Türü</Text>
              <View style={styles.addressTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.addressTypeOption,
                    formData.addressType === 'shipping' && styles.addressTypeOptionActive
                  ]}
                  onPress={() => setFormData({ ...formData, addressType: 'shipping' })}
                >
                  <Icon name="local-shipping" size={20} color={formData.addressType === 'shipping' ? 'white' : Colors.primary} />
                  <Text style={[
                    styles.addressTypeOptionText,
                    formData.addressType === 'shipping' && styles.addressTypeOptionTextActive
                  ]}>
                    Teslimat
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.addressTypeOption,
                    formData.addressType === 'billing' && styles.addressTypeOptionActive
                  ]}
                  onPress={() => setFormData({ ...formData, addressType: 'billing' })}
                >
                  <Icon name="receipt" size={20} color={formData.addressType === 'billing' ? 'white' : '#10b981'} />
                  <Text style={[
                    styles.addressTypeOptionText,
                    formData.addressType === 'billing' && styles.addressTypeOptionTextActive
                  ]}>
                    Fatura
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ad Soyad *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="Adınızı ve soyadınızı girin"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Telefon *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Telefon numaranızı girin"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adres *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Mahalle, sokak, bina no, daire no"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.formLabel}>İl *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="İl"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.formLabel}>İlçe</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.district}
                  onChangeText={(text) => setFormData({ ...formData, district: text })}
                  placeholder="İlçe"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Posta Kodu</Text>
              <TextInput
                style={styles.formInput}
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
                placeholder="Posta kodu"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              >
                <View style={[styles.checkbox, formData.isDefault && styles.checkboxActive]}>
                  {formData.isDefault && <Icon name="check" size={16} color="white" />}
                </View>
                <Text style={styles.checkboxText}>Varsayılan adres olarak ayarla</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
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
    backgroundColor: 'white',
    ...Shadows.small,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    padding: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: 12,
    padding: 4,
    ...Shadows.small,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  activeTabText: {
    color: 'white',
  },
  listContainer: {
    padding: Spacing.lg,
  },
  addressCard: {
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  addressInfo: {
    flex: 1,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  addressTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  addressActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  addressContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  addressLocation: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  addressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  defaultButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
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
    backgroundColor: 'white',
    ...Shadows.small,
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modalSaveButton: {
    padding: Spacing.sm,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  addressTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addressTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'white',
    gap: 8,
  },
  addressTypeOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  addressTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  addressTypeOptionTextActive: {
    color: 'white',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.text,
  },
});