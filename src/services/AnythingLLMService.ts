import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LLMConfig {
  apiUrl: string;
  apiKey?: string;
  workspaceSlug?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
}

export interface LLMMessage {
  message: string;
  mode: 'chat' | 'query';
  sessionId?: string;
}

export interface LLMResponse {
  id: string;
  type: 'abort' | 'textResponseChunk';
  textResponse: string;
  sources: any[];
  close: boolean;
  error: boolean;
}

export class AnythingLLMService {
  private static readonly CONFIG_KEY = 'anythingllm_config';
  private static readonly SESSION_KEY = 'anythingllm_session';
  
  private static defaultConfig: LLMConfig = {
    apiUrl: 'http://localhost:3001',
    apiKey: '',
    workspaceSlug: 'huglu-mobil',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: false
  };

  // Konfigürasyonu kaydet
  static async saveConfig(config: Partial<LLMConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(updatedConfig));
    } catch (error) {
      console.error('LLM Config save error:', error);
      throw error;
    }
  }

  // Konfigürasyonu getir
  static async getConfig(): Promise<LLMConfig> {
    try {
      const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configStr) {
        const config = JSON.parse(configStr);
        return { ...this.defaultConfig, ...config };
      }
      return this.defaultConfig;
    } catch (error) {
      console.error('LLM Config load error:', error);
      return this.defaultConfig;
    }
  }

  // Session ID oluştur veya getir
  static async getSessionId(): Promise<string> {
    try {
      let sessionId = await AsyncStorage.getItem(this.SESSION_KEY);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(this.SESSION_KEY, sessionId);
      }
      return sessionId;
    } catch (error) {
      console.error('Session ID error:', error);
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // AnythingLLM API'ye mesaj gönder
  static async sendMessage(message: string, mode: 'chat' | 'query' = 'chat'): Promise<string> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        throw new Error('AnythingLLM is not enabled');
      }

      if (!config.apiUrl) {
        throw new Error('AnythingLLM API URL is not configured');
      }

      const sessionId = await this.getSessionId();
      
      const requestBody: LLMMessage = {
        message,
        mode,
        sessionId
      };

      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // API Key varsa ekle
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const url = `${config.apiUrl}/api/v1/workspace/${config.workspaceSlug}/chat`;
      
      console.log('🤖 AnythingLLM Request:', { url, body: requestBody });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AnythingLLM API Error:', response.status, errorText);
        throw new Error(`AnythingLLM API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ AnythingLLM Response:', data);

      // Response format'ını kontrol et
      if (data.textResponse) {
        return data.textResponse;
      } else if (data.message) {
        return data.message;
      } else if (typeof data === 'string') {
        return data;
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        return 'Üzgünüm, beklenmeyen bir yanıt formatı aldım.';
      }

    } catch (error: any) {
      console.error('❌ AnythingLLM Service Error:', error);
      
      if (error.message?.includes('Network request failed')) {
        return 'AnythingLLM sunucusuna bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.';
      } else if (error.message?.includes('timeout')) {
        return 'AnythingLLM yanıt süresi aşıldı. Lütfen tekrar deneyin.';
      } else if (error.message?.includes('not enabled')) {
        return 'AnythingLLM entegrasyonu aktif değil. Ayarlardan etkinleştirin.';
      } else {
        return `AnythingLLM hatası: ${error.message || 'Bilinmeyen hata'}`;
      }
    }
  }

  // Bağlantıyı test et
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getConfig();
      
      if (!config.apiUrl) {
        return { success: false, message: 'API URL yapılandırılmamış' };
      }

      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${config.apiUrl}/api/v1/system/check`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: 'AnythingLLM bağlantısı başarılı!' };
      } else {
        return { success: false, message: `Bağlantı hatası: ${response.status}` };
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: `Bağlantı testi başarısız: ${error.message}` 
      };
    }
  }

  // Workspace'leri listele
  static async listWorkspaces(): Promise<any[]> {
    try {
      const config = await this.getConfig();
      
      if (!config.apiUrl) {
        throw new Error('API URL yapılandırılmamış');
      }

      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${config.apiUrl}/api/v1/workspaces`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.workspaces || [];
      } else {
        console.error('Workspace listesi alınamadı:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Workspace listesi hatası:', error);
      return [];
    }
  }

  // Session'ı temizle
  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Session clear error:', error);
    }
  }

  // Konfigürasyonu sıfırla
  static async resetConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CONFIG_KEY);
      await this.clearSession();
    } catch (error) {
      console.error('Config reset error:', error);
    }
  }

  // RAG ile soru sor (query mode)
  static async queryRAG(question: string): Promise<string> {
    return this.sendMessage(question, 'query');
  }

  // Normal sohbet (chat mode)
  static async chat(message: string): Promise<string> {
    return this.sendMessage(message, 'chat');
  }

  // Akıllı yanıt seçici - RAG mı yoksa normal chat mi?
  static async getSmartResponse(message: string, context?: any): Promise<string> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        return 'AnythingLLM entegrasyonu aktif değil.';
      }

      // Eğer ürün, sipariş, teknik sorular varsa RAG kullan
      const ragKeywords = [
        'ürün', 'sipariş', 'kargo', 'iade', 'fiyat', 'stok', 
        'teslimat', 'ödeme', 'garanti', 'özellikleri', 'nasıl',
        'neden', 'ne zaman', 'hangi', 'kaç', 'ne kadar'
      ];

      const shouldUseRAG = ragKeywords.some(keyword => 
        message.toLowerCase().includes(keyword.toLowerCase())
      );

      if (shouldUseRAG) {
        console.log('🔍 Using RAG mode for:', message);
        return await this.queryRAG(message);
      } else {
        console.log('💬 Using chat mode for:', message);
        return await this.chat(message);
      }
    } catch (error) {
      console.error('Smart response error:', error);
      return 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.';
    }
  }
}
