import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NfcCardService, { NfcCardData } from '../services/NfcCardService';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';

interface NfcScanScreenProps {
  navigation: any;
  route: {
    params?: {
      onResult?: (data: NfcCardData | null) => void;
    }
  }
}

const NfcScanScreen: React.FC<NfcScanScreenProps> = ({ navigation, route }) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [cardData, setCardData] = useState<NfcCardData | null>(null);
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = async () => {
      setStatus('scanning');
      const data = await NfcCardService.readEmvOnce();
      if (data) {
        setCardData(data);
        setStatus(data.pan ? 'success' : 'error');
      } else {
        setStatus('error');
      }
    };
    run();
  }, []);

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true, delay }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    createPulse(pulse1, 0);
    createPulse(pulse2, 800);
  }, [pulse1, pulse2]);

  const retryScan = async () => {
    setStatus('scanning');
    const data = await NfcCardService.readEmvOnce();
    if (data) {
      setCardData(data);
      setStatus(data.pan ? 'success' : 'error');
    } else {
      setStatus('error');
    }
  };

  const handleDone = () => {
    if (route.params?.onResult) {
      route.params.onResult(cardData);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A1A2E', '#2E2E4D']} style={styles.header}>
        <Text style={styles.headerTitle}>Temassız Ödeme</Text>
        <Text style={styles.headerSubtitle}>Kartınızı arka tarafa yaklaştırın</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.radarContainer}>
          <Animated.View
            style={[styles.radarPulse, {
              transform: [{ scale: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
              opacity: pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] })
            }]}
          />
          <Animated.View
            style={[styles.radarPulse, {
              transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
              opacity: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] })
            }]}
          />
          <View style={styles.radarCenter}>
            <Image source={require('../../assets/wallet.png')} style={{ width: 36, height: 36, tintColor: '#1A1A2E' }} />
          </View>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>
            {status === 'scanning' && 'Kart aranıyor...'}
            {status === 'success' && 'Kart algılandı'}
            {status === 'error' && 'Kart algılanamadı'}
          </Text>
          {status === 'error' && (
            <Text style={styles.statusText}>Lütfen kartı cihazın NFC antenine daha yakın tutun ve tekrar deneyin.</Text>
          )}
          {cardData?.pan && (
            <View style={styles.cardPreview}>
              <Text style={styles.cardPreviewPan}>**** **** **** {cardData.pan.slice(-4)}</Text>
              {(cardData.expiryMonth && cardData.expiryYear) && (
                <Text style={styles.cardPreviewExpiry}>SKT {cardData.expiryMonth}/{cardData.expiryYear.slice(-2)}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.secondaryButton]} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>İptal</Text>
          </TouchableOpacity>
          {status === 'success' ? (
            <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleDone}>
              <Text style={styles.primaryButtonText}>Kart Bilgilerini Kullan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={retryScan}>
              <Text style={styles.primaryButtonText}>Yeniden Dene</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: Spacing.lg, paddingTop: Spacing.lg + 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  content: { flex: 1, padding: Spacing.lg },
  radarContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.lg, height: 220 },
  radarPulse: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#1A1A2E' },
  radarCenter: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...Shadows.medium },
  statusBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: Spacing.lg, ...Shadows.medium },
  statusTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  statusText: { fontSize: 14, color: '#4B5563' },
  cardPreview: { marginTop: 8, padding: 12, backgroundColor: '#F8F9FF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardPreviewPan: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cardPreviewExpiry: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, gap: 12 },
  secondaryButton: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  secondaryButtonText: { color: '#374151', fontWeight: '700', fontSize: 16 },
  primaryButton: { backgroundColor: '#1A1A2E', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});

export default NfcScanScreen;


