import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { ProductVariation, ProductVariationOption } from '../utils/types';

interface ProductVariationManagerProps {
  productId: number;
  onVariationsChange: (variations: ProductVariation[]) => void;
}

export const ProductVariationManager: React.FC<ProductVariationManagerProps> = ({
  productId,
  onVariationsChange,
}) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [showAddVariation, setShowAddVariation] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [newVariationName, setNewVariationName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [newOptionStock, setNewOptionStock] = useState('');

  const addVariation = () => {
    if (!newVariationName.trim()) {
      Alert.alert('Hata', 'Varyasyon adı boş olamaz');
      return;
    }

    const newVariation: ProductVariation = {
      id: Date.now(), // Temporary ID
      productId,
      name: newVariationName.trim(),
      options: [],
    };

    setVariations([...variations, newVariation]);
    setNewVariationName('');
    setShowAddVariation(false);
    onVariationsChange([...variations, newVariation]);
  };

  const addOption = () => {
    if (!selectedVariation) return;
    if (!newOptionValue.trim()) {
      Alert.alert('Hata', 'Seçenek değeri boş olamaz');
      return;
    }

    const newOption: ProductVariationOption = {
      id: Date.now(), // Temporary ID
      variationId: selectedVariation.id,
      value: newOptionValue.trim(),
      priceModifier: parseFloat(newOptionPrice) || 0,
      stock: parseInt(newOptionStock) || 0,
    };

    const updatedVariations = variations.map(v => {
      if (v.id === selectedVariation.id) {
        return {
          ...v,
          options: [...v.options, newOption],
        };
      }
      return v;
    });

    setVariations(updatedVariations);
    setNewOptionValue('');
    setNewOptionPrice('');
    setNewOptionStock('');
    setShowAddOption(false);
    setSelectedVariation(null);
    onVariationsChange(updatedVariations);
  };

  const removeVariation = (variationId: number) => {
    Alert.alert(
      'Varyasyonu Sil',
      'Bu varyasyonu silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updatedVariations = variations.filter(v => v.id !== variationId);
            setVariations(updatedVariations);
            onVariationsChange(updatedVariations);
          },
        },
      ]
    );
  };

  const removeOption = (variationId: number, optionId: number) => {
    Alert.alert(
      'Seçeneği Sil',
      'Bu seçeneği silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updatedVariations = variations.map(v => {
              if (v.id === variationId) {
                return {
                  ...v,
                  options: v.options.filter(o => o.id !== optionId),
                };
              }
              return v;
            });
            setVariations(updatedVariations);
            onVariationsChange(updatedVariations);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ürün Varyasyonları</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddVariation(true)}
        >
          <Text style={styles.addButtonText}>+ Varyasyon Ekle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.variationsList}>
        {variations.map((variation) => (
          <View key={variation.id} style={styles.variationCard}>
            <View style={styles.variationHeader}>
              <Text style={styles.variationName}>{variation.name}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeVariation(variation.id)}
              >
                <Text style={styles.removeButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {variation.options.map((option) => (
                <View key={option.id} style={styles.optionItem}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionValue}>{option.value}</Text>
                    <Text style={styles.optionDetails}>
                      +{option.priceModifier}₺ | Stok: {option.stock}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeOptionButton}
                    onPress={() => removeOption(variation.id, option.id)}
                  >
                    <Text style={styles.removeButtonText}>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.addOptionButton}
              onPress={() => {
                setSelectedVariation(variation);
                setShowAddOption(true);
              }}
            >
              <Text style={styles.addOptionButtonText}>+ Seçenek Ekle</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add Variation Modal */}
      <Modal
        visible={showAddVariation}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Varyasyon Ekle</Text>
            <TextInput
              style={styles.input}
              placeholder="Varyasyon adı (örn: Boyut, Renk)"
              value={newVariationName}
              onChangeText={setNewVariationName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddVariation(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addVariation}
              >
                <Text style={styles.saveButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Option Modal */}
      <Modal
        visible={showAddOption}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedVariation?.name} için Seçenek Ekle
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Seçenek değeri (örn: XL, Kırmızı)"
              value={newOptionValue}
              onChangeText={setNewOptionValue}
            />
            <TextInput
              style={styles.input}
              placeholder="Ek ücret (0)"
              value={newOptionPrice}
              onChangeText={setNewOptionPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Stok miktarı (0)"
              value={newOptionStock}
              onChangeText={setNewOptionStock}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddOption(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addOption}
              >
                <Text style={styles.saveButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  variationsList: {
    flex: 1,
  },
  variationCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  variationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 16,
  },
  optionsList: {
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionInfo: {
    flex: 1,
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  optionDetails: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  removeOptionButton: {
    padding: 4,
  },
  addOptionButton: {
    backgroundColor: '#E8F5E8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  addOptionButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
