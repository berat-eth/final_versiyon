import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

export const RealTimeStatusBar: React.FC = () => {
  const {
    networkStatus,
    offlineQueueStats,
    isProcessing,
    checkNetworkStatus,
    processOfflineQueue,
    forceOnlineMode,
    clearCache
  } = useRealTimeUpdates();

  const handleProcessQueue = () => {
    if (networkStatus.queueLength > 0) {
      Alert.alert(
        'Offline Queue',
        `${networkStatus.queueLength} işlem kuyrukta bekliyor. Şimdi işlemek istiyor musunuz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'İşle', onPress: processOfflineQueue }
        ]
      );
    }
  };

  const handleForceOnline = () => {
    Alert.alert(
      'Online Mod',
      'Uygulamayı zorla online moda geçirmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: forceOnlineMode }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Cache Temizle',
      'Tüm cache verilerini temizlemek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: clearCache }
      ]
    );
  };

  const handleRefresh = () => {
    checkNetworkStatus();
  };

  // Don't show if everything is normal
  if (networkStatus.isOnline && networkStatus.queueLength === 0) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      networkStatus.isOnline ? styles.online : styles.offline
    ]}>
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            {networkStatus.isOnline ? '🌐 Online' : '📱 Offline'}
          </Text>
          {networkStatus.queueLength > 0 && (
            <Text style={styles.queueText}>
              {networkStatus.queueLength} işlem kuyrukta
            </Text>
          )}
          <Text style={styles.lastCheckText}>
            Son kontrol: {networkStatus.lastCheck.toLocaleTimeString('tr-TR')}
          </Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefresh}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>
              {isProcessing ? '⏳' : '🔄'}
            </Text>
          </TouchableOpacity>
          
          {networkStatus.queueLength > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.processButton]}
              onPress={handleProcessQueue}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? '⏳' : '▶️'}
              </Text>
            </TouchableOpacity>
          )}
          
          {!networkStatus.isOnline && (
            <TouchableOpacity
              style={[styles.actionButton, styles.forceButton]}
              onPress={handleForceOnline}
            >
              <Text style={styles.actionButtonText}>🌐</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.cacheButton]}
            onPress={handleClearCache}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {offlineQueueStats.total > 0 && (
        <View style={styles.queueDetails}>
          <Text style={styles.queueDetailsText}>
            Sepet: {offlineQueueStats.cart} | 
            Sipariş: {offlineQueueStats.orders} | 
            Yorum: {offlineQueueStats.reviews}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  online: {
    backgroundColor: '#e8f5e8',
    borderBottomColor: '#4caf50',
  },
  offline: {
    backgroundColor: '#fff3e0',
    borderBottomColor: '#ff9800',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  queueText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  lastCheckText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  processButton: {
    backgroundColor: '#4caf50',
    borderColor: '#45a049',
  },
  forceButton: {
    backgroundColor: '#2196f3',
    borderColor: '#1976d2',
  },
  cacheButton: {
    backgroundColor: '#ff9800',
    borderColor: '#f57c00',
  },
  actionButtonText: {
    fontSize: 16,
  },
  queueDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  queueDetailsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
