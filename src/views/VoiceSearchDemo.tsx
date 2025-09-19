import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import VoiceSearchButton from '../components/VoiceSearchButton';
import { voiceSearchService } from '../services/VoiceSearchService';

const VoiceSearchDemo: React.FC = () => {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const handleVoiceResult = (text: string) => {
    console.log('🎤 Sesli arama sonucu:', text);
    setSearchResults(prev => [text, ...prev.slice(0, 9)]);
  };

  const handleVoiceError = (error: string) => {
    Alert.alert('Ses Tanıma Hatası', error);
  };

  const handleStartListening = () => {
    setIsListening(true);
  };

  const handleEndListening = () => {
    setIsListening(false);
  };

  const clearResults = () => {
    setSearchResults([]);
  };

  const speakText = async (text: string) => {
    try {
      await voiceSearchService.speakText(text);
    } catch (error) {
      Alert.alert('Hata', 'Metin okunamadı');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎤 Sesli Arama Demo</Text>
        <Text style={styles.subtitle}>
          Mikrofon butonuna basıp konuşarak arama yapabilirsiniz
        </Text>
      </View>

      <View style={styles.voiceSection}>
        <VoiceSearchButton
          onResult={handleVoiceResult}
          onError={handleVoiceError}
          size="large"
          style={styles.voiceButton}
        />
        
        {isListening && (
          <Text style={styles.listeningText}>
            🎤 Dinliyorum... Konuşun
          </Text>
        )}
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
        <Text style={styles.featuresTitle}>Özellikler</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✅ Türkçe ses tanıma</Text>
          <Text style={styles.featureItem}>✅ Gerçek zamanlı metin görüntüleme</Text>
          <Text style={styles.featureItem}>✅ Metin okuma (TTS)</Text>
          <Text style={styles.featureItem}>✅ Arama geçmişi</Text>
          <Text style={styles.featureItem}>✅ Mikrofon izin yönetimi</Text>
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
  listeningText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
    textAlign: 'center',
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

export default VoiceSearchDemo;
