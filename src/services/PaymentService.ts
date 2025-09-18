import { apiService } from '../utils/api-service';

// Kredi kartı bilgileri artık kayıt edilmiyor - sadece anlık işlemler için kullanılıyor
export interface PaymentCard {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

export interface PaymentBuyer {
  id?: number;
  name: string;
  surname: string;
  gsmNumber: string;
  email: string;
  identityNumber?: string;
  registrationAddress?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

export interface PaymentAddress {
  contactName: string;
  city: string;
  country?: string;
  address: string;
  zipCode: string;
}

export interface PaymentRequest {
  orderId: number;
  paymentCard: PaymentCard;
  buyer: PaymentBuyer;
  shippingAddress?: PaymentAddress;
  billingAddress?: PaymentAddress;
}

export interface PaymentResult {
  success: boolean;
  message?: string;
  data?: {
    orderId: number;
    paymentId: string;
    amount: string;
    currency: string;
    cardInfo: {
      lastFourDigits: string;
      cardType: string;
      cardAssociation: string;
    };
  };
  error?: string;
}

export interface PaymentStatus {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  iyzicoStatus?: string;
}

export interface TestCard {
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  cardHolderName: string;
}

export class PaymentService {
  
  // Kredi kartı ile ödeme işlemi - KART BİLGİLERİ KAYIT EDİLMİYOR
  static async processPayment(paymentData: PaymentRequest): Promise<PaymentResult> {
    try {
      console.log('🔄 Processing payment for order:', paymentData.orderId);
      console.log('⚠️ SECURITY: Card data will NOT be stored - only processed for immediate transaction');
      
      // Kart bilgilerini işlemeden önce güvenlik kontrolü
      if (!this.validateCardNumber(paymentData.paymentCard.cardNumber)) {
        return {
          success: false,
          message: 'Geçersiz kart numarası',
          error: 'INVALID_CARD_NUMBER'
        };
      }
      
      if (!this.validateExpiry(paymentData.paymentCard.expireMonth, paymentData.paymentCard.expireYear)) {
        return {
          success: false,
          message: 'Geçersiz son kullanma tarihi',
          error: 'INVALID_EXPIRY'
        };
      }
      
      if (!this.validateCVC(paymentData.paymentCard.cvc, paymentData.paymentCard.cardNumber)) {
        return {
          success: false,
          message: 'Geçersiz güvenlik kodu',
          error: 'INVALID_CVC'
        };
      }
      
      const response = await apiService.request('/payments/process', 'POST', paymentData);
      
      if (response.success) {
        console.log('✅ Payment successful:', response.data);
        console.log('✅ Card data processed and discarded - not stored');
        return {
          success: true,
          message: response.message,
          data: response.data
        };
      } else {
        console.log('❌ Payment failed:', response.message);
        return {
          success: false,
          message: response.message,
          error: response.error
        };
      }
    } catch (error) {
      console.error('❌ Payment service error:', error);
      return {
        success: false,
        message: 'Ödeme işlemi sırasında bir hata oluştu',
        error: 'PAYMENT_SERVICE_ERROR'
      };
    }
  }

  // Ödeme durumu sorgulama
  static async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      console.log('🔍 Checking payment status:', paymentId);
      
      const response = await apiService.request(`/payments/${paymentId}/status`, 'GET');
      
      if (response.success) {
        return response.data;
      } else {
        console.error('❌ Failed to get payment status:', response.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Payment status check error:', error);
      return null;
    }
  }

  // Test kartları alma (sadece development)
  static async getTestCards(): Promise<{ success: TestCard; failure: TestCard } | null> {
    try {
      const response = await apiService.request('/payments/test-cards', 'GET');
      
      if (response.success) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Test cards fetch error:', error);
      return null;
    }
  }

  // Kart numarasını formatla (4'er rakam grupları)
  static formatCardNumber(cardNumber: string): string {
    // Sadece rakamları al
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // 4'er rakam grupları halinde formatla
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    // Maksimum 19 karakter (16 rakam + 3 boşluk)
    return formatted.substring(0, 19);
  }

  // Kart numarasını maskele
  static maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 8) return cardNumber;
    
    const firstFour = cleaned.substring(0, 4);
    const lastFour = cleaned.substring(cleaned.length - 4);
    const middle = '*'.repeat(cleaned.length - 8);
    
    return `${firstFour} ${middle} ${lastFour}`;
  }

  // Son kullanma tarihini formatla
  static formatExpiry(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + (cleaned.length > 2 ? '/' + cleaned.substring(2, 4) : '');
    }
    return cleaned;
  }

  // Kart numarası validasyonu
  static validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Uzunluk kontrolü (13-19 rakam)
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algoritması
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // CVC validasyonu
  static validateCVC(cvc: string, cardNumber: string = ''): boolean {
    const cleaned = cvc.replace(/\D/g, '');
    
    // American Express için 4 rakam, diğerleri için 3 rakam
    const isAmex = cardNumber.replace(/\D/g, '').startsWith('34') || 
                   cardNumber.replace(/\D/g, '').startsWith('37');
    
    const expectedLength = isAmex ? 4 : 3;
    return cleaned.length === expectedLength;
  }

  // Son kullanma tarihi validasyonu
  static validateExpiry(month: string, year: string): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    
    // Ay kontrolü
    if (expMonth < 1 || expMonth > 12) {
      return false;
    }
    
    // Yıl kontrolü (gelecek 20 yıl)
    if (expYear < currentYear || expYear > currentYear + 20) {
      return false;
    }
    
    // Geçmiş tarih kontrolü
    if (expYear === currentYear && expMonth < currentMonth) {
      return false;
    }
    
    return true;
  }

  // Kart tipini tespit et
  static getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('4')) {
      return 'Visa';
    } else if (cleaned.startsWith('5') || cleaned.startsWith('2')) {
      return 'Mastercard';
    } else if (cleaned.startsWith('34') || cleaned.startsWith('37')) {
      return 'American Express';
    } else if (cleaned.startsWith('6')) {
      return 'Discover';
    }
    
    return 'Unknown';
  }

  // Hata mesajlarını Türkçe'ye çevir
  static translatePaymentError(error: string): string {
    const translations: { [key: string]: string } = {
      'PAYMENT_ERROR': 'Ödeme işlemi başarısız',
      'PAYMENT_FAILED': 'Ödeme reddedildi',
      'SERVICE_ERROR': 'Ödeme servisi hatası',
      'PAYMENT_SERVICE_ERROR': 'Ödeme işlemi sırasında bir hata oluştu',
      'Invalid request': 'Geçersiz istek',
      'Card number is invalid': 'Kart numarası geçersiz',
      'Expiry date is invalid': 'Son kullanma tarihi geçersiz',
      'CVC is invalid': 'Güvenlik kodu geçersiz',
      'Insufficient funds': 'Yetersiz bakiye',
      'Card is blocked': 'Kart bloke',
      'Transaction not permitted': 'İşlem izni yok',
      'General error': 'Genel hata'
    };

    return translations[error] || error || 'Bilinmeyen hata';
  }

  // Test için örnek kart bilgileri
  static getSampleCards(): { [key: string]: PaymentCard } {
    return {
      success: {
        cardHolderName: 'John Doe',
        cardNumber: '5528 7900 0000 0008',
        expireMonth: '12',
        expireYear: '2030',
        cvc: '123'
      },
      failure: {
        cardHolderName: 'Jane Doe',
        cardNumber: '4111 1111 1111 1129',
        expireMonth: '12',
        expireYear: '2030',
        cvc: '123'
      }
    };
  }
}

export default PaymentService;
