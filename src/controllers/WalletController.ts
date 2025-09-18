import { apiService } from '../utils/api-service';

export interface WalletData {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  date: string;
}

export class WalletController {
  /**
   * Get user wallet data including balance and recent transactions
   */
  static async getWallet(userId: number): Promise<{
    success: boolean;
    data?: WalletData;
    message?: string;
  }> {
    try {
      console.log(`💰 WalletController: Getting wallet for user ${userId}`);
      
      const response = await apiService.getWallet(userId);
      
      if (response.success && response.data) {
        const walletData: WalletData = {
          balance: response.data.balance || 0,
          currency: response.data.currency || 'TRY',
          transactions: response.data.transactions || []
        };
        
        console.log(`✅ WalletController: Wallet data retrieved successfully`);
        return {
          success: true,
          data: walletData
        };
      } else {
        console.error('❌ WalletController: Failed to get wallet data:', response.message);
        return {
          success: false,
          message: response.message || 'Cüzdan verileri alınamadı'
        };
      }
    } catch (error) {
      console.error('❌ WalletController: Error getting wallet:', error);
      return {
        success: false,
        message: 'Cüzdan verileri alınırken bir hata oluştu'
      };
    }
  }

  /**
   * Add money to user wallet
   */
  static async addMoney(
    userId: number,
    amount: number,
    paymentMethod: string = 'credit_card',
    description?: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      if (amount <= 0) {
        return {
          success: false,
          message: 'Geçersiz miktar'
        };
      }

      console.log(`💰 WalletController: Adding ${amount} to wallet for user ${userId}`);
      
      const response = await apiService.addMoneyToWallet(
        userId,
        amount,
        paymentMethod,
        description || `${amount} TL para yükleme`
      );
      
      if (response.success) {
        console.log(`✅ WalletController: Money added successfully`);
        return {
          success: true,
          message: response.message || 'Para başarıyla yüklendi'
        };
      } else {
        console.error('❌ WalletController: Failed to add money:', response.message);
        return {
          success: false,
          message: response.message || 'Para yükleme işlemi başarısız'
        };
      }
    } catch (error) {
      console.error('❌ WalletController: Error adding money:', error);
      return {
        success: false,
        message: 'Para yükleme işlemi sırasında bir hata oluştu'
      };
    }
  }


  /**
   * Get wallet transactions with pagination
   */
  static async getTransactions(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    success: boolean;
    data?: WalletTransaction[];
    message?: string;
  }> {
    try {
      console.log(`💰 WalletController: Getting transactions for user ${userId}`);
      
      const response = await apiService.getWalletTransactions(userId, limit, offset);
      
      if (response.success && response.data) {
        console.log(`✅ WalletController: ${response.data.length} transactions retrieved`);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.error('❌ WalletController: Failed to get transactions:', response.message);
        return {
          success: false,
          message: response.message || 'İşlem geçmişi alınamadı'
        };
      }
    } catch (error) {
      console.error('❌ WalletController: Error getting transactions:', error);
      return {
        success: false,
        message: 'İşlem geçmişi alınırken bir hata oluştu'
      };
    }
  }

  /**
   * Check if user has sufficient balance
   */
  static async hasSufficientBalance(userId: number, amount: number): Promise<boolean> {
    try {
      const walletResponse = await this.getWallet(userId);
      if (walletResponse.success && walletResponse.data) {
        return walletResponse.data.balance >= amount;
      }
      return false;
    } catch (error) {
      console.error('❌ WalletController: Error checking balance:', error);
      return false;
    }
  }

  /**
   * Format wallet balance for display
   */
  static formatBalance(balance: number, currency: string = 'TRY'): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  }

  /**
   * Get transaction status text in Turkish
   */
  static getTransactionStatusText(status: string): string {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Beklemede';
      case 'failed':
        return 'Başarısız';
      default:
        return 'Bilinmiyor';
    }
  }

  /**
   * Get transaction type text in Turkish
   */
  static getTransactionTypeText(type: string): string {
    switch (type) {
      case 'credit':
        return 'Para Yükleme';
      case 'debit':
        return 'İşlem';
      default:
        return 'İşlem';
    }
  }
}
