// import { apiService } from './apiService'; // Not needed for this service

export interface UserProfile {
  userId: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalActivities: number;
  lastUpdated: string;
}

export interface UserActivity {
  id: number;
  activityType: string;
  activityData: any;
  timestamp: string;
  date: string;
  time: string;
}

export interface UserBehavior {
  id: number;
  behaviorType: string;
  behaviorData: any;
  timestamp: string;
}

export interface UserEcommerce {
  id: number;
  ecommerceType: string;
  ecommerceData: any;
  timestamp: string;
}

export interface UserPerformance {
  id: number;
  performanceType: string;
  performanceData: any;
  timestamp: string;
}

export interface UserSocial {
  id: number;
  socialType: string;
  socialData: any;
  timestamp: string;
}

export interface UserStats {
  userId: number;
  totalActivities: number;
  totalBehavior: number;
  totalEcommerce: number;
  totalPerformance: number;
  totalSocial: number;
  lastUpdated: string;
}

export interface UserCompleteData {
  profile: UserProfile | null;
  activities: UserActivity[];
  behavior: UserBehavior[];
  ecommerce: UserEcommerce[];
  performance: UserPerformance[];
  social: UserSocial[];
  stats: UserStats | null;
}

class UserSpecificDataService {
  private baseUrl = 'http://localhost:3001/api/user-specific';

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

  // Kullanıcı profil verilerini kaydet
  async saveUserProfile(userId: number, userData: Partial<UserProfile>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-profile/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Kullanıcı profili kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı aktivitesini kaydet
  async saveUserActivity(userId: number, activityData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-activity/${userId}`, {
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

  // Kullanıcı davranış verilerini kaydet
  async saveBehaviorData(userId: number, behaviorData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-behavior/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(behaviorData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Davranış verisi kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı e-ticaret verilerini kaydet
  async saveEcommerceData(userId: number, ecommerceData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-ecommerce/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ecommerceData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ E-ticaret verisi kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı performans verilerini kaydet
  async savePerformanceData(userId: number, performanceData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-performance/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(performanceData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Performans verisi kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı sosyal medya verilerini kaydet
  async saveSocialData(userId: number, socialData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-social/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(socialData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Sosyal medya verisi kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı istatistiklerini kaydet
  async saveUserStats(userId: number, statsData: Partial<UserStats>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-stats/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statsData),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ İstatistikler kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı verilerini getir
  async getUserData(userId: number): Promise<UserCompleteData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${userId}`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Kullanıcı verileri getirilemedi:', error);
      return null;
    }
  }

  // Tüm kullanıcıları listele
  async getAllUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Kullanıcı listesi getirilemedi:', error);
      return [];
    }
  }

  // Kullanıcı verilerini indir
  async downloadUserData(userId: number): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/download/${userId}`);
      return await response.blob();
    } catch (error) {
      console.error('❌ Kullanıcı verileri indirilemedi:', error);
      return null;
    }
  }

  // Kullanıcı verilerini yedekle
  async backupUserData(userId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/backup/${userId}`, {
        method: 'POST',
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Kullanıcı verileri yedeklenemedi:', error);
      return false;
    }
  }

  // Kullanıcı verilerini temizle
  async cleanupUserData(userId: number, daysToKeep: number = 30): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/cleanup/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysToKeep }),
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Kullanıcı verileri temizlenemedi:', error);
      return false;
    }
  }

  // Kullanıcı verilerini sil
  async deleteUserData(userId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${userId}`, {
        method: 'DELETE',
      });

      const result = await this.safeJsonParse(response);
      return result?.success || false;
    } catch (error) {
      console.error('❌ Kullanıcı verileri silinemedi:', error);
      return false;
    }
  }
}

export const userSpecificDataService = new UserSpecificDataService();
