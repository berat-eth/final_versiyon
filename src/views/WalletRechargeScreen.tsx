import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { apiService } from '../utils/api-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletRechargeScreenProps {
  navigation: any;
}

interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  branchCode: string;
  swiftCode: string;
}

export const WalletRechargeScreen: React.FC<WalletRechargeScreenProps> = ({ navigation }) => {
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<any[]>([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('currentUserId');
      const uid = raw ? parseInt(raw, 10) : 1;
      const userId = Number.isFinite(uid) && uid > 0 ? uid : 1;
      const response = await apiService.get(`/wallet/balance/${userId}`);
      if (response.success) {
        setBalance(response.data.balance);
      }
      
      // İşlem geçmişini yükle
      const historyResponse = await apiService.get(`/wallet/transactions/${userId}`);
      if (historyResponse.success) {
        setRechargeHistory(historyResponse.data.transactions);
      }
    } catch (error) {
      console.error('❌ Wallet data load error:', error);
      Alert.alert('Hata', 'Cüzdan bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!amount || !paymentMethod) {
      Alert.alert('Uyarı', 'Lütfen tutar ve ödeme yöntemi seçin');
      return;
    }

    const rechargeAmount = parseFloat(amount);
    if (rechargeAmount < 10 || rechargeAmount > 10000) {
      Alert.alert('Uyarı', 'Tutar 10-10000 TL arasında olmalıdır');
      return;
    }

    try {
      setLoading(true);
      
      const raw = await AsyncStorage.getItem('currentUserId');
      const uid = raw ? parseInt(raw, 10) : 1;
      const userId = Number.isFinite(uid) && uid > 0 ? uid : 1;
      const requestData = {
        userId,
        amount: rechargeAmount,
        paymentMethod,
        bankInfo: paymentMethod === 'bank_transfer' ? {
          senderName: 'Test Kullanıcı',
          senderPhone: '+905551234567'
        } : null
      };

      const response = await apiService.post('/wallet/recharge-request', requestData);
      
      if (response.success) {
        if (paymentMethod === 'card') {
          // Kart ödemesi başarılı
          Alert.alert(
            'Başarılı!',
            `Para yükleme başarılı! Yeni bakiyeniz: ₺${response.data.newBalance}`,
            [
              {
                text: 'Tamam',
                onPress: () => {
                  setBalance(response.data.newBalance);
                  setAmount('');
                  setPaymentMethod(null);
                  loadWalletData();
                }
              }
            ]
          );
        } else {
          // EFT/Havale - banka bilgilerini göster
          setBankInfo(response.data.bankInfo);
          setShowBankInfo(true);
          Alert.alert(
            'Bilgi',
            'EFT/Havale bilgileri WhatsApp ile gönderildi. Onay bekleniyor.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  setAmount('');
                  setPaymentMethod(null);
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
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      'pending': 'Beklemede',
      'pending_approval': 'Onay Bekliyor',
      'completed': 'Tamamlandı',
      'failed': 'Başarısız',
      'cancelled': 'İptal Edildi'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      'pending': Colors.warning,
      'pending_approval': Colors.warning,
      'completed': Colors.success,
      'failed': Colors.error,
      'cancelled': Colors.textLight
    };
    return colorMap[status] || Colors.textLight;
  };

  const renderBankInfoModal = () => (
    <Modal
      visible={showBankInfo}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBankInfo(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Banka Bilgileri</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBankInfo(false)}
            >
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          {bankInfo && (
            <ScrollView style={styles.bankInfoContainer}>
              <View style={styles.bankInfoItem}>
                <Text style={styles.bankInfoLabel}>Banka Adı:</Text>
                <Text style={styles.bankInfoValue}>{bankInfo.bankName}</Text>
              </View>
              
              <View style={styles.bankInfoItem}>
                <Text style={styles.bankInfoLabel}>Hesap Sahibi:</Text>
                <Text style={styles.bankInfoValue}>{bankInfo.accountName}</Text>
              </View>
              
              <View style={styles.bankInfoItem}>
                <Text style={styles.bankInfoLabel}>Hesap No:</Text>
                <Text style={styles.bankInfoValue}>{bankInfo.accountNumber}</Text>
              </View>
              
              <View style={styles.bankInfoItem}>
                <Text style={styles.bankInfoLabel}>IBAN:</Text>
                <Text style={styles.bankInfoValue}>{bankInfo.iban}</Text>
              </View>
              
              <View style={styles.bankInfoItem}>
                <Text style={styles.bankInfoLabel}>Şube Kodu:</Text>
                <Text style={styles.bankInfoValue}>{bankInfo.branchCode}</Text>
              </View>
              
              <View style={styles.bankInfoItem}>
                <Text style={styles.bankInfoLabel}>Swift Kodu:</Text>
                <Text style={styles.bankInfoValue}>{bankInfo.swiftCode}</Text>
              </View>
              
              <View style={styles.noteContainer}>
                <Icon name="info" size={20} color={Colors.primary} />
                <Text style={styles.noteText}>
                  Lütfen açıklama kısmına "Cüzdan Yükleme - [Tutar] TL" yazın.
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading && !balance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cüzdan bilgileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Cüzdan Bakiyesi */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Icon name="account-balance-wallet" size={32} color={Colors.primary} />
          <Text style={styles.balanceTitle}>Cüzdan Bakiyem</Text>
        </View>
        <Text style={styles.balanceAmount}>₺{balance.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadWalletData}
        >
          <Icon name="refresh" size={20} color={Colors.primary} />
          <Text style={styles.refreshText}>Yenile</Text>
        </TouchableOpacity>
      </View>

      {/* Para Yükleme Formu */}
      <View style={styles.rechargeCard}>
        <Text style={styles.sectionTitle}>Para Yükle</Text>
        
        {/* Tutar Girişi */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Tutar (TL)</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Örn: 100"
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        {/* Ödeme Yöntemi Seçimi */}
        <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
        <View style={styles.paymentMethods}>
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              paymentMethod === 'card' && styles.paymentMethodSelected
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Icon 
              name="credit-card" 
              size={24} 
              color={paymentMethod === 'card' ? Colors.textOnPrimary : Colors.primary} 
            />
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === 'card' && styles.paymentMethodTextSelected
            ]}>
              Kredi Kartı
            </Text>
            <Text style={[
              styles.paymentMethodSubtext,
              paymentMethod === 'card' && styles.paymentMethodSubtextSelected
            ]}>
              Anında yükleme
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethod,
              paymentMethod === 'bank_transfer' && styles.paymentMethodSelected
            ]}
            onPress={() => setPaymentMethod('bank_transfer')}
          >
            <Icon 
              name="account-balance" 
              size={24} 
              color={paymentMethod === 'bank_transfer' ? Colors.textOnPrimary : Colors.primary} 
            />
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === 'bank_transfer' && styles.paymentMethodTextSelected
            ]}>
              EFT/Havale
            </Text>
            <Text style={[
              styles.paymentMethodSubtext,
              paymentMethod === 'bank_transfer' && styles.paymentMethodSubtextSelected
            ]}>
              Manuel onay
            </Text>
          </TouchableOpacity>
        </View>

        {/* Yükleme Butonu */}
        <TouchableOpacity
          style={[
            styles.rechargeButton,
            (!amount || !paymentMethod || loading) && styles.rechargeButtonDisabled
          ]}
          onPress={handleRecharge}
          disabled={!amount || !paymentMethod || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.textOnPrimary} />
          ) : (
            <>
              <Icon name="add" size={20} color={Colors.textOnPrimary} />
              <Text style={styles.rechargeButtonText}>Para Yükle</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* İşlem Geçmişi */}
      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>İşlem Geçmişi</Text>
        {rechargeHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Icon name="history" size={48} color={Colors.textLight} />
            <Text style={styles.emptyHistoryText}>Henüz işlem yok</Text>
          </View>
        ) : (
          rechargeHistory.map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.createdAt)}
                </Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={[
                  styles.transactionAmountText,
                  { color: transaction.amount > 0 ? Colors.success : Colors.error }
                ]}>
                  {transaction.amount > 0 ? '+' : ''}₺{Math.abs(transaction.amount).toFixed(2)}
                </Text>
                <Text style={styles.transactionBalance}>
                  Bakiye: ₺{transaction.balance.toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {renderBankInfoModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textLight,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 16,
    ...Shadows.medium,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textOnPrimary,
    marginLeft: Spacing.sm,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
    marginBottom: Spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.textOnPrimary + '20',
    borderRadius: 20,
  },
  refreshText: {
    fontSize: 14,
    color: Colors.textOnPrimary,
    marginLeft: Spacing.xs,
  },
  rechargeCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 16,
    ...Shadows.medium,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 18,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  paymentMethod: {
    flex: 1,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  paymentMethodSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  paymentMethodTextSelected: {
    color: Colors.textOnPrimary,
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  paymentMethodSubtextSelected: {
    color: Colors.textOnPrimary + 'CC',
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  rechargeButtonDisabled: {
    backgroundColor: Colors.border,
  },
  rechargeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 16,
    ...Shadows.medium,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionBalance: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    borderRadius: 16,
    maxHeight: '80%',
    width: '90%',
    ...Shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  bankInfoContainer: {
    padding: Spacing.lg,
  },
  bankInfoItem: {
    marginBottom: Spacing.md,
  },
  bankInfoLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  bankInfoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: Spacing.sm,
    lineHeight: 20,
  },
});
