import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';

interface CategoriesSectionProps {
  categories: string[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  onAllCategoriesPress: () => void;
  showFlashDeals: boolean;
  onFlashToggle: () => void;
  getCategoryIcon: (category: string) => any;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  onAllCategoriesPress,
  showFlashDeals,
  onFlashToggle,
  getCategoryIcon,
}) => {
  return (
    <View style={styles.categoriesSection}>
      <LinearGradient
        colors={Gradients.light}
        style={styles.categoriesGradient}
      >
        <View style={styles.categoriesHeader}>
          <View style={styles.categoriesTitleContainer}>
            <Image 
              source={require('../../assets/categories-icon.png')} 
              style={{ width: 20, height: 20, tintColor: Colors.primary }}
              resizeMode="contain"
            />
            <Text style={styles.categoriesTitle}>Kategoriler</Text>
          </View>
          <View style={styles.categoriesActions}>
            <TouchableOpacity
              style={styles.flashButton}
              onPress={onFlashToggle}
            >
              <LinearGradient
                colors={showFlashDeals ? Gradients.secondary : ['#FFFFFF', '#F9FAFB']}
                style={styles.flashButtonGradient}
              >
                <Icon name="flash-on" size={16} color={showFlashDeals ? Colors.textOnPrimary : Colors.secondary} />
                <Text style={[styles.flashButtonText, showFlashDeals && styles.flashButtonTextActive]}>
                  {showFlashDeals ? 'Tümü' : 'Flash'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onAllCategoriesPress}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>Tümü →</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity
            style={styles.categoryChip}
            onPress={() => onCategorySelect(null)}
          >
            <LinearGradient
              colors={!selectedCategory ? Gradients.primary as [string, string] : ['#FFFFFF', '#F9FAFB']}
              style={styles.categoryChipGradient}
            >
              <Icon 
                name="apps" 
                size={18} 
                color={!selectedCategory ? Colors.textOnPrimary : Colors.primary} 
              />
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive,
                ]}
              >
                Tümü
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          {(categories || []).map((category, index) => (
            <TouchableOpacity
              key={category}
              style={styles.categoryChip}
              onPress={() => onCategorySelect(category)}
            >
              <LinearGradient
                colors={selectedCategory === category ? Gradients.primary as [string, string] : ['#FFFFFF', '#F9FAFB']}
                style={styles.categoryChipGradient}
              >
                {getCategoryIcon(category) ? (
                  <Image
                    source={getCategoryIcon(category)}
                    style={[
                      styles.categoryChipIcon,
                      { tintColor: selectedCategory === category ? Colors.textOnPrimary : Colors.primary }
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon 
                    name="category" 
                    size={18} 
                    color={selectedCategory === category ? Colors.textOnPrimary : Colors.primary} 
                  />
                )}
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesSection: {
    backgroundColor: Colors.background,
    marginBottom: 0,
  },
  categoriesGradient: {
    paddingVertical: 0,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    marginBottom: 0,
  },
  categoriesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoriesActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  flashButton: {
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
  flashButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flashButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    marginLeft: 6,
    fontWeight: '700',
  },
  flashButtonTextActive: {
    color: Colors.textOnPrimary,
  },
  seeAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
  },
  categoryChip: {
    marginRight: Spacing.md,
    borderRadius: 20,
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
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipIcon: {
    width: 18,
    height: 18,
    marginRight: Spacing.sm,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  categoryChipTextActive: {
    color: Colors.textOnPrimary,
  },
});
