import db, { getDatabase } from './database';

// Retry function for database operations
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.warn(`Database operation attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

export const setupDatabase = async () => {
  try {
    console.log('🗄️ Setting up database...');
    
    // Get database connection with retry logic
    const database = await retryOperation(() => getDatabase());
    
    // SQLite foreign key desteğini etkinleştir
    await retryOperation(() => database.runAsync('PRAGMA foreign_keys = ON'));
    console.log('✅ Foreign keys enabled');
    
    // Execute all table creation in a single transaction to prevent locks
    await retryOperation(async () => {
      await database.execAsync('BEGIN TRANSACTION');
      
      try {
        // Create products table if not exists
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            image TEXT,
            stock INTEGER DEFAULT 0,
            brand TEXT,
            rating REAL DEFAULT 0,
            reviewCount INTEGER DEFAULT 0
          )
        `);
        console.log('✅ Products table ready');

        // Create product_variations table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS product_variations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
          )
        `);

        // Create product_variation_options table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS product_variation_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            variationId INTEGER NOT NULL,
            value TEXT NOT NULL,
            priceModifier REAL DEFAULT 0,
            stock INTEGER DEFAULT 0,
            sku TEXT,
            image TEXT,
            FOREIGN KEY (variationId) REFERENCES product_variations (id) ON DELETE CASCADE
          )
        `);

        // Update cart table to include variation support
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            variationString TEXT DEFAULT '',
            selectedVariations TEXT DEFAULT '{}',
            FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
          )
        `);

        // Create users table if not exists
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create reviews table if not exists
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            userName TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);

        // Create orders table if not exists
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            totalAmount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            shippingAddress TEXT,
            paymentMethod TEXT,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);

        // Create order_items table if not exists
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            selectedVariations TEXT DEFAULT '{}',
            FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ Order items table ready');

        // Create user_preferences table if not exists - DROP and recreate to fix schema issues
        await database.runAsync(`DROP TABLE IF EXISTS user_preferences`);
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            preferenceKey TEXT NOT NULL,
            preferenceValue TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(userId, preferenceKey)
          )
        `);
        console.log('✅ User preferences table ready');

        // Create user_sessions table for better session management
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            sessionToken TEXT NOT NULL,
            expiresAt TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ User sessions table ready');

        // Create cache tables for offline data - DROP and recreate to fix schema issues
        await database.runAsync(`DROP TABLE IF EXISTS cache_products`);
        await database.runAsync(`DROP TABLE IF EXISTS cache_categories`);
        await database.runAsync(`DROP TABLE IF EXISTS cache_general`);
        await database.runAsync(`DROP TABLE IF EXISTS cache_search`);
        
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS cache_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cacheKey TEXT UNIQUE NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            size INTEGER DEFAULT 0,
            isOffline INTEGER DEFAULT 0
          )
        `);
        console.log('✅ Cache products table ready');

        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS cache_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cacheKey TEXT UNIQUE NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            size INTEGER DEFAULT 0,
            isOffline INTEGER DEFAULT 0
          )
        `);
        console.log('✅ Cache categories table ready');

        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS cache_general (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cacheKey TEXT UNIQUE NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            size INTEGER DEFAULT 0,
            isOffline INTEGER DEFAULT 0
          )
        `);
        console.log('✅ Cache general table ready');

        // Create user_wallet table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_wallet (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            balance REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'TRY',
            lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ User wallet table ready');

        // Create user_settings table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            settingKey TEXT NOT NULL,
            settingValue TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(userId, settingKey)
          )
        `);
        console.log('✅ User settings table ready');

        // Create user_activity_log table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            activityType TEXT NOT NULL,
            activityData TEXT,
            ipAddress TEXT,
            userAgent TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ User activity log table ready');

        // Create user_addresses table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            addressType TEXT DEFAULT 'shipping',
            fullName TEXT NOT NULL,
            phone TEXT,
            address TEXT NOT NULL,
            city TEXT,
            state TEXT,
            postalCode TEXT,
            country TEXT DEFAULT 'Turkey',
            isDefault INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ User addresses table ready');

        // Create user_favorites table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
            UNIQUE(userId, productId)
          )
        `);
        console.log('✅ User favorites table ready');

        // Create user_notifications table
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS user_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            isRead INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ User notifications table ready');

        // Commit the transaction
        await database.execAsync('COMMIT');
        console.log('✅ Database transaction committed successfully');
        
      } catch (error) {
        // Rollback the transaction on error
        await database.execAsync('ROLLBACK');
        console.error('❌ Database transaction rolled back due to error:', error);
        throw error;
      }
    });

    console.log('✅ Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database setup error:', error);
    throw error; // Re-throw to let caller handle it
  }
};