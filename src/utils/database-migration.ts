import * as SQLite from 'expo-sqlite';

/**
 * Database migration utility for SQLite cache
 * Handles schema updates and data migration
 */
export class DatabaseMigration {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    try {
      // Check if new tables exist
      const result = await this.db.getFirstAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='cache_products_v2'
      `);
      
      return !result; // If table doesn't exist, migration is needed
    } catch (error) {
      console.log('Migration check failed, assuming migration needed:', error);
      return true;
    }
  }

  /**
   * Perform database migration
   */
  async migrate(): Promise<void> {
    try {
      console.log('🔄 Starting database migration...');
      
      // Disable foreign key checks temporarily
      await this.db.execAsync('PRAGMA foreign_keys=OFF');
      
      // Drop old tables if they exist
      await this.dropOldTables();
      
      // Create new tables with updated schema
      await this.createNewTables();
      
      // Re-enable foreign key checks
      await this.db.execAsync('PRAGMA foreign_keys=ON');
      
      console.log('✅ Database migration completed successfully');
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      throw error;
    }
  }

  /**
   * Drop old tables
   */
  private async dropOldTables(): Promise<void> {
    const oldTables = [
      'cache_products',
      'cache_categories', 
      'cache_general',
      'user_settings',
      'user_wallet',
      'user_favorites',
      'cart_items',
      'orders'
    ];

    for (const table of oldTables) {
      try {
        await this.db.execAsync(`DROP TABLE IF EXISTS ${table}`);
        console.log(`🗑️ Dropped old table: ${table}`);
      } catch (error) {
        console.warn(`⚠️ Could not drop table ${table}:`, error);
      }
    }
  }

  /**
   * Create new tables with updated schema
   */
  private async createNewTables(): Promise<void> {
    // Cache tables (no foreign keys needed)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache_products_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cacheKey TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        size INTEGER DEFAULT 0,
        isOffline INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache_categories_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cacheKey TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        size INTEGER DEFAULT 0,
        isOffline INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache_general_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cacheKey TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        size INTEGER DEFAULT 0,
        isOffline INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User data tables (simplified, no foreign keys)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_settings_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        settingKey TEXT NOT NULL,
        settingValue TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, settingKey)
      )
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_wallet_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        balance REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'TRY',
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId)
      )
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_favorites_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productData TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, productId)
      )
    `);

    // Create indexes for better performance
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_cache_products_key ON cache_products_v2(cacheKey)');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_cache_categories_key ON cache_categories_v2(cacheKey)');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_cache_general_key ON cache_general_v2(cacheKey)');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings_v2(userId)');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_user_wallet_user ON user_wallet_v2(userId)');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites_v2(userId)');

    console.log('✅ Created new tables with updated schema');
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    try {
      await this.db.execAsync('DELETE FROM cache_products_v2');
      await this.db.execAsync('DELETE FROM cache_categories_v2');
      await this.db.execAsync('DELETE FROM cache_general_v2');
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.warn('⚠️ Could not clear cache:', error);
    }
  }

  /**
   * Get database info
   */
  async getDatabaseInfo(): Promise<any> {
    try {
      const tables = await this.db.getAllAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%_v2'
        ORDER BY name
      `);

      const info = {
        tables: tables.map((t: any) => t.name),
        totalTables: tables.length
      };

      return info;
    } catch (error) {
      console.error('❌ Error getting database info:', error);
      return { tables: [], totalTables: 0 };
    }
  }
}

export default DatabaseMigration;
