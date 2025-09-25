const mysql = require('mysql2/promise');

async function checkProducts() {
  const pool = mysql.createPool({
    host: '92.113.22.70',
    user: 'u987029066_Admin',
    password: '38cdfD8217..',
    database: 'u987029066_mobil'
  });

  try {
    // Toplam ürün sayısını kontrol et
    const [countRows] = await pool.execute('SELECT COUNT(*) as total FROM products');
    console.log('📊 Toplam ürün sayısı:', countRows[0].total);

    // Son 10 ürünü listele
    const [recentRows] = await pool.execute('SELECT id, name, price, category, lastUpdated FROM products ORDER BY lastUpdated DESC LIMIT 10');
    console.log('\n📋 Son 10 ürün:');
    recentRows.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.price} TL (${product.category}) - ${product.lastUpdated}`);
    });

    // Kategori dağılımını kontrol et
    const [categoryRows] = await pool.execute('SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC');
    console.log('\n📂 Kategori dağılımı:');
    categoryRows.forEach(cat => {
      console.log(`${cat.category}: ${cat.count} ürün`);
    });

    // Tenant kontrolü
    const [tenantRows] = await pool.execute('SELECT id, name FROM tenants');
    console.log('\n🏢 Tenant bilgileri:');
    tenantRows.forEach(tenant => {
      console.log(`ID: ${tenant.id}, Name: ${tenant.name}`);
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await pool.end();
  }
}

checkProducts();
