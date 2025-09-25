import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, FlatList, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';
import { CustomProductionController, CustomProductionRequest } from '../controllers/CustomProductionController';
import { apiService } from '../utils/api-service';

interface Props {
  navigation: any;
  route: any;
}

export const CustomProductionRequestDetailScreen: React.FC<Props> = ({ route }) => {
  const { requestId, userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<CustomProductionRequest | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uid = userId || 1;
        const data = await CustomProductionController.getCustomProductionRequest(uid, Number(requestId));
        if (mounted) setRequest(data);
        const msgResp = await apiService.listCustomProductionMessages(Number(requestId));
        if (mounted && msgResp.success) setMessages(Array.isArray(msgResp.data) ? msgResp.data : []);
      } catch (e) {
        if (mounted) setRequest(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [requestId, userId]);

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ marginTop: 8, color: Colors.textMuted }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Icon name="error-outline" size={28} color={Colors.textMuted} />
        <Text style={{ marginTop: 8, color: Colors.text }}>Talep bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.lg }}>
      <View style={styles.header}> 
        <View>
          <Text style={styles.title}>Talep #{request.requestNumber}</Text>
          <Text style={styles.subTitle}>{new Date(request.createdAt).toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{request.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Müşteri</Text>
        <Text style={styles.rowText}>{request.customerName}</Text>
        {request.customerPhone ? <Text style={styles.rowText}>{request.customerPhone}</Text> : null}
        <Text style={styles.rowText}>{request.customerEmail}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ürünler</Text>
        {request.items.map((it, idx) => (
          <View key={`${it.id}-${idx}`} style={styles.itemRow}> 
            {it.productImage ? (
              <Image source={{ uri: it.productImage }} style={styles.itemImg} />
            ) : (
              <Icon name="checkroom" size={22} color={Colors.textMuted} />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.itemName} numberOfLines={2}>{it.productName || `Ürün #${it.productId}`}</Text>
              <Text style={styles.itemMeta}>Adet: {it.quantity}</Text>
              {it.productPrice ? <Text style={styles.itemMeta}>Birim Fiyat: {it.productPrice.toLocaleString('tr-TR')} TL</Text> : null}
              {it.customizations?.text ? <Text style={styles.itemMeta}>Özelleştirme: {it.customizations.text}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Özet</Text>
        <Text style={styles.rowText}>Toplam Adet: {request.totalQuantity}</Text>
        {typeof request.totalAmount === 'number' && request.totalAmount > 0 ? (
          <Text style={styles.rowText}>Tahmini Tutar: {request.totalAmount.toLocaleString('tr-TR')} TL</Text>
        ) : null}
        {request.estimatedDeliveryDate ? (
          <Text style={styles.rowText}>Tahmini Teslim: {new Date(request.estimatedDeliveryDate).toLocaleDateString('tr-TR')}</Text>
        ) : null}
      </View>

      {request.quoteStatus ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teklif</Text>
          {typeof request.quoteAmount === 'number' ? (
            <Text style={styles.rowText}>Tutar: {request.quoteAmount.toLocaleString('tr-TR')} {request.quoteCurrency || 'TRY'}</Text>
          ) : null}
          {request.quoteValidUntil ? (
            <Text style={styles.rowText}>Geçerlilik: {new Date(request.quoteValidUntil).toLocaleDateString('tr-TR')}</Text>
          ) : null}
          {request.quoteNotes ? (
            <Text style={styles.rowText}>Not: {request.quoteNotes}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mesajlar</Text>
        {messages.length === 0 ? (
          <Text style={styles.rowText}>Henüz mesaj yok.</Text>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m, i) => `${m.id || i}`}
            renderItem={({ item }) => (
              <View style={styles.messageRow}>
                <View style={[styles.messageBubble, item.from === 'admin' ? styles.messageAdmin : styles.messageUser]}>
                  <Text style={styles.messageText}>{item.message}</Text>
                </View>
                <Text style={styles.messageMeta}>{new Date(item.createdAt || item.date || Date.now()).toLocaleString('tr-TR')}</Text>
              </View>
            )}
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yazın..."
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, sending || !input.trim() ? { opacity: 0.6 } : undefined]}
            disabled={sending || !input.trim()}
            onPress={async () => {
              try {
                setSending(true);
                const resp = await apiService.sendCustomProductionMessage(Number(requestId), String(userId || 1), input.trim());
                if (resp.success) {
                  setInput('');
                  const list = await apiService.listCustomProductionMessages(Number(requestId));
                  if (list.success) setMessages(Array.isArray(list.data) ? list.data : []);
                }
              } finally {
                setSending(false);
              }
            }}
          >
            <Icon name="send" size={18} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  subTitle: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  statusPill: { backgroundColor: Colors.background, borderColor: Colors.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, color: Colors.text, fontWeight: '700' },
  section: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  rowText: { fontSize: 13, color: Colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  itemImg: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  itemName: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  messageRow: { marginTop: 6 },
  messageBubble: { maxWidth: '90%', padding: 10, borderRadius: 10 },
  messageAdmin: { backgroundColor: '#eef2ff', alignSelf: 'flex-start' },
  messageUser: { backgroundColor: '#dcfce7', alignSelf: 'flex-end' },
  messageText: { color: Colors.text },
  messageMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, color: Colors.text, backgroundColor: Colors.background },
  sendBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
});

export default CustomProductionRequestDetailScreen;

