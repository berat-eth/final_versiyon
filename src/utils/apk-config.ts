// APK Build Configuration
// This file contains specific configurations for APK builds

import { IP_SERVER_CANDIDATES } from './api-config';

// APK-specific server configurations
export const APK_SERVER_CONFIG = {
  // Primary server (domain-based)
  primary: 'https://api.zerodaysoftware.tr/api',
  
  // Backup servers (IP-based for better reliability)
  backup: IP_SERVER_CANDIDATES.map(ip => `https://${ip}/api`),
  
  // Fallback servers
  fallback: [
    'https://api.zerodaysoftware.tr/api',
    ...IP_SERVER_CANDIDATES.map(ip => `https://${ip}/api`)
  ],
  
  // Connection settings
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
};

// Test all available servers and return the best one
export async function findBestServerForApk(): Promise<string> {
  console.log('🔍 APK: Finding best server...');
  
  const servers = APK_SERVER_CONFIG.fallback;
  const testPromises = servers.map(async (url) => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APK_SERVER_CONFIG.timeout);
      
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        console.log(`✅ APK: Server ${url} responded in ${responseTime}ms`);
        return { url, responseTime, success: true };
      } else {
        console.log(`❌ APK: Server ${url} failed with status ${response.status}`);
        return { url, responseTime, success: false };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`❌ APK: Server ${url} error: ${error.message}`);
      return { url, responseTime, success: false };
    }
  });

  const results = await Promise.all(testPromises);
  const workingServers = results.filter(r => r.success);
  
  if (workingServers.length > 0) {
    // Sort by response time and return the fastest
    workingServers.sort((a, b) => a.responseTime - b.responseTime);
    const bestServer = workingServers[0].url;
    console.log(`✅ APK: Best server found: ${bestServer} (${workingServers[0].responseTime}ms)`);
    return bestServer;
  }
  
  // Fallback to primary server
  console.log('⚠️ APK: No working servers found, using primary server');
  return APK_SERVER_CONFIG.primary;
}

// Enhanced connection test for APK
export async function testApkConnection(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APK_SERVER_CONFIG.timeout);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Huglu-Mobile-App/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log(`❌ APK: Connection test failed for ${url}:`, error.message);
    return false;
  }
}

// Get server status for debugging
export async function getServerStatus(): Promise<{
  primary: boolean;
  backup: boolean[];
  bestServer: string | null;
}> {
  const primaryStatus = await testApkConnection(APK_SERVER_CONFIG.primary);
  const backupStatus = await Promise.all(
    APK_SERVER_CONFIG.backup.map(server => testApkConnection(server))
  );
  
  let bestServer: string | null = null;
  if (primaryStatus) {
    bestServer = APK_SERVER_CONFIG.primary;
  } else {
    const workingBackup = APK_SERVER_CONFIG.backup.find((_, index) => backupStatus[index]);
    if (workingBackup) {
      bestServer = workingBackup;
    }
  }
  
  return {
    primary: primaryStatus,
    backup: backupStatus,
    bestServer
  };
}
