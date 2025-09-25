import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ProductController } from '../controllers/ProductController';
import { UserController } from '../controllers/UserController';
import { apiService } from '../utils/api-service';

interface InvoiceItem {
  id: number;
  orderId: number;
  date: string;
  total: number;
  pdfUrl?: string;
  status?: string;
}

export const InvoicesScreen: React.FC<{ navigation: any }>= ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = await UserController.getCurrentUserId();
      // Uyumlu uç noktalar: /invoices, /orders/:id/invoices, /billing/invoices
      const endpoints = [
        `/invoices/${userId}`,
        `/billing/invoices/${userId}`,
        `/orders/${userId}/invoices`
      ];
      for (const ep of endpoints) {
        const res = await apiService.get(ep);
        if (res?.success && Array.isArray(res.data)) {
          const mapped: InvoiceItem[] = res.data.map((x: any) => ({
            id: Number(x.id ?? x.invoiceId ?? x.orderId),
            orderId: Number(x.orderId ?? x.id),
            date: String(x.date ?? x.createdAt ?? x.issueDate ?? new Date().toISOString()),
            total: Number(x.total ?? x.totalAmount ?? 0),
            pdfUrl: x.pdfUrl || x.url,
            status: x.status || 'issued',
          }));
          setInvoices(mapped);
          setLoading(false);
          return;
        }
      }
      setInvoices([]);
      setLoading(false);
    } catch (e) {
      setError('Faturalar yüklenemedi');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }, [loadInvoices]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Faturalar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Icon name="error-outline" size={40} color="#ef4444" />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInvoices}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: InvoiceItem }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        if (item.pdfUrl) {
          navigation.navigate('WebView', { url: item.pdfUrl, title: `Fatura #${item.id}` });
        } else {
          navigation.navigate('OrderDetail', { orderId: item.orderId });
        }
      }}
    >
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Icon name="receipt-long" size={22} color="#6b7280" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Fatura #{item.id}</Text>
          <Text style={styles.subtitle}>{new Date(item.date).toLocaleDateString('tr-TR')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>{ProductController.formatPrice(item.total)}</Text>
          {item.status && <Text style={styles.status}>{item.status}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(x) => String(x.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: Spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={() => (
          <View style={styles.centerBox}>
            <Icon name="inbox" size={40} color="#9ca3af" />
            <Text style={styles.centerText}>Henüz fatura bulunmuyor</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: 8,
    color: '#6b7280',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadows.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  status: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default InvoicesScreen;


