import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

interface ProductShareCardProps {
  productName: string;
  productPrice: number;
  productImage?: string;
  productBrand?: string;
  productDescription?: string;
  width?: number;
  height?: number;
}

export const ProductShareCard: React.FC<ProductShareCardProps> = ({
  productName,
  productPrice,
  productImage,
  productBrand,
  productDescription,
  width = 400,
  height = 300,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🏕️</Text>
            <Text style={styles.brandName}>Huğlu Outdoor</Text>
          </View>
          <Text style={styles.tagline}>Kamp Malzemeleri</Text>
        </View>

        {/* Product Section */}
        <View style={styles.productSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ 
                uri: productImage || 'https://via.placeholder.com/200x200?text=No+Image' 
              }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{formatPrice(productPrice)}</Text>
            </View>
          </View>
          
          <View style={styles.productInfo}>
            {productBrand && (
              <Text style={styles.brand}>{productBrand}</Text>
            )}
            <Text style={styles.productName} numberOfLines={2}>
              {productName}
            </Text>
            {productDescription && (
              <Text style={styles.description} numberOfLines={2}>
                {productDescription}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>🔥 Harika kamp ürünleri keşfet!</Text>
            <Text style={styles.footerSubtext}>Huğlu Outdoor'da indirimli fiyatlarla</Text>
          </View>
          <View style={styles.hashtags}>
            <Text style={styles.hashtag}>#Kamp</Text>
            <Text style={styles.hashtag}>#Outdoor</Text>
            <Text style={styles.hashtag}>#HuğluOutdoor</Text>
          </View>
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    marginRight: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 12,
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  productSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  priceBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  brand: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 12,
    color: '#D0D0D0',
    lineHeight: 16,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  hashtags: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  hashtag: {
    fontSize: 12,
    color: '#FF6B35',
    marginHorizontal: 4,
    fontWeight: '500',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
});
