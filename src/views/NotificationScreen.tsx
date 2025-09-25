import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../contexts/AppContext';
import { UserController } from '../controllers/UserController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { EmptyState } from '../components/EmptyState';
import { Colors } from '../theme/colors';

interface NotificationScreenProps {
  navigation: any;
}

interface Notification {
  id: string;
  type: 'order' | 'product' | 'system' | 'promotion';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const { state, markNotificationRead } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      // Get notifications from context state
      const contextNotifications = state.notifications.notifications || [];
      
      // Get user notifications from database if user is logged in
      const currentUser = await UserController.getCurrentUser();
      let dbNotifications: any[] = [];
      
      if (currentUser) {
        dbNotifications = await UserController.getUserNotifications(currentUser.id);
      }

      // Combine and format notifications
      const allNotifications = [
        ...contextNotifications,
        ...dbNotifications.map(dbNotif => ({
          id: dbNotif.id?.toString() || Date.now().toString(),
          type: dbNotif.type || 'system',
          title: dbNotif.title || 'Bildirim',
          message: dbNotif.message || '',
          isRead: dbNotif.isRead === 1,
          createdAt: dbNotif.createdAt || new Date().toISOString(),
          data: dbNotif.data ? JSON.parse(dbNotif.data) : null,
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Hata', 'Bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [state.notifications.notifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ));
    }

    // Handle navigation based on notification type
    if (notification.data) {
      switch (notification.type) {
        case 'order':
          if (notification.data.orderId) {
            navigation.navigate('OrderDetail', { orderId: notification.data.orderId });
          }
          break;
        case 'product':
          if (notification.data.productId) {
            navigation.navigate('ProductDetail', { productId: notification.data.productId });
          }
          break;
        default:
          // Show notification details
          Alert.alert(notification.title, notification.message);
          break;
      }
    } else {
      Alert.alert(notification.title, notification.message);
    }
  }, [markNotificationRead, navigation]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return 'shopping-bag';
      case 'product':
        return 'inventory';
      case 'promotion':
        return 'local-offer';
      case 'system':
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return Colors.primary;
      case 'product':
        return '#10b981';
      case 'promotion':
        return '#f59e0b';
      case 'system':
      default:
        return '#6366f1';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Az önce';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
        <Icon 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={getNotificationColor(item.type)} 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.primary + 'dd']}
      style={styles.header}
    >
      <StatusBar style="light" />
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Bildirimler</Text>
        
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => {
            Alert.alert(
              'Tüm Bildirimleri Temizle',
              'Tüm bildirimleri silmek istediğinizden emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: () => {
                    setNotifications([]);
                    // Clear from context as well
                    // dispatch({ type: 'CLEAR_NOTIFICATIONS' });
                  }
                }
              ]
            );
          }}
        >
          <Icon name="clear-all" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {notifications.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Icon name="notifications-none" size={80} color="#d1d5db" />
          </View>
          <Text style={styles.emptyStateTitle}>Henüz Bildiriminiz Yok</Text>
          <Text style={styles.emptyStateMessage}>
            Merak etmeyin! Sipariş durumunuz, özel kampanyalar ve önemli güncellemeler hakkında bildirimleri burada göreceksiniz.
          </Text>
          <View style={styles.emptyStateFeatures}>
            <View style={styles.emptyFeatureItem}>
              <Icon name="shopping-bag" size={20} color="#6366f1" />
              <Text style={styles.emptyFeatureText}>Sipariş güncellemeleri</Text>
            </View>
            <View style={styles.emptyFeatureItem}>
              <Icon name="local-offer" size={20} color="#f59e0b" />
              <Text style={styles.emptyFeatureText}>Özel kampanyalar</Text>
            </View>
            <View style={styles.emptyFeatureItem}>
              <Icon name="inventory" size={20} color="#10b981" />
              <Text style={styles.emptyFeatureText}>Ürün bildirimleri</Text>
            </View>
          </View>
          <Text style={styles.emptyStateFooter}>
            İlk siparişinizi vererek bildirim almaya başlayın! 🛍️
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  emptyFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyFeatureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  emptyStateFooter: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
