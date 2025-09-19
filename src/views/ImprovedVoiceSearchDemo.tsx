import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import ImprovedVoiceSearchButton from '../components/ImprovedVoiceSearchButton';
import { improvedVoiceSearchService } from '../services/ImprovedVoiceSearchService';

const ImprovedVoiceSearchDemo: React.FC = () => {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    maxDuration: 10,
    minDuration: 1,
    autoRetry: true,
    showText: true,
  });

  const handleVoiceResult = (text: string) => {
    console.log('🎤 Sesli arama sonucu:', text);
    setSearchResults(prev => [text, ...prev.slice(0, 9)]);
    setError(null);
  };

  const handleVoiceError = (errorMessage: string) => {
    console.error('Ses tanıma hatası:', errorMessage);
    setError(errorMessage);
  };

  const handlePermissionDenied = () => {
    Alert.alert(
      'İzin Gerekli',
      'Sesli arama için mikrofon iznine ihtiyacımız var. Lütfen ayarlardan izin verin.',
      [{ text: 'Tamam' }]
    );
  };

  const clearResults = () => {
    setSearchResults([]);
    setError(null);
  };

  const speakText = async (text: string) => {
    try {
      await improvedVoiceSearchService.speakText(text);
    } catch (error) {
      Alert.alert('Hata', 'Metin okunamadı');
    }
  };

  const updateSettings = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    improvedVoiceSearchService.updateConfig({ [key]: value });
  };

  useEffect(() => {
    // Servis ayarlarını güncelle
    improvedVoiceSearchService.updateConfig({
      maxDuration: settings.maxDuration,
      minDuration: settings.minDuration,
    });
  }, [settings]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎤 Gelişmiş Sesli Arama</Text>
        <Text style={styles.subtitle}>
          İyileştirilmiş ses tanıma sistemi ile daha stabil arama
        </Text>
      </View>

      <View style={styles.voiceSection}>
        <ImprovedVoiceSearchButton
          onResult={handleVoiceResult}
          onError={handleVoiceError}
          onPermissionDenied={handlePermissionDenied}
          size="large"
          style={styles.voiceButton}
          showText={settings.showText}
          autoRetry={settings.autoRetry}
        />
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>⚙️ Ayarlar</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Maksimum Süre: {settings.maxDuration}s</Text>
          <TextInput
            style={styles.numberInput}
            value={settings.maxDuration.toString()}
            onChangeText={(text) => updateSettings('maxDuration', parseInt(text) || 10)}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Minimum Süre: {settings.minDuration}s</Text>
          <TextInput
            style={styles.numberInput}
            value={settings.minDuration.toString()}
            onChangeText={(text) => updateSettings('minDuration', parseInt(text) || 1)}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Otomatik Tekrar</Text>
          <Switch
            value={settings.autoRetry}
            onValueChange={(value) => updateSettings('autoRetry', value)}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Metin Göster</Text>
          <Switch
            value={settings.showText}
            onValueChange={(value) => updateSettings('showText', value)}
          />
        </View>
      </View>

      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Arama Sonuçları</Text>
          {searchResults.length > 0 && (
            <TouchableOpacity onPress={clearResults} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Temizle</Text>
            </TouchableOpacity>
          )}
        </View>

        {searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Henüz arama yapılmadı{'\n'}
              Mikrofon butonuna basarak başlayın
            </Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resultItem}
                onPress={() => speakText(result)}
              >
                <Text style={styles.resultText}>{result}</Text>
                <Text style={styles.speakIcon}>🔊</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>✨ Yeni Özellikler</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✅ Gelişmiş hata yönetimi</Text>
          <Text style={styles.featureItem}>✅ Otomatik retry mekanizması</Text>
          <Text style={styles.featureItem}>✅ Ayarlanabilir kayıt süreleri</Text>
          <Text style={styles.featureItem}>✅ İzin yönetimi iyileştirmeleri</Text>
          <Text style={styles.featureItem}>✅ Daha stabil ses kaydetme</Text>
          <Text style={styles.featureItem}>✅ Görsel geri bildirim</Text>
          <Text style={styles.featureItem}>✅ Animasyonlu arayüz</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  voiceSection: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceButton: {
    marginBottom: 20,
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsSection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
  },
  resultsSection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsList: {
    padding: 20,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  resultText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  speakIcon: {
    fontSize: 20,
    marginLeft: 12,
  },
  featuresSection: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default ImprovedVoiceSearchDemo;
