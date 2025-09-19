# 🎤 Sesli Arama Özelliği Kullanım Kılavuzu

## Özellikler

✅ **Türkçe Ses Tanıma** - Doğal dil işleme ile Türkçe konuşmayı anlar  
✅ **Gerçek Zamanlı Metin** - Konuşurken metni canlı olarak görürsünüz  
✅ **Metin Okuma (TTS)** - Arama sonuçlarını sesli olarak dinleyebilirsiniz  
✅ **Arama Geçmişi** - Sesli aramalar otomatik olarak kaydedilir  
✅ **İzin Yönetimi** - Mikrofon izinleri otomatik olarak yönetilir  
✅ **Hata Yönetimi** - Kullanıcı dostu hata mesajları  

## Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
# veya
yarn install
```

**Not:** `react-native-voice` paketi Expo ile uyumlu olmadığı için `expo-av` ve `expo-speech` paketleri kullanılmaktadır.

### 2. iOS için Ek Kurulum

iOS simülatöründe test etmek için:

```bash
cd ios && pod install && cd ..
```

### 3. Uygulamayı Başlatın

```bash
npm start
# veya
expo start
```

## Kullanım

### Temel Kullanım

```tsx
import VoiceSearchButton from '../components/VoiceSearchButton';

const MyComponent = () => {
  const handleVoiceResult = (text: string) => {
    console.log('Tanınan metin:', text);
    // Arama işlemini burada yapın
  };

  const handleVoiceError = (error: string) => {
    console.error('Ses tanıma hatası:', error);
  };

  return (
    <VoiceSearchButton
      onResult={handleVoiceResult}
      onError={handleVoiceError}
      size="medium"
    />
  );
};
```

### SearchBar ile Entegrasyon

SearchBar komponenti otomatik olarak sesli arama özelliği ile gelir:

```tsx
import { SearchBar } from '../components/SearchBar';

const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    // Arama işlemi
    console.log('Arama:', searchText);
  };

  return (
    <SearchBar
      value={searchText}
      onChangeText={setSearchText}
      onSubmit={handleSearch}
      placeholder="Ürün ara..."
    />
  );
};
```

### Gelişmiş Kullanım

```tsx
import { voiceSearchService } from '../services/VoiceSearchService';

// Manuel ses tanıma başlatma
const startListening = async () => {
  const success = await voiceSearchService.startListening({
    onStart: () => console.log('Dinleme başladı'),
    onResult: (result) => console.log('Sonuç:', result.text),
    onError: (error) => console.error('Hata:', error),
    onEnd: () => console.log('Dinleme bitti'),
  });
};

// Metin okuma
const speakText = async (text: string) => {
  await voiceSearchService.speakText(text, 'tr-TR');
};

// Servisi temizleme
const cleanup = () => {
  voiceSearchService.destroy();
};
```

## API Referansı

### VoiceSearchButton Props

| Prop | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `onResult` | `(text: string) => void` | - | Ses tanıma sonucu callback'i |
| `onError` | `(error: string) => void` | - | Hata callback'i |
| `disabled` | `boolean` | `false` | Butonu devre dışı bırak |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Buton boyutu |
| `style` | `ViewStyle` | - | Özel stil |

### VoiceSearchService Metodları

#### `startListening(callbacks)`
Ses tanımayı başlatır.

```tsx
interface VoiceSearchCallbacks {
  onStart?: () => void;
  onResult?: (result: VoiceSearchResult) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}
```

#### `stopListening()`
Ses tanımayı durdurur.

#### `cancelListening()`
Ses tanımayı iptal eder.

#### `speakText(text, language)`
Metni sesli olarak okur.

#### `isCurrentlyListening()`
Şu anda dinleme yapılıp yapılmadığını kontrol eder.

#### `destroy()`
Servisi temizler.

## İzinler

### Android
`app.json` dosyasında `RECORD_AUDIO` izni otomatik olarak eklenir:

```json
{
  "android": {
    "permissions": [
      "RECORD_AUDIO"
    ]
  }
}
```

### iOS
`app.json` dosyasında mikrofon kullanım açıklaması eklenir:

```json
{
  "ios": {
    "infoPlist": {
      "NSMicrophoneUsageDescription": "Bu uygulama sesli arama özelliği için mikrofon kullanır"
    }
  }
}
```

## Sorun Giderme

### Ses Tanıma Çalışmıyor

1. **İzin Kontrolü**: Uygulama mikrofon iznine sahip mi?
2. **Cihaz Kontrolü**: Mikrofon çalışıyor mu?
3. **Ağ Bağlantısı**: İnternet bağlantısı var mı?
4. **Dil Ayarı**: Türkçe dil desteği aktif mi?

### Hata Mesajları

- `"API key required"` - API anahtarı eksik
- `"Invalid or inactive API key"` - Geçersiz API anahtarı
- `"Ses tanıma hatası"` - Genel ses tanıma hatası
- `"Mikrofon iznine ihtiyacımız var"` - İzin reddedildi

### Performans Optimizasyonu

1. **Bellek Yönetimi**: Component unmount olduğunda servisi temizleyin
2. **İzin Kontrolü**: İzinleri önceden kontrol edin
3. **Hata Yönetimi**: Hataları kullanıcı dostu şekilde gösterin

## Demo

Sesli arama özelliğini test etmek için `VoiceSearchDemo` komponentini kullanabilirsiniz:

```tsx
import VoiceSearchDemo from '../views/VoiceSearchDemo';

// Demo sayfasını göster
<VoiceSearchDemo />
```

## Teknik Detaylar

- **Ses Tanıma**: 
  - Web: Web Speech API (`webkitSpeechRecognition`)
  - Mobil: `expo-av` ile ses kaydetme (geliştiriliyor)
- **Metin Okuma**: `expo-speech` kütüphanesi
- **İzin Yönetimi**: `PermissionsAndroid` (Android) ve `Info.plist` (iOS)
- **Dil Desteği**: Türkçe (tr-TR)
- **Platform Desteği**: Web, iOS ve Android

## Platform Desteği

### ✅ Web (Tam Destek)
- Web Speech API kullanır
- Gerçek zamanlı ses tanıma
- Mikrofon izni otomatik

### 🔄 Mobil (Geliştiriliyor)
- `expo-av` ile ses kaydetme
- Şu anda simülasyon modu
- Gelecekte Google Speech-to-Text API entegrasyonu

## Bilinen Sınırlamalar

1. **Mobil Ses Tanıma**: Şu anda mobil cihazlarda gerçek ses tanıma çalışmıyor, simülasyon modunda
2. **İnternet Bağlantısı**: Web Speech API için internet gerekli
3. **Tarayıcı Desteği**: Sadece Chrome, Safari ve Edge destekler

## Lisans

Bu özellik Huglu Outdoor uygulaması için geliştirilmiştir.
