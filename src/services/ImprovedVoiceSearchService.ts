import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface VoiceSearchResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  duration?: number;
}

export interface VoiceSearchCallbacks {
  onStart?: () => void;
  onResult?: (result: VoiceSearchResult) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onPermissionDenied?: () => void;
}

export interface VoiceSearchConfig {
  maxDuration: number; // maksimum kayıt süresi (saniye)
  minDuration: number; // minimum kayıt süresi (saniye)
  language: string;
  autoStop: boolean;
  retryCount: number;
}

class ImprovedVoiceSearchService {
  private isListening = false;
  private callbacks: VoiceSearchCallbacks = {};
  private recording: Audio.Recording | null = null;
  private recordingStartTime: number = 0;
  private timeoutId: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private isInitialized = false;
  
  private config: VoiceSearchConfig = {
    maxDuration: 10, // 10 saniye
    minDuration: 1,  // 1 saniye
    language: 'tr-TR',
    autoStop: true,
    retryCount: 3
  };

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Önce izinleri kontrol et
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ Mikrofon izni yok, servis başlatılamadı');
        this.isInitialized = false;
        return;
      }

      // Audio modunu ayarla
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      this.isInitialized = true;
      console.log('✅ Voice servisi başarıyla başlatıldı');
    } catch (error) {
      console.error('❌ Voice servisi başlatılamadı:', error);
      this.isInitialized = false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Mikrofon İzni',
            message: 'Sesli arama özelliğini kullanabilmek için mikrofon iznine ihtiyacımız var.',
            buttonNeutral: 'Daha Sonra Sor',
            buttonNegative: 'İptal',
            buttonPositive: 'İzin Ver',
          }
        );
        
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        if (!hasPermission) {
          this.callbacks.onPermissionDenied?.();
        }
        return hasPermission;
      }
      
      // iOS için otomatik izin
      return true;
    } catch (error) {
      console.error('❌ İzin hatası:', error);
      this.callbacks.onError?.('Mikrofon izni alınamadı');
      return false;
    }
  }

  async startListening(callbacks: VoiceSearchCallbacks = {}): Promise<boolean> {
    try {
      this.callbacks = callbacks;
      this.retryCount = 0;

      // Zaten dinliyorsa durdur
      if (this.isListening) {
        await this.stopListening();
      }

      // İzin kontrolü
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        callbacks.onPermissionDenied?.();
        return false;
      }

      // Servis kontrolü
      if (!this.isInitialized) {
        await this.initializeService();
        if (!this.isInitialized) {
          callbacks.onError?.('Ses servisi başlatılamadı');
          return false;
        }
      }

      // Kayıt başlat
      const success = await this.startRecording();
      if (success) {
        this.setupAutoStop();
        return true;
      } else {
        this.handleError('Kayıt başlatılamadı');
        return false;
      }
    } catch (error) {
      console.error('❌ Ses tanıma başlatma hatası:', error);
      this.handleError('Ses tanıma başlatılamadı');
      return false;
    }
  }

  private async startRecording(): Promise<boolean> {
    try {
      // Mevcut kaydı temizle
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          console.warn('Mevcut kayıt temizlenirken hata:', e);
        }
        this.recording = null;
      }

      // Audio modunu tekrar ayarla
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Yeni kayıt oluştur
      const recording = new Audio.Recording();
      
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      this.recording = recording;
      this.recordingStartTime = Date.now();
      this.isListening = true;
      
      this.callbacks.onStart?.();
      console.log('🎤 Kayıt başlatıldı');
      
      return true;
    } catch (error) {
      console.error('❌ Kayıt başlatma hatası:', error);
      if (error.message?.includes('permissions')) {
        this.callbacks.onError?.('Mikrofon izni gerekli');
      } else {
        this.callbacks.onError?.('Ses kaydı başlatılamadı');
      }
      return false;
    }
  }

  private setupAutoStop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(async () => {
      if (this.isListening) {
        console.log('⏰ Otomatik durdurma - maksimum süre aşıldı');
        await this.stopListening();
      }
    }, this.config.maxDuration * 1000);
  }

  async stopListening(): Promise<void> {
    try {
      if (!this.isListening || !this.recording) {
        return;
      }

      // Timeout'u temizle
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      // Kayıt süresini hesapla
      const duration = (Date.now() - this.recordingStartTime) / 1000;
      
      // Minimum süre kontrolü
      if (duration < this.config.minDuration) {
        console.log('⚠️ Kayıt süresi çok kısa, tekrar deneyin');
        this.handleError('Lütfen daha uzun konuşun');
        await this.cancelListening();
        return;
      }

      // Kayıt durdur
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isListening = false;
      this.callbacks.onEnd?.();

      if (uri) {
        // Ses dosyasını işle
        await this.processRecording(uri, duration);
      } else {
        this.handleError('Ses dosyası oluşturulamadı');
      }

      this.recording = null;
    } catch (error) {
      console.error('❌ Kayıt durdurma hatası:', error);
      this.handleError('Kayıt durdurulamadı');
    }
  }

  private async processRecording(uri: string, duration: number) {
    try {
      // Şimdilik simülasyon - gerçek ses tanıma API'si entegre edilebilir
      const simulatedTexts = [
        'tişört arayın',
        'pantolon bul',
        'mont ara',
        'ayakkabı bul',
        'çanta ara',
        'şapka bul',
        'beret ara',
        'hırka bul',
        'gömlek ara',
        'kazak bul'
      ];
      
      const randomText = simulatedTexts[Math.floor(Math.random() * simulatedTexts.length)];
      
      const result: VoiceSearchResult = {
        text: randomText,
        confidence: 0.85,
        isFinal: true,
        duration: duration
      };

      console.log('📝 Simüle edilen metin:', result.text);
      this.callbacks.onResult?.(result);
      
      // Gelecekte burada gerçek ses tanıma API'si çağrılabilir
      // await this.callSpeechToTextAPI(uri);
      
    } catch (error) {
      console.error('❌ Ses işleme hatası:', error);
      this.handleError('Ses işlenemedi');
    }
  }

  async cancelListening(): Promise<void> {
    try {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      this.isListening = false;
      console.log('🚫 Kayıt iptal edildi');
    } catch (error) {
      console.error('❌ Kayıt iptal hatası:', error);
    }
  }

  private handleError(message: string) {
    this.isListening = false;
    this.callbacks.onError?.(message);
    
    // Retry mekanizması - sadece izin hatası değilse
    if (this.retryCount < this.config.retryCount && !message.includes('izni')) {
      this.retryCount++;
      console.log(`🔄 Retry ${this.retryCount}/${this.config.retryCount}`);
      setTimeout(() => {
        this.startListening(this.callbacks);
      }, 2000); // 2 saniye bekle
    } else if (message.includes('izni')) {
      this.callbacks.onPermissionDenied?.();
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Metin okuma özelliği
  async speakText(text: string, language: string = 'tr-TR'): Promise<void> {
    try {
      await Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.8,
        quality: Speech.VoiceQuality.Enhanced,
      });
    } catch (error) {
      console.error('❌ Metin okuma hatası:', error);
    }
  }

  // Konfigürasyon güncelleme
  updateConfig(newConfig: Partial<VoiceSearchConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Servisi temizle
  destroy(): void {
    try {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      
      if (this.recording) {
        this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      
      this.isListening = false;
      this.isInitialized = false;
      console.log('🧹 Voice servisi temizlendi');
    } catch (error) {
      console.error('❌ Voice servisi temizleme hatası:', error);
    }
  }
}

// Singleton instance
export const improvedVoiceSearchService = new ImprovedVoiceSearchService();
export default improvedVoiceSearchService;
