// Network configuration utility for API service
import { apiService } from './api-service';
import { detectBestServer, getApiConfig } from './api-config';

export interface NetworkConfig {
  autoDetectOnStart: boolean;
  preferredUrls: string[];
  fallbackUrls: string[];
  detectionTimeout: number;
}

export const defaultNetworkConfig: NetworkConfig = {
  autoDetectOnStart: true,
  preferredUrls: [
    'http://localhost:3000/api',
    'http://127.0.0.1:3000/api'
  ],
  fallbackUrls: [
    'http://192.168.1.1:3000/api',
    'http://192.168.0.1:3000/api',
    'http://10.0.0.1:3000/api'
  ],
  detectionTimeout: 15000 // 15 seconds - increased for better detection
};

// Initialize network configuration
export async function initializeNetworkConfig(config: NetworkConfig = defaultNetworkConfig): Promise<void> {
  if (__DEV__) console.log('🌐 Initializing network configuration...');
  
  if (config.autoDetectOnStart) {
    try {
      // Try to detect best server first (includes remote servers)
      const bestServer = await detectBestServer();
      apiService.setApiUrl(bestServer);
      if (__DEV__) console.log(`✅ Best server detected: ${bestServer}`);
      
      // Fallback to auto-detection if best server detection fails
      if (!bestServer || bestServer === 'http://localhost:3000/api') {
        const detectedUrl = await apiService.autoDetectApiUrl();
        if (__DEV__) console.log(`✅ Network configuration initialized with URL: ${detectedUrl}`);
      }
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Network auto-detection failed during initialization:', error);
      // Fall back to configuration-based URL
      const apiConfig = getApiConfig();
      apiService.setApiUrl(apiConfig.baseUrl);
      if (__DEV__) console.log(`🔄 Using configured API URL: ${apiConfig.baseUrl}`);
    }
  }
  
  // Start network monitoring
  apiService.startNetworkMonitoring(30000); // Check every 30 seconds
}

// Manual network detection
export async function detectNetwork(): Promise<string> {
  if (__DEV__) console.log('🔍 Manual network detection triggered...');
  return await apiService.autoDetectApiUrl();
}

// Set custom API URL
export function setCustomApiUrl(url: string): void {
  if (__DEV__) console.log(`🌐 Setting custom API URL: ${url}`);
  apiService.setApiUrl(url);
}

// Get current API URL
export function getCurrentApiUrl(): string {
  return apiService.getCurrentApiUrl();
}

// Test current connection
export async function testCurrentConnection(): Promise<boolean> {
  const result = await apiService.testConnection();
  return result.success;
}
