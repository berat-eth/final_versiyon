import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({ visible, onClose }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible, opacity, scale]);

  const handleAllow = async () => {
    try {
      setRequesting(true);
      // Modal bir kez gösterilsin
      await AsyncStorage.setItem('notificationsPromptShown', '1');
      // Dinamik import: modül yoksa çakılmasın
      let granted = false;
      try {
        const Notifications = await import('expo-notifications');
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted) {
          const req = await Notifications.requestPermissionsAsync();
          granted = req.granted || req.ios?.status === 3; // granted
        } else {
          granted = true;
        }
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Genel Bildirimler',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
      } catch {
        // expo-notifications yoksa sessiz geç
      }
      onClose();
    } finally {
      setRequesting(false);
    }
  };

  const handleLater = async () => {
    await AsyncStorage.setItem('notificationsPromptShown', '1');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ width: '85%', borderRadius: 16, overflow: 'hidden', transform: [{ scale }], opacity }}>
          <LinearGradient colors={["#ffffff", "#f4f7ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 }}>Bildirimlere izin ver</Text>
            <Text style={{ fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 16 }}>
              Kampanyalar, sipariş durumları ve fırsatlar için bildirim göndermek istiyoruz.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={handleLater} disabled={requesting} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                <Text style={{ color: '#555', fontWeight: '600' }}>Daha sonra</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAllow} disabled={requesting} style={{ backgroundColor: '#1f6feb', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{requesting ? 'İsteniyor...' : 'İzin ver'}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default NotificationPermissionModal;


