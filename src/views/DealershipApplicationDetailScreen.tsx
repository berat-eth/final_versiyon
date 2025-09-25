import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
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

const DealershipApplicationDetailScreen: React.FC<{ 
  navigation: any; 
  route: { params: { application: DealershipApplication } } 
}> = ({ navigation, route }) => {
  const { currentUser } = useAppContext();
  const [application, setApplication] = useState<DealershipApplication | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route.params?.application) {
      setApplication(route.params.application);
    } else {
      // Eğer application parametresi yoksa, yeniden yükle
      loadApplication();
    }
  }, []);

  const loadApplication = async () => {
    if (!currentUser?.email || !route.params?.application?.id) return;

    try {
      setLoading(true);
      const response = await apiService.getDealershipApplication(
        route.params.application.id,
        currentUser.email
      );
      
      if (response.success && response.data) {
        setApplication(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Başvuru detayları yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading application:', error);
      Alert.alert('Hata', 'Başvuru detayları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#3b82f6';
      case 'review':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'contacted':
        return '#8b5cf6';
      default:
        return '#6b7280';
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

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'new':
        return 'Başvurunuz alınmıştır. İncelenme sürecine geçecektir.';
      case 'review':
        return 'Başvurunuz incelenmektedir. En kısa sürede size dönüş yapılacaktır.';
      case 'approved':
        return 'Tebrikler! Başvurunuz onaylanmıştır. Size yakında iletişime geçilecektir.';
      case 'rejected':
        return 'Maalesef başvurunuz bu sefer onaylanmamıştır. Gelecekte tekrar başvurabilirsiniz.';
      case 'contacted':
        return 'Size iletişime geçilmiştir. Lütfen e-posta ve telefonunuzu kontrol edin.';
      default:
        return '';
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3c72" />
          <Text style={styles.loadingText}>Başvuru detayları yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Başvuru bulunamadı</Text>
          <Text style={styles.errorSubtitle}>
            Bu başvuruya erişim yetkiniz yok veya başvuru silinmiş olabilir.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
              <Text style={styles.statusText}>{getStatusText(application.status)}</Text>
            </View>
            <Text style={styles.applicationId}>#{application.id}</Text>
          </View>
          <Text style={styles.statusDescription}>
            {getStatusDescription(application.status)}
          </Text>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firma Bilgileri</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="business" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Firma Adı</Text>
                <Text style={styles.infoValue}>{application.companyName}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="person" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ad Soyad</Text>
                <Text style={styles.infoValue}>{application.fullName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="location-on" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Şehir</Text>
                <Text style={styles.infoValue}>{application.city}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="email" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-posta</Text>
                <Text style={styles.infoValue}>{application.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="phone" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telefon</Text>
                <Text style={styles.infoValue}>{application.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Financial Information */}
        {application.estimatedMonthlyRevenue && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finansal Bilgiler</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Icon name="trending-up" size={20} color="#6b7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tahmini Aylık Ciro</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(application.estimatedMonthlyRevenue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Message */}
        {application.message && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mesaj</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{application.message}</Text>
            </View>
          </View>
        )}

        {/* Admin Note */}
        {application.note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yönetici Notu</Text>
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>{application.note}</Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Başvuru Geçmişi</Text>
          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#10b981' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Başvuru Oluşturuldu</Text>
                <Text style={styles.timelineDate}>{formatDate(application.createdAt)}</Text>
              </View>
            </View>
            
            {application.updatedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(application.status) }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Durum Güncellendi</Text>
                  <Text style={styles.timelineDate}>{formatDate(application.updatedAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#1e3c72',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  applicationId: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  messageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  noteCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  noteText: {
    fontSize: 16,
    color: '#92400e',
    lineHeight: 24,
  },
  timelineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default DealershipApplicationDetailScreen;
