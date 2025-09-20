import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { improvedVoiceSearchService, VoiceSearchResult } from '../services/ImprovedVoiceSearchService';

interface ImprovedVoiceSearchButtonProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  onPermissionDenied?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showText?: boolean;
  autoRetry?: boolean;
}

const ImprovedVoiceSearchButton: React.FC<ImprovedVoiceSearchButtonProps> = ({
  onResult,
  onError,
  onPermissionDenied,
  disabled = false,
  size = 'medium',
  style,
  showText = true,
  autoRetry = true,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(1));
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      improvedVoiceSearchService.cancelListening();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      // Dinleme animasyonu
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handlePress = async () => {
    if (disabled || isProcessing) return;

    if (isListening) {
      // Dinlemeyi durdur
      await stopListening();
    } else {
      // Dinlemeyi başlat
      await startListening();
    }
  };

  const startListening = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setRecognizedText('');

      const success = await improvedVoiceSearchService.startListening({
        onStart: () => {
          setIsListening(true);
          setIsProcessing(false);
          setRecognizedText('');
          setError(null);
        },
        onResult: (result: VoiceSearchResult) => {
          setRecognizedText(result.text);
          if (result.isFinal) {
            setIsListening(false);
            setIsProcessing(false);
            onResult(result.text);
            
            // Başarı animasyonu
            Animated.sequence([
              Animated.timing(fadeAnim, {
                toValue: 0.7,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
        onError: (errorMessage: string) => {
          setIsListening(false);
          setIsProcessing(false);
          setError(errorMessage);
          onError?.(errorMessage);
          
          // Hata animasyonu
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0.5,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();

          if (autoRetry && errorMessage.includes('Lütfen daha uzun konuşun')) {
            showRetryMessage();
          }
        },
        onEnd: () => {
          setIsListening(false);
          setIsProcessing(false);
        },
        onPermissionDenied: () => {
          setIsProcessing(false);
          onPermissionDenied?.();
          Alert.alert(
            'Mikrofon İzni Gerekli',
            'Sesli arama özelliğini kullanabilmek için mikrofon iznine ihtiyacımız var. Lütfen ayarlardan izin verin.',
            [
              { text: 'Tamam', style: 'default' },
              { text: 'Ayarlar', onPress: () => {/* Ayarlar sayfasına yönlendir */} }
            ]
          );
        },
      });

      if (!success) {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Ses tanıma başlatma hatası:', error);
      setIsProcessing(false);
      onError?.('Ses tanıma başlatılamadı');
    }
  };

  const stopListening = async () => {
    try {
      await improvedVoiceSearchService.stopListening();
      setIsListening(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('Ses tanıma durdurma hatası:', error);
    }
  };

  const showRetryMessage = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      Alert.alert(
        'Tekrar Deneyin',
        'Ses tanıma için daha uzun konuşmanız gerekiyor. Tekrar denemek ister misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { text: 'Evet', onPress: startListening }
        ]
      );
    }, 2000);
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, iconSize: 20, fontSize: 12 };
      case 'large':
        return { width: 80, height: 80, iconSize: 40, fontSize: 16 };
      default:
        return { width: 60, height: 60, iconSize: 30, fontSize: 14 };
    }
  };

  const buttonSize = getButtonSize();
  const buttonColor = error ? '#ff4444' : (isListening ? '#ff4444' : '#007AFF');
  const backgroundColor = error ? '#ffebee' : (isListening ? '#ffebee' : '#f0f0f0');

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.button,
          {
            width: buttonSize.width,
            height: buttonSize.height,
            transform: [{ scale: pulseAnim }],
            opacity: fadeAnim,
            backgroundColor,
            borderColor: buttonColor,
          },
          disabled && styles.disabledButton,
        ]}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={handlePress}
          disabled={disabled || isProcessing}
          activeOpacity={0.7}
        >
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color={buttonColor}
            />
          ) : (
            <Ionicons
              name={isListening ? 'stop' : 'mic'}
              size={buttonSize.iconSize}
              color={buttonColor}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {showText && (
        <View style={styles.textContainer}>
          {recognizedText ? (
            <Text style={[styles.recognizedText, { color: buttonColor }]} numberOfLines={2}>
              ✅ {recognizedText}
            </Text>
          ) : error ? (
            <Text style={styles.errorText} numberOfLines={2}>
              ❌ {error}
            </Text>
          ) : isListening ? (
            <Text style={styles.listeningText}>
              🎤 Dinliyorum... Konuşun
            </Text>
          ) : (
            <Text style={styles.instructionText}>
              {disabled ? 'Devre Dışı' : '🎤 Konuşmak için dokunun'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
    opacity: 0.6,
  },
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 200,
    alignItems: 'center',
  },
  recognizedText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 11,
    color: '#ff4444',
    textAlign: 'center',
    fontWeight: '500',
  },
  listeningText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ImprovedVoiceSearchButton;
