import apiService from '../utils/api-service';
import { User } from '../utils/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class UserModel {
  static async create(user: Omit<User, 'id' | 'createdAt'>): Promise<number | null> {
    try {
      const response = await apiService.createUser({
        name: user.name,
        email: user.email,
        password: user.password,
        phone: user.phone || '',
        address: user.address || ''
      });
      
      if (response.success && response.data) {
        return response.data.userId;
      }
      return null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  static async getByEmail(email: string): Promise<User | null> {
    try {
      const response = await apiService.getUserByEmail(email);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  static async getById(id: number): Promise<User | null> {
    try {
      const response = await apiService.getUserById(id);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }

  static async update(id: number, data: Partial<User>): Promise<boolean> {
    try {
      const response = await apiService.updateUser(id, data);
      return response.success;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  static async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await apiService.loginUser(email, password);
      if (response.success && response.data) {
        await AsyncStorage.setItem('currentUser', JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error logging in:', error);
      return null;
      }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}