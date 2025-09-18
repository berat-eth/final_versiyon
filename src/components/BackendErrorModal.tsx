import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';

interface BackendErrorModalProps {
  visible: boolean;
  onClose: () => void;
  onRedirect: () => void;
  onRetry: () => void;
}

const { width } = Dimensions.get('window');

export const BackendErrorModal: React.FC<BackendErrorModalProps> = ({
  visible,
  onClose,
  onRedirect,
  onRetry,
}) => {
  const [countdown, setCountdown] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const scaleAnim = new Animated.Value(0);
  const countdownAnim = new Animated.Value(1);

  useEffect(() => {
    if (visible) {
      setCountdown(3);
      setIsRedirecting(false);
      
      // Modal açılış animasyonu
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Otomatik yönlendirme kaldırıldı; sayaç kullanılmıyor
      return () => {};
    } else {
      scaleAnim.setValue(0);
      countdownAnim.setValue(1);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleRetry = () => {
    handleClose();
    setTimeout(() => {
      onRetry();
    }, 300);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.errorIcon}>
              <Icon name="error-outline" size={32} color={Colors.error} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Icon name="close" size={24} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Bağlantı Sorunu</Text>
            <Text style={styles.message}>
              İnternet bağlantısı veya sunucu hatası nedeniyle API'ye erişilemiyor.
              Lütfen bağlantınızı kontrol edin ya da daha sonra tekrar deneyin.
            </Text>

            <View style={styles.redirectingContainer}>
              <Icon name="language" size={24} color={Colors.primary} />
              <Text style={styles.redirectingText}>
                İsterseniz siteye gidebilirsiniz.
              </Text>
            </View>
          </View>

          {/* Actions */}
          {!isRedirecting && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Icon name="refresh" size={20} color={Colors.textOnPrimary} />
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.redirectButton} onPress={onRedirect}>
                <Icon name="language" size={20} color={Colors.primary} />
                <Text style={styles.redirectButtonText}>Siteye Git</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: Colors.background,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  countdownText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  redirectingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  redirectingText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
    marginLeft: Spacing.sm,
  },
  redirectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  redirectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});
