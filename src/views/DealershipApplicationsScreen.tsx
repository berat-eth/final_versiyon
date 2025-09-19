import React, { useState, useEffect } from 'react';
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
  const { currentUser } = useAppContext();
  const [applications, setApplications] = useState<DealershipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
                Toplam {applications.length} başvuru
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

            <View style={styles.applicationsList}>
              {applications.map(renderApplicationCard)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
});

export default DealershipApplicationsScreen;
