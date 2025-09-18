import * as SecureStore from 'expo-secure-store';

const KEY_API = 'auth_api_key_v1';
const KEY_TENANT = 'auth_tenant_id_v1';

export async function setApiKey(key: string): Promise<void> {
  if (!key) return;
  await SecureStore.setItemAsync(KEY_API, key, {
    keychainService: KEY_API,
  });
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_API);
  } catch {
    return null;
  }
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_API);
}

export async function setTenantId(tenantId: string): Promise<void> {
  if (!tenantId) return;
  await SecureStore.setItemAsync(KEY_TENANT, tenantId, {
    keychainService: KEY_TENANT,
  });
}

export async function getTenantId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_TENANT);
  } catch {
    return null;
  }
}

export async function clearTenant(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_TENANT);
}


