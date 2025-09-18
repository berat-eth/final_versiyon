import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
  Dimensions,
  Image,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import { UserController } from '../controllers/UserController';
import { CartController } from '../controllers/CartController';
import { useAppContext } from '../contexts/AppContext';

interface FavoritesScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const { updateCart } = useAppContext();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  // Reload favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      const favoriteData = await UserController.getUserFavorites(userId);
      
      if (favoriteData.length === 0) {
        setFavorites([]);
        return;
      }
      
      // Get all current products to merge with favorite data
      console.log('🔄 Loading current product data for favorites...');
      const allProducts = await ProductController.getAllProducts();
      
      // Convert favorite data to products with current stock information
      const favoriteProducts: Product[] = favoriteData.map((fav: any) => {
        const productData = JSON.parse(fav.productData || '{}');
        const productId = parseInt(fav.productId);
        
        // Find current product data
        const currentProduct = allProducts.find(p => p.id === productId);
        
        // Debug log to see what data we have
        console.log('🖼️ Favorite product data merge:', {
          productId: fav.productId,
          hasCurrentData: !!currentProduct,
          storedStock: productData.stock,
          currentStock: currentProduct?.stock,
          image: productData.image || currentProduct?.image
        });
        
        return {
          id: productId,
          name: currentProduct?.name || productData.name || 'Bilinmeyen Ürün',
          price: currentProduct?.price || productData.price || 0,
          image: currentProduct?.image || productData.image || (productData.images && productData.images[0]) || '',
          brand: currentProduct?.brand || productData.brand || '',
          description: currentProduct?.description || productData.description || '',
          category: currentProduct?.category || productData.category || '',
          stock: currentProduct?.stock !== undefined ? currentProduct.stock : (productData.stock || 0),
          rating: currentProduct?.rating || productData.rating || 0,
          reviewCount: currentProduct?.reviewCount || productData.reviewCount || 0,
          hasVariations: currentProduct?.hasVariations || false,
          variations: currentProduct?.variations || [],
          images: currentProduct?.images || productData.images || []
        };
      });
      
      console.log(`✅ Loaded ${favoriteProducts.length} favorites with current data`);
      setFavorites(favoriteProducts);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadFavorites(true);
  };

  const handleRemoveFromFavorites = async (productId: number) => {
    Alert.alert(
      'Favorilerden Çıkar',
      'Bu ürünü favorilerden çıkarmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = 1; // Default guest user ID
              const success = await UserController.removeFromFavorites(userId, productId);
              if (success) {
                setFavorites(favorites.filter(item => item.id !== productId));
                setSelectedItems(selectedItems.filter(id => id !== productId));
                Alert.alert('Başarılı', 'Ürün favorilerden çıkarıldı');
              } else {
                Alert.alert('Hata', 'Ürün favorilerden çıkarılamadı');
              }
            } catch (error) {
              console.error('Error removing from favorites:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (product: Product) => {
    try {
      if (product.stock === 0) {
        Alert.alert('Uyarı', 'Bu ürün stokta yok.');
        return;
      }

      // Use CartController to add to cart
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      const result = await CartController.addToCart(userId, product.id, 1);

      if (result.success) {
        // Global sepet state'ini güncelle
        try {
          const cartItems = await CartController.getCartItems(userId);
          const subtotal = CartController.calculateSubtotal(cartItems);
          const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
          
          console.log('🛒 Cart updated from Favorites:', { itemCount, subtotal, itemsLength: cartItems.length });
          
          updateCart({
            items: cartItems,
            total: subtotal,
            itemCount,
            lastUpdated: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error updating cart context:', error);
        }

        Alert.alert('Başarılı', result.message, [
          { text: 'Tamam' },
          { 
            text: 'Sepete Git', 
            onPress: () => navigation.navigate('Cart') 
          }
        ]);
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    }
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const toggleSelection = (productId: number) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter(id => id !== productId));
    } else {
      setSelectedItems([...selectedItems, productId]);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItems([]);
  };

  const removeSelectedItems = () => {
    Alert.alert(
      'Seçili Ürünleri Çıkar',
      `${selectedItems.length} ürünü favorilerden çıkarmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: () => {
            setFavorites(favorites.filter(item => !selectedItems.includes(item.id)));
            setSelectedItems([]);
            setIsSelectionMode(false);
          },
        },
      ]
    );
  };

  const addSelectedToCart = () => {
    const selectedProducts = favorites.filter(item => selectedItems.includes(item.id));
    Alert.alert('Sepete Eklendi', `${selectedProducts.length} ürün sepete eklendi!`);
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      {isSelectionMode && (
        <TouchableOpacity
          style={[
            styles.selectionCheckbox,
            selectedItems.includes(item.id) && styles.selectionCheckboxSelected
          ]}
          onPress={() => toggleSelection(item.id)}
        >
          {selectedItems.includes(item.id) && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.productImageContainer}
        onPress={() => handleProductPress(item)}
      >
        {item.image && item.image.trim() !== '' ? (
          <Image
            source={{ uri: item.image }}
            style={styles.productImage}
            resizeMode="cover"
            onError={(e) => {
              console.log('Image load error:', e.nativeEvent.error);
            }}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Icon name="image" size={40} color="#9ca3af" />
            <Text style={styles.noImageText}>Görsel Yok</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.productInfo}>
        <Text style={styles.productBrand}>{item.brand}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingStar}>⭐</Text>
          <Text style={styles.rating}>{item.rating}</Text>
          <Text style={styles.reviewCount}>({item.reviewCount})</Text>
        </View>
        
        <Text style={styles.productPrice}>
          {ProductController.formatPrice(item.price)}
        </Text>
        
        {item.stock < 5 && item.stock > 0 && (
          <Text style={styles.lowStock}>Son {item.stock} adet!</Text>
        )}
        {item.stock === 0 && (
          <Text style={styles.outOfStock}>Tükendi</Text>
        )}
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => handleAddToCart(item)}
          disabled={item.stock === 0}
        >
          <Text style={styles.addToCartButtonText}>Sepete Ekle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromFavorites(item.id)}
        >
          <Text style={styles.removeButtonText}>Kaldır</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.modernContainer}>
      {/* İç başlık kaldırıldı; üst başlık navigator tarafından yönetiliyor */}

      {/* Selection Actions */}
      {isSelectionMode && selectedItems.length > 0 && (
        <View style={styles.selectionActions}>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={addSelectedToCart}
          >
            <Text style={styles.selectionButtonText}>
              Sepete Ekle ({selectedItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, styles.removeSelectionButton]}
            onPress={removeSelectedItems}
          >
            <Text style={styles.removeSelectionButtonText}>
              Kaldır ({selectedItems.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Favoriler yükleniyor...</Text>
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>❤️</Text>
          <Text style={styles.emptyStateTitle}>Favori Ürününüz Yok</Text>
          <Text style={styles.emptyStateDescription}>
            Beğendiğiniz ürünleri favorilere ekleyerek daha sonra kolayca bulabilirsiniz.
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('Products')}
          >
            <Text style={styles.emptyStateButtonText}>Ürünleri Keşfet</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeSelectionButton: {
    backgroundColor: '#FF6B6B',
  },
  removeSelectionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  productsContainer: {
    padding: 16,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1A1A2E',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckboxSelected: {
    backgroundColor: '#1A1A2E',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productImageContainer: {
    width: '100%',
    height: cardWidth - 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  productInfo: {
    marginBottom: 12,
  },
  productBrand: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 8,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStar: {
    fontSize: 12,
    marginRight: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A2E',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  lowStock: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  outOfStock: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  productActions: {
    gap: 8,
  },
  addToCartButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modern Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
});
