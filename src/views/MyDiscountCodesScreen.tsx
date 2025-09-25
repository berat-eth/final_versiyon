import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../contexts/AppContext';
import { DiscountWheelController, DiscountCode } from '../controllers/DiscountWheelController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { EmptyState } from '../components/EmptyState';

export default function MyDiscountCodesScreen() {
  const { user } = useAppContext();
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDiscountCodes();
  }, []);

  const loadDiscountCodes = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const codes = await DiscountWheelController.getUserDiscountCodes(user.id);
      setDiscountCodes(codes);
    } catch (error) {
      console.error('Error loading discount codes:', error);
      Alert.alert('Hata', 'İndirim kodları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiscountCodes();
    setRefreshing(false);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      Alert.alert('Başarılı', 'İndirim kodu panoya kopyalandı');
    } catch (error) {
      console.error('Error copying code:', error);
      Alert.alert('Hata', 'Kod kopyalanırken hata oluştu');
    }
  };

  const handleShareCode = async (code: DiscountCode) => {
    try {
      const message = `🎉 İndirim kodum: ${code.discountCode}\n` +
        `💰 ${DiscountWheelController.getDiscountDisplay(code.discountValue, code.discountType)}\n` +
        `⏰ ${DiscountWheelController.getTimeRemaining(code.expiresAt)} sonra süresi dolacak\n` +
        `📱 Huglu uygulamasından kullanabilirsiniz!`;
      
      await Share.share({
        message,
        title: 'İndirim Kodu Paylaş'
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const renderDiscountCodeCard = (code: DiscountCode) => {
    const isExpired = DiscountWheelController.isDiscountCodeExpired(code.expiresAt);
    const isUsed = code.isUsed;
    
    return (
      <View key={code.id} style={[
        styles.discountCard,
        isUsed && styles.usedCard,
        isExpired && !isUsed && styles.expiredCard
      ]}>
        <View style={styles.cardHeader}>
          <View style={styles.codeInfo}>
            <Text style={styles.discountCode}>
              {DiscountWheelController.formatDiscountCode(code.discountCode)}
            </Text>
            <Text style={styles.discountValue}>
              {DiscountWheelController.getDiscountDisplay(code.discountValue, code.discountType)}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(code, isExpired) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(code, isExpired)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Süre:</Text>
            <Text style={[styles.detailValue, isExpired && styles.expiredText]}>
              {DiscountWheelController.getTimeRemaining(code.expiresAt)}
            </Text>
          </View>

          {code.minOrderAmount > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Min. Tutar:</Text>
              <Text style={styles.detailValue}>{code.minOrderAmount} TL</Text>
            </View>
          )}

          {code.isUsed && code.usedAt && (
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#28a745" />
              <Text style={styles.detailLabel}>Kullanım:</Text>
              <Text style={styles.detailValue}>
                {new Date(code.usedAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Oluşturulma:</Text>
            <Text style={styles.detailValue}>
              {new Date(code.createdAt).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        </View>

        {!isUsed && !isExpired && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCopyCode(code.discountCode)}
            >
              <Ionicons name="copy-outline" size={16} color="#007bff" />
              <Text style={styles.actionText}>Kopyala</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShareCode(code)}
            >
              <Ionicons name="share-outline" size={16} color="#28a745" />
              <Text style={styles.actionText}>Paylaş</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getStatusColor = (code: DiscountCode, isExpired: boolean): string => {
    if (code.isUsed) return '#dc3545';
    if (isExpired) return '#ffc107';
    return '#28a745';
  };

  const getStatusText = (code: DiscountCode, isExpired: boolean): string => {
    if (code.isUsed) return 'Kullanıldı';
    if (isExpired) return 'Süresi Doldu';
    return 'Aktif';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const activeCodes = discountCodes.filter(code => !code.isUsed && !DiscountWheelController.isDiscountCodeExpired(code.expiresAt));
  const usedCodes = discountCodes.filter(code => code.isUsed);
  const expiredCodes = discountCodes.filter(code => !code.isUsed && DiscountWheelController.isDiscountCodeExpired(code.expiresAt));

  return (
    <SafeAreaView style={styles.container}>
      {/* İç başlık kaldırıldı; üst başlık navigator tarafından geliyor */}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{activeCodes.length}</Text>
            <Text style={styles.summaryLabel}>Aktif Kod</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{usedCodes.length}</Text>
            <Text style={styles.summaryLabel}>Kullanılan</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{expiredCodes.length}</Text>
            <Text style={styles.summaryLabel}>Süresi Dolmuş</Text>
          </View>
        </View>

        {/* Active Codes */}
        {activeCodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Aktif Kodlar</Text>
            {activeCodes.map(renderDiscountCodeCard)}
          </View>
        )}

        {/* Used Codes */}
        {usedCodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Kullanılan Kodlar</Text>
            {usedCodes.map(renderDiscountCodeCard)}
          </View>
        )}

        {/* Expired Codes */}
        {expiredCodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Süresi Dolmuş Kodlar</Text>
            {expiredCodes.map(renderDiscountCodeCard)}
          </View>
        )}

        {/* Empty State */}
        {discountCodes.length === 0 && (
          <EmptyState
            title="Henüz İndirim Kodunuz Yok"
            message="İndirim çarkından kod kazanarak başlayın!"
            icon="pricetag-outline"
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  discountCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usedCard: {
    opacity: 0.7,
  },
  expiredCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  codeInfo: {
    flex: 1,
  },
  discountCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    letterSpacing: 1,
  },
  discountValue: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  cardContent: {
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 10,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  expiredText: {
    color: '#ffc107',
  },
  cardActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  bottomSpacer: {
    height: 20,
  },
});
