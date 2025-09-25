import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { FilterOptions } from '../models/Product';
import { ProductController } from '../controllers/ProductController';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
  categories: string[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
  categories,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [brands, setBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFilterData();
    }
  }, [visible]);

  const loadFilterData = async () => {
    setLoading(true);
    try {
      const [brandsData, priceRangeData] = await Promise.all([
        ProductController.getBrands(),
        ProductController.getPriceRange(),
      ]);
      setBrands(brandsData);
      setPriceRange(priceRangeData);
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category === category ? undefined : category,
    }));
  };

  const handleBrandToggle = (brand: string) => {
    setFilters(prev => {
      const currentBrands = prev.brands || [];
      const newBrands = currentBrands.includes(brand)
        ? currentBrands.filter(b => b !== brand)
        : [...currentBrands, brand];
      
      return {
        ...prev,
        brands: newBrands.length > 0 ? newBrands : undefined,
      };
    });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFilters(prev => ({
      ...prev,
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue,
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFilters(prev => ({
      ...prev,
      minRating: prev.minRating === rating ? undefined : rating,
    }));
  };

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy: prev.sortBy === sortBy ? undefined : sortBy,
    }));
  };

  const handleStockToggle = (value: boolean) => {
    setFilters(prev => ({
      ...prev,
      inStock: value,
    }));
  };

  const handleReset = () => {
    setFilters({});
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.brands && filters.brands.length > 0) count++;
    if (filters.minRating !== undefined) count++;
    if (filters.inStock) count++;
    if (filters.sortBy) count++;
    return count;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={[styles.star, i <= rating && styles.starSelected]}>
          {i <= rating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtreler</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Sıfırla</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategoriler</Text>
              <View style={styles.chipContainer}>
                {(categories || []).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.chip,
                      filters.category === category && styles.chipSelected,
                    ]}
                    onPress={() => handleCategoryChange(category)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.category === category && styles.chipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fiyat Aralığı</Text>
              <View style={styles.priceContainer}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <Text style={styles.priceValue}>
                    ₺{filters.minPrice || priceRange.min}
                  </Text>
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <Text style={styles.priceValue}>
                    ₺{filters.maxPrice || priceRange.max}
                  </Text>
                </View>
              </View>
            </View>

            {/* Brands */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Markalar</Text>
              <View style={styles.brandContainer}>
                {brands.slice(0, 6).map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={[
                      styles.chip,
                      filters.brands?.includes(brand) && styles.chipSelected,
                    ]}
                    onPress={() => handleBrandToggle(brand)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.brands?.includes(brand) && styles.chipTextSelected,
                      ]}
                    >
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Puan</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingChip,
                      filters.minRating === rating && styles.chipSelected,
                    ]}
                    onPress={() => handleRatingChange(rating)}
                  >
                    <View style={styles.starsContainer}>
                      {renderStars(rating)}
                    </View>
                    <Text
                      style={[
                        styles.ratingText,
                        filters.minRating === rating && styles.chipTextSelected,
                      ]}
                    >
                      {rating}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stock */}
            <View style={styles.section}>
              <View style={styles.stockContainer}>
                <Text style={styles.sectionTitle}>Sadece Stokta Olanlar</Text>
                <Switch
                  value={filters.inStock || false}
                  onValueChange={handleStockToggle}
                  trackColor={{ false: '#E0E0E0', true: '#2E7D32' }}
                  thumbColor={filters.inStock ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Sort */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sıralama</Text>
              <View style={styles.sortContainer}>
                {[
                  { key: 'price_asc', label: 'Fiyat (Düşükten Yükseğe)' },
                  { key: 'price_desc', label: 'Fiyat (Yüksekten Düşüğe)' },
                  { key: 'rating_desc', label: 'En Yüksek Puan' },
                  { key: 'name_asc', label: 'İsim (A-Z)' },
                  { key: 'name_desc', label: 'İsim (Z-A)' },
                ].map((sort) => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.sortOption,
                      filters.sortBy === sort.key && styles.sortOptionSelected,
                    ]}
                    onPress={() => handleSortChange(sort.key as FilterOptions['sortBy'])}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        filters.sortBy === sort.key && styles.sortOptionTextSelected,
                      ]}
                    >
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>
                Uygula ({getActiveFiltersCount()} filtre)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButton: {
    marginRight: 16,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  priceContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  brandContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  starSelected: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortContainer: {
    gap: 8,
  },
  sortOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  sortOptionSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  applyButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
