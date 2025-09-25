import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Typography, Shadows } from '../theme/theme';
import { AnythingLLMService, LLMConfig } from '../services/AnythingLLMService';
import { ModernCard } from '../components/ui/ModernCard';
import { ModernButton } from '../components/ui/ModernButton';
import { ModernInput } from '../components/ui/ModernInput';

interface AnythingLLMSettingsScreenProps {
  navigation: any;
}

export const AnythingLLMSettingsScreen: React.FC<AnythingLLMSettingsScreenProps> = ({ navigation }) => {
  const [config, setConfig] = useState<LLMConfig>({
    apiUrl: 'http://localhost:3001',
    apiKey: '',
    workspaceSlug: 'huglu-mobil',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  });
  
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const savedConfig = await AnythingLLMService.getConfig();
      setConfig(savedConfig);
    } catch (error) {
      console.error('Config load error:', error);
      Alert.alert('Hata', 'Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      await AnythingLLMService.saveConfig(config);
      Alert.alert('Başarılı', 'Ayarlar kaydedildi!');
    } catch (error) {
      console.error('Config save error:', error);
      Alert.alert('Hata', 'Ayarlar kaydedilemedi');
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const result = await AnythingLLMService.testConnection();
      
      if (result.success) {
        Alert.alert('✅ Başarılı', result.message);
      } else {
        Alert.alert('❌ Hata', result.message);
      }
    } catch (error) {
      Alert.alert('❌ Hata', 'Bağlantı testi başarısız');
    } finally {
      setTesting(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      setLoadingWorkspaces(true);
      // Önce mevcut konfigürasyonu kaydet
      await AnythingLLMService.saveConfig(config);
      
      const workspaceList = await AnythingLLMService.listWorkspaces();
      setWorkspaces(workspaceList);
      
      if (workspaceList.length === 0) {
        Alert.alert('Bilgi', 'Workspace bulunamadı. API ayarlarınızı kontrol edin.');
      }
    } catch (error) {
      console.error('Workspace load error:', error);
      Alert.alert('Hata', 'Workspace\'ler yüklenemedi');
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const resetConfig = () => {
    Alert.alert(
      'Ayarları Sıfırla',
      'Tüm AnythingLLM ayarları silinecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            await AnythingLLMService.resetConfig();
            await loadConfig();
            Alert.alert('Başarılı', 'Ayarlar sıfırlandı');
          },
        },
      ]
    );
  };

  const testSmartResponse = async () => {
    try {
      setTesting(true);
      const response = await AnythingLLMService.getSmartResponse(
        'Merhaba, nasılsınız? Test mesajı.'
      );
      Alert.alert('Test Yanıtı', response);
    } catch (error) {
      Alert.alert('Hata', 'Test mesajı gönderilemedi');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AnythingLLM Ayarları</Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveConfig}>
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Genel Ayarlar */}
        <ModernCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="settings" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Genel Ayarlar</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>AnythingLLM Aktif</Text>
            <Switch
              value={config.enabled}
              onValueChange={(value) => setConfig({ ...config, enabled: value })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={config.enabled ? Colors.textOnPrimary : Colors.textLight}
            />
          </View>

          <Text style={styles.settingDescription}>
            AnythingLLM entegrasyonunu etkinleştirin. Bu özellik aktif olduğunda chatbot RAG (Retrieval-Augmented Generation) desteği kullanacaktır.
          </Text>
        </ModernCard>

        {/* API Ayarları */}
        <ModernCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="cloud" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>API Ayarları</Text>
          </View>

          <ModernInput
            label="API URL"
            value={config.apiUrl}
            onChangeText={(text) => setConfig({ ...config, apiUrl: text })}
            placeholder="http://localhost:3001"
            style={styles.input}
          />

          <ModernInput
            label="API Key (Opsiyonel)"
            value={config.apiKey}
            onChangeText={(text) => setConfig({ ...config, apiKey: text })}
            placeholder="Bearer token..."
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <ModernButton
              title="Bağlantıyı Test Et"
              onPress={testConnection}
              loading={testing}
              variant="outline"
              style={styles.testButton}
            />
          </View>
        </ModernCard>

        {/* Workspace Ayarları */}
        <ModernCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="work" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Workspace Ayarları</Text>
          </View>

          <ModernInput
            label="Workspace Slug"
            value={config.workspaceSlug}
            onChangeText={(text) => setConfig({ ...config, workspaceSlug: text })}
            placeholder="huglu-mobil"
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <ModernButton
              title="Workspace'leri Yükle"
              onPress={loadWorkspaces}
              loading={loadingWorkspaces}
              variant="outline"
              style={styles.testButton}
            />
          </View>

          {workspaces.length > 0 && (
            <View style={styles.workspaceList}>
              <Text style={styles.workspaceListTitle}>Mevcut Workspace'ler:</Text>
              {workspaces.map((workspace, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.workspaceItem,
                    workspace.slug === config.workspaceSlug && styles.workspaceItemSelected
                  ]}
                  onPress={() => setConfig({ ...config, workspaceSlug: workspace.slug })}
                >
                  <Text style={[
                    styles.workspaceItemText,
                    workspace.slug === config.workspaceSlug && styles.workspaceItemTextSelected
                  ]}>
                    {workspace.name} ({workspace.slug})
                  </Text>
                  {workspace.slug === config.workspaceSlug && (
                    <Icon name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ModernCard>

        {/* Model Ayarları */}
        <ModernCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="psychology" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Model Ayarları</Text>
          </View>

          <ModernInput
            label="Model"
            value={config.model}
            onChangeText={(text) => setConfig({ ...config, model: text })}
            placeholder="gpt-3.5-turbo"
            style={styles.input}
          />

          <ModernInput
            label="Temperature (0.0 - 1.0)"
            value={config.temperature?.toString() || '0.7'}
            onChangeText={(text) => {
              const temp = parseFloat(text) || 0.7;
              setConfig({ ...config, temperature: Math.min(1.0, Math.max(0.0, temp)) });
            }}
            placeholder="0.7"
            keyboardType="numeric"
            style={styles.input}
          />

          <ModernInput
            label="Max Tokens"
            value={config.maxTokens?.toString() || '1000'}
            onChangeText={(text) => {
              const tokens = parseInt(text) || 1000;
              setConfig({ ...config, maxTokens: Math.max(100, tokens) });
            }}
            placeholder="1000"
            keyboardType="numeric"
            style={styles.input}
          />
        </ModernCard>

        {/* Test Bölümü */}
        <ModernCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="bug-report" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Test</Text>
          </View>

          <View style={styles.buttonRow}>
            <ModernButton
              title="Test Mesajı Gönder"
              onPress={testSmartResponse}
              loading={testing}
              variant="primary"
              style={styles.testButton}
              disabled={!config.enabled}
            />
          </View>

          <Text style={styles.testDescription}>
            Bu buton AnythingLLM ile test mesajı gönderir ve yanıtı gösterir.
          </Text>
        </ModernCard>

        {/* Tehlikeli İşlemler */}
        <ModernCard style={{ ...styles.section, borderColor: Colors.error, borderWidth: 1 }}>
          <View style={styles.sectionHeader}>
            <Icon name="warning" size={24} color={Colors.error} />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Tehlikeli İşlemler</Text>
          </View>

          <ModernButton
            title="Tüm Ayarları Sıfırla"
            onPress={resetConfig}
            variant="outline"
            style={[styles.testButton, { borderColor: Colors.error }]}
          />
        </ModernCard>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: Spacing.md,
    color: Colors.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.small,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.headlineSmall,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  saveButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    ...Typography.labelLarge,
    color: Colors.textOnPrimary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.titleLarge,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  settingLabel: {
    ...Typography.labelLarge,
    color: Colors.text,
  },
  settingDescription: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    lineHeight: 20,
  },
  input: {
    marginBottom: Spacing.md,
  },
  buttonRow: {
    marginTop: Spacing.md,
  },
  testButton: {
    alignSelf: 'stretch',
  },
  workspaceList: {
    marginTop: Spacing.lg,
  },
  workspaceListTitle: {
    ...Typography.labelLarge,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  workspaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workspaceItemSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  workspaceItemText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    flex: 1,
  },
  workspaceItemTextSelected: {
    ...Typography.labelLarge,
    color: Colors.primary,
  },
  testDescription: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  dangerTitle: {
    color: Colors.error,
  },
});
