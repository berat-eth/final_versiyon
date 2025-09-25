const mysql = require('mysql2/promise');

// Database connection
const poolConfig = {
  host: '92.113.22.70',
  user: 'u987029066_Admin',
  password: 'Hugluadmin123',
  database: 'u987029066_mobil',
  port: 3306,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4'
};

async function updateProductPrices() {
  let connection = null;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(poolConfig);
    
    console.log('📊 Starting product price update...');
    
    // Bu script'i XML verisinden çalıştırmak yerine,
    // manuel olarak fiyat mantığını güncelleyeceğiz
    
    console.log('✅ Product price logic has been updated in the application code.');
    console.log('🔄 New products from XML will now use the correct price logic:');
    console.log('   - If IndirimliFiyat > 0: Use IndirimliFiyat');
    console.log('   - If IndirimliFiyat = 0: Use SatisFiyati');
    console.log('');
    console.log('🚀 To apply this to existing products, run the XML sync service.');
    console.log('   The next sync will update all product prices with the new logic.');
    
  } catch (error) {
    console.error('❌ Error updating product prices:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the update
updateProductPrices();
