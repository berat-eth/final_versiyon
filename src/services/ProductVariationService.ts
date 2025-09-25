import { ProductVariation, ProductVariationOption } from '../utils/types';
import { apiService } from '../utils/api-service';

export class ProductVariationService {
  /**
   * Save product variations to database
   */
  static async saveProductVariations(
    tenantId: number,
    productId: number,
    variations: ProductVariation[]
  ): Promise<boolean> {
    try {
      const response = await apiService.saveProductVariations(tenantId, productId, variations);
      return response.success;
    } catch (error) {
      console.error('Error saving product variations:', error);
      return false;
    }
  }

  /**
   * Get product variations from database
   */
  static async getProductVariations(
    tenantId: number,
    productId: number
  ): Promise<ProductVariation[]> {
    try {
      const response = await apiService.getProductVariations(productId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting product variations:', error);
      return [];
    }
  }

  /**
   * Update product hasVariations flag
   */
  static async updateProductHasVariations(
    tenantId: number,
    productId: number,
    hasVariations: boolean
  ): Promise<boolean> {
    try {
      const response = await apiService.updateProductHasVariations(productId, hasVariations);
      return response.success;
    } catch (error) {
      console.error('Error updating product hasVariations flag:', error);
      return false;
    }
  }

  /**
   * Check if a product has meaningful variations
   * A product has meaningful variations if:
   * 1. It has multiple different variation values for the same attribute, OR
   * 2. It has multiple different variation attributes
   */
  static hasMeaningfulVariations(variations: ProductVariation[]): boolean {
    if (!variations || variations.length === 0) {
      return false;
    }

    // Check if any variation has multiple different values
    return variations.some(variation => {
      const uniqueValues = new Set(variation.options.map(opt => opt.value));
      return uniqueValues.size > 1;
    });
  }

  /**
   * Filter out single-option variations
   */
  static filterMeaningfulVariations(variations: ProductVariation[]): ProductVariation[] {
    if (!variations || variations.length === 0) {
      return [];
    }

    return variations.filter(variation => {
      const uniqueValues = new Set(variation.options.map(opt => opt.value));
      return uniqueValues.size > 1;
    });
  }

  /**
   * Get variation summary for display
   */
  static getVariationSummary(variations: ProductVariation[]): string {
    if (!variations || variations.length === 0) {
      return '';
    }

    const meaningfulVariations = this.filterMeaningfulVariations(variations);
    
    if (meaningfulVariations.length === 0) {
      return '';
    }

    const variationNames = meaningfulVariations.map(v => v.name);
    return variationNames.join(', ');
  }

  /**
   * Calculate total price modifier for selected options
   */
  static calculateTotalPriceModifier(selectedOptions: { [key: string]: ProductVariationOption }): number {
    return Object.values(selectedOptions).reduce((total, option) => {
      return total + (option?.priceModifier || 0);
    }, 0);
  }

  /**
   * Get minimum stock from selected options
   */
  static getMinimumStock(selectedOptions: { [key: string]: ProductVariationOption }): number {
    const stocks = Object.values(selectedOptions).map(option => option?.stock || 0);
    return stocks.length > 0 ? Math.min(...stocks) : 0;
  }

  /**
   * Check if all required variations are selected
   */
  static areAllVariationsSelected(
    variations: ProductVariation[],
    selectedOptions: { [key: string]: ProductVariationOption }
  ): boolean {
    if (!variations || variations.length === 0) {
      return true;
    }

    const meaningfulVariations = this.filterMeaningfulVariations(variations);
    return meaningfulVariations.every(variation => selectedOptions[variation.name]);
  }

  /**
   * Get selected variation string for display
   */
  static getSelectedVariationString(
    variations: ProductVariation[],
    selectedOptions: { [key: string]: ProductVariationOption }
  ): string {
    if (!variations || variations.length === 0) {
      return '';
    }

    const meaningfulVariations = this.filterMeaningfulVariations(variations);
    const selectedValues = meaningfulVariations.map(variation => {
      const selectedOption = selectedOptions[variation.name];
      return selectedOption ? `${variation.name}: ${selectedOption.value}` : '';
    }).filter(Boolean);
    
    return selectedValues.join(', ');
  }
}
