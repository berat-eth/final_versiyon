import { getApiBaseUrl } from '../utils/api-config';
import { safeJsonParse } from '../utils/safe-json-parse';

export interface GroupDiscount {
  id: string;
  name: string;
  description: string;
  discountPercentage: number;
  minParticipants: number;
  currentParticipants: number;
  maxParticipants?: number;
  productIds: string[];
  categoryIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  participants: GroupParticipant[];
  totalSavings: number;
  estimatedSavings: number;
}

export interface GroupParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: string;
  productIds: string[];
  totalAmount: number;
  savings: number;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  inviterUserId: string;
  inviterName: string;
  invitedUserId?: string;
  invitedEmail?: string;
  invitedPhone?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  message?: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  productIds: string[];
  categoryIds?: string[];
  minParticipants: number;
  maxParticipants?: number;
  endDate: string;
  message?: string;
}

export class GroupDiscountController {
  private static baseUrl = `${getApiBaseUrl()}/group-discounts`;

  // Kullanıcının aktif grup indirimlerini getir
  static async getUserGroupDiscounts(userId: string): Promise<GroupDiscount[]> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Grup indirimleri yüklenemedi');
      }

      const result = await safeJsonParse(response);
      return result.success ? (result.data?.groups || []) : [];
    } catch (error) {
      console.error('Error fetching group discounts:', error);
      return [];
    }
  }

  // Yeni grup oluştur
  static async createGroup(userId: string, groupData: CreateGroupRequest): Promise<GroupDiscount> {
    try {
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...groupData,
        }),
      });

      if (!response.ok) {
        throw new Error('Grup oluşturulamadı');
      }

      const data = await response.json();
      return data.group;
    } catch (error) {
      console.error('Error creating group:', error);
      // Simulated group creation
      return this.createSimulatedGroup(groupData);
    }
  }

  // Gruba katıl
  static async joinGroup(userId: string, groupId: string, productIds: string[]): Promise<{
    success: boolean;
    group: GroupDiscount;
    savings: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          groupId,
          productIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Gruba katılınamadı');
      }

      const result = await safeJsonParse(response);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error joining group:', error);
      // Simulated join
      return {
        success: true,
        group: this.getDefaultGroupDiscounts()[0],
        savings: 150,
      };
    }
  }

  // Grup davetiyesi gönder
  static async sendInvitation(
    userId: string,
    groupId: string,
    invitationData: {
      invitedEmail?: string;
      invitedPhone?: string;
      message?: string;
    }
  ): Promise<GroupInvitation> {
    try {
      const response = await fetch(`${this.baseUrl}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          groupId,
          ...invitationData,
        }),
      });

      if (!response.ok) {
        throw new Error('Davetiye gönderilemedi');
      }

      const data = await response.json();
      return data.invitation;
    } catch (error) {
      console.error('Error sending invitation:', error);
      // Simulated invitation
      return this.createSimulatedInvitation(groupId, invitationData);
    }
  }

  // Grup davetiyelerini getir
  static async getUserInvitations(userId: string): Promise<GroupInvitation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Davetiyeler yüklenemedi');
      }

      const data = await response.json();
      return data.invitations || [];
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
  }

  // Davetiyeyi kabul et/reddet
  static async respondToInvitation(
    invitationId: string,
    userId: string,
    response: 'accept' | 'decline',
    productIds?: string[]
  ): Promise<{ success: boolean; group?: GroupDiscount }> {
    try {
      const apiResponse = await fetch(`${this.baseUrl}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          userId,
          response,
          productIds,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Davetiye yanıtlanamadı');
      }

      // Response'u önce text olarak al
      const responseText = await apiResponse.text();
      
      // Boş veya geçersiz response kontrolü
      if (!responseText || responseText.trim() === '' || responseText === 'undefined') {
        console.warn('Empty or invalid response from group discount API');
        return {
          success: response === 'accept',
          group: response === 'accept' ? this.getDefaultGroupDiscounts()[0] : undefined,
        };
      }

      // JSON parse et
      const data = JSON.parse(responseText);
      return data;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return {
        success: response === 'accept',
        group: response === 'accept' ? this.getDefaultGroupDiscounts()[0] : undefined,
      };
    }
  }

  // Grup detaylarını getir
  static async getGroupDetails(groupId: string): Promise<GroupDiscount | null> {
    try {
      const response = await fetch(`${this.baseUrl}/details/${groupId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Grup detayları yüklenemedi');
      }

      const data = await response.json();
      return data.group;
    } catch (error) {
      console.error('Error fetching group details:', error);
      return null;
    }
  }

  // Grup istatistiklerini getir
  static async getGroupStats(userId: string): Promise<{
    totalGroups: number;
    activeGroups: number;
    totalSavings: number;
    totalInvitations: number;
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

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching group stats:', error);
      return {
        totalGroups: 0,
        activeGroups: 0,
        totalSavings: 0,
        totalInvitations: 0,
      };
    }
  }


  // Simüle edilmiş grup oluşturma
  private static createSimulatedGroup(groupData: CreateGroupRequest): GroupDiscount {
    return {
      id: `group-${Date.now()}`,
      name: groupData.name,
      description: groupData.description,
      discountPercentage: 20,
      minParticipants: groupData.minParticipants,
      currentParticipants: 1,
      maxParticipants: groupData.maxParticipants,
      productIds: groupData.productIds,
      categoryIds: groupData.categoryIds || [],
      startDate: new Date().toISOString(),
      endDate: groupData.endDate,
      isActive: true,
      participants: [],
      totalSavings: 0,
      estimatedSavings: 0,
    };
  }

  // Simüle edilmiş davetiye oluşturma
  private static createSimulatedInvitation(
    groupId: string,
    invitationData: any
  ): GroupInvitation {
    return {
      id: `invitation-${Date.now()}`,
      groupId,
      inviterUserId: 'current-user',
      inviterName: 'Mevcut Kullanıcı',
      invitedEmail: invitationData.invitedEmail,
      invitedPhone: invitationData.invitedPhone,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: invitationData.message,
    };
  }
}
