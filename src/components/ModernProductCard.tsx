import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from './ui/ModernCard';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';

interface ModernProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'horizontal';
  width?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const ModernProductCard: React.FC<ModernProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
  variant = 'default',
  width,
}) => {
  const cardWidth = width || (variant === 'horizontal' ? screenWidth - Spacing.lg * 2 : screenWidth * 0.45);

  const renderStockStatus = () => {
    if (product.stock === 0) {
      return (
        <View style={[styles.badge, styles.outOfStockBadge]}>
          <Text style={styles.badgeText}>Tükendi</Text>
        </View>
      );
    } else if (product.stock < 5) {
      return (
        <View style={[styles.badge, styles.lowStockBadge]}>
          <Text style={styles.badgeText}>Son {product.stock} Ürün</Text>
        </View>
      );
    }
    return null;
  };

  const renderRating = () => {
    if (product.rating > 0) {
      return (
        <View style={styles.ratingContainer}>
          <Icon name="star" size={14} color={Colors.warning} />
          <Text style={styles.ratingText}>
            {product.rating.toFixed(1)}
          </Text>
          {product.reviewCount > 0 && (
            <Text style={styles.reviewCount}>({product.reviewCount})</Text>
          )}
        </View>
      );
    }
    return null;
  };

  if (variant === 'horizontal') {
    return (
      <ModernCard
        onPress={onPress}
        style={[styles.horizontalCard, { width: cardWidth }] as any}
        noPadding
        variant="outlined"
        gradientBorder={false}
      >
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalImageContainer}>
            <Image 
              source={{ uri: product.image || 'https://via.placeholder.com/300x300?text=No+Image' }} 
              style={styles.horizontalImage} 
            />
            {renderStockStatus()}
          </View>
          <View style={styles.horizontalInfo}>
            <View style={styles.horizontalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandText}>{product.brand}</Text>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
              </View>
              {onToggleFavorite && (
                <TouchableOpacity
                  onPress={onToggleFavorite}
                  style={styles.favoriteButton}
                >
                  <Icon
                    name={isFavorite ? 'favorite' : 'favorite-border'}
                    size={20}
                    color={isFavorite ? Colors.secondary : Colors.textLight}
                  />
                </TouchableOpacity>
              )}
            </View>
            
            {renderRating()}
            
            <View style={styles.horizontalFooter}>
              <View>
                <Text style={styles.priceLabel}>Fiyat</Text>
                <Text style={styles.price}>
                  {ProductController.formatPrice(product.price)}
                </Text>
              </View>
              {onAddToCart && (
                <TouchableOpacity
                  style={[
                    styles.addToCartButtonHorizontal,
                    product.stock === 0 && styles.addToCartButtonDisabled,
                  ]}
                  onPress={onAddToCart}
                  disabled={product.stock === 0}
                >
                  <Image
                    source={require('../../assets/cart-add-icon.png')}
                    style={{
                      width: 24,
                      height: 24,
                      tintColor: product.stock === 0 ? Colors.textMuted : Colors.primary
                    }}
                    resizeMode="contain"
                  />
                  <Text style={[
                    styles.addToCartText,
                    product.stock === 0 && styles.addToCartTextDisabled
                  ]}>
                    Sepete Ekle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ModernCard>
    );
  }

  if (variant === 'compact') {
    return (
      <ModernCard
        onPress={onPress}
        style={[styles.compactCard, { width: cardWidth }] as any}
        noPadding
      >
        <View style={styles.compactImageContainer}>
          <Image source={{ uri: product.image }} style={styles.compactImage} />
          {renderStockStatus()}
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={onToggleFavorite}
              style={styles.compactFavoriteButton}
            >
              <Icon
                name={isFavorite ? 'favorite' : 'favorite-border'}
                size={16}
                color={isFavorite ? Colors.secondary : Colors.text}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactProductName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.compactPrice}>
            {ProductController.formatPrice(product.price)}
          </Text>
        </View>
      </ModernCard>
    );
  }

  // Default variant
  return (
    <ModernCard
      onPress={onPress}
      style={[styles.card, { width: cardWidth }] as any}
      noPadding
      variant="outlined"
      gradientBorder={false}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: product.image || 'https://via.placeholder.com/300x300?text=No+Image' }} 
          style={styles.image} 
        />
        {renderStockStatus()}
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            style={styles.favoriteButton}
          >
            <Icon
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={20}
              color={isFavorite ? Colors.secondary : Colors.text}
            />
          </TouchableOpacity>
        )}
        {product.hasVariations && (
          <View style={styles.variationBadge}>
            <Icon name="palette" size={12} color={Colors.textOnPrimary} />
            <Text style={styles.variationText}>Varyasyonlu</Text>
          </View>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.brandText}>{product.brand}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        
        {renderRating()}
        
        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Fiyat</Text>
            <Text style={styles.price}>
              {ProductController.formatPrice(product.price)}
            </Text>
          </View>
          {onAddToCart && (
            <TouchableOpacity
              style={[
                styles.addToCartButton,
                product.stock === 0 && styles.addToCartButtonDisabled,
              ]}
              onPress={onAddToCart}
              disabled={product.stock === 0}
            >
              <Image
                source={require('../../assets/cart-add-icon.png')}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: product.stock === 0 ? Colors.textMuted : Colors.primary
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ModernCard>
  );
};

const styles = StyleSheet.create({
  // Default card styles
  card: {
    marginBottom: Spacing.lg + 10, // Daha fazla mesafe
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockBadge: {
    backgroundColor: Colors.error,
  },
  lowStockBadge: {
    backgroundColor: Colors.warning,
  },
  badgeText: {
    fontSize: 10,
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  variationBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  variationText: {
    fontSize: 10,
    color: Colors.textOnPrimary,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoContainer: {
    padding: Spacing.md,
  },
  brandText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: Spacing.sm,
    minHeight: 36,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  addToCartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: 'transparent',
  },

  // Horizontal card styles
  horizontalCard: {
    marginBottom: Spacing.lg + 10, // Daha fazla mesafe
  },
  horizontalContent: {
    flexDirection: 'row',
  },
  horizontalImageContainer: {
    width: 120,
    height: 120,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  horizontalInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  horizontalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  horizontalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  addToCartButtonHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  addToCartText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  addToCartTextDisabled: {
    color: Colors.textMuted,
  },

  // Compact card styles
  compactCard: {
    marginBottom: Spacing.md + 10, // Daha fazla mesafe
  },
  compactImageContainer: {
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  compactFavoriteButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactInfo: {
    padding: Spacing.sm,
  },
  compactProductName: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
});
