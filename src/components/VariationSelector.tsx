import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { ProductVariation, ProductVariationOption } from '../utils/types';

interface VariationSelectorProps {
  variations: ProductVariation[];
  onVariationChange: (selectedOptions: { [key: string]: ProductVariationOption }) => void;
  selectedOptions: { [key: string]: ProductVariationOption };
}

export const VariationSelector: React.FC<VariationSelectorProps> = ({
  variations,
  onVariationChange,
  selectedOptions,
}) => {
  const [localSelectedOptions, setLocalSelectedOptions] = useState<{ [key: string]: ProductVariationOption }>(selectedOptions);

  useEffect(() => {
    setLocalSelectedOptions(selectedOptions);
  }, [selectedOptions]);

  const handleOptionSelect = (variation: ProductVariation, option: ProductVariationOption) => {
    const newSelectedOptions = {
      ...localSelectedOptions,
      [variation.name]: option,
    };
    
    setLocalSelectedOptions(newSelectedOptions);
    onVariationChange(newSelectedOptions);
  };

  const isOptionSelected = (variationName: string, option: ProductVariationOption) => {
    return localSelectedOptions[variationName]?.id === option.id;
  };

  const isOptionAvailable = (option: ProductVariationOption) => {
    return option.stock > 0;
  };

  const getTotalPriceModifier = () => {
    return Object.values(localSelectedOptions).reduce((total, option) => {
      return total + (option?.priceModifier || 0);
    }, 0);
  };

  // Don't render if no variations
  if (!variations || variations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {variations.map((variation) => (
        <View key={variation.id} style={styles.variationContainer}>
          <Text style={styles.variationName}>{variation.name}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.optionsContainer}
          >
            {variation.options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  isOptionSelected(variation.name, option) && styles.selectedOption,
                  !isOptionAvailable(option) && styles.unavailableOption,
                ]}
                onPress={() => handleOptionSelect(variation, option)}
                disabled={!isOptionAvailable(option)}
              >
                {option.image && (
                  <Image 
                    source={{ uri: option.image }} 
                    style={styles.optionImage}
                    resizeMode="cover"
                  />
                )}
                <Text style={[
                  styles.optionText,
                  isOptionSelected(variation.name, option) && styles.selectedOptionText,
                  !isOptionAvailable(option) && styles.unavailableOptionText,
                ]}>
                  {option.value}
                </Text>
                <Text style={[
                  styles.stockText,
                  !isOptionAvailable(option) && styles.unavailableStockText,
                ]}>
                  {option.stock > 0 ? `${option.stock} adet` : 'Tükendi'}
                </Text>
                {option.priceModifier > 0 && (
                  <Text style={[
                    styles.priceModifier,
                    isOptionSelected(variation.name, option) && styles.selectedPriceModifier,
                  ]}>
                    +{option.priceModifier.toFixed(2)}₺
                  </Text>
                )}
                {option.stock <= 5 && option.stock > 0 && (
                  <Text style={styles.lowStockBadge}>Son {option.stock}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}
      
      {getTotalPriceModifier() > 0 && (
        <View style={styles.priceModifierContainer}>
          <Text style={styles.priceModifierLabel}>Ek Ücret:</Text>
          <Text style={styles.priceModifierTotal}>+{getTotalPriceModifier().toFixed(2)}₺</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  variationContainer: {
    marginBottom: 20,
  },
  variationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  selectedOption: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E8',
  },
  unavailableOption: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  optionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  unavailableOptionText: {
    color: '#999999',
  },
  priceModifier: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  selectedPriceModifier: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  lowStockBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF9800',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priceModifierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  priceModifierLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceModifierTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  stockText: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
    textAlign: 'center',
  },
  unavailableStockText: {
    color: '#F44336',
    fontWeight: '500',
  },
});
