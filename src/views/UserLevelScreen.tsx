import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserLevelCard } from '../components/UserLevelCard';
import { UserLevelController } from '../controllers/UserLevelController';
import { UserLevelProgress, UserLevel, ExpTransaction } from '../models/UserLevel';
import { useAppContext } from '../contexts/AppContext';
import { UserController } from '../controllers/UserController';

const { width } = Dimensions.get('window');

export const UserLevelScreen: React.FC = () => {
  const { state } = useAppContext();
  const user = state.user;
  const [levelProgress, setLevelProgress] = useState<UserLevelProgress | null>(null);
  const [expHistory, setExpHistory] = useState<ExpTransaction[]>([]);
  const [allLevels, setAllLevels] = useState<UserLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'progress' | 'history' | 'levels'>('progress');
  const [hasUserData, setHasUserData] = useState<boolean | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);

  useEffect(() => {
    // Kullanıcı ID yoksa da veriyi hydrate etmeyi dene
    loadData();
    // user id değiştiğinde yenile
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Kullanıcı ID'yi context'ten ya da UserController'dan al
      let effectiveUserId = user?.id;
      if (!effectiveUserId) {
        try {
          effectiveUserId = await UserController.getCurrentUserId();
        } catch {}
      }

      if (!effectiveUserId || effectiveUserId === 1) {
        console.log('❌ UserLevelScreen: No logged-in user available');
        setHasUserData(false);
        return;
      }

      console.log('🔄 UserLevelScreen: Loading data for user:', effectiveUserId);
      
      const [levelData, historyData, levelsData] = await Promise.all([
        UserLevelController.getUserLevel(String(effectiveUserId)),
        UserLevelController.getExpHistory(String(effectiveUserId), 1, 50),
        Promise.resolve(UserLevelController.getAllLevels()),
      ]);

      console.log('📊 UserLevelScreen: Data loaded:', {
        levelData: levelData ? 'Available' : 'Null',
        historyCount: historyData?.transactions?.length || 0,
        levelsCount: levelsData?.length || 0
      });

      // Veritabanı kontrolü - kullanıcının herhangi bir seviye verisi var mı?
      const hasData = levelData !== null || (historyData.transactions && historyData.transactions.length > 0);
      setHasUserData(hasData);

      setLevelProgress(levelData);
      setExpHistory(historyData.transactions);
      setAllLevels(levelsData);
      
      console.log('✅ UserLevelScreen: Data loading completed');
    } catch (error) {
      console.error('❌ UserLevelScreen: Error loading level data:', error);
      setHasUserData(false);
      Alert.alert('Hata', 'Seviye bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getExpSourceIcon = (source: string) => {
    switch (source) {
      case 'purchase':
        return 'cart';
      case 'invitation':
        return 'person-add';
      case 'social_share':
        return 'share';
      case 'review':
        return 'star';
      case 'login':
        return 'log-in';
      case 'special':
        return 'gift';
      default:
        return 'add-circle';
    }
  };

  const getExpSourceColor = (source: string) => {
    switch (source) {
      case 'purchase':
        return '#4CAF50';
      case 'invitation':
        return '#2196F3';
      case 'social_share':
        return '#FF9800';
      case 'review':
        return '#9C27B0';
      case 'login':
        return '#607D8B';
      case 'special':
        return '#E91E63';
      default:
        return '#757575';
    }
  };

  const getExpSourceText = (source: string) => {
    switch (source) {
      case 'purchase':
        return 'Alışveriş';
      case 'invitation':
        return 'Davet';
      case 'social_share':
        return 'Sosyal Paylaşım';
      case 'review':
        return 'Yorum';
      case 'login':
        return 'Günlük Giriş';
      case 'special':
        return 'Özel Etkinlik';
      default:
        return 'Diğer';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Seviye bilgileri yükleniyor...</Text>
          <Text style={styles.debugText}>Debug: User ID = {user?.id || 'Yok'}</Text>
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => {
              console.log('🔄 Manuel yenileme başlatılıyor...');
              loadData();
            }}
          >
            <Text style={styles.debugButtonText}>Manuel Yenile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Veritabanında kullanıcı verisi yoksa uyarı göster
  if (hasUserData === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Hesap Hareketi Bulunamadı</Text>
          <Text style={styles.errorText}>
            Henüz seviye sisteminde herhangi bir hareketiniz bulunmuyor. Alışveriş yaparak, sosyal medyada paylaşım yaparak veya arkadaşlarınızı davet ederek EXP kazanmaya başlayın!
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Tekrar Kontrol Et</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Seviye Sistemi</Text>
          <TouchableOpacity style={styles.infoButton} onPress={() => setInfoVisible(true)}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>İlerlemenizi takip edin ve ödüller kazanın</Text>
      </View>

      {/* Bilgilendirme Modalı */}
      <Modal
        visible={infoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <Text style={styles.infoTitle}>Seviye Sistemi Hakkında</Text>
              </View>
              <TouchableOpacity onPress={() => setInfoVisible(false)}>
                <Ionicons name="close" size={22} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              <Text style={styles.infoText}>
                Seviye atladıkça özel ayrıcalıklar kazanın! Her seviyede farklı indirimler ve özel ürünlere erişim hakkı elde edersiniz.
              </Text>
              <View style={styles.quickLevelUpContainer}>
                <Text style={styles.quickLevelUpTitle}>🚀 Hızlı Seviye Atlama Yöntemleri:</Text>
                <View style={styles.quickLevelUpList}>
                  <View style={styles.quickLevelUpItem}>
                    <Ionicons name="cart" size={16} color="#4CAF50" />
                    <Text style={styles.quickLevelUpText}>Alışveriş yapın (100₺ = 10 EXP)</Text>
                  </View>
                  <View style={styles.quickLevelUpItem}>
                    <Ionicons name="share" size={16} color="#FF9800" />
                    <Text style={styles.quickLevelUpText}>Sosyal medyada paylaşın (25 EXP, günde max 3)</Text>
                  </View>
                  <View style={styles.quickLevelUpItem}>
                    <Ionicons name="person-add" size={16} color="#2196F3" />
                    <Text style={styles.quickLevelUpText}>Arkadaş davet edin (250 EXP)</Text>
                  </View>
                  <View style={styles.quickLevelUpItem}>
                    <Ionicons name="star" size={16} color="#9C27B0" />
                    <Text style={styles.quickLevelUpText}>Ürün yorumu yapın (15 EXP)</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setInfoVisible(false)}>
              <Text style={styles.modalPrimaryText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'progress' && styles.activeTab]}
          onPress={() => setSelectedTab('progress')}
        >
          <Text style={[styles.tabText, selectedTab === 'progress' && styles.activeTabText]}>
            İlerleme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>
            Geçmiş
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'levels' && styles.activeTab]}
          onPress={() => setSelectedTab('levels')}
        >
          <Text style={[styles.tabText, selectedTab === 'levels' && styles.activeTabText]}>
            Seviyeler
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'progress' && (
          <View>
            {levelProgress ? (
              <UserLevelCard levelProgress={levelProgress} showDetails={true} />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="trending-up" size={48} color="#999" />
                <Text style={styles.emptyText}>Seviye ilerleme verisi bulunamadı</Text>
              </View>
            )}
            
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>İstatistikler</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{(levelProgress?.totalExp || 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Toplam EXP</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{levelProgress?.currentLevel?.displayName || '-'}</Text>
                  <Text style={styles.statLabel}>Mevcut Seviye</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {levelProgress?.nextLevel ? (levelProgress?.expToNextLevel || 0).toLocaleString() : 'Maksimum'}
                  </Text>
                  <Text style={styles.statLabel}>Kalan EXP</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(levelProgress?.progressPercentage || 0)}%</Text>
                  <Text style={styles.statLabel}>İlerleme</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'history' && (
          <View>
            <Text style={styles.sectionTitle}>EXP Geçmişi</Text>
            {expHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color="#999" />
                <Text style={styles.emptyText}>Henüz EXP geçmişiniz bulunmuyor</Text>
              </View>
            ) : (
              expHistory.map((transaction, index) => (
                <View key={transaction.id || index} style={styles.historyItem}>
                  <View style={styles.historyIcon}>
                    <Ionicons
                      name={getExpSourceIcon(transaction.source)}
                      size={24}
                      color={getExpSourceColor(transaction.source)}
                    />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyDescription}>{transaction.description}</Text>
                    <Text style={styles.historySource}>
                      {getExpSourceText(transaction.source)}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(transaction.timestamp)}</Text>
                  </View>
                  <View style={styles.historyAmount}>
                    <Text style={styles.historyAmountText}>+{transaction.amount}</Text>
                    <Text style={styles.historyAmountLabel}>EXP</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {selectedTab === 'levels' && (
          <View>
            <Text style={styles.sectionTitle}>Tüm Seviyeler ve Ayrıcalıkları</Text>
            <Text style={styles.sectionSubtitle}>
              Her seviyede farklı indirimler ve özel ayrıcalıklar kazanırsınız
            </Text>
            {allLevels.map((level, index) => (
              <View key={level.id} style={styles.levelItem}>
                <LinearGradient
                  colors={[level.color, level.color + '80']}
                  style={styles.levelGradient}
                >
                  <View style={styles.levelContent}>
                    <View style={styles.levelHeader}>
                      <Ionicons
                        name={level.id === 'diamond' ? 'diamond' : 'medal-outline'}
                        size={32}
                        color="white"
                      />
                      <View style={styles.levelInfo}>
                        <Text style={styles.levelName}>{level.displayName}</Text>
                        <Text style={styles.levelRange}>
                          {level.minExp.toLocaleString()} - {level.maxExp === Infinity ? '∞' : level.maxExp.toLocaleString()} EXP
                        </Text>
                      </View>
                      <View style={styles.levelMultiplier}>
                        <Text style={styles.multiplierText}>x{level.multiplier}</Text>
                      </View>
                    </View>
                    <View style={styles.levelBenefits}>
                      {level.benefits.map((benefit, benefitIndex) => (
                        <View key={benefitIndex} style={styles.benefitItem}>
                          <Ionicons name="checkmark-circle" size={16} color="white" />
                          <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.levelRewards}>
                      <Text style={styles.rewardsTitle}>🎁 Özel Ödüller:</Text>
                      <Text style={styles.rewardsText}>
                        • %{Math.round((level.multiplier - 1) * 100)} ek indirim{'\n'}
                        • Özel ürünlere erişim{'\n'}
                        • Hızlı kargo avantajı{'\n'}
                        • Kişisel müşteri temsilcisi
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,255,0.08)'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
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
    color: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    margin: 16,
    marginBottom: 12,
  },
  statsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#000',
    marginTop: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  historySource: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#000',
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  historyAmountLabel: {
    fontSize: 12,
    color: '#666',
  },
  levelItem: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  levelGradient: {
    padding: 16,
  },
  levelContent: {
    // Content styles
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  levelRange: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  levelMultiplier: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  multiplierText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  levelBenefits: {
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    flex: 1,
  },
  // Kullanıcı bilgilendirme alanı stilleri
  infoCard: {
    backgroundColor: '#F8F9FA',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  quickLevelUpContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickLevelUpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quickLevelUpList: {
    gap: 8,
  },
  quickLevelUpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  quickLevelUpText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
  // Seviye detayları için ek stiller
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  levelRewards: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  rewardsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalPrimaryButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
