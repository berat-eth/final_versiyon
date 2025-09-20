import { apiService } from './api-service';

export interface Address {
  id: number;
  userId: number;
  addressType: 'shipping' | 'billing';
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  addressType: 'shipping' | 'billing';
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface UpdateAddressData extends CreateAddressData {
  id: number;
}

export class AddressService {
  static async getUserAddresses(userId: number, addressType?: 'shipping' | 'billing'): Promise<Address[]> {
    try {
      const params = new URLSearchParams({ userId: userId.toString() });
      if (addressType) {
        params.append('addressType', addressType);
      }
      
      const response = await apiService.get(`/user-addresses?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      throw error;
    }
  }

  static async createAddress(userId: number, addressData: CreateAddressData): Promise<{ success: boolean; message: string; addressId?: number }> {
    try {
      const response = await apiService.post('/user-addresses', {
        userId,
        ...addressData
      });
      return response;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  static async updateAddress(addressData: UpdateAddressData): Promise<{ success: boolean; message: string }> {
    try {
      const { id, ...data } = addressData;
      const response = await apiService.put(`/user-addresses/${id}`, data);
      return response;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  static async deleteAddress(addressId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.delete(`/user-addresses/${addressId}`);
      return response;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  static async setDefaultAddress(addressId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put(`/user-addresses/${addressId}/set-default`);
      return response;
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }

  static getAddressTypeText(addressType: 'shipping' | 'billing'): string {
    switch (addressType) {
      case 'shipping':
        return 'Teslimat Adresi';
      case 'billing':
        return 'Fatura Adresi';
      default:
        return 'Adres';
    }
  }

  static getAddressTypeIcon(addressType: 'shipping' | 'billing'): string {
    switch (addressType) {
      case 'shipping':
        return 'local-shipping';
      case 'billing':
        return 'receipt';
      default:
        return 'location-on';
    }
  }

  static getAddressTypeColor(addressType: 'shipping' | 'billing'): string {
    switch (addressType) {
      case 'shipping':
        return '#3b82f6'; // Mavi
      case 'billing':
        return '#10b981'; // Yeşil
      default:
        return '#6b7280'; // Gri
    }
  }
}
