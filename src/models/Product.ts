import apiService from '../utils/api-service';
import { Product, ProductVariation, ProductVariationOption } from '../utils/types';

export interface FilterOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  minRating?: number;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc' | 'name_desc';
}

export class ProductModel {
  static async getAll(): Promise<Product[]> {
    try {
      const response = await apiService.getAllProducts();
      if (response.success && response.data) {
        const products = response.data;
        const productsWithVariations = await Promise.all(
          products.map(async (product) => {
            const variations = await this.getProductVariations(product.id);
            return {
              ...product,
              variations,
              hasVariations: variations.length > 0,
            };
          })
        );
        return productsWithVariations || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }

  static async getById(id: number): Promise<Product | null> {
    try {
      const response = await apiService.getProductById(id);
      if (response.success && response.data) {
        const product = response.data;
        const variations = await this.getProductVariations(id);
        return {
          ...product,
          variations,
          hasVariations: variations.length > 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting product by id:', error);
      return null;
    }
  }

  static async getByCategory(category: string): Promise<Product[]> {
    try {
      const response = await apiService.getProductsByCategory(category);
      if (response.success && response.data) {
        const products = response.data;
        const productsWithVariations = await Promise.all(
          products.map(async (product) => {
            const variations = await this.getProductVariations(product.id);
            return {
              ...product,
              variations,
              hasVariations: variations.length > 0,
            };
          })
        );
        return productsWithVariations || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting products by category:', error);
      return [];
    }
  }

  static async search(query: string): Promise<Product[]> {
    try {
      const response = await apiService.searchProducts(query);
      if (response.success && response.data) {
        const products = response.data;
        const productsWithVariations = await Promise.all(
          products.map(async (product) => {
            const variations = await this.getProductVariations(product.id);
            return {
              ...product,
              variations,
              hasVariations: variations.length > 0,
            };
          })
        );
        return productsWithVariations || [];
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  static async filterProducts(filters: FilterOptions): Promise<Product[]> {
    try {
      let query = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];

      // Category filter
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      // Price range filter
      if (filters.minPrice !== undefined) {
        query += ' AND price >= ?';
        params.push(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query += ' AND price <= ?';
        params.push(filters.maxPrice);
      }

      // Brand filter
      if (filters.brands && filters.brands.length > 0) {
        const placeholders = filters.brands.map(() => '?').join(',');
        query += ` AND brand IN (${placeholders})`;
        params.push(...filters.brands);
      }

      // Rating filter
      if (filters.minRating !== undefined) {
        query += ' AND rating >= ?';
        params.push(filters.minRating);
      }

      // Stock filter
      if (filters.inStock) {
        query += ' AND stock > 0';
      }

      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'price_asc':
            query += ' ORDER BY price ASC';
            break;
          case 'price_desc':
            query += ' ORDER BY price DESC';
            break;
          case 'rating_desc':
            query += ' ORDER BY rating DESC';
            break;
          case 'name_asc':
            query += ' ORDER BY name ASC';
            break;
          case 'name_desc':
            query += ' ORDER BY name DESC';
            break;
        }
      }

      const response = await apiService.filterProducts(filters);
      if (response.success && response.data) {
        const products = response.data;
        const productsWithVariations = await Promise.all(
          products.map(async (product) => {
            const variations = await this.getProductVariations(product.id);
            return {
              ...product,
              variations,
              hasVariations: variations.length > 0,
            };
          })
        );
        return productsWithVariations || [];
      }
      return [];
    } catch (error) {
      console.error('Error filtering products:', error);
      return [];
    }
  }

  // New methods for variations
  static async getProductVariations(productId: number): Promise<ProductVariation[]> {
    try {
      const response = await apiService.getProductVariations(productId);
      if (response.success && response.data) {
        const variations = response.data;
        const variationsWithOptions = await Promise.all(
          variations.map(async (variation: any) => {
            const options = await this.getVariationOptions(variation.id);
            return {
              ...variation,
              options,
            };
          })
        );
        return variationsWithOptions || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting product variations:', error);
      return [];
    }
  }

  static async getVariationOptions(variationId: number): Promise<ProductVariationOption[]> {
    try {
      const response = await apiService.getVariationOptions(variationId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting variation options:', error);
      return [];
    }
  }

  static async getVariationOptionById(optionId: number): Promise<ProductVariationOption | null> {
    try {
      const response = await apiService.getVariationOptionById(optionId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting variation option by id:', error);
      return null;
    }
  }

  static async updateVariationOptionStock(optionId: number, quantity: number): Promise<boolean> {
    try {
      const response = await apiService.updateVariationOptionStock(optionId, quantity);
      return response.success;
    } catch (error) {
      console.error('Error updating variation option stock:', error);
      return false;
    }
  }

  static async getProductStockWithVariations(productId: number, selectedOptions?: { [key: string]: number }): Promise<number> {
    try {
      if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
        // Return base product stock if no variations selected
        const product = await this.getById(productId);
        return product?.stock || 0;
      }

      // Get minimum stock from selected variation options
      const optionIds = Object.values(selectedOptions);
      if (optionIds.length === 0) return 0;

      // For now, return 0 as we need to implement this in the API
      // Will be implemented in API
      return 0;
    } catch (error) {
      console.error('Error getting product stock with variations:', error);
      return 0;
    }
  }

  static async getBrands(): Promise<string[]> {
    try {
      const response = await apiService.getBrands();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting brands:', error);
      return [];
    }
  }

  static async getPriceRange(): Promise<{ min: number; max: number }> {
    try {
      const response = await apiService.getPriceRange();
      if (response.success && response.data) {
        return response.data;
      }
      return { min: 0, max: 0 };
    } catch (error) {
      console.error('Error getting price range:', error);
      return { min: 0, max: 0 };
    }
  }

  static async updateStock(id: number, quantity: number): Promise<boolean> {
    try {
      const response = await apiService.updateProductStock(id, quantity);
      return response.success;
    } catch (error) {
      console.error('Error updating product stock:', error);
      return false;
    }
  }

  static async getCategories(): Promise<string[]> {
    try {
      const response = await apiService.getCategories();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }
}