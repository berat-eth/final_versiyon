import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  ScrollView,} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppContext } from '../contexts/AppContext';

interface OrderSuccessProps {
  orderNumber: string;
  estimatedDelivery: string;
  onViewOrders: () => void;
  onContinueShopping: () => void;
  onBack: () => void;
}

export const OrderSuccess: React.FC<OrderSuccessProps> = ({
  orderNumber,
  estimatedDelivery,
  onViewOrders,
  onContinueShopping,
  onBack,
}) => {
  const { addNotification } = useAppContext();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Add success notification
  useEffect(() => {
    addNotification({
      type: 'order',
      title: 'Sipariş Başarılı! 🎉',
      message: `Sipariş #${orderNumber} başarıyla oluşturuldu.`,
    });

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [orderNumber, addNotification, fadeAnim, scaleAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sipariş Tamamlandı</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon with Animation */}
        <Animated.View
          style={[
            styles.successIconContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <View style={styles.successIconBackground}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.successTitle}>Siparişiniz Başarıyla Oluşturuldu!</Text>
          <Text style={styles.successSubtitle}>
            Siparişiniz alındı ve işleme alındı. Size e-posta ile onay gönderilecek.
          </Text>
        </Animated.View>

        {/* Order Details Card */}
        <Animated.View
          style={[
            styles.orderDetailsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.cardTitle}>Sipariş Detayları</Text>
          
          <View style={styles.orderDetailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>🔢</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Sipariş Numarası</Text>
              <Text style={styles.detailValue}>#{orderNumber}</Text>
            </View>
          </View>
          
          <View style={styles.orderDetailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>📅</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Tahmini Teslimat</Text>
              <Text style={styles.detailValue}>{estimatedDelivery}</Text>
            </View>
          </View>
          
          <View style={styles.orderDetailRow}>
            <View style={styles.detailIcon}>
              <Text style={styles.detailIconText}>📍</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Durum</Text>
              <Text style={styles.detailValue}>Onaylandı</Text>
            </View>
          </View>
        </Animated.View>

        {/* Next Steps Card */}
        <Animated.View
          style={[
            styles.nextStepsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.cardTitle}>Sonraki Adımlar</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepIconText}>📧</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>E-posta Onayı</Text>
              <Text style={styles.stepDescription}>
                Sipariş onayınız e-posta ile gönderilecek
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepIconText}>📦</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Hazırlanıyor</Text>
              <Text style={styles.stepDescription}>
                Siparişiniz hazırlanmaya başlanacak
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepIconText}>🚚</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Kargoya Veriliyor</Text>
              <Text style={styles.stepDescription}>
                Kargo bilgileri size iletilecek
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionButtonsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.primaryButton} onPress={onViewOrders}>
            <Text style={styles.primaryButtonText}>Siparişlerimi Görüntüle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={onContinueShopping}>
            <Text style={styles.secondaryButtonText}>Alışverişe Devam Et</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Help Section */}
        <Animated.View
          style={[
            styles.helpSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.helpIconContainer}>
            <Text style={styles.helpIcon}>💬</Text>
          </View>
          <Text style={styles.helpTitle}>Yardıma mı ihtiyacınız var?</Text>
          <Text style={styles.helpDescription}>
            Siparişinizle ilgili herhangi bir sorunuz varsa müşteri hizmetlerimizle iletişime geçebilirsiniz.
          </Text>
          
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Müşteri Hizmetleri</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  successIconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  successIconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  successIcon: {
    fontSize: 60,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  orderDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailIconText: {
    fontSize: 20,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  nextStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepIconText: {
    fontSize: 24,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  helpSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  helpIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  helpIcon: {
    fontSize: 28,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  helpDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  helpButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default OrderSuccess;
