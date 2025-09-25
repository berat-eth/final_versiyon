import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Linking, Modal, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';
import { CustomProductionController, CustomProductionRequest } from '../controllers/CustomProductionController';
import { useAppContext } from '../contexts/AppContext';
import { apiService } from '../utils/api-service';

export const CustomProductionRequestsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { state } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<CustomProductionRequest[]>([]);
  const [msgModal, setMsgModal] = useState<{ visible: boolean; requestId?: number }>(() => ({ visible: false }));
  const [msgText, setMsgText] = useState('');

  useEffect(() => {
    loadData(false);
  }, []);

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const userId = state.user?.id || 1;
      const data = await CustomProductionController.getCustomProductionRequests(userId, { forceRefresh });
      setRequests(data);
    } catch (error) {
      console.error('Error loading custom production requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const StatusChip: React.FC<{ status: CustomProductionRequest['status'] }> = ({ status }) => {
    const label = CustomProductionController.getStatusText(status);
    const color = CustomProductionController.getStatusColor(status);
    return (
      <View style={[styles.statusChip, { backgroundColor: color + '22', borderColor: color }]}> 
        <Text style={[styles.statusChipText, { color: color }]}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: CustomProductionRequest }) => {
    const getSteps = (status: CustomProductionRequest['status']) => {
      const allSteps = [
        { key: 'pending', label: 'Talep Alındı', done: true },
        { key: 'review', label: 'Değerlendirme', done: ['review', 'design', 'production', 'shipped', 'completed'].includes(status) },
        { key: 'design', label: 'Tasarım', done: ['design', 'production', 'shipped', 'completed'].includes(status) },
        { key: 'production', label: 'Üretimde', done: ['production', 'shipped', 'completed'].includes(status) },
        { key: 'shipped', label: 'Kargolandı', done: ['shipped', 'completed'].includes(status) },
        { key: 'completed', label: 'Tamamlandı', done: status === 'completed' },
      ];
      return allSteps;
    };

    const steps = getSteps(item.status);
    const productNames = item.items.map(item => item.productName || 'Ürün').join(', ');

    const hasQuote = item.quoteAmount != null && item.quoteStatus != null;
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => {
        const userId = state.user?.id || 1;
        // requestId ile detay ekranına git
        (navigation as any).navigate('CustomProductionRequestDetail', { requestId: item.id, userId });
      }}>
      <View style={styles.card}>
        {hasQuote && (
          <View style={styles.quoteRibbon}>
            <Icon name="request-quote" size={16} color="#fff" />
            <Text style={styles.quoteRibbonText}>
              {item.quoteStatus === 'sent' && 'Teklif Gönderildi'}
              {item.quoteStatus === 'accepted' && 'Teklif Onaylandı'}
              {item.quoteStatus === 'rejected' && 'Teklif Reddedildi'}
              {item.quoteStatus && !['sent','accepted','rejected'].includes(item.quoteStatus) && 'Teklif'}
            </Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{productNames}</Text>
          <StatusChip status={item.status} />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Icon name="tag" size={16} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.requestNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="calendar-today" size={16} color={Colors.textMuted} />
            <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="inventory-2" size={16} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.totalQuantity} adet</Text>
          </View>
        </View>
        {/* Ürün Kalemleri */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionHeader}>Ürünler</Text>
          {item.items.map((sub, idx) => (
            <View key={`${item.id}-row-${sub.id || idx}`} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                {sub.productImage ? (
                  <Image source={{ uri: sub.productImage }} style={styles.itemImage} resizeMode="cover" />
                ) : (
                  <Icon name="checkroom" size={16} color={Colors.textMuted} />
                )}
                <Text style={styles.itemName} numberOfLines={1}>{sub.productName || `Ürün #${sub.productId}`}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemQty}>x{sub.quantity}</Text>
              </View>
            </View>
          ))}
          {item.items.some(s => (s as any).customizations?.text || (s as any).customizations?.logo || (s as any).customizations?.position) && (
            <View style={styles.customizationSummary}>
              <Icon name="tune" size={16} color={Colors.primary} />
              <Text style={styles.customizationText}>Özelleştirme: {item.items.map(s => (s as any).customizations?.text).filter(Boolean).join(', ') || '—'}</Text>
            </View>
          )}
        </View>

        {/* Toplamlar */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Toplam Adet</Text>
          <Text style={styles.totalValue}>{item.totalQuantity}</Text>
        </View>
        {typeof item.totalAmount === 'number' && item.totalAmount > 0 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Tahmini Tutar</Text>
            <Text style={styles.totalValue}>{item.totalAmount.toLocaleString('tr-TR')} TL</Text>
          </View>
        )}

        {/* Teklif Kutucuğu */}
        {hasQuote && (
          <View style={styles.quoteBox}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteTitle}>Gelen Teklif</Text>
              <View style={[styles.quoteStatus, item.quoteStatus === 'accepted' ? styles.quoteAccepted : item.quoteStatus === 'rejected' ? styles.quoteRejected : styles.quoteSent]}>
                <Text style={styles.quoteStatusText}>
                  {item.quoteStatus === 'accepted' ? 'Onaylandı' : item.quoteStatus === 'rejected' ? 'Reddedildi' : 'Gönderildi'}
                </Text>
              </View>
            </View>
            <View style={styles.quoteBody}>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Teklif Tutarı</Text>
                <Text style={styles.quoteValue}>{(item.quoteAmount || 0).toLocaleString('tr-TR')} {item.quoteCurrency || 'TRY'}</Text>
              </View>
              {item.quoteValidUntil && (
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Geçerlilik</Text>
                  <Text style={styles.quoteValue}>{new Date(item.quoteValidUntil).toLocaleDateString('tr-TR')}</Text>
                </View>
              )}
              {item.quoteNotes && (
                <View style={styles.quoteNotes}>
                  <Text style={styles.quoteNotesText}>{item.quoteNotes}</Text>
                </View>
              )}
            </View>
            {item.quoteStatus === 'sent' && (
              <View style={styles.quoteActions}>
                <TouchableOpacity style={[styles.quoteBtn, styles.quoteRejectBtn]} onPress={() => console.log('quote_reject', item.id)}>
                  <Text style={styles.quoteBtnText}>Reddet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quoteBtn, styles.quoteAcceptBtn]} onPress={() => console.log('quote_accept', item.id)}>
                  <Text style={[styles.quoteBtnText, styles.quoteAcceptBtnText]}>Kabul Et</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.steps}>
          {steps.map(step => (
            <View key={`${item.id}-${step.key}`} style={styles.step}>
              <View style={[styles.stepDot, step.done ? styles.stepDotDone : styles.stepDotTodo]} />
              <Text style={[styles.stepLabel, step.done ? styles.stepLabelDone : undefined]}>{step.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setMsgModal({ visible: true, requestId: item.id })}>
            <Icon name="chat-bubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Mesaj Gönder</Text>
          </TouchableOpacity>
          {hasQuote && (
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="picture-as-pdf" size={18} color={Colors.primary} />
              <Text style={styles.actionText}>
                {`${(item.quoteAmount || 0).toLocaleString('tr-TR')} ${item.quoteCurrency || 'TRY'}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      />

      {/* Mesaj Gönder Modal */}
      <Modal
        visible={msgModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setMsgModal({ visible: false })}
      >
        <View style={styles.modalOverlay}> 
          <View style={styles.messageModal}> 
            <View style={styles.modalHeader}> 
              <Text style={styles.modalTitle}>Mesaj Gönder</Text>
              <TouchableOpacity onPress={() => setMsgModal({ visible: false })}>
                <Icon name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: Spacing.lg }}> 
              <TextInput
                style={[styles.textInput, { height: 120, textAlignVertical: 'top' }]}
                placeholder="Mesajınızı yazın..."
                value={msgText}
                onChangeText={setMsgText}
                multiline
              />
              <TouchableOpacity
                style={[styles.actionButton, { marginTop: Spacing.md, alignSelf: 'flex-end', borderColor: Colors.primary }]}
                onPress={async () => {
                  if (!msgModal.requestId || !msgText.trim()) return;
                  try {
                    const userKey = state.user?.id || 1;
                    const resp = await apiService.sendCustomProductionMessage(msgModal.requestId, userKey, msgText.trim());
                    if (resp.success) {
                      setMsgText('');
                      setMsgModal({ visible: false });
                    }
                  } catch (e) {}
                }}
              >
                <Icon name="send" size={18} color={Colors.primary} />
                <Text style={styles.actionText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  quoteRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  quoteRibbonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotDone: {
    backgroundColor: Colors.primary,
  },
  stepDotTodo: {
    backgroundColor: Colors.border,
  },
  stepLabel: {
    fontSize: 12,
    color: Colors.text,
  },
  stepLabelDone: {
    color: Colors.primary,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: Spacing.md,
  },
  itemsSection: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  itemImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemRight: {},
  itemQty: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  customizationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginTop: Spacing.xs,
  },
  customizationText: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  totalValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
  },
  quoteBox: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '0D',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '1A',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
  },
  quoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  quoteStatus: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quoteSent: {
    backgroundColor: '#2563eb20',
  },
  quoteAccepted: {
    backgroundColor: '#16a34a20',
  },
  quoteRejected: {
    backgroundColor: '#dc262620',
  },
  quoteStatusText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  quoteBody: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  quoteValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
  },
  quoteNotes: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
  },
  quoteNotesText: {
    fontSize: 12,
    color: Colors.text,
  },
  quoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  quoteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  quoteRejectBtn: {
    borderColor: '#dc2626',
  },
  quoteAcceptBtn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  quoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  quoteAcceptBtnText: {
    color: Colors.textOnPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  messageModal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
});
