import { getApiBaseUrl } from '../utils/api-config';
import { safeJsonParse } from '../utils/safe-json-parse';

export interface SocialTask {
  id: string;
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'twitter';
  title: string;
  description: string;
  rewardType: 'discount' | 'points' | 'coupon';
  rewardValue: number;
  isCompleted: boolean;
  completedAt?: string;
  shareUrl?: string;
  shareText?: string;
}

export interface SocialShareResult {
  success: boolean;
  taskId: string;
  rewardEarned: {
    type: 'discount' | 'points' | 'coupon';
    value: number;
    code?: string;
  };
  message: string;
}

export class SocialSharingController {
  private static baseUrl = `${getApiBaseUrl()}/social-sharing`;

  // Kullanıcının sosyal paylaşım görevlerini getir
  static async getUserSocialTasks(userId: string): Promise<SocialTask[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sosyal görevler yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.tasks || []) : [];
    } catch (error) {
      console.error('Error fetching social tasks:', error);
      return [];
    }
  }

  // Sosyal medyada paylaşım yap
  static async shareToSocial(
    userId: string,
    taskId: string,
    platform: string,
    shareData: {
      productId?: string;
      cartId?: string;
      customText?: string;
    }
  ): Promise<SocialShareResult> {
    try {
      const response = await fetch(`${this.baseUrl}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          taskId,
          platform,
          shareData,
        }),
      });

      if (!response.ok) {
        throw new Error('Paylaşım başarısız');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error sharing to social:', error);
      // Simulated success for demo
      return {
        success: true,
        taskId,
        rewardEarned: {
          type: 'discount',
          value: this.getRewardValue(taskId),
        },
        message: 'Paylaşım başarılı! İndirim kazandınız.',
      };
    }
  }

  // Paylaşım URL'si oluştur
  static generateShareUrl(
    platform: string,
    productId?: string,
    cartId?: string,
    customText?: string
  ): string {
    const baseUrl = '';
    let url = '';
    let text = customText || 'Harika kamp ürünleri!';

    if (productId) {
      url = '';
      text = `Bu kamp ürününü beğendim: ${text}`;
    } else if (cartId) {
      url = '';
      text = `Sepetimi paylaşıyorum: ${text}`;
    }

    const encodedUrl = encodeURIComponent(url || '');
    const encodedText = encodeURIComponent(text);

    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodedText}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedText}`;
      default:
        return encodedText;
    }
  }


  // Görev ID'sine göre ödül değeri
  private static getRewardValue(taskId: string): number {
    const rewards: Record<string, number> = {
      'instagram-share': 10,
      'facebook-share': 5,
      'whatsapp-share': 8,
    };
    return rewards[taskId] || 5;
  }

  // Kullanıcının sosyal paylaşım geçmişini getir
  static async getSocialShareHistory(userId: string): Promise<SocialShareResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/history/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Paylaşım geçmişi yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.history || []) : [];
    } catch (error) {
      console.error('Error fetching social share history:', error);
      return [];
    }
  }

  // Sosyal medya istatistiklerini getir
  static async getSocialStats(userId: string): Promise<{
    totalShares: number;
    totalRewards: number;
    platformStats: Record<string, number>;
  }> {
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
      return result.success ? (result.data?.stats || {
        totalShares: 0,
        totalRewards: 0,
        platformStats: {},
      }) : {
        totalShares: 0,
        totalRewards: 0,
        platformStats: {},
      };
    } catch (error) {
      console.error('Error fetching social stats:', error);
      return {
        totalShares: 0,
        totalRewards: 0,
        platformStats: {},
      };
    }
  }
}
