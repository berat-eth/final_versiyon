// import { apiService } from './apiService'; // Not needed for this service

export interface UserData {
  userId: number;
  name: string;
  surname: string;
}

export interface ActivityData {
  userId: number;
  activityType: string;
  activityData?: any;
}

export interface UserActivity {
  id: number;
  userId: number;
  activityType: string;
  activityData: any;
  timestamp: string;
  date: string;
  time: string;
}

export interface DailyReport {
  date: string;
  totalActivities: number;
  uniqueUsers: number;
  activitiesByType: { [key: string]: number };
  userActivities: { [key: string]: { name: string; activities: UserActivity[] } };
}

import { getApiBaseUrl } from '../utils/api-config';

class UserDataService {
  private baseUrl = `${getApiBaseUrl()}/user-data`;

  // Güvenli JSON parse metodu
  private async safeJsonParse(response: Response): Promise<any> {
    try {
      const text = await response.text();
      
      if (!text || text === 'undefined' || text.trim() === '') {
        console.error('❌ Empty response from server');
        return { success: false, message: 'Empty response' };
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.error('❌ JSON parse error:', error);
      return { 
        success: false, 
        message: 'Invalid JSON response',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Kullanıcı verilerini sunucuya kaydet
  async saveUserData(userData: UserData): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Kullanıcı verisi kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı aktivitesini sunucuya kaydet
  async logUserActivity(activityData: ActivityData): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/log-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Aktivite kaydedilemedi:', error);
      return false;
    }
  }

  // Tüm kullanıcı verilerini getir
  async getUsersData(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/users`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Kullanıcı verileri getirilemedi:', error);
      return null;
    }
  }

  // Tüm aktivite verilerini getir
  async getActivitiesData(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/activities`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Aktivite verileri getirilemedi:', error);
      return null;
    }
  }

  // Belirli kullanıcının aktivitelerini getir
  async getUserActivities(userId: number): Promise<UserActivity[]> {
    try {
      const response = await fetch(`${this.baseUrl}/user-activities/${userId}`);
      const result = await response.json();
      return result.data.activities;
    } catch (error) {
      console.error('❌ Kullanıcı aktiviteleri getirilemedi:', error);
      return [];
    }
  }

  // Günlük rapor oluştur
  async getDailyReport(date?: string): Promise<DailyReport | null> {
    try {
      const url = date ? `${this.baseUrl}/daily-report/${date}` : `${this.baseUrl}/daily-report`;
      const response = await fetch(url);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Günlük rapor getirilemedi:', error);
      return null;
    }
  }

  // Veri dosyalarını indir
  async downloadUsersData(): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/download/users`);
      return await response.blob();
    } catch (error) {
      console.error('❌ Kullanıcı verileri indirilemedi:', error);
      return null;
    }
  }

  async downloadActivitiesData(): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/download/activities`);
      return await response.blob();
    } catch (error) {
      console.error('❌ Aktivite verileri indirilemedi:', error);
      return null;
    }
  }

  // Veri dosyalarını temizle (admin)
  async clearAllData(adminKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/clear-data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminKey }),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Veriler temizlenemedi:', error);
      return false;
    }
  }
}

export const userDataService = new UserDataService();
