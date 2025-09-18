import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { Colors } from '../theme/colors';

interface StoreLocatorScreenProps {
  navigation: any;
  route: any;
}

export default function StoreLocatorScreen({ navigation, route }: StoreLocatorScreenProps) {
  const { productId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<any[]>([]);

  // Koda gömülü mağazalar (adres/koordinatları burada çoğaltabilirsiniz)
  const STATIC_STORES = useMemo(() => [
    {
      id: 3,
      name: 'Huğlu Fabrika',
      address: 'KOMEK, Huğlu, 43173. Sk Sitesi No:20, 42700 Beyşehir/Konya',
      lat: 37.4751052,
      lng: 31.5837487,
      phone: '+90 530 312 58 13',
    },
    {
      id: 4,
      name: 'Beyşehir Şubesi',
      address: 'Bahçelievler, Prof. Dr. Yılmaz Muslu Cd. No: 9B, 42700 Beyşehir/Konya',
      lat: 37.6846826,
      lng: 31.7234722,
      phone: '+90 530 312 58 13',
    },
  ], []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Konum İzni Gerekli', 'Yakın mağazaları göstermek için konum izni verin.');
          // İzin verilmezse varsayılan merkez: Türkiye
          setCoords({ lat: 39.9255, lng: 32.8663 });
        } else {
          const loc = await Location.getCurrentPositionAsync({});
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setCoords({ lat, lng });
        }
        // Backend olmadan sabit mağaza listesi
        setStores(STATIC_STORES);
      } catch (e) {
        console.error(e);
        Alert.alert('Hata', 'Mağazalar yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, STATIC_STORES]);

  const center = coords || { lat: 39.9255, lng: 32.8663 };


  const openInMaps = (item: any) => {
    const label = encodeURIComponent(item.name || 'Mağaza');
    const hasCoords = typeof item.lat === 'number' && typeof item.lng === 'number';
    let url: string | undefined;
    if (hasCoords) {
      const lat = item.lat;
      const lng = item.lng;
      url = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${label})`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`,
      });
    } else {
      const query = encodeURIComponent(`${item.name || ''} ${item.address || ''}`.trim());
      url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
        default: `https://www.google.com/maps/search/?api=1&query=${query}`,
      });
    }
    if (url) {
      Linking.openURL(url).catch(() => {
        const fallback = hasCoords
          ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address || '')}`;
        Linking.openURL(fallback);
      });
    }
  };

  const callStore = (phone?: string) => {
    if (!phone) return;
    const tel = `tel:${phone}`;
    Linking.openURL(tel).catch(() => {});
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.storeName}>{item.name || 'Mağaza'}</Text>
      </View>
      <Text style={styles.address}>{item.address}</Text>
      <View style={styles.actions}>
        {item.phone && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => callStore(item.phone)}>
            <Icon name="call" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Ara</Text>
          </TouchableOpacity>
        )}
        {(item.lat && item.lng) && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => openInMaps(item)}>
            <Icon name="map" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Haritada Aç</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Icon name="location-on" size={48} color={Colors.primary} />
              <Text style={styles.mapPlaceholderText}>Harita Görünümü</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                Konum: {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Bilinmiyor'}
              </Text>
            </View>
          </View>
          <FlatList
            data={stores}
            keyExtractor={(item, idx) => String(item.id || idx)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={<Text style={styles.sectionTitle}>Sana En Yakın Mağazalar</Text>}
            ListEmptyComponent={<Text style={styles.empty}>Mağaza bulunamadı.</Text>}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapContainer: { height: Math.min(320, Math.round(Dimensions.get('window').height * 0.35)), marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f8f9fa',
    padding: 20
  },
  mapPlaceholderText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: Colors.primary, 
    marginTop: 10 
  },
  mapPlaceholderSubtext: { 
    fontSize: 14, 
    color: '#666', 
    marginTop: 5,
    textAlign: 'center'
  },
  list: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 8, marginTop: 12 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  storeName: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  address: { fontSize: 14, color: '#444' },
  actions: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  actionText: { marginLeft: 6, color: Colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});


