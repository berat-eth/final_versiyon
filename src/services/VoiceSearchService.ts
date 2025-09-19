import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface VoiceSearchResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceSearchCallbacks {
  onStart?: () => void;
  onResult?: (result: VoiceSearchResult) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

class VoiceSearchService {
  private isListening = false;
  private callbacks: VoiceSearchCallbacks = {};
  private recognition: any = null;
  private recording: Audio.Recording | null = null;

  constructor() {
    this.initializeVoice();
  }

  private initializeVoice() {
    // Web Speech API sadece web platformunda kullanılır
    // Mobil platformlarda sadece ses kaydetme yapılır
    console.log('🎤 Voice servisi başlatıldı - Platform:', Platform.OS);
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
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
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('❌ İzin hatası:', err);
        return false;
      }
    }
    return true; // iOS için otomatik izin
  }

  async startListening(callbacks: VoiceSearchCallbacks = {}): Promise<boolean> {
    try {
      this.callbacks = callbacks;

      // Web platformu için basit simülasyon
      if (Platform.OS === 'web') {
        this.callbacks.onError?.('Web platformunda ses tanıma henüz desteklenmiyor');
        return false;
      }

      // Mobil platformlar için ses kaydetme
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'İzin Gerekli',
          'Sesli arama için mikrofon iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
        return false;
      }

      // Zaten dinliyorsa durdur
      if (this.isListening) {
        await this.stopListening();
      }

      // Ses kaydetme izni al
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Kayıt başlat
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
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
      });

      this.recording = recording;
      await recording.startAsync();
      
      this.isListening = true;
      this.callbacks.onStart?.();

      // 5 saniye sonra otomatik durdur
      setTimeout(async () => {
        if (this.isListening) {
          await this.stopListening();
        }
      }, 5000);

      return true;
    } catch (error) {
      console.error('❌ Ses tanıma başlatma hatası:', error);
      this.callbacks.onError?.('Ses tanıma başlatılamadı');
      return false;
    }
  }

  async stopListening(): Promise<void> {
    try {
      if (!this.isListening) return;

      // Mobil platformlar için ses kaydını durdur ve işle
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        
        if (uri) {
          // Ses dosyasını işle (şimdilik basit bir simülasyon)
          const result: VoiceSearchResult = {
            text: 'Ses tanıma özelliği geliştiriliyor...',
            confidence: 0.8,
            isFinal: true
          };
          this.callbacks.onResult?.(result);
        }
        
        this.recording = null;
      }

      this.isListening = false;
      this.callbacks.onEnd?.();
    } catch (error) {
      console.error('❌ Ses tanıma durdurma hatası:', error);
      this.callbacks.onError?.('Ses tanıma durdurulamadı');
    }
  }

  async cancelListening(): Promise<void> {
    try {
      if (!this.isListening) return;

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      this.isListening = false;
    } catch (error) {
      console.error('❌ Ses tanıma iptal hatası:', error);
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
      });
    } catch (error) {
      console.error('❌ Metin okuma hatası:', error);
    }
  }

  // Servisi temizle
  destroy(): void {
    try {
      if (this.recording) {
        this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      this.isListening = false;
      console.log('🧹 Voice servisi temizlendi');
    } catch (error) {
      console.error('❌ Voice servisi temizleme hatası:', error);
    }
  }
}

// Singleton instance
export const voiceSearchService = new VoiceSearchService();
export default voiceSearchService;
