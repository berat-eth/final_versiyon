import { getApiBaseUrl, DEFAULT_TENANT_API_KEY } from '../utils/api-config';
import { safeJsonParse } from '../utils/safe-json-parse';
import { UserLevel, UserLevelProgress, ExpTransaction, UserLevelSystem } from '../models/UserLevel';

export class UserLevelController {
  private static baseUrl = `${getApiBaseUrl()}/user-level`;

  // Kullanıcının seviye bilgilerini getir
  static async getUserLevel(userId: string): Promise<UserLevelProgress | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ UserLevelController: API Error Response:', errorText);
        throw new Error(`Seviye bilgileri yüklenemedi (${response.status}): ${errorText}`);
      }

      // Güvenli JSON parse
      const parsed = await safeJsonParse(response);
      if (!parsed || !parsed.success) {
        console.error('❌ UserLevelController: No data received from API');
        return null;
      }

      const api = (parsed as any).data || {};
      console.log('✅ UserLevelController: API Response:', api);

      // Beklenen API şeması: { success: boolean, levelProgress: {...} }
      if (api.success && api.levelProgress) {
        return api.levelProgress as UserLevelProgress;
      }
      // Alternatif şema: { success: boolean, data: { levelProgress: {...} } }
      if (api.success && api.data?.levelProgress) {
        return api.data.levelProgress as UserLevelProgress;
      } else {
        console.error('❌ UserLevelController: Invalid response format:', api);
        return null;
      }
    } catch (error) {
      console.error('❌ UserLevelController: Error fetching user level:', error);
      return null;
    }
  }

  // Kullanıcının EXP geçmişini getir
  static async getExpHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    transactions: ExpTransaction[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/history?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error('EXP geçmişi yüklenemedi');
      }

      // Güvenli JSON parse
      const parsed = await safeJsonParse(response);
      if (!parsed || !parsed.success) {
        console.error('❌ UserLevelController: No EXP history data received from API');
        return {
          transactions: [],
          total: 0,
          hasMore: false,
        };
      }
      const api = (parsed as any).data || {};
      console.log('✅ UserLevelController: EXP History API Response:', api);
      
      if (api.success) {
        return {
          transactions: api.transactions || api.data?.transactions || [],
          total: api.total || api.data?.total || 0,
          hasMore: api.hasMore || api.data?.hasMore || false,
        };
      } else {
        console.error('❌ UserLevelController: Invalid EXP history response format:', api);
        return {
          transactions: [],
          total: 0,
          hasMore: false,
        };
      }
    } catch (error) {
      console.error('Error fetching exp history:', error);
      return {
        transactions: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  // EXP kazan
  static async addExp(
    userId: string,
    source: string,
    amount: number,
    description: string,
    orderId?: string,
    productId?: string
  ): Promise<{ success: boolean; newLevel?: UserLevel; levelUp: boolean }> {
    try {
      const expGain = UserLevelSystem.calculateExpGain(source, amount);
      
      const response = await fetch(`${this.baseUrl}/${userId}/add-exp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
        body: JSON.stringify({
          source,
          amount: expGain,
          description,
          orderId,
          productId,
        }),
      });

      if (!response.ok) {
        throw new Error('EXP eklenemedi');
      }

      const data = await response.json();
      return {
        success: true,
        newLevel: data.newLevel,
        levelUp: data.levelUp || false,
      };
    } catch (error) {
      console.error('Error adding exp:', error);
      return {
        success: false,
        levelUp: false,
      };
    }
  }

  // Alışveriş sonrası EXP kazan
  static async addPurchaseExp(
    userId: string,
    orderId: string,
    orderTotal: number,
    productIds: string[]
  ): Promise<{ success: boolean; expGained: number; newLevel?: UserLevel; levelUp: boolean }> {
    try {
      const expGain = UserLevelSystem.calculateExpGain('purchase', 0, orderTotal);
      
      const response = await fetch(`${this.baseUrl}/${userId}/purchase-exp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
        body: JSON.stringify({
          orderId,
          orderTotal,
          productIds,
          expGain,
        }),
      });

      if (!response.ok) {
        throw new Error('Alışveriş EXP\'si eklenemedi');
      }

      const data = await response.json();
      return {
        success: true,
        expGained: data.expGained || 0,
        newLevel: data.newLevel,
        levelUp: data.levelUp || false,
      };
    } catch (error) {
      console.error('Error adding purchase exp:', error);
      return {
        success: false,
        expGained: 0,
        levelUp: false,
      };
    }
  }

  // Davet sonrası EXP kazan
  static async addInvitationExp(
    userId: string,
    invitedUserId: string,
    invitedUserName: string
  ): Promise<{ success: boolean; expGained: number; newLevel?: UserLevel; levelUp: boolean }> {
    try {
      const expGain = UserLevelSystem.calculateExpGain('invitation', 0);
      
      const response = await fetch(`${this.baseUrl}/${userId}/invitation-exp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
        body: JSON.stringify({
          invitedUserId,
          invitedUserName,
          expGain,
        }),
      });

      if (!response.ok) {
        throw new Error('Davet EXP\'si eklenemedi');
      }

      const data = await response.json();
      return {
        success: true,
        expGained: data.expGained || 0,
        newLevel: data.newLevel,
        levelUp: data.levelUp || false,
      };
    } catch (error) {
      console.error('Error adding invitation exp:', error);
      return {
        success: false,
        expGained: 0,
        levelUp: false,
      };
    }
  }

  // Sosyal paylaşım sonrası EXP kazan
  static async addSocialShareExp(userId: string): Promise<{ success: boolean; message: string; newLevel?: UserLevelProgress }> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/social-share-exp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
        body: JSON.stringify({
          platform: 'social_share',
          expGain: 25,
        }),
      });

      if (!response.ok) {
        throw new Error('Sosyal paylaşım EXP\'si eklenemedi');
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message,
        newLevel: data.newLevel,
      };
    } catch (error) {
      console.error('Error adding social share exp:', error);
      return {
        success: false,
        message: 'Sosyal paylaşım EXP\'si eklenemedi',
      };
    }
  }

  // Seviye atlama ödüllerini al
  static async claimLevelUpRewards(
    userId: string,
    levelId: string
  ): Promise<{ success: boolean; rewards: any[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/claim-rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
        body: JSON.stringify({
          levelId,
        }),
      });

      if (!response.ok) {
        throw new Error('Ödüller alınamadı');
      }

      // Güvenli JSON parse
      const parsed = await safeJsonParse(response);
      if (!parsed || !parsed.success) {
        return {
          success: false,
          rewards: [],
        };
      }
      const api = (parsed as any).data || {};
      return {
        success: true,
        rewards: api.rewards || api.data?.rewards || [],
      };
    } catch (error) {
      console.error('Error claiming level up rewards:', error);
      return {
        success: false,
        rewards: [],
      };
    }
  }

  // Kullanıcının seviye istatistiklerini getir
  static async getLevelStats(userId: string): Promise<{
    totalExp: number;
    currentLevel: UserLevel;
    nextLevel: UserLevel | null;
    expToNextLevel: number;
    progressPercentage: number;
    totalPurchases: number;
    totalInvitations: number;
    totalSocialShares: number;
    levelUpCount: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0',
          'X-API-Key': DEFAULT_TENANT_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error('Seviye istatistikleri yüklenemedi');
      }

      // Güvenli JSON parse
      const parsed = await safeJsonParse(response);
      if (!parsed || !parsed.success) {
        return {
          totalExp: 0,
          currentLevel: UserLevelSystem.getAllLevels()[0],
          nextLevel: null,
          expToNextLevel: 0,
          progressPercentage: 0,
          totalPurchases: 0,
          totalInvitations: 0,
          totalSocialShares: 0,
          levelUpCount: 0,
        };
      }
      const api = (parsed as any).data || {};
      return api.stats || api.data?.stats || {
        totalExp: 0,
        currentLevel: UserLevelSystem.getAllLevels()[0],
        nextLevel: null,
        expToNextLevel: 0,
        progressPercentage: 0,
        totalPurchases: 0,
        totalInvitations: 0,
        totalSocialShares: 0,
        levelUpCount: 0,
      };
    } catch (error) {
      console.error('Error fetching level stats:', error);
      return {
        totalExp: 0,
        currentLevel: UserLevelSystem.getAllLevels()[0],
        nextLevel: null,
        expToNextLevel: 0,
        progressPercentage: 0,
        totalPurchases: 0,
        totalInvitations: 0,
        totalSocialShares: 0,
        levelUpCount: 0,
      };
    }
  }

  // Tüm seviyeleri getir
  static getAllLevels(): UserLevel[] {
    return UserLevelSystem.getAllLevels();
  }

  // Seviye bilgilerini getir
  static getLevelInfo(levelId: string): UserLevel | null {
    return UserLevelSystem.getLevelInfo(levelId);
  }
}
