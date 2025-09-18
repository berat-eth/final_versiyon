import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductController } from '../controllers/ProductController';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { ReviewController } from '../controllers/ReviewController';
import { Product, Review, ProductVariationOption } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ReviewForm } from '../components/ReviewForm';
import { ReviewList } from '../components/ReviewList';
import { VariationSelector } from '../components/VariationSelector';
import { ProductVariationService } from '../services/ProductVariationService';
import { Colors } from '../theme/colors';
import { ModernButton } from '../components/ui/ModernButton';
import { SocialShareButtons } from '../components/SocialShareButtons';

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: ProductVariationOption }>({});
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [showViewer, setShowViewer] = useState<boolean>(false);

  const { productId } = route.params;

  useEffect(() => {
    loadProduct();
    loadCurrentUser();
    checkIfFavorite();
    // Rastgele izleyici sayısı üret ve göster
    const count = Math.floor(Math.random() * 20) + 1; // 1..20
    setViewerCount(count);
    setShowViewer(true);
    const hideTimer = setTimeout(() => setShowViewer(false), 8000); // 8 sn sonra gizle
    return () => clearTimeout(hideTimer);
  }, [productId]);

  useEffect(() => {
    if (product) {
      calculateCurrentPrice();
      calculateCurrentStock();
    }
  }, [product, selectedOptions]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const prod = await ProductController.getProductById(productId);
      setProduct(prod);
      setCurrentPrice(prod?.price || 0);
      setCurrentStock(prod?.stock || 0);
      await loadReviews();
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentPrice = () => {
    if (!product) return;
    
    let totalPrice = product.price;
    const priceModifier = ProductVariationService.calculateTotalPriceModifier(selectedOptions);
    totalPrice += priceModifier;
    setCurrentPrice(totalPrice);
  };

  const calculateCurrentStock = () => {
    if (!product) return;
    
    if (!product.hasVariations || Object.keys(selectedOptions).length === 0) {
      setCurrentStock(product.stock);
      return;
    }

    // Get minimum stock from selected options using the service
    const minStock = ProductVariationService.getMinimumStock(selectedOptions);
    setCurrentStock(minStock);
  };


  const handleVariationChange = (newSelectedOptions: { [key: string]: ProductVariationOption }) => {
    setSelectedOptions(newSelectedOptions);
  };

  const isAllVariationsSelected = () => {
    if (!product || !product.hasVariations) return true;
    return ProductVariationService.areAllVariationsSelected(product.variations || [], selectedOptions);
  };

  const getSelectedVariationString = () => {
    if (!product || !product.hasVariations) return '';
    return ProductVariationService.getSelectedVariationString(product.variations || [], selectedOptions);
  };

  const loadCurrentUser = async () => {
    try {
      const user = await UserController.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        await loadUserReview(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const productReviews = await ReviewController.getReviewsByProductId(productId);
      setReviews(productReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadUserReview = async (userId: number) => {
    try {
      const review = await ReviewController.getUserReview(productId, userId);
      setUserReview(review);
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.hasVariations && !isAllVariationsSelected()) {
      Alert.alert('Uyarı', 'Lütfen tüm varyasyon seçeneklerini belirleyin.');
      return;
    }

    if (currentStock < quantity) {
      Alert.alert('Hata', 'Seçilen miktar stoktan fazla.');
      return;
    }

    setAddingToCart(true);
    try {
      // Use default guest user ID for anonymous shopping
      const userId = currentUser ? currentUser.id : 1;
      const result = await CartController.addToCart(
        userId,
        product.id,
        quantity,
        selectedOptions
      );

      if (result.success) {
        Alert.alert('Başarılı', result.message, [
          { text: 'Tamam' },
          { 
            text: 'Sepete Git', 
            onPress: () => navigation.navigate('Cart') 
          }
        ]);
        setQuantity(1);
        setSelectedOptions({});
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Ürün sepete eklenirken bir hata oluştu');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!currentUser) {
      Alert.alert('Hata', 'Yorum yapmak için giriş yapmanız gerekiyor.');
      return;
    }

    setSubmittingReview(true);
    try {
      let result;
      
      if (userReview) {
        // Update existing review
        result = await ReviewController.updateReview(userReview.id, rating, comment);
      } else {
        // Add new review
        result = await ReviewController.addReview(
          productId,
          currentUser.id,
          currentUser.name,
          rating,
          comment
        );
      }

      if (result.success) {
        Alert.alert('Başarılı', result.message);
        setShowReviewForm(false);
        await loadReviews();
        await loadUserReview(currentUser.id);
        await loadProduct(); // Refresh product rating
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Yorum gönderilirken bir hata oluştu');
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const userId = 1; // Default guest user ID
      const favorites = await UserController.getUserFavorites(userId);
      const favoriteIds = favorites.map((fav: any) => parseInt(fav.productId));
      setIsFavorite(favoriteIds.includes(productId));
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const userId = await UserController.getCurrentUserId(); // Get current user ID
      
      if (isFavorite) {
        const success = await UserController.removeFromFavorites(userId, productId);
        if (success) {
          setIsFavorite(false);
          Alert.alert('Başarılı', 'Ürün favorilerden çıkarıldı');
        } else {
          Alert.alert('Hata', 'Ürün favorilerden çıkarılamadı');
        }
      } else {
        const success = await UserController.addToFavorites(userId, productId, {
          name: product?.name,
          price: product?.price,
          image: product?.image,
          images: product?.images || [],
          brand: product?.brand,
          description: product?.description,
          category: product?.category,
          stock: product?.stock,
          rating: product?.rating,
          reviewCount: product?.reviewCount
        });
        if (success) {
          setIsFavorite(true);
          Alert.alert('Başarılı', 'Ürün favorilere eklendi');
        } else {
          Alert.alert('Hata', 'Ürün favorilere eklenemedi');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Hata', 'Favori işlemi sırasında bir hata oluştu');
    }
  };

  const handleReviewUpdate = async () => {
    await loadReviews();
    if (currentUser) {
      await loadUserReview(currentUser.id);
    }
    await loadProduct(); // Refresh product rating
  };

  const increaseQuantity = () => {
    if (quantity < currentStock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Ürün bulunamadı</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {showViewer && (
          <View style={styles.viewerToast}>
            <Icon name="visibility" size={16} color="#1A1A1A" />
            <Text style={styles.viewerToastText}>Bu ürünü şu anda {viewerCount} kişi inceliyor</Text>
          </View>
        )}
        {/* Ana Görsel */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image || 'https://via.placeholder.com/400x400?text=No+Image' }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Favori Butonu */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <Icon
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              color={isFavorite ? Colors.secondary : Colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.rating}>{product.rating}</Text>
            <Text style={styles.reviewCount}>
              ({product.reviewCount} değerlendirme)
            </Text>
          </View>

          <Text style={styles.price}>
            {ProductController.formatPrice(currentPrice)}
          </Text>

          {product.hasVariations && (
            <View style={styles.variationInfo}>
              <Text style={styles.variationLabel}>Seçilen:</Text>
              <Text style={styles.variationValue}>
                {isAllVariationsSelected() ? getSelectedVariationString() : 'Varyasyon seçin'}
              </Text>
            </View>
          )}

          <View style={styles.stockContainer}>
            {currentStock > 0 ? (
              <>
                <Text style={styles.stockText}>Stok: {currentStock} adet</Text>
                {currentStock < 5 && (
                  <Text style={styles.lowStock}>Son {currentStock} adet!</Text>
                )}
              </>
            ) : (
              <Text style={styles.outOfStock}>Tükendi</Text>
            )}
          </View>

          {product.hasVariations && product.variations && (
            <View style={styles.variationSection}>
              <Text style={styles.sectionTitle}>Varyasyonlar</Text>
              <Text style={styles.variationSubtitle}>
                Lütfen istediğiniz varyasyonları seçin
              </Text>
              <VariationSelector
                variations={product.variations}
                selectedOptions={selectedOptions}
                onVariationChange={handleVariationChange}
              />
              
              {/* Seçilen Varyasyon Özeti */}
              {Object.keys(selectedOptions).length > 0 && (
                <View style={styles.selectedVariationSummary}>
                  <Text style={styles.selectedVariationTitle}>Seçilen Varyasyonlar:</Text>
                  {Object.entries(selectedOptions).map(([variationId, option]) => (
                    <View key={variationId} style={styles.selectedVariationItem}>
                      <Text style={styles.selectedVariationLabel}>
                        {product.variations?.find(v => v.id.toString() === variationId)?.name}:
                      </Text>
                      <Text style={styles.selectedVariationValue}>
                        {option.value}
                        {option.priceModifier > 0 && (
                          <Text style={styles.priceModifier}>
                            {' '}(+{ProductController.formatPrice(option.priceModifier)})
                          </Text>
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Ürün Açıklaması</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Sosyal Paylaşım Bölümü */}
          <SocialShareButtons
            productId={product.id.toString()}
            productName={product.name}
            productPrice={currentPrice}
            productImage={product.image}
            productBrand={product.brand}
            productDescription={product.description}
            onShareSuccess={(platform, expGained) => {
              console.log(`Paylaşım başarılı: ${platform}, +${expGained} EXP`);
            }}
          />

          {/* Review Section */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
              {currentUser && (
                <TouchableOpacity
                  style={styles.addReviewButton}
                  onPress={() => setShowReviewForm(true)}
                >
                  <Text style={styles.addReviewButtonText}>
                    {userReview ? 'Yorumumu Düzenle' : 'Yorum Yap'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <ReviewList
              reviews={reviews}
              currentUserId={currentUser?.id}
              onReviewUpdate={handleReviewUpdate}
            />
          </View>

          {currentStock > 0 && (
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Adet:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decreaseQuantity}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={increaseQuantity}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>


      {currentStock > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.addToCartButton, 
              (addingToCart || (product.hasVariations && !isAllVariationsSelected())) && styles.disabledButton
            ]}
            onPress={handleAddToCart}
            disabled={addingToCart || (product.hasVariations && !isAllVariationsSelected())}
          >
            <Text style={styles.addToCartText}>
              {addingToCart ? 'Ekleniyor...' : 
               product.hasVariations && !isAllVariationsSelected() ? 'Varyasyon Seçin' : 'Sepete Ekle'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ReviewForm
        visible={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        onSubmit={handleReviewSubmit}
        review={userReview}
        loading={submittingReview}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 400,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  brand: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '400',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    lineHeight: 30,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingStar: {
    fontSize: 16,
    marginRight: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginRight: 6,
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: -1,
  },
  variationInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  variationLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  variationValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  stockContainer: {
    marginBottom: 24,
  },
  stockText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  lowStock: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 4,
    fontWeight: '500',
  },
  outOfStock: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  variationSection: {
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
  },
  variationSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  selectedVariationSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  selectedVariationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedVariationItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  selectedVariationLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    minWidth: 80,
  },
  selectedVariationValue: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
    fontWeight: '500',
  },
  priceModifier: {
    color: '#000000',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#48484A',
    lineHeight: 24,
    fontWeight: '400',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 16,
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  quantity: {
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  addToCartButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewerToast: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewerToastText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '500',
  },
});