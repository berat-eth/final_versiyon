import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export async function configureNotificationHandler(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications: any = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications: any = require('expo-notifications');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Genel Bildirimler',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {}
}

export async function requestAndGetPushToken(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem('expoPushToken');
    if (stored) return stored;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications: any = require('expo-notifications');
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      const req = await Notifications.requestPermissionsAsync();
      const iosStatus = (req as any)?.ios?.status;
      if (!req.granted && iosStatus !== 3) {
        return null;
      }
    }

    await ensureAndroidChannel();

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse?.data || null;
    if (token) {
      await AsyncStorage.setItem('expoPushToken', token);
    }
    return token;
  } catch (e) {
    return null;
  }
}

export default {
  configureNotificationHandler,
  ensureAndroidChannel,
  requestAndGetPushToken,
};


