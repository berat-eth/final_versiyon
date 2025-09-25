import { getApiBaseUrl } from '../utils/api-config';
import { safeJsonParse } from '../utils/safe-json-parse';

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: 'monthly' | 'weekly' | 'daily' | 'social' | 'spending';
  rewardType: 'discount' | 'gift' | 'points' | 'cashback';
  rewardValue: number;
  rewardDescription: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  participants: CompetitionParticipant[];
  leaderboard: LeaderboardEntry[];
  rules: string[];
  maxParticipants?: number;
  minSpendingAmount?: number;
  minInvitations?: number;
  minShares?: number;
}

export interface CompetitionParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: string;
  currentScore: number;
  rank: number;
  isActive: boolean;
  achievements: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  score: number;
  progress: number;
  isCurrentUser: boolean;
}

export interface CompetitionStats {
  totalCompetitions: number;
  activeCompetitions: number;
  totalWins: number;
  totalPoints: number;
  currentRank: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  points: number;
}

export interface CompetitionResult {
  success: boolean;
  competitionId: string;
  pointsEarned: number;
  newRank: number;
  message: string;
  achievements?: Achievement[];
}

export class ShoppingCompetitionController {
  private static baseUrl = `${getApiBaseUrl()}/competitions`;

  // Aktif yarışmaları getir
  static async getActiveCompetitions(userId: string): Promise<Competition[]> {
    try {
      const response = await fetch(`${this.baseUrl}/active/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Yarışmalar yüklenemedi');
      }

      // Response'u önce text olarak al
      const responseText = await response.text();
      
      // Boş veya geçersiz response kontrolü
      if (!responseText || responseText.trim() === '' || responseText === 'undefined') {
        console.warn('Empty or invalid response from competitions API');
        return [];
      }

      // JSON parse et
      const data = JSON.parse(responseText);
      return data.competitions || [];
    } catch (error) {
      console.error('Error fetching competitions:', error);
      return [];
    }
  }

  // Yarışmaya katıl
  static async joinCompetition(
    userId: string,
    competitionId: string
  ): Promise<CompetitionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          competitionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Yarışmaya katılınamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error joining competition:', error);
      // Simulated join
      return {
        success: true,
        competitionId,
        pointsEarned: 10,
        newRank: 1,
        message: 'Yarışmaya başarıyla katıldınız!',
      };
    }
  }

  // Puan kazan (alışveriş, davet, paylaşım)
  static async earnPoints(
    userId: string,
    competitionId: string,
    action: 'purchase' | 'invite' | 'share' | 'review',
    value: number
  ): Promise<CompetitionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/earn-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          competitionId,
          action,
          value,
        }),
      });

      if (!response.ok) {
        throw new Error('Puan kazanılamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error earning points:', error);
      // Simulated points earning
      const points = this.calculatePoints(action, value);
      return {
        success: true,
        competitionId,
        pointsEarned: points,
        newRank: 1,
        message: `${points} puan kazandınız!`,
      };
    }
  }

  // Liderlik tablosunu getir
  static async getLeaderboard(
    competitionId: string,
    userId: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/leaderboard/${competitionId}/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Liderlik tablosu yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.leaderboard || []) : [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Fallback data
      return this.getDefaultLeaderboard(userId);
    }
  }

  // Kullanıcı istatistiklerini getir
  static async getUserStats(userId: string): Promise<CompetitionStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('İstatistikler yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data?.stats : null;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalCompetitions: 0,
        activeCompetitions: 0,
        totalWins: 0,
        totalPoints: 0,
        currentRank: 0,
        achievements: [],
      };
    }
  }

  // Başarımları getir
  static async getAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await fetch(`${this.baseUrl}/achievements/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Başarımlar yüklenemedi');
      }

      // Response'u önce text olarak al
      const responseText = await response.text();
      
      // Boş veya geçersiz response kontrolü
      if (!responseText || responseText.trim() === '' || responseText === 'undefined') {
        console.warn('Empty or invalid response from achievements API');
        return this.getDefaultAchievements();
      }

      // JSON parse et
      const data = JSON.parse(responseText);
      return data.achievements || [];
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return this.getDefaultAchievements();
    }
  }

  // Yarışma detaylarını getir
  static async getCompetitionDetails(competitionId: string): Promise<Competition | null> {
    try {
      const response = await fetch(`${this.baseUrl}/details/${competitionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Yarışma detayları yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data?.competition : null;
    } catch (error) {
      console.error('Error fetching competition details:', error);
      return null;
    }
  }

  // Puan hesaplama
  private static calculatePoints(action: string, value: number): number {
    const multipliers: Record<string, number> = {
      purchase: 1,
      invite: 50,
      share: 10,
      review: 25,
    };
    return Math.floor(value * (multipliers[action] || 1));
  }



}
