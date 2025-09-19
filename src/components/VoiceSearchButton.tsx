import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceSearchService, VoiceSearchResult } from '../services/VoiceSearchService';

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onResult,
  onError,
  disabled = false,
  size = 'medium',
  style,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    return () => {
      // Component unmount olduğunda ses tanımayı durdur
      voiceSearchService.stopListening();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      // Dinleme animasyonu
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
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
      await voiceSearchService.stopListening();
      setIsListening(false);
      setIsProcessing(true);

      // Kısa bir bekleme sonrası işlemi tamamla
      setTimeout(() => {
        if (recognizedText.trim()) {
          onResult(recognizedText.trim());
        }
        setRecognizedText('');
        setIsProcessing(false);
      }, 500);
    } else {
      // Dinlemeyi başlat
      setIsProcessing(true);
      const success = await voiceSearchService.startListening({
        onStart: () => {
          setIsListening(true);
          setIsProcessing(false);
          setRecognizedText('');
        },
        onResult: (result: VoiceSearchResult) => {
          setRecognizedText(result.text);
          if (result.isFinal) {
            setIsListening(false);
            setIsProcessing(false);
            onResult(result.text);
          }
        },
        onError: (error: string) => {
          setIsListening(false);
          setIsProcessing(false);
          setRecognizedText('');
          onError?.(error);
          Alert.alert('Ses Tanıma Hatası', error);
        },
        onEnd: () => {
          setIsListening(false);
          setIsProcessing(false);
        },
      });

      if (!success) {
        setIsProcessing(false);
      }
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, iconSize: 20 };
      case 'large':
        return { width: 80, height: 80, iconSize: 40 };
      default:
        return { width: 60, height: 60, iconSize: 30 };
    }
  };

  const buttonSize = getButtonSize();

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.button,
          {
            width: buttonSize.width,
            height: buttonSize.height,
            transform: [{ scale: pulseAnim }],
          },
          isListening && styles.listeningButton,
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
              color={isListening ? '#ff4444' : '#007AFF'}
            />
          ) : (
            <Ionicons
              name={isListening ? 'stop' : 'mic'}
              size={buttonSize.iconSize}
              color={isListening ? '#ff4444' : '#007AFF'}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {recognizedText && (
        <View style={styles.textContainer}>
          <Text style={styles.recognizedText} numberOfLines={2}>
            {recognizedText}
          </Text>
        </View>
      )}

      {isListening && (
        <Text style={styles.listeningText}>
          Dinliyorum... Konuşun
        </Text>
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
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
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
  listeningButton: {
    backgroundColor: '#ffebee',
    borderColor: '#ff4444',
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
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    maxWidth: 200,
  },
  recognizedText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: '500',
  },
  listeningText: {
    marginTop: 8,
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '600',
  },
});

export default VoiceSearchButton;
