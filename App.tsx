import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import './src/utils/console-config';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Linking } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import apiService from './src/utils/api-service';
import { AppProvider } from './src/contexts/AppContext';
import { BackendErrorProvider } from './src/services/BackendErrorService';
import { initializeNetworkConfig } from './src/utils/network-config';
import { IP_SERVER_CANDIDATES } from './src/utils/api-config';
import { findBestServerForApk } from './src/utils/apk-config';
import NfcCardService from './src/services/NfcCardService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from './src/utils/api-config';
import NotificationPermissionModal from './src/components/NotificationPermissionModal';
import NotificationsService from './src/services/NotificationsService';
import NtfyService from './src/services/NtfyService';

// TurboModule uyarılarını gizle
LogBox.ignoreLogs([
  'Module TurboModuleRegistry',
  'TurboModuleRegistry.getEnforcing(...)',
  '[runtime not ready]',
  'Sync error:',
  'Sync failed',
  'Simulated network failure',
]);

export default function App() {
  const [showNotifModal, setShowNotifModal] = useState(false);

  useEffect(() => {
    // Network'ü başlangıçta initialize et (SQLite kaldırıldı)
    const setupApp = async () => {
      try {
        // Notifications handler & channel
        await NotificationsService.configureNotificationHandler();
        await NotificationsService.ensureAndroidChannel();

        // NFC başlat ve kullanılabilirliği kontrol et
        await NfcCardService.init();
        NfcCardService.ensureEnabledWithPrompt().catch(() => {});

        // Production-ready API detection
        const quickTestOnce = async (): Promise<string | null> => {
          // For APK builds, use specialized server detection
          if (!__DEV__) {
            try {
              const bestServer = await findBestServerForApk();
              return bestServer;
            } catch (error) {
              console.error('❌ APK: Server detection failed:', error);
              // Fallback to domain-based detection
            }
          }
          
          const candidates: string[] = ['https://api.zerodaysoftware.tr/api'];
          
          // Add IP candidates for both development and production
          if (IP_SERVER_CANDIDATES) {
            IP_SERVER_CANDIDATES.forEach(ip => {
              candidates.push(`https://${ip}/api`);
            });
          }

          const tests = candidates.map(async (u) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1500);
              const resp = await fetch(`${u.replace(/\/$/, '')}/health`, { 
                method: 'GET', 
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              });
              clearTimeout(timeoutId);
              return resp.ok ? u : null;
            } catch {
              return null;
            }
          });

          const results = await Promise.all(tests);
          const found = results.find(Boolean) as string | undefined;
          return found || null;
        };

        let workingUrl: string | null = null;
        for (let attempt = 0; attempt < 1 && !workingUrl; attempt++) {
          const found = await quickTestOnce();
          if (found) {
            workingUrl = found.includes('/api') ? found : `${found}/api`;
            apiService.setApiUrl(workingUrl);
            break;
          }
        }

        // Uzak URL bulunamazsa yönlendirme yapma; uygulama yüklenmeye devam etsin
        
        // Initialize network configuration with auto-detection
        await initializeNetworkConfig();
        
        // Test backend connection'ı arka planda çalıştır (UI'yı bloklama)
        apiService.testConnection().catch(() => {});

        // ntfy dinleyicisini başlat (opsiyonel userId geçirilebilir)
        try {
          const userIdRaw = await AsyncStorage.getItem('currentUserId');
          const userId = userIdRaw ? Number(userIdRaw) : undefined;
          await NtfyService.init(userId);
        } catch {}

        // Uygulama ilk açılışında tek seferlik health kontrolü (bilgi amaçlı)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const healthResp = await fetch(`${getApiBaseUrl()}/health`, { method: 'GET', signal: controller.signal });
          clearTimeout(timeoutId);
          // 200 dışı ise yönlendirme yapma; hata yönetimi API çağrılarında modal ile yapılacak
        } catch {
          // Health isteği başarısızsa sessiz; yönlendirme zorunlu değil
        }

        // IP'ye hızlı ping (health) kontrolü - yönlendirme kaldırıldı
        (async () => {
          try {
            const targetIp = (IP_SERVER_CANDIDATES && IP_SERVER_CANDIDATES[0]) || '';
            if (!targetIp) return;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const resp = await fetch(`https://${targetIp}/health`, { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) {
              throw new Error('unreachable');
            }
          } catch {
            // Sessizce geç: kullanıcı uygulamada kalmalı, otomatik yönlendirme yok
          }
        })();

        // No periodic retries after redirect requirement
        return () => {};
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        // App devam etsin, network hatası olsa bile
      }
    };

    const cleanupPromise = setupApp();
    return () => {
      // Ensure any async cleanup if provided
      Promise.resolve(cleanupPromise).catch(() => {});
    };
  }, []);

  // Açılışta bildirim izni modalını göster (sadece 1 kez)
  useEffect(() => {
    (async () => {
      try {
        const shown = await AsyncStorage.getItem('notificationsPromptShown');
        if (!shown) {
          setShowNotifModal(true);
        }
        // Token kaydı arka planda alınsın (izin verilmişse)
        await NotificationsService.requestAndGetPushToken();
      } catch {}
    })();
  }, []);

  // Yönlendirme sayacı ve WebView fallback kaldırıldı

  // Yönlendirme ekranı kaldırıldı

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <AppProvider>
          <BackendErrorProvider navigation={null}>
            <AppNavigator />
            <NotificationPermissionModal visible={showNotifModal} onClose={() => setShowNotifModal(false)} />
          </BackendErrorProvider>
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
