import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernProductCard } from '../components/ModernProductCard';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import { CartController } from '../controllers/CartController';
import { UserController } from '../controllers/UserController';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { CampaignController, Campaign } from '../controllers/CampaignController';
import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';

interface FlashDiscountsScreenProps {
  navigation: any;
  route: any;
}

const { width } = Dimensions.get('window');

export const FlashDiscountsScreen: React.FC<FlashDiscountsScreenProps> = ({ navigation, route }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<number[]>([]);
  const { updateCart } = useAppContext();
  const { t } = useLanguage();

  const nowTs = Date.now();

  // Flash kampanyalarını filtrele
  const flashCampaigns = useMemo(() => {
    return (campaigns || []).filter(c => 
      c.isActive && 
      c.status === 'active' && 
      c.endDate && 
      new Date(c.endDate).getTime() > nowTs
    );
  }, [campaigns, nowTs]);

  // Flash indirimli ürünleri al
  const getFlashProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Tüm ürünleri al
      const allProducts = await ProductController.getAllProducts();
      
      // Flash kampanyalarına dahil olan ürünleri filtrele
      const flashProductIds = new Set<number>();
      
      flashCampaigns.forEach(campaign => {
        if (campaign.applicableProducts && campaign.applicableProducts.length > 0) {
          campaign.applicableProducts.forEach(id => flashProductIds.add(id));
        }
      });

      // Eğer belirli ürünler yoksa, tüm ürünleri flash indirimli olarak göster
      let flashProducts = allProducts;
      if (flashProductIds.size > 0) {
        flashProducts = allProducts.filter(product => flashProductIds.has(product.id));
      }

      // Kampanya indirimlerini uygula
      const productsWithDiscounts = flashProducts.map(product => {
        const applicableCampaign = flashCampaigns.find(campaign => 
          !campaign.applicableProducts || 
          campaign.applicableProducts.length === 0 || 
          campaign.applicableProducts.includes(product.id)
        );

        if (applicableCampaign) {
          let discountedPrice = product.price;
          
          if (applicableCampaign.discountType === 'percentage') {
            discountedPrice = product.price * (1 - applicableCampaign.discountValue / 100);
          } else if (applicableCampaign.discountType === 'fixed') {
            discountedPrice = Math.max(0, product.price - applicableCampaign.discountValue);
          }

          return {
            ...product,
            originalPrice: product.price,
            price: discountedPrice,
            discountPercentage: applicableCampaign.discountType === 'percentage' 
              ? applicableCampaign.discountValue 
              : Math.round(((product.price - discountedPrice) / product.price) * 100),
            campaign: applicableCampaign
          };
        }

        return product;
      });

      setProducts(productsWithDiscounts);
      setFilteredProducts(productsWithDiscounts);
    } catch (error) {
      console.error('Flash ürünleri yüklenirken hata:', error);
      Alert.alert('Hata', 'Flash indirimli ürünler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [flashCampaigns]);

  // Kampanyaları yükle
  const loadCampaigns = useCallback(async () => {
    try {
      const campaignsData = await CampaignController.getCampaigns();
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error);
    }
  }, []);

  // Favori ürünleri yükle
  const loadFavorites = useCallback(async () => {
    try {
      const userId = 1; // Default guest user ID
      const favorites = await UserController.getFavoriteProducts(userId);
      setFavoriteProducts(favorites || []);
    } catch (error) {
      console.error('Favoriler yüklenirken hata:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadCampaigns(),
        loadFavorites()
      ]);
    };
    loadData();
  }, [loadCampaigns, loadFavorites]);

  useEffect(() => {
    if (flashCampaigns.length > 0) {
      getFlashProducts();
    } else {
      setLoading(false);
    }
  }, [flashCampaigns, getFlashProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadCampaigns(),
      loadFavorites()
    ]);
    if (flashCampaigns.length > 0) {
      await getFlashProducts();
    }
    setRefreshing(false);
  };

  const formatHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderFlashHeader = () => {
    if (flashCampaigns.length === 0) {
      return (
        <View style={styles.emptyHeader}>
          <Icon name="flash-off" size={48} color={Colors.lightGray} />
          <Text style={styles.emptyTitle}>Aktif Flash İndirim Yok</Text>
          <Text style={styles.emptySubtitle}>
            Şu anda aktif flash indirim kampanyası bulunmuyor. Yakında yeni kampanyalar için takipte kalın!
          </Text>
        </View>
      );
    }

    const ends = flashCampaigns
      .map(c => new Date(c.endDate as string).getTime())
      .sort((a, b) => a - b);
    const soonestEnd = ends[0];
    const remainSec = soonestEnd ? Math.max(0, Math.floor((soonestEnd - nowTs) / 1000)) : 0;

    return (
      <View style={styles.flashHeader}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E']}
          style={styles.flashHeaderGradient}
        >
          <View style={styles.flashTitleWrap}>
            <Icon name="flash-on" size={24} color="white" />
            <Text style={styles.flashTitle}>⚡ Flash İndirimler</Text>
          </View>
          <View style={styles.flashTimer}>
            <Icon name="timer" size={16} color="white" />
            <Text style={styles.flashTimerText}>Bitiş: {formatHMS(remainSec)}</Text>
          </View>
          <Text style={styles.flashSubtitle}>
            {flashCampaigns.length} aktif kampanya • Sınırlı süre!
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isFavorite = favoriteProducts.includes(item.id);
    
    return (
      <View style={styles.productContainer}>
        <ModernProductCard
          product={item}
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
          onAddToCart={async () => {
            try {
              const userId = 1;
              await CartController.addToCart(userId, item.id, 1);
              updateCart(await CartController.getCartState(userId));
            } catch (error) {
              console.error('Sepete ekleme hatası:', error);
            }
          }}
          onToggleFavorite={async () => {
            try {
              const userId = 1;
              if (isFavorite) {
                await UserController.removeFromFavorites(userId, item.id);
              } else {
                await UserController.addToFavorites(userId, item.id);
              }
              loadFavorites();
            } catch (error) {
              console.error('Favori işlemi hatası:', error);
            }
          }}
          isFavorite={isFavorite}
          showDiscount={true}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="flash-off" size={64} color={Colors.lightGray} />
      <Text style={styles.emptyStateTitle}>Flash İndirimli Ürün Bulunamadı</Text>
      <Text style={styles.emptyStateSubtitle}>
        Şu anda flash indirimli ürün bulunmuyor. Yakında yeni kampanyalar için takipte kalın!
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <Icon name="refresh" size={20} color="white" />
        <Text style={styles.refreshButtonText}>Yenile</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {renderFlashHeader()}
      
      {filteredProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  flashHeader: {
    marginBottom: 16,
  },
  flashHeaderGradient: {
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    ...Shadows.medium,
  },
  flashTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flashTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  flashTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flashTimerText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  flashSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  emptyHeader: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    ...Shadows.medium,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productContainer: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.lightGray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    ...Shadows.small,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FlashDiscountsScreen;
