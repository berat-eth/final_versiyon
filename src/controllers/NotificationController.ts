import { UserController } from './UserController';
import { OrderController } from './OrderController';

export interface Notification {
  id: string;
  type: 'order' | 'product' | 'system' | 'promotion';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export class NotificationController {
  // Create a new notification
  static async createNotification(
    userId: number,
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<{ success: boolean; notificationId?: string; message?: string }> {
    try {
      const notificationData = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      };

      const success = await UserController.addUserNotification(userId, notificationData);
      
      if (success) {
        return {
          success: true,
          notificationId: Date.now().toString(),
        };
      } else {
        return {
          success: false,
          message: 'Bildirim oluşturulamadı',
        };
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        message: 'Bildirim oluşturulurken bir hata oluştu',
      };
    }
  }

  // Get user notifications
  static async getUserNotifications(
    userId: number,
    limit: number = 50
  ): Promise<{ success: boolean; notifications?: Notification[]; message?: string }> {
    try {
      const dbNotifications = await UserController.getUserNotifications(userId, limit);
      
      const notifications: Notification[] = dbNotifications.map(dbNotif => ({
        id: dbNotif.id?.toString() || Date.now().toString(),
        type: dbNotif.type || 'system',
        title: dbNotif.title || 'Bildirim',
        message: dbNotif.message || '',
        isRead: dbNotif.isRead === 1,
        createdAt: dbNotif.createdAt || new Date().toISOString(),
        data: dbNotif.data ? JSON.parse(dbNotif.data) : null,
      }));

      return {
        success: true,
        notifications,
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return {
        success: false,
        message: 'Bildirimler alınırken bir hata oluştu',
      };
    }
  }

  // Mark notification as read
  static async markAsRead(
    userId: number,
    notificationId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await UserController.markNotificationAsRead(
        userId,
        parseInt(notificationId)
      );

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          message: 'Bildirim okundu olarak işaretlenemedi',
        };
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: 'Bildirim güncellenirken bir hata oluştu',
      };
    }
  }

  // Delete notification
  static async deleteNotification(
    userId: number,
    notificationId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await UserController.deleteUserNotification(
        userId,
        parseInt(notificationId)
      );

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          message: 'Bildirim silinemedi',
        };
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        message: 'Bildirim silinirken bir hata oluştu',
      };
    }
  }

  // Clear all notifications for user
  static async clearAllNotifications(
    userId: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await UserController.clearUserNotifications(userId);

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          message: 'Bildirimler temizlenemedi',
        };
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return {
        success: false,
        message: 'Bildirimler temizlenirken bir hata oluştu',
      };
    }
  }

  // Create order-related notifications
  static async createOrderNotification(
    userId: number,
    orderId: number,
    status: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      let title = '';
      let message = '';

      switch (status) {
        case 'confirmed':
          title = 'Sipariş Onaylandı';
          message = `#${orderId} numaralı siparişiniz onaylandı ve hazırlanmaya başlandı.`;
          break;
        case 'preparing':
          title = 'Sipariş Hazırlanıyor';
          message = `#${orderId} numaralı siparişiniz hazırlanıyor.`;
          break;
        case 'shipped':
          title = 'Sipariş Kargoya Verildi';
          message = `#${orderId} numaralı siparişiniz kargoya verildi. Kargo takip numaranızı yakında alacaksınız.`;
          break;
        case 'delivered':
          title = 'Sipariş Teslim Edildi';
          message = `#${orderId} numaralı siparişiniz başarıyla teslim edildi. Teşekkür ederiz!`;
          break;
        case 'cancelled':
          title = 'Sipariş İptal Edildi';
          message = `#${orderId} numaralı siparişiniz iptal edildi. İade işlemi başlatıldı.`;
          break;
        default:
          title = 'Sipariş Güncellemesi';
          message = `#${orderId} numaralı siparişinizde güncelleme var.`;
          break;
      }

      return await this.createNotification(userId, {
        type: 'order',
        title,
        message,
        data: { orderId, status },
      });
    } catch (error) {
      console.error('Error creating order notification:', error);
      return {
        success: false,
        message: 'Sipariş bildirimi oluşturulamadı',
      };
    }
  }

  // Create promotion notification
  static async createPromotionNotification(
    userId: number,
    title: string,
    message: string,
    promotionData?: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      return await this.createNotification(userId, {
        type: 'promotion',
        title,
        message,
        data: promotionData,
      });
    } catch (error) {
      console.error('Error creating promotion notification:', error);
      return {
        success: false,
        message: 'Promosyon bildirimi oluşturulamadı',
      };
    }
  }

  // Create system notification
  static async createSystemNotification(
    userId: number,
    title: string,
    message: string,
    systemData?: any
  ): Promise<{ success: boolean; message?: string }> {
    try {
      return await this.createNotification(userId, {
        type: 'system',
        title,
        message,
        data: systemData,
      });
    } catch (error) {
      console.error('Error creating system notification:', error);
      return {
        success: false,
        message: 'Sistem bildirimi oluşturulamadı',
      };
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await this.getUserNotifications(userId);
      if (result.success && result.notifications) {
        return result.notifications.filter(n => !n.isRead).length;
      }
      return 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}
