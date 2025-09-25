import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface ProductListControlsProps {
  filteredCount: number;
  totalCount: number;
  showFlashDeals: boolean;
  sortBy: 'price-asc' | 'price-desc' | 'rating' | 'name';
  viewMode: 'grid' | 'list';
  onSortPress: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export const ProductListControls: React.FC<ProductListControlsProps> = ({
  filteredCount,
  totalCount,
  showFlashDeals,
  sortBy,
  viewMode,
  onSortPress,
  onViewModeChange,
}) => {
  const getSortLabel = () => {
    switch (sortBy) {
      case 'name': return 'İsim';
      case 'price-asc': return 'Fiyat ↑';
      case 'price-desc': return 'Fiyat ↓';
      case 'rating': return 'Puan';
      default: return 'İsim';
    }
  };

  return (
    <LinearGradient
      colors={Gradients.light}
      style={styles.container}
    >
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {filteredCount} / {totalCount} ürün
        </Text>
        {totalCount > 0 && (
          <Text style={styles.totalCountText}>
            {showFlashDeals ? '⚡ Flash İndirimler' : `📦 Toplam ${totalCount} ürün mevcut`}
          </Text>
        )}
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={onSortPress}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.sortButtonGradient}
          >
            <Icon name="sort" size={20} color={Colors.primary} />
            <Text style={styles.sortButtonText}>
              {getSortLabel()}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => onViewModeChange('grid')}
          >
            <LinearGradient
              colors={viewMode === 'grid' ? Gradients.primary : ['#FFFFFF', '#F9FAFB']}
              style={styles.viewModeButtonGradient}
            >
              <Icon name="grid-view" size={20} color={viewMode === 'grid' ? Colors.textOnPrimary : Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => onViewModeChange('list')}
          >
            <LinearGradient
              colors={viewMode === 'list' ? Gradients.primary : ['#FFFFFF', '#F9FAFB']}
              style={styles.viewModeButtonGradient}
            >
              <Icon name="view-list" size={20} color={viewMode === 'list' ? Colors.textOnPrimary : Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultCount: {
    flex: 1,
  },
  resultCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalCountText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    marginRight: Spacing.sm,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sortButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortButtonText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '700',
  },
  viewModeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewModeButton: {
    width: 48,
    height: 48,
  },
  viewModeButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
