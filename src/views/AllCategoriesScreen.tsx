import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ProductController } from '../controllers/ProductController';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.lg * 2;

interface AllCategoriesScreenProps {
  navigation: any;
}

export const AllCategoriesScreen: React.FC<AllCategoriesScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await ProductController.getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const categoryIcons: { [key: string]: any } = {
    'Bandana': require('../../assets/kategori_icon/bandana.png'),
    'Battaniye': require('../../assets/kategori_icon/battaniye.png'),
    'Eşofmanlar': require('../../assets/kategori_icon/esofman.png'),
    'Gömlek': require('../../assets/kategori_icon/gömlek.png'),
    'Hırka': require('../../assets/kategori_icon/hırka.png'),
    'Mont': require('../../assets/kategori_icon/mont.png'),
    'Pantolon': require('../../assets/kategori_icon/pantolon.png'),
    'Tişört': require('../../assets/kategori_icon/tişört.png'),
    'T-Shirt': require('../../assets/kategori_icon/tişört.png'),
    'Şapka': require('../../assets/kategori_icon/şapka.png'),
    'Hoodie': require('../../assets/kategori_icon/hoodie_4696583.png'),
    'Sweatshirt': require('../../assets/kategori_icon/hoodie_4696583.png'),
    'Rüzgarlık': require('../../assets/kategori_icon/rüzgarlık.png'),
    'Yağmurluk': require('../../assets/kategori_icon/yağmurluk.png'),
    'Polar Bere': require('../../assets/kategori_icon/polar bere.png'),
    'Mutfak Ürünleri': require('../../assets/kategori_icon/mutfsk ürünleri.png'),
    'Silah Aksuar': require('../../assets/kategori_icon/silah aksuar.png'),
    'Silah Aksesuar': require('../../assets/kategori_icon/silah aksuar.png'),
    'Silah Aksesuarları': require('../../assets/kategori_icon/silah aksuar.png'),
    'Camp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Kamp Ürünleri': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Aplike': require('../../assets/kategori_icon/aplike.png'),
    'Yardımcı Giyim Ürünleri': require('../../assets/kategori_icon/aplike.png'),
    'Waistcoat': require('../../assets/kategori_icon/waistcoat_6229344.png'),
    'Yelek': require('../../assets/kategori_icon/waistcoat_6229344.png'),
    // Fallback iconlar için genel kategoriler
    'Giyim': require('../../assets/kategori_icon/tişört.png'),
    'Aksesuar': require('../../assets/kategori_icon/şapka.png'),
    'Kamp': require('../../assets/kategori_icon/camp ürünleri.png'),
    'Mutfak': require('../../assets/kategori_icon/mutfsk ürünleri.png'),
    'Outdoor': require('../../assets/kategori_icon/mont.png'),
    'Spor': require('../../assets/kategori_icon/esofman.png'),
  };

  const handleCategoryPress = (category: string) => {
    navigation.navigate('ProductList', { 
      category: category,
      title: category 
    });
  };

  const getCategoryIcon = (category: string) => {
    // Önce tam eşleşme ara
    if (categoryIcons[category]) {
      return categoryIcons[category];
    }
    
    // Kısmi eşleşme ara
    const lowerCategory = category.toLowerCase();
    for (const [key, icon] of Object.entries(categoryIcons)) {
      if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
        return icon;
      }
    }
    
    // Kategori türüne göre genel icon seç
    if (lowerCategory.includes('mont') || lowerCategory.includes('ceket') || lowerCategory.includes('jacket')) {
      return categoryIcons['Mont'];
    }
    if (lowerCategory.includes('pantolon') || lowerCategory.includes('pants')) {
      return categoryIcons['Pantolon'];
    }
    if (lowerCategory.includes('tişört') || lowerCategory.includes('t-shirt') || lowerCategory.includes('shirt')) {
      return categoryIcons['Tişört'];
    }
    if (lowerCategory.includes('şapka') || lowerCategory.includes('hat') || lowerCategory.includes('cap')) {
      return categoryIcons['Şapka'];
    }
    if (lowerCategory.includes('kamp') || lowerCategory.includes('camp') || lowerCategory.includes('outdoor')) {
      return categoryIcons['Kamp Ürünleri'];
    }
    if (lowerCategory.includes('mutfak') || lowerCategory.includes('kitchen')) {
      return categoryIcons['Mutfak Ürünleri'];
    }
    if (lowerCategory.includes('aksesuar') || lowerCategory.includes('accessory')) {
      return categoryIcons['Aksesuar'];
    }
    
    return null;
  };

  const renderCategoryCard = ({ item: category }: { item: string }) => {
    const iconSource = getCategoryIcon(category);
    
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryIconContainer}>
          {iconSource ? (
            <Image
              source={iconSource}
              style={styles.categoryIcon}
              resizeMode="contain"
            />
          ) : (
            <Icon
              name="category"
              size={24}
              color={Colors.primary}
            />
          )}
        </View>
        <Text style={styles.categoryName}>{category}</Text>
        <Icon name="chevron-right" size={20} color={Colors.textLight} />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Image 
            source={require('../../assets/categories-icon.png')} 
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Tüm Kategoriler</Text>
        </View>
        <View style={styles.placeholder} />
      </View>
      <Text style={styles.headerSubtitle}>
        {categories.length} kategori arasından seçim yapın
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="category" size={64} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>Kategori Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Şu anda görüntülenebilecek kategori bulunmuyor.
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={loadCategories}
      >
        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Icon name="refresh" size={32} color={Colors.primary} />
          <Text style={styles.loadingText}>Kategoriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      {renderHeader()}
      
      {categories.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryCard}
          keyExtractor={(item, index) => `category-${index}-${item}`}
          contentContainerStyle={styles.categoriesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.small,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  categoriesList: {
    padding: Spacing.lg,
  },
  categoryCard: {
    width: CARD_WIDTH,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.primary,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    ...Shadows.small,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
});
