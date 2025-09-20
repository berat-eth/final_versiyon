import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator, Alert, Image } from 'react-native';
import apiService from '../utils/api-service';
import { UserController } from '../controllers/UserController';
import { Colors } from '../theme/colors';

export default function ReferralScreen({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [url, setUrl] = useState('');
  const [invitedCount, setInvitedCount] = useState(0);
  const [rewardBalance, setRewardBalance] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const userId = await UserController.getCurrentUserId();
        const res = await apiService.getReferralInfo(userId);
        if (res.success && res.data) {
          const { referralCode, referralLink, referralCount, totalEarnings } = res.data as any;
          setCode(referralCode || '');
          setUrl(referralLink || '');
          setInvitedCount(referralCount || 0);
          setRewardBalance(totalEarnings || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const userId = await UserController.getCurrentUserId();
      const res = await apiService.generateReferralLink(userId);
      if (res.success && res.data) {
        setCode(res.data.code);
        setUrl(res.data.url);
        // Refresh referral info to get updated stats
        const refreshRes = await apiService.getReferralInfo(userId);
        if (refreshRes.success && refreshRes.data) {
          const { referralCount, totalEarnings } = refreshRes.data as any;
          setInvitedCount(referralCount || 0);
          setRewardBalance(totalEarnings || 0);
        }
      } else {
        Alert.alert('Hata', 'Referans bağlantısı oluşturulamadı.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const link = url || `https://huglu-outdoor.app.link/ref/${code}`;
      await Share.share({
        message: `Benim referansımla indirim kazan! ${link}`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <View style={styles.content}>
          {/* Hero Card */}
          <View style={styles.hero}>
            <Image source={require('../../assets/share.png')} style={styles.heroIcon} />
            <Text style={styles.heroTitle}>Davet et, birlikte kazanın!</Text>
            <Text style={styles.heroSubtitle}>Arkadaşlarını davet et, onlar alışveriş yaptıkça sen de ödül kazan.</Text>
          </View>

          {/* Stats Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Referans Kodun</Text>
            <Text style={styles.code}>{code || '—'}</Text>
            <Text style={styles.url}>{url || '—'}</Text>
            <View style={styles.rowBetween}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{invitedCount}</Text>
                <Text style={styles.statLabel}>Davet</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate}>
              <Text style={styles.primaryText}>Kod/Link Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare} disabled={!code && !url}>
              <Text style={styles.secondaryText}>Paylaş</Text>
            </TouchableOpacity>
          </View>

          {/* How it works */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Nasıl Çalışır?</Text>
            <View style={styles.stepItem}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
              <Text style={styles.stepText}>Referans kodunu oluştur ve arkadaşlarınla paylaş.</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
              <Text style={styles.stepText}>Arkadaşların kodu kullanarak uygulamaya kayıt olsun.</Text>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
              <Text style={styles.stepText}>İlk alışverişlerinde sen de ödül kazan.</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  hero: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
  heroIcon: { width: 56, height: 56, tintColor: Colors.primary, marginBottom: 8 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: '#6C757D', textAlign: 'center' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontSize: 12, color: '#666' },
  code: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  url: { fontSize: 12, color: '#777', marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: '#EEE' },
  statLabel: { color: '#6C757D', fontSize: 12, marginTop: 4 },
  statValue: { color: '#1A1A1A', fontSize: 20, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 12, columnGap: 12 },
  primaryBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryText: { color: '#1A1A1A', fontWeight: '800' },
  stepsCard: { borderWidth: 1, borderColor: '#eee', borderRadius: 16, padding: 16, marginTop: 8 },
  stepsTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepBadgeText: { color: '#FFFFFF', fontWeight: '800' },
  stepText: { flex: 1, color: '#343A40' },
});


