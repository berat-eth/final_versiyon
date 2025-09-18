import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ProductController } from '../controllers/ProductController';

interface CategoryTree {
  mainCategory: string;
  subCategories: string[];
  fullPath: string;
}

interface CategoryNavigatorProps {
  onCategorySelect: (category: string) => void;
  selectedCategory?: string;
}

export const CategoryNavigator: React.FC<CategoryNavigatorProps> = ({
  onCategorySelect,
  selectedCategory,
}) => {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoryTree = await ProductController.getCategoryTree();
      setCategories(categoryTree);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategorySelect = (category: string) => {
    onCategorySelect(category);
  };

  const handleSubCategorySelect = (subCategory: string) => {
    onCategorySelect(subCategory);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Kategoriler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kategoriler</Text>
        <TouchableOpacity onPress={loadCategories} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Yenile</Text>
        </TouchableOpacity>
      </View>

      {(categories || []).map((category) => (
        <View key={category.mainCategory} style={styles.categoryContainer}>
          <TouchableOpacity
            style={[
              styles.mainCategoryButton,
              selectedCategory === category.mainCategory && styles.selectedCategory,
            ]}
            onPress={() => handleCategorySelect(category.mainCategory)}
          >
            <Text
              style={[
                styles.mainCategoryText,
                selectedCategory === category.mainCategory && styles.selectedCategoryText,
              ]}
            >
              {category.mainCategory}
            </Text>
            {category.subCategories.length > 0 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleCategory(category.mainCategory)}
              >
                <Text style={styles.expandButtonText}>
                  {expandedCategories.has(category.mainCategory) ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {expandedCategories.has(category.mainCategory) && category.subCategories.length > 0 && (
            <View style={styles.subCategoriesContainer}>
              {category.subCategories.map((subCategory) => (
                <TouchableOpacity
                  key={subCategory}
                  style={[
                    styles.subCategoryButton,
                    selectedCategory === subCategory && styles.selectedSubCategory,
                  ]}
                  onPress={() => handleSubCategorySelect(subCategory)}
                >
                  <Text
                    style={[
                      styles.subCategoryText,
                      selectedCategory === subCategory && styles.selectedSubCategoryText,
                    ]}
                  >
                    {subCategory}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}

      {categories.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Kategori bulunamadı</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  refreshText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryContainer: {
    marginBottom: 8,
  },
  mainCategoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  mainCategoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  selectedCategoryText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  expandButton: {
    padding: 8,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#666',
  },
  subCategoriesContainer: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 2,
    borderLeftColor: '#e1e5e9',
  },
  subCategoryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedSubCategory: {
    backgroundColor: '#e8f4fd',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  subCategoryText: {
    fontSize: 14,
    color: '#555',
  },
  selectedSubCategoryText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
