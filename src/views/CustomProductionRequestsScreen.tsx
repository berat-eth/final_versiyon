import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';
import { CustomProductionController, CustomProductionRequest } from '../controllers/CustomProductionController';

export const CustomProductionRequestsScreen: React.FC<{ navigation: any }> = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<CustomProductionRequest[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userId = 1; // Will be replaced with actual user context
      const data = await CustomProductionController.getCustomProductionRequests(userId);
      setRequests(data);
    } catch (error) {
      console.error('Error loading custom production requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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

    return (
      <View style={styles.card}>
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
        <View style={styles.steps}>
          {steps.map(step => (
            <View key={`${item.id}-${step.key}`} style={styles.step}>
              <View style={[styles.stepDot, step.done ? styles.stepDotDone : styles.stepDotTodo]} />
              <Text style={[styles.stepLabel, step.done ? styles.stepLabelDone : undefined]}>{step.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="chat-bubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Mesaj Gönder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="picture-as-pdf" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Teklif PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
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
});
