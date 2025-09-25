import { apiService } from '../utils/api-service';

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
      const response = await apiService.post<{ success: boolean; message?: string; addressId?: number }>('/user-addresses', {
        userId,
        ...addressData
      });
      return {
        success: !!response.success,
        message: response.message || 'Adres kaydedildi',
        addressId: (response.data as any)?.addressId
      };
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  static async updateAddress(addressData: UpdateAddressData): Promise<{ success: boolean; message: string }> {
    try {
      const { id, ...data } = addressData;
      const response = await apiService.put<{ success: boolean; message?: string }>(`/user-addresses/${id}`, data);
      return { success: !!response.success, message: response.message || 'Adres güncellendi' };
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  static async deleteAddress(addressId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.delete<{ success: boolean; message?: string }>(`/user-addresses/${addressId}`);
      return { success: !!response.success, message: response.message || 'Adres silindi' };
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  static async setDefaultAddress(addressId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<{ success: boolean; message?: string }>(`/user-addresses/${addressId}/set-default`);
      return { success: !!response.success, message: response.message || 'Varsayılan adres ayarlandı' };
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
