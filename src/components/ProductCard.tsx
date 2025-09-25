import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import { ImageGallery } from './ImageGallery';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 32) / 2; // Reduced margin for cleaner look

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(product)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <ImageGallery
          images={[
            product.image1,
            product.image2,
            product.image3,
            product.image4,
            product.image5,
            ...(product.images || [])
          ].filter(img => img && img.trim() !== '')}
          mainImage={product.image}
          style={styles.imageGallery}
          showThumbnails={false}
        />
        {product.stock < 5 && product.stock > 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>{product.stock}</Text>
          </View>
        )}
        {product.stock === 0 && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Tükendi</Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        {/* Beden bilgisi (varyasyonlu ürünler için) */}
        {product.hasVariations && product.variations && product.variations.length > 0 && (
          <View style={styles.sizeContainer}>
            <Text style={styles.sizeLabel}>Bedenler:</Text>
            <View style={styles.sizeList}>
              {product.variations.slice(0, 3).map((variation, index) => (
                <View key={index} style={styles.sizeChip}>
                  <Text style={styles.sizeText}>
                    {variation.options?.[0]?.value || 'N/A'}
                  </Text>
                </View>
              ))}
              {product.variations.length > 3 && (
                <View style={styles.sizeChip}>
                  <Text style={styles.sizeText}>+{product.variations.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            {ProductController.formatPrice(product.price)}
          </Text>
          {product.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    // Minimal shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#F8F9FA',
  },
  imageGallery: {
    height: cardWidth * 0.85, // Slightly reduced height for minimalism
  },
  stockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#000000',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  content: {
    padding: 16,
    paddingTop: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 12,
    minHeight: 40,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  ratingContainer: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  sizeContainer: {
    marginBottom: 8,
  },
  sizeLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  sizeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sizeChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sizeText: {
    fontSize: 10,
    color: '#333333',
    fontWeight: '500',
  },
});