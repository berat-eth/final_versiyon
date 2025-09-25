import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppContext } from '../contexts/AppContext';
import apiService from '../utils/api-service';

interface DealershipApplication {
  id: number;
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  message?: string;
  estimatedMonthlyRevenue?: number;
  status: 'new' | 'review' | 'approved' | 'rejected' | 'contacted';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

const DealershipApplicationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { state } = useAppContext();
  const currentUser = state.user;
  const [applications, setApplications] = useState<DealershipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.getDealershipApplications(currentUser.email);
      
      if (response.success && response.data) {
        setApplications(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Başvurular yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert('Hata', 'Başvurular yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  // Filtrelenmiş başvurular
  const filteredApplications = useMemo(() => {
    let filtered = [...applications];

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.companyName.toLowerCase().includes(query) ||
        app.fullName.toLowerCase().includes(query) ||
        app.city.toLowerCase().includes(query) ||
        app.phone.includes(query)
      );
    }

    // Durum filtresi
    if (statusFilter) {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    return filtered;
  }, [applications, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#3b82f6'; // Mavi
      case 'review':
        return '#f59e0b'; // Turuncu
      case 'approved':
        return '#10b981'; // Yeşil
      case 'rejected':
        return '#ef4444'; // Kırmızı
      case 'contacted':
        return '#8b5cf6'; // Mor
      default:
        return '#6b7280'; // Gri
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Yeni Başvuru';
      case 'review':
        return 'İnceleniyor';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'contacted':
        return 'İletişime Geçildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const renderApplicationCard = (application: DealershipApplication) => (
    <TouchableOpacity
      key={application.id}
      style={styles.applicationCard}
      onPress={() => navigation.navigate('DealershipApplicationDetail', { application })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{application.companyName}</Text>
          <Text style={styles.fullName}>{application.fullName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
          <Text style={styles.statusText}>{getStatusText(application.status)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Icon name="location-on" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{application.city}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="phone" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{application.phone}</Text>
        </View>

        {application.estimatedMonthlyRevenue && (
          <View style={styles.infoRow}>
            <Icon name="trending-up" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              Tahmini Aylık Ciro: {formatCurrency(application.estimatedMonthlyRevenue)}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Icon name="schedule" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            Başvuru Tarihi: {formatDate(application.createdAt)}
          </Text>
        </View>

        {application.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Not:</Text>
            <Text style={styles.noteText}>{application.note}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Icon name="chevron-right" size={24} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3c72" />
          <Text style={styles.loadingText}>Başvurular yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Arama ve Filtre Çubuğu */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Firma, kişi, şehir veya telefon ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, statusFilter ? styles.filterButtonActive : null]}
          onPress={() => setShowFilters(true)}
        >
          <Icon name="tune" size={20} color={statusFilter ? "#fff" : "#6b7280"} />
          {statusFilter && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {applications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="business" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Henüz başvurunuz yok</Text>
            <Text style={styles.emptySubtitle}>
              Bayilik başvurusu yaparak Huğlu Outdoor ailesine katılabilirsiniz
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('DealershipApplication')}
            >
              <Text style={styles.emptyButtonText}>Yeni Başvuru Yap</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>
                {filteredApplications.length === applications.length 
                  ? `Toplam ${applications.length} başvuru`
                  : `${filteredApplications.length} / ${applications.length} başvuru`
                }
              </Text>
              <View style={styles.statusSummary}>
                {['new', 'review', 'approved', 'rejected', 'contacted'].map(status => {
                  const count = applications.filter(app => app.status === status).length;
                  if (count === 0) return null;
                  
                  return (
                    <View key={status} style={styles.statusItem}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                      <Text style={styles.statusCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {filteredApplications.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Icon name="search-off" size={48} color="#d1d5db" />
                <Text style={styles.noResultsTitle}>Sonuç bulunamadı</Text>
                <Text style={styles.noResultsSubtitle}>
                  Arama kriterlerinizi değiştirerek tekrar deneyin
                </Text>
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setStatusFilter(null);
                  }}
                >
                  <Text style={styles.clearFiltersButtonText}>Filtreleri Temizle</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.applicationsList}>
                {filteredApplications.map(renderApplicationCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Filtreleme Modalı */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Başvuru Durumu</Text>
              <View style={styles.statusFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusFilterItem,
                    !statusFilter && styles.statusFilterItemActive
                  ]}
                  onPress={() => setStatusFilter(null)}
                >
                  <Text style={[
                    styles.statusFilterText,
                    !statusFilter && styles.statusFilterTextActive
                  ]}>
                    Tümü
                  </Text>
                </TouchableOpacity>
                
                {['new', 'review', 'approved', 'rejected', 'contacted'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusFilterItem,
                      statusFilter === status && styles.statusFilterItemActive
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <View style={[
                      styles.statusFilterDot,
                      { backgroundColor: getStatusColor(status) }
                    ]} />
                    <Text style={[
                      styles.statusFilterText,
                      statusFilter === status && styles.statusFilterTextActive
                    ]}>
                      {getStatusText(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setStatusFilter(null);
                  setShowFilters(false);
                }}
              >
                <Text style={styles.modalButtonText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Uygula
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#1e3c72',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#1e3c72',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  applicationsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  noteContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  cardFooter: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#1e3c72',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // iPhone home indicator için
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusFilterItemActive: {
    backgroundColor: '#1e3c72',
    borderColor: '#1e3c72',
  },
  statusFilterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusFilterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonPrimary: {
    backgroundColor: '#1e3c72',
    borderColor: '#1e3c72',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonTextPrimary: {
    color: 'white',
  },
});

export default DealershipApplicationsScreen;
