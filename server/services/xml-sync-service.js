const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');

class XmlSyncService {
  constructor(pool) {
    this.pool = pool;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      errors: 0
    };
  }

  // XML kaynakları konfigürasyonu
  getXmlSources() {
    return [
      {
        name: 'Huglu Outdoor',
        url: 'https://www.hugluoutdoor.com/TicimaxXml/2AF3B156D82546DCA5F28C2012E64724/',
        category: 'outdoor',
        priority: 1,
        type: 'ticimax' // XML tipini belirt
      }
    ];
  }

  // XML veriyi çek ve parse et
  async fetchAndParseXml(xmlSource) {
    try {
      console.log(`📡 Fetching XML from: ${xmlSource.name} (${xmlSource.url})`);
      
      const response = await axios.get(xmlSource.url, {
        timeout: 30000, // 30 saniye timeout
        headers: {
          'User-Agent': 'Huglu-Backend-Sync/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlData = response.data;
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: true,
        trim: true
      });

      const result = await parser.parseStringPromise(xmlData);
      console.log(`✅ XML parsed successfully from ${xmlSource.name}`);
      
      // Debug: XML yapısını kontrol et
      console.log('🔍 XML Structure Debug:');
      console.log('Root exists:', !!result.Root);
      if (result.Root) {
        console.log('Root keys:', Object.keys(result.Root));
        console.log('Urunler exists:', !!result.Root.Urunler);
        if (result.Root.Urunler) {
          console.log('Urunler keys:', Object.keys(result.Root.Urunler));
          console.log('Urun exists:', !!result.Root.Urunler.Urun);
          if (result.Root.Urunler.Urun) {
            console.log('Urun type:', typeof result.Root.Urunler.Urun);
            console.log('Urun length:', Array.isArray(result.Root.Urunler.Urun) ? result.Root.Urunler.Urun.length : 'Not array');
          }
        }
      }
      
      // Tüm XML yapısını göster (ilk 1000 karakter)
      console.log('📄 Full XML structure preview:');
      console.log(JSON.stringify(result, null, 2).substring(0, 1000));
      
      // Hata kontrolü
      if (result.Root && result.Root.ErrorMessage) {
        throw new Error(`XML Error: ${result.Root.ErrorMessage}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error fetching XML from ${xmlSource.name}:`, error.message);
      throw error;
    }
  }

  // XML veriyi ürün formatına dönüştür
  parseXmlToProducts(xmlData, source) {
    try {
      const products = [];
      
      // Ticimax XML formatı için
      if (source.type === 'ticimax' && xmlData.Root && xmlData.Root.Urunler && xmlData.Root.Urunler.Urun) {
        const items = Array.isArray(xmlData.Root.Urunler.Urun) 
          ? xmlData.Root.Urunler.Urun 
          : [xmlData.Root.Urunler.Urun];

        console.log(`🔍 Found ${items.length} products in Ticimax XML`);
        
        items.forEach((item, index) => {
          try {
            const product = this.mapTicimaxProduct(item, source);
            if (product) {
              products.push(product);
            }
          } catch (itemError) {
            console.warn(`⚠️ Error parsing Ticimax item ${index}:`, itemError.message);
          }
        });
      }
      // RSS formatı için (eski kod)
      else if (xmlData.rss && xmlData.rss.channel && xmlData.rss.channel.item) {
        const items = Array.isArray(xmlData.rss.channel.item) 
          ? xmlData.rss.channel.item 
          : [xmlData.rss.channel.item];

        items.forEach((item, index) => {
          try {
            const product = this.mapXmlItemToProduct(item, source);
            if (product) {
              products.push(product);
            }
          } catch (itemError) {
            console.warn(`⚠️ Error parsing RSS item ${index} from ${source.name}:`, itemError.message);
          }
        });
      }

      console.log(`📦 Parsed ${products.length} products from ${source.name}`);
      return products;
    } catch (error) {
      console.error(`❌ Error parsing XML to products from ${source.name}:`, error.message);
      throw error;
    }
  }

  // Ticimax XML item'ını ürün objesine dönüştür
  mapTicimaxProduct(item, source) {
    try {
      // Resimleri al ve ayrı sütunlara böl
      let images = [];
      if (item.Resimler && item.Resimler.Resim) {
        images = Array.isArray(item.Resimler.Resim) 
          ? item.Resimler.Resim 
          : [item.Resimler.Resim];
      }

      // Görselleri ayrı sütunlara böl
      const image1 = images.length > 0 ? images[0] : '';
      const image2 = images.length > 1 ? images[1] : '';
      const image3 = images.length > 2 ? images[2] : '';
      const image4 = images.length > 3 ? images[3] : '';
      const image5 = images.length > 4 ? images[4] : '';

      // Varyasyonları al ve detaylı işle
      let variations = [];
      let variationDetails = [];
      if (item.UrunSecenek && item.UrunSecenek.Secenek) {
        variations = Array.isArray(item.UrunSecenek.Secenek) 
          ? item.UrunSecenek.Secenek 
          : [item.UrunSecenek.Secenek];

        // Her varyasyon için detaylı bilgi topla
        variations.forEach(variation => {
          const beden = variation.EkSecenekOzellik?.Ozellik?.Deger || '';
          const stok = parseInt(variation.StokAdedi) || 0;
          const fiyat = this.extractPrice(variation.IndirimliFiyat) || this.extractPrice(variation.SatisFiyati);
          
          variationDetails.push({
            varyasyonId: variation.VaryasyonID,
            beden: beden,
            stok: stok,
            fiyat: fiyat,
            stokKodu: variation.StokKodu,
            barkod: variation.Barkod
          });
        });
      }

      // Toplam stok hesapla
      const totalStock = variations.reduce((total, variation) => {
        return total + (parseInt(variation.StokAdedi) || 0);
      }, 0);

      // En düşük fiyatı al - IndirimliFiyat 0 ise SatisFiyati kullan
      const minPrice = variations.reduce((min, variation) => {
        const discountedPrice = this.extractPrice(variation.IndirimliFiyat);
        const regularPrice = this.extractPrice(variation.SatisFiyati);
        const price = discountedPrice > 0 ? discountedPrice : regularPrice;
        return price < min ? price : min;
      }, Number.MAX_VALUE);

      const product = {
        name: item.UrunAdi || 'Unknown Product',
        description: this.cleanHtml(item.Aciklama || ''),
        price: minPrice === Number.MAX_VALUE ? 0 : minPrice,
        category: this.extractMainCategory(item.KategoriTree || item.Kategori),
        brand: item.Marka || 'Huğlu Outdoor',
        image: image1, // Ana görsel (ilk görsel)
        images: JSON.stringify(images), // Tüm görseller JSON olarak
        image1: image1,
        image2: image2,
        image3: image3,
        image4: image4,
        image5: image5,
        stock: totalStock,
        rating: 0, // Ticimax'te rating yok
        reviewCount: 0, // Ticimax'te review yok
        externalId: item.UrunKartiID || `ext_${Date.now()}_${Math.random()}`,
        source: source.name,
        lastUpdated: new Date(),
        // Ek bilgiler
        variations: variations.length,
        variationDetails: JSON.stringify(variationDetails), // Varyasyon detayları
        categoryTree: item.KategoriTree || '',
        productUrl: item.UrunUrl || '',
        salesUnit: item.SatisBirimi || 'ADET',
        totalImages: images.length, // Toplam görsel sayısı
        hasVariations: variations.length > 0
      };

      // Gerekli alanları kontrol et
      if (!product.name || product.name === 'Unknown Product') {
        return null;
      }

      return product;
    } catch (error) {
      console.warn(`⚠️ Error mapping Ticimax item:`, error.message);
      return null;
    }
  }

  // HTML taglarını temizle
  cleanHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Ana kategoriyi çıkar
  extractMainCategory(categoryTree) {
    if (!categoryTree) return 'Genel';
    const parts = categoryTree.split('/');
    return parts[0] || 'Genel';
  }

  // XML item'ı ürün objesine dönüştür (RSS için)
  mapXmlItemToProduct(item, source) {
    try {
      // XML yapısına göre mapping (örnek)
      const product = {
        name: item.title || item.name || 'Unknown Product',
        description: item.description || item.summary || '',
        price: this.extractPrice(item.price || item.cost || '0'),
        category: source.category,
        brand: 'Huglu',
        image: item.image || item.thumbnail || '',
        stock: this.extractStock(item.stock || item.availability || '0'),
        rating: this.extractRating(item.rating || '0'),
        reviewCount: parseInt(item.reviewCount || '0') || 0,
        externalId: item.id || item.guid || `ext_${Date.now()}_${Math.random()}`,
        source: source.name,
        lastUpdated: new Date()
      };

      // Gerekli alanları kontrol et
      if (!product.name || product.name === 'Unknown Product') {
        return null;
      }

      return product;
    } catch (error) {
      console.warn(`⚠️ Error mapping XML item:`, error.message);
      return null;
    }
  }

  // Fiyat çıkarma
  extractPrice(priceStr) {
    try {
      if (typeof priceStr === 'number') return priceStr;
      
      const price = parseFloat(priceStr.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(price) ? 0 : price;
    } catch {
      return 0;
    }
  }

  // Stok çıkarma
  extractStock(stockStr) {
    try {
      if (typeof stockStr === 'number') return stockStr;
      
      const stock = parseInt(stockStr.toString().replace(/[^\d]/g, ''));
      return isNaN(stock) ? 0 : stock;
    } catch {
      return 0;
    }
  }

  // Rating çıkarma
  extractRating(ratingStr) {
    try {
      if (typeof ratingStr === 'number') return ratingStr;
      
      const rating = parseFloat(ratingStr.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(rating) ? 0 : Math.min(Math.max(rating, 0), 5); // 0-5 arası
    } catch {
      return 0;
    }
  }

  // Ürünü veritabanına ekle veya güncelle
  async upsertProduct(product, tenantId) {
    try {
              // Önce external ID ile mevcut ürünü kontrol et
        const [existing] = await this.pool.execute(
          'SELECT id, name, price, stock, image, images, image1, image2, image3, image4, image5, hasVariations FROM products WHERE externalId = ? AND tenantId = ?',
          [product.externalId, tenantId]
        );

      if (existing.length > 0) {
        // Mevcut ürünü güncelle
        const existingProduct = existing[0];
        let hasChanges = false;
        const updates = [];

        // Değişiklikleri kontrol et
        if (existingProduct.name !== product.name) {
          updates.push('name = ?');
          hasChanges = true;
        }
        if (existingProduct.price !== product.price) {
          updates.push('price = ?');
          hasChanges = true;
        }
        if (existingProduct.stock !== product.stock) {
          updates.push('stock = ?');
          hasChanges = true;
        }
        if (existingProduct.images !== product.images) {
          updates.push('images = ?');
          hasChanges = true;
        }
        if (existingProduct.image1 !== product.image1) {
          updates.push('image1 = ?');
          hasChanges = true;
        }
        if (existingProduct.image2 !== product.image2) {
          updates.push('image2 = ?');
          hasChanges = true;
        }
        if (existingProduct.image3 !== product.image3) {
          updates.push('image3 = ?');
          hasChanges = true;
        }
        if (existingProduct.image4 !== product.image4) {
          updates.push('image4 = ?');
          hasChanges = true;
        }
        if (existingProduct.image5 !== product.image5) {
          updates.push('image5 = ?');
          hasChanges = true;
        }
        if (existingProduct.hasVariations !== product.hasVariations) {
          updates.push('hasVariations = ?');
          hasChanges = true;
        }

        if (hasChanges) {
          await this.pool.execute(
            `UPDATE products SET ${updates.join(', ')}, lastUpdated = ? WHERE id = ?`,
            [
              ...(updates.includes('name = ?') ? [product.name] : []),
              ...(updates.includes('price = ?') ? [product.price] : []),
              ...(updates.includes('stock = ?') ? [product.stock] : []),
              ...(updates.includes('images = ?') ? [product.images] : []),
              ...(updates.includes('image1 = ?') ? [product.image1] : []),
              ...(updates.includes('image2 = ?') ? [product.image2] : []),
              ...(updates.includes('image3 = ?') ? [product.image3] : []),
              ...(updates.includes('image4 = ?') ? [product.image4] : []),
              ...(updates.includes('image5 = ?') ? [product.image5] : []),
              ...(updates.includes('hasVariations = ?') ? [product.hasVariations] : []),
              product.lastUpdated,
              existingProduct.id
            ]
          );
          
          this.syncStats.updatedProducts++;
          console.log(`🔄 Updated product: ${product.name}`);
        }
      } else {
        // Yeni ürün ekle
        await this.pool.execute(
          `INSERT INTO products (tenantId, name, description, price, category, image, images, image1, image2, image3, image4, image5, stock, brand, rating, reviewCount, externalId, source, hasVariations, lastUpdated) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId,
            product.name,
            product.description,
            product.price,
            product.category,
            product.image,
            product.images,
            product.image1,
            product.image2,
            product.image3,
            product.image4,
            product.image5,
            product.stock,
            product.brand,
            product.rating,
            product.reviewCount,
            product.externalId,
            product.source,
            product.hasVariations,
            product.lastUpdated
          ]
        );
        
        this.syncStats.newProducts++;
        console.log(`🆕 Added new product: ${product.name}`);
      }

      // Varyasyonları kaydet
      if (product.hasVariations && product.variationDetails) {
        await this.upsertProductVariations(tenantId, productId, product.variationDetails);
      }

      this.syncStats.totalProducts++;
      return true;
    } catch (error) {
      console.error(`❌ Error upserting product ${product.name}:`, error.message);
      this.syncStats.errors++;
      return false;
    }
  }

  // Ürün varyasyonlarını veritabanına kaydet
  async upsertProductVariations(tenantId, productId, variationDetails) {
    try {
      if (!variationDetails || variationDetails.length === 0) {
        return;
      }

      // Önce mevcut varyasyonları sil
      await this.pool.execute(
        'DELETE FROM product_variation_options WHERE variationId IN (SELECT id FROM product_variations WHERE productId = ? AND tenantId = ?)',
        [productId, tenantId]
      );
      await this.pool.execute(
        'DELETE FROM product_variations WHERE productId = ? AND tenantId = ?',
        [productId, tenantId]
      );

      // Varyasyonları grupla (beden, renk, vb.)
      const variationMap = new Map();
      
      variationDetails.forEach(variation => {
        const variationName = 'Beden'; // XML'den gelen varyasyon türü
        const variationValue = variation.beden;
        
        if (!variationValue || variationValue.trim() === '') {
          return;
        }

        if (!variationMap.has(variationName)) {
          variationMap.set(variationName, []);
        }

        variationMap.get(variationName).push({
          value: variationValue,
          priceModifier: variation.fiyat || 0,
          stock: variation.stok || 0,
          sku: variation.stokKodu || '',
          externalId: variation.varyasyonId
        });
      });

      // Her varyasyon türü için kayıt oluştur
      for (const [variationName, options] of variationMap) {
        // Varyasyon türünü kaydet
        const [variationResult] = await this.pool.execute(
          `INSERT INTO product_variations (tenantId, productId, name, displayOrder, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, productId, variationName, 0, new Date()]
        );

        const variationId = variationResult.insertId;

        // Varyasyon seçeneklerini kaydet
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          await this.pool.execute(
            `INSERT INTO product_variation_options 
             (tenantId, variationId, value, priceModifier, stock, sku, displayOrder, isActive, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tenantId,
              variationId,
              option.value,
              option.priceModifier,
              option.stock,
              option.sku,
              i,
              true,
              new Date()
            ]
          );
        }

        console.log(`✅ Saved ${options.length} options for variation: ${variationName}`);
      }

      console.log(`✅ Saved variations for product ID: ${productId}`);
    } catch (error) {
      console.error(`❌ Error saving product variations:`, error.message);
      throw error;
    }
  }

  // Kategorileri veritabanına kaydet
  async upsertCategories(categories, tenantId) {
    try {
      for (const category of categories) {
        // Mevcut kategoriyi kontrol et
        const [existing] = await this.pool.execute(
          'SELECT id FROM categories WHERE name = ? AND tenantId = ?',
          [category.name, tenantId]
        );

        if (existing.length > 0) {
          // Mevcut kategoriyi güncelle
          await this.pool.execute(
            `UPDATE categories SET 
             description = ?, 
             categoryTree = ?, 
             externalId = ?, 
             updatedAt = ? 
             WHERE id = ?`,
            [
              category.description,
              category.categoryTree,
              category.externalId,
              new Date(),
              existing[0].id
            ]
          );
          console.log(`🔄 Updated category: ${category.name}`);
        } else {
          // Yeni kategori ekle
          await this.pool.execute(
            `INSERT INTO categories (tenantId, name, description, categoryTree, externalId, source) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              tenantId,
              category.name,
              category.description,
              category.categoryTree,
              category.externalId,
              'XML'
            ]
          );
          console.log(`🆕 Added new category: ${category.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error upserting categories:`, error.message);
      throw error;
    }
  }

  // XML'den kategorileri çıkar
  extractCategoriesFromProducts(products) {
    const categoryMap = new Map();
    
    products.forEach(product => {
      const categoryName = product.category;
      const categoryTree = product.categoryTree || '';
      
      if (categoryName && !categoryMap.has(categoryName)) {
        // Kategori ağacını parse et
        const treeParts = categoryTree.split('/').filter(part => part.trim());
        const mainCategory = treeParts[0] || categoryName;
        const subCategories = treeParts.slice(1);
        
        categoryMap.set(categoryName, {
          name: categoryName,
          description: `${categoryName} kategorisi`,
          categoryTree: categoryTree,
          externalId: `cat_${categoryName.replace(/\s+/g, '_').toLowerCase()}`,
          mainCategory: mainCategory,
          subCategories: subCategories
        });
      }
    });
    
    return Array.from(categoryMap.values());
  }

  // Tüm XML kaynaklarından veri çek ve senkronize et
  async syncAllSources(tenantId = null) {
    if (this.isRunning) {
      console.log('⏳ Sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('\n🚀 Starting XML sync process...');
      
      // Stats'ı sıfırla
      this.syncStats = {
        totalProducts: 0,
        newProducts: 0,
        updatedProducts: 0,
        errors: 0
      };

      // Eğer tenantId belirtilmemişse, tüm aktif tenant'ları al
      let tenants = [];
      if (tenantId) {
        tenants = [{ id: tenantId }];
      } else {
        const [tenantRows] = await this.pool.execute('SELECT id, name FROM tenants WHERE isActive = true');
        tenants = tenantRows;
      }

      const sources = this.getXmlSources();
      
      for (const tenant of tenants) {
        console.log(`\n🏢 Processing tenant: ${tenant.name || `ID: ${tenant.id}`}`);
        
        for (const source of sources) {
          try {
            console.log(`\n📡 Processing source: ${source.name} for tenant ${tenant.id}`);
            
            // XML veriyi çek ve parse et
            const xmlData = await this.fetchAndParseXml(source);
            
            // Ürünlere dönüştür
            const products = this.parseXmlToProducts(xmlData, source);
            
            // Kategorileri çıkar ve kaydet
            console.log(`\n📂 Extracting categories from products...`);
            const categories = this.extractCategoriesFromProducts(products);
            await this.upsertCategories(categories, tenant.id);
            console.log(`✅ Processed ${categories.length} categories`);
            
            // Her ürünü veritabanına ekle/güncelle
            for (const product of products) {
              await this.upsertProduct(product, tenant.id);
            }
            
            console.log(`✅ Completed processing ${source.name} for tenant ${tenant.id}`);
            
          } catch (sourceError) {
            console.error(`❌ Error processing source ${source.name} for tenant ${tenant.id}:`, sourceError.message);
            this.syncStats.errors++;
          }
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      
      console.log(`\n🎉 XML sync completed in ${duration}ms`);
      console.log('📊 Sync Statistics:');
      console.log(`   Total Products: ${this.syncStats.totalProducts}`);
      console.log(`   New Products: ${this.syncStats.newProducts}`);
      console.log(`   Updated Products: ${this.syncStats.updatedProducts}`);
      console.log(`   Errors: ${this.syncStats.errors}`);
      console.log(`   Last Sync: ${this.lastSyncTime.toLocaleString()}\n`);

    } catch (error) {
      console.error('❌ Fatal error during XML sync:', error.message);
      this.syncStats.errors++;
    } finally {
      this.isRunning = false;
    }
  }

  // Cron job başlat
  startScheduledSync() {
    console.log('⏰ Starting scheduled XML sync (every 4 hours)...');
    
    // Her 4 saatte bir çalıştır (saat 00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
    cron.schedule('0 */4 * * *', async () => {
      console.log(`\n🕐 Scheduled sync triggered at ${new Date().toLocaleString()}`);
      
      // Server load kontrolü
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 18) {
        console.log('⏳ Business hours detected, delaying sync by 30 minutes...');
        setTimeout(async () => {
          await this.syncAllSources();
        }, 30 * 60 * 1000); // 30 dakika gecikme
      } else {
        await this.syncAllSources();
      }
    });

    // İlk çalıştırma (2 dakika sonra)
    setTimeout(async () => {
      console.log('🚀 Initial sync starting in 2 minutes...');
      await this.syncAllSources();
    }, 2 * 60 * 1000); // 2 dakika
  }

  // Manuel sync tetikle
  async triggerManualSync() {
    console.log('👆 Manual sync triggered');
    await this.syncAllSources();
  }

  // Sync durumunu getir
  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats
    };
  }
}

module.exports = XmlSyncService;
