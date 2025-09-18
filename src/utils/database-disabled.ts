// SQLite database disabled to prevent crashes
// All database operations will return empty results or success

// Mock database functions to prevent crashes
export const getDatabase = async () => {
  throw new Error('Local database disabled');
};

// Mock offline queue functions
export const addToOfflineQueue = async (endpoint: string, method: string, data?: any) => {
  return Promise.resolve();
};

export const getOfflineQueue = async () => {
  return Promise.resolve([]);
};

export const removeFromOfflineQueue = async (id: number) => {
  return Promise.resolve();
};

// Mock database object
const db = {
  runAsync: async (sql: string, params: any[] = []) => {
    return Promise.resolve({ changes: 0, lastInsertRowid: 0 });
  },
  getAllAsync: async (sql: string, params: any[] = []) => {
    return Promise.resolve([]);
  },
  getFirstAsync: async (sql: string, params: any[] = []) => {
    return Promise.resolve(null);
  },
  execAsync: async (sql: string) => {
    return Promise.resolve();
  },
  execSync: (sql: string) => {
    return;
  },
  closeSync: () => {
    return;
  }
};

export default db;

export interface OfflineQueueItem {
  id: number;
  endpoint: string;
  method: string;
  data: any;
  timestamp: string;
}
