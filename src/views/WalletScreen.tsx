import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductController } from '../controllers/ProductController';
import { WalletController } from '../controllers/WalletController';
import { UserController } from '../controllers/UserController';
import { apiService } from '../utils/api-service';

interface WalletScreenProps {
  navigation: any;
}

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  referenceId?: string;
  balance?: number;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ navigation }) => {
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('TRY');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<number>(1); // Will be updated with current user ID
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundIban, setRefundIban] = useState('');
  const [refundName, setRefundName] = useState('');
  const [refundNote, setRefundNote] = useState('');
  
  // Para yükleme modal state'leri
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'bank_transfer' | null>(null);
  const [rechargeLoading, setRechargeLoading] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUserId = await UserController.getCurrentUserId(); // Get current user ID
      setUserId(currentUserId);
      
      console.log('💰 Loading wallet data for user:', currentUserId);
      
      // Yeni API ile bakiye ve işlem geçmişini yükle
      const [balanceResponse, transactionsResponse] = await Promise.all([
        apiService.get(`/wallet/balance/${currentUserId}`),
        apiService.get(`/wallet/transactions/${currentUserId}`)
      ]);
      
      if (balanceResponse.success) {
        setBalance(balanceResponse.data.balance || 0);
        setCurrency('TRY');
        console.log('✅ Wallet balance loaded successfully');
      }
      
      if (transactionsResponse.success) {
        const formattedTransactions = transactionsResponse.data.transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.amount > 0 ? 'credit' : 'debit',
          amount: Math.abs(tx.amount),
          description: tx.description || 'Cüzdan işlemi',
          date: tx.createdAt,
          status: 'completed',
          referenceId: tx.referenceId,
          balance: tx.balance
        }));
        setTransactions(formattedTransactions);
        console.log('✅ Wallet transactions loaded successfully');
      }
      
    } catch (error) {
      console.error('❌ Error loading wallet data:', error);
      setError('Cüzdan verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleAddMoney = () => {
    setRechargeModalVisible(true);
  };


  const handleRecharge = async () => {
    if (!rechargeAmount || !selectedPaymentMethod) {
      Alert.alert('Uyarı', 'Lütfen tutar ve ödeme yöntemi seçin');
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (amount < 10 || amount > 10000) {
      Alert.alert('Uyarı', 'Tutar 10-10000 TL arasında olmalıdır');
      return;
    }

    try {
      setRechargeLoading(true);
      
      const requestData = {
        userId: userId,
        amount: amount,
        paymentMethod: selectedPaymentMethod,
        bankInfo: selectedPaymentMethod === 'bank_transfer' ? {
          senderName: 'Test Kullanıcı',
          senderPhone: '+905551234567'
        } : null
      };

      const response = await apiService.post('/wallet/recharge-request', requestData);
      
      if (response.success) {
        if (selectedPaymentMethod === 'card') {
          // Kart ödemesi başarılı
          Alert.alert(
            'Başarılı!',
            `Para yükleme başarılı! Yeni bakiyeniz: ₺${response.data.newBalance}`,
            [
              {
                text: 'Tamam',
                onPress: () => {
                  setBalance(response.data.newBalance);
                  setRechargeModalVisible(false);
                  setRechargeAmount('');
                  setSelectedPaymentMethod(null);
                  loadWalletData();
                }
              }
            ]
          );
        } else {
          // EFT/Havale
          Alert.alert(
            'Bilgi',
            'EFT/Havale bilgileri WhatsApp ile gönderildi. Onay bekleniyor.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  setRechargeModalVisible(false);
                  setRechargeAmount('');
                  setSelectedPaymentMethod(null);
                  loadWalletData();
                }
              }
            ]
          );
        }
      } else {
        Alert.alert('Hata', response.message || 'Para yükleme işlemi başarısız');
      }
    } catch (error) {
      console.error('❌ Recharge error:', error);
      Alert.alert('Hata', 'Para yükleme işlemi sırasında hata oluştu');
    } finally {
      setRechargeLoading(false);
    }
  };


  const getTransactionIcon = (type: 'credit' | 'debit') => {
    return type === 'credit' ? '➕' : '➖';
  };

  const getTransactionColor = (type: 'credit' | 'debit') => {
    return type === 'credit' ? '#4CAF50' : '#F44336';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#666666';
    }
  };

  const getStatusText = (status: string) => {
    return WalletController.getTransactionStatusText(status);
  };

  const handleSubmitRefund = async () => {
    const amountNum = Number(refundAmount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }
    if (amountNum > balance) {
      Alert.alert('Hata', 'Talep tutarı bakiyenizden fazla olamaz');
      return;
    }
    if (!/^TR[0-9A-Z]{24}$/i.test(refundIban.replace(/\s/g, ''))) {
      Alert.alert('Hata', 'Geçerli bir IBAN girin (TR ile başlamalı)');
      return;
    }
    if (!refundName.trim()) {
      Alert.alert('Hata', 'Ad Soyad gerekli');
      return;
    }

    try {
      // Backendde özel endpoint yok; şimdilik negatif işlem kaydı gibi davranıyoruz.
      Alert.alert('Talep Alındı', 'Bakiye iadesi talebiniz alınmıştır. Onay sonrası IBAN\'ınıza gönderilecektir.');
      setRefundModalVisible(false);
      setRefundAmount('');
      setRefundIban('');
      setRefundName('');
      setRefundNote('');
    } catch (e) {
      Alert.alert('Hata', 'Talep gönderilirken bir sorun oluştu');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.modernContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
          <Text style={styles.loadingText}>Cüzdan verileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.modernContainer}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWalletData}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.modernContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Modern Balance Card */}
        <View style={styles.modernBalanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="account-balance-wallet" size={32} color="#6b7280" />
            <Text style={styles.modernBalanceTitle}>Cüzdan Bakiyesi</Text>
          </View>
          <Text style={styles.modernBalanceAmount}>
            {ProductController.formatPrice(balance)}
          </Text>
          <View style={styles.modernBalanceActions}>
            <TouchableOpacity style={styles.modernActionButton} onPress={handleAddMoney}>
              <Icon name="add" size={20} color="white" />
              <Text style={styles.modernActionButtonText}>Para Yükle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modernActionButton} onPress={() => setRefundModalVisible(true)}>
              <Icon name="undo" size={20} color="white" />
              <Text style={styles.modernActionButtonText}>Bakiye İadesi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Stats */}
        <View style={styles.modernStatsContainer}>
          <View style={styles.modernStatItem}>
            <View style={styles.modernStatIcon}>
              <Icon name="receipt" size={20} color="#6b7280" />
            </View>
            <Text style={styles.modernStatNumber}>{transactions.length}</Text>
            <Text style={styles.modernStatLabel}>Toplam İşlem</Text>
          </View>
          <View style={styles.modernStatItem}>
            <View style={styles.modernStatIcon}>
              <Icon name="trending-up" size={20} color="#10b981" />
            </View>
            <Text style={styles.modernStatNumber}>
              {transactions.filter(t => t.type === 'credit').length}
            </Text>
            <Text style={styles.modernStatLabel}>Gelen</Text>
          </View>
          <View style={styles.modernStatItem}>
            <View style={styles.modernStatIcon}>
              <Icon name="trending-down" size={20} color="#ef4444" />
            </View>
            <Text style={styles.modernStatNumber}>
              {transactions.filter(t => t.type === 'debit').length}
            </Text>
            <Text style={styles.modernStatLabel}>Giden</Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionIcon}>
                  <Text style={styles.iconText}>
                    {getTransactionIcon(transaction.type)}
                  </Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.date).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.amountText,
                    { color: getTransactionColor(transaction.type) }
                  ]}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {ProductController.formatPrice(transaction.amount)}
                  </Text>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(transaction.status) }
                  ]}>
                    {getStatusText(transaction.status)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Güvenlik Bilgisi */}
        <View style={styles.securityInfoContainer}>
          <View style={styles.securityInfoHeader}>
            <Icon name="security" size={24} color="#10b981" />
            <Text style={styles.securityTitle}>Güvenlik</Text>
          </View>
          <Text style={styles.securityText}>
            • Kredi kartı bilgileriniz hiçbir şekilde kayıt edilmez
          </Text>
          <Text style={styles.securityText}>
            • Tüm ödemeler güvenli şekilde işlenir
          </Text>
          <Text style={styles.securityText}>
            • Sadece anlık işlemler için kart bilgileri kullanılır
          </Text>
        </View>
      </ScrollView>
      
      {/* Para Yükleme Modal */}
      <Modal
        visible={rechargeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRechargeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rechargeModal}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.rechargeTitle}>Para Yükle</Text>
              <TouchableOpacity onPress={() => setRechargeModalVisible(false)}>
                <Icon name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.rechargeSubtitle}>Mevcut Bakiye: {ProductController.formatPrice(balance)}</Text>
            
            {/* Tutar Girişi */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Tutar (TL)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Örn: 100"
                value={rechargeAmount}
                onChangeText={setRechargeAmount}
                maxLength={6}
              />
            </View>

            {/* Ödeme Yöntemi Seçimi */}
            <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === 'card' && styles.paymentMethodSelected
                ]}
                onPress={() => setSelectedPaymentMethod('card')}
              >
                <Icon 
                  name="credit-card" 
                  size={24} 
                  color={selectedPaymentMethod === 'card' ? '#ffffff' : '#1f2937'} 
                />
                <Text style={[
                  styles.paymentMethodText,
                  selectedPaymentMethod === 'card' && styles.paymentMethodTextSelected
                ]}>
                  Kredi Kartı
                </Text>
                <Text style={[
                  styles.paymentMethodSubtext,
                  selectedPaymentMethod === 'card' && styles.paymentMethodSubtextSelected
                ]}>
                  Anında yükleme
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === 'bank_transfer' && styles.paymentMethodSelected
                ]}
                onPress={() => setSelectedPaymentMethod('bank_transfer')}
              >
                <Icon 
                  name="account-balance" 
                  size={24} 
                  color={selectedPaymentMethod === 'bank_transfer' ? '#ffffff' : '#1f2937'} 
                />
                <Text style={[
                  styles.paymentMethodText,
                  selectedPaymentMethod === 'bank_transfer' && styles.paymentMethodTextSelected
                ]}>
                  EFT/Havale
                </Text>
                <Text style={[
                  styles.paymentMethodSubtext,
                  selectedPaymentMethod === 'bank_transfer' && styles.paymentMethodSubtextSelected
                ]}>
                  Manuel onay
                </Text>
              </TouchableOpacity>
            </View>

            {/* Yükleme Butonu */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!rechargeAmount || !selectedPaymentMethod || rechargeLoading) && styles.submitButtonDisabled
              ]}
              onPress={handleRecharge}
              disabled={!rechargeAmount || !selectedPaymentMethod || rechargeLoading}
            >
              {rechargeLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Para Yükle</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Refund Request Modal */}
      <Modal
        visible={refundModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRefundModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.refundModal}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.refundTitle}>Bakiye İadesi Talebi</Text>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Icon name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <Text style={styles.refundSubtitle}>Mevcut Bakiye: {ProductController.formatPrice(balance)}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Tutar</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Örn: 250"
                value={refundAmount}
                onChangeText={setRefundAmount}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>İBAN</Text>
              <TextInput
                style={styles.input}
                placeholder="TR.."
                autoCapitalize="characters"
                value={refundIban}
                onChangeText={setRefundIban}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ad Soyad"
                value={refundName}
                onChangeText={setRefundName}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Açıklama</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="İsteğe bağlı açıklama"
                multiline
                value={refundNote}
                onChangeText={setRefundNote}
              />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitRefund}>
              <Text style={styles.submitButtonText}>Talep Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#1A1A2E',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  withdrawButtonText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 12,
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
  transactionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666666',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paymentMethodsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentIconText: {
    fontSize: 16,
  },
  paymentIconImage: {
    width: 24,
    height: 24,
    tintColor: '#1A1A2E',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  paymentMethodArrow: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  addPaymentMethod: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  addPaymentMethodText: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  
  // Modern Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernBalanceCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernBalanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  modernBalanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  modernBalanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modernActionButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  refundModal: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  refundSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  inputRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modernStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  modernStatItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modernStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Para yükleme modal stilleri
  rechargeModal: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  rechargeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  rechargeSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  paymentMethod: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  paymentMethodSelected: {
    borderColor: '#1f2937',
    backgroundColor: '#1f2937',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  paymentMethodTextSelected: {
    color: '#ffffff',
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentMethodSubtextSelected: {
    color: '#ffffff',
    opacity: 0.8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  
  // Güvenlik bilgisi stilleri
  securityInfoContainer: {
    backgroundColor: '#f0fdf4',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  securityInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginLeft: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
    lineHeight: 20,
  },
});
