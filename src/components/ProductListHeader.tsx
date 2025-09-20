import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchBar } from './SearchBar';
import { Colors, Gradients } from '../theme/colors';

interface ProductListHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchSubmit: () => void;
  onFilterPress: () => void;
  hasActiveFilters: boolean;
}

export const ProductListHeader: React.FC<ProductListHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onFilterPress,
  hasActiveFilters,
}) => {
  return (
    <LinearGradient
      colors={Gradients.light}
      style={styles.container}
    >
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Ürün ara..."
          onSubmit={onSearchSubmit}
        />
      </View>

      <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
        <LinearGradient
          colors={hasActiveFilters ? Gradients.primary : ['#FFFFFF', '#F9FAFB']}
          style={styles.filterButtonGradient}
        >
          <Icon 
            name="tune" 
            size={24} 
            color={hasActiveFilters ? Colors.textOnPrimary : Colors.primary} 
          />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
