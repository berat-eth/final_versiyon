import { getNtfyWebSocketUrl, NTFY_CONFIG } from '../utils/ntfy-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type NtfyMessage = {
  time?: number;
  topic?: string;
  title?: string;
  message?: string;
  priority?: number;
  tags?: string[];
};

export class NtfyService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private readonly reconnectBaseMs = 2000;
  private topic: string | null = null;

  constructor() {}

  async init(userId?: number): Promise<void> {
    // Kullanıcıya özgü topic üret
    const topic = `${NTFY_CONFIG.topicPrefix}${userId || 'guest'}`;
    this.topic = topic;
    await AsyncStorage.setItem('ntfyTopic', topic);
    this.connect();
  }

  private scheduleReconnect(attempt: number): void {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(this.reconnectBaseMs * Math.pow(2, attempt), 30000);
    this.reconnectTimer = setTimeout(() => this.connect(attempt + 1), delay);
  }

  private connect(attempt = 0): void {
    try {
      const wsUrl = getNtfyWebSocketUrl();
      const url = `${wsUrl}/${encodeURIComponent(this.topic || 'huglu-mobile-guest')}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        attempt = 0;
      };

      this.ws.onmessage = async (event) => {
        try {
          const data: NtfyMessage = JSON.parse(String(event.data || '{}'));
          const title = data.title || 'Huğlu';
          const body = data.message || '';
          await this.presentLocalNotification(title, body);
        } catch {}
      };

      this.ws.onclose = () => {
        this.scheduleReconnect(attempt);
      };

      this.ws.onerror = () => {
        try { this.ws && this.ws.close(); } catch {}
      };
    } catch {
      this.scheduleReconnect(attempt);
    }
  }

  async presentLocalNotification(title: string, body: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications: any = require('expo-notifications');
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Genel Bildirimler',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch {}
  }

  stop(): void {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }
}

export default new NtfyService();


