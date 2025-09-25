import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../contexts/AppContext';
import { CampaignController, Campaign } from '../controllers/CampaignController';
import { PersonalizationController, PersonalizedContent, PersonalizedOffer } from '../controllers/PersonalizationController';
import { Product } from '../utils/types';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { EmptyState } from '../components/EmptyState';

const { width } = Dimensions.get('window');

export default function PersonalizedOffersScreen() {
  const { user } = useAppContext();
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPersonalizedContent();
  }, []);

  const loadPersonalizedContent = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const content = await PersonalizationController.generatePersonalizedContent(user.id);
      setPersonalizedContent(content);
    } catch (error) {
      console.error('Error loading personalized content:', error);
      Alert.alert('Hata', 'Kişiselleştirilmiş içerik yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPersonalizedContent();
    setRefreshing(false);
  };

  const handleOfferPress = async (offer: PersonalizedOffer) => {
    try {
      // Apply offer logic here
      Alert.alert(
        offer.title,
        offer.description,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Uygula', onPress: () => applyOffer(offer) }
        ]
      );
    } catch (error) {
      console.error('Error handling offer press:', error);
    }
  };

  const applyOffer = async (offer: PersonalizedOffer) => {
    // This would apply the offer to the user's cart or account
    Alert.alert('Başarılı', 'Kampanya uygulandı!');
  };

  const handleProductPress = (product: Product) => {
    // Navigate to product detail
    console.log('Navigate to product:', product.id);
  };

  const renderOfferCard = (offer: PersonalizedOffer, index: number) => (
    <TouchableOpacity
      key={offer.id}
      style={[styles.offerCard, { backgroundColor: getOfferColor(offer.type) }]}
      onPress={() => handleOfferPress(offer)}
    >
      <View style={styles.offerHeader}>
        <View style={styles.offerIcon}>
          <Ionicons name={getOfferIcon(offer.type)} size={24} color="white" />
        </View>
        <View style={styles.offerInfo}>
          <Text style={styles.offerTitle}>{offer.title}</Text>
          <Text style={styles.offerDescription}>{offer.description}</Text>
        </View>
      </View>
      
      {offer.discountAmount && (
        <View style={styles.offerDiscount}>
          <Text style={styles.discountText}>
            {offer.discountType === 'percentage' 
              ? `%${offer.discountAmount} İndirim`
              : `${offer.discountAmount} TL İndirim`
            }
          </Text>
        </View>
      )}
      
      <View style={styles.offerReason}>
        <Text style={styles.reasonText}>💡 {offer.reason}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProductCard = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => handleProductPress(product)}
    >
      <Image 
        source={{ uri: product.image || 'https://via.placeholder.com/300x300?text=No+Image' }} 
        style={styles.productImage} 
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>
          {product.price.toFixed(2)} TL
        </Text>
        {product.category && (
          <Text style={styles.productCategory}>{product.category}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCategorySuggestion = (category: string) => (
    <TouchableOpacity key={category} style={styles.categoryChip}>
      <Text style={styles.categoryText}>{category}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Size Özel Teklifler</Text>
        </View>
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!personalizedContent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Size Özel Teklifler</Text>
        </View>
        <EmptyState
          title="Teklif Bulunamadı"
          message="Size özel teklifler henüz hazır değil"
          icon="gift-outline"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Size Özel Teklifler</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Personalized Greeting */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingText}>{personalizedContent.greeting}</Text>
        </View>

        {/* Personalized Offers */}
        {personalizedContent.personalizedOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Size Özel Kampanyalar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.offersScroll}
            >
              {personalizedContent.personalizedOffers.map((offer, index) =>
                renderOfferCard(offer, index)
              )}
            </ScrollView>
          </View>
        )}

        {/* Recommended Products */}
        {personalizedContent.recommendedProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Size Önerilen Ürünler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.productsScroll}
            >
              {personalizedContent.recommendedProducts.map(renderProductCard)}
            </ScrollView>
          </View>
        )}

        {/* Category Suggestions */}
        {personalizedContent.categorySuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ İlginizi Çekebilecek Kategoriler</Text>
            <View style={styles.categoriesContainer}>
              {personalizedContent.categorySuggestions.map(renderCategorySuggestion)}
            </View>
          </View>
        )}

        {/* Brand Suggestions */}
        {personalizedContent.brandSuggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏪 Önerilen Markalar</Text>
            <View style={styles.categoriesContainer}>
              {personalizedContent.brandSuggestions.map(renderCategorySuggestion)}
            </View>
          </View>
        )}

        {/* Next Best Action */}
        <View style={styles.nextActionCard}>
          <Text style={styles.nextActionTitle}>💡 Önerilen Aksiyon</Text>
          <Text style={styles.nextActionText}>{personalizedContent.nextBestAction}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getOfferColor = (type: string): string => {
  const colors: Record<string, string> = {
    discount: '#28a745',
    free_shipping: '#17a2b8',
    bundle: '#6f42c1',
    loyalty: '#fd7e14',
    seasonal: '#20c997',
    birthday: '#e83e8c',
  };
  return colors[type] || '#007bff';
};

const getOfferIcon = (type: string): string => {
  const icons: Record<string, string> = {
    discount: 'local-offer',
    free_shipping: 'local-shipping',
    bundle: 'inventory',
    loyalty: 'star',
    seasonal: 'eco',
    birthday: 'cake',
  };
  return icons[type] || 'card-giftcard';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  greetingCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greetingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  offersScroll: {
    paddingLeft: 15,
  },
  offerCard: {
    width: width * 0.8,
    marginRight: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  offerDiscount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  offerReason: {
    marginTop: 8,
  },
  reasonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  productsScroll: {
    paddingLeft: 15,
  },
  productCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  categoryChip: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  nextActionCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nextActionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
