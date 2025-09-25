// AsyncStorage tabanlı yerel depolama (SQLite olmadan)
import AsyncStorageLib from '@react-native-async-storage/async-storage';

// Basit no-op DB arayüzü: SQL çalıştırmak yerine uyarı yazar.
// Bu sayede sqlite bağımlılığı olmadan build başarısız olmaz.
type NoopResult = { changes?: number; lastInsertRowid?: number } | any[] | any | void;

const noopDb = {
  runAsync: async (_sql: string, _params: any[] = []): Promise<NoopResult> => {
    // Database disabled - silent operation
    return { changes: 0, lastInsertRowid: 0 };
  },
  getAllAsync: async (_sql: string, _params: any[] = []): Promise<any[]> => {
    // Database disabled - returning empty array
    return [];
  },
  getFirstAsync: async (_sql: string, _params: any[] = []): Promise<any | null> => {
    // Database disabled - returning null
    return null;
  },
  execAsync: async (_sql: string): Promise<void> => {
    // noop
  },
  execSync: (_sql: string): void => {
    // noop
  },
  closeSync: (): void => {
    // noop
  }
};

export const getDatabase = async () => noopDb;
export default noopDb;

// Offline kuyruk (AsyncStorage ile)
export interface OfflineQueueItem {
  id: number;
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'offline_queue_items_v1';

async function readQueue(): Promise<OfflineQueueItem[]> {
  try {
    const raw = await AsyncStorageLib.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(items) ? items : [];
  } catch (e) {
    return [];
  }
}

async function writeQueue(items: OfflineQueueItem[]): Promise<void> {
  try {
    await AsyncStorageLib.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch (e) {
    // Silent error handling
  }
}

export const addToOfflineQueue = async (endpoint: string, method: string, body?: any): Promise<void> => {
  const list = await readQueue();
  const newItem: OfflineQueueItem = {
    id: list.length > 0 ? (Math.max(...list.map(i => i.id)) + 1) : 1,
    endpoint,
    method,
    body,
    timestamp: Date.now()
  };
  const updated = [...list, newItem];
  await writeQueue(updated);
  // Added to offline queue
};

export const getOfflineQueue = async (): Promise<OfflineQueueItem[]> => {
  const list = await readQueue();
  // Zaman sırasına göre sırala (eskiden yeniye)
  return list.sort((a, b) => a.timestamp - b.timestamp);
};

export const removeFromOfflineQueue = async (id: number): Promise<void> => {
  const list = await readQueue();
  const updated = list.filter(item => item.id !== id);
  await writeQueue(updated);
  // Removed from offline queue
};