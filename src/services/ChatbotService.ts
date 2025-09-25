import { ChatMessage, QuickReply } from '../components/Chatbot';
import { AnythingLLMService } from './AnythingLLMService';
import { Linking } from 'react-native';
import { apiService } from '../utils/api-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatbotResponse {
  text: string;
  type?: 'text' | 'quick_reply' | 'product' | 'order' | 'image';
  quickReplies?: QuickReply[];
  data?: any;
}

export class ChatbotService {
  private static intents: { [key: string]: string[] } = {
    greeting: [
      'merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar'
    ],
    order_tracking: [
      'sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim'
    ],
    product_search: [
      'ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama'
    ],
    campaigns: [
      'kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif'
    ],
    recommendations: [
      'öneri', 'bana ne önerirsin', 'ne alsam', 'beni tanı', 'kişisel öneri', 'kişiselleştir'
    ],
    support: [
      'yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek'
    ],
    payment: [
      'ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit'
    ],
    return: [
      'iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış'
    ],
    shipping: [
      'kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres'
    ],
    account: [
      'hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik'
    ],
    goodbye: [
      'görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış'
    ]
  };

  private static quickResponses: { [key: string]: ChatbotResponse } = {
    greeting: {
      text: '👋 Merhaba! Size nasıl yardımcı olabilirim?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
        { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    },
    order_tracking: {
      text: '📦 Sipariş takibi için sipariş numaranızı paylaşabilir misiniz? Veya "Siparişlerim" sayfasından tüm siparişlerinizi görüntüleyebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📋 Siparişlerim', action: 'view_orders' },
        { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
        { id: '3', text: '📞 Destek Çağır', action: 'live_support' },
      ]
    },
    product_search: {
      text: '🔍 Hangi ürünü arıyorsunuz? Ürün adını yazabilir veya kategorilere göz atabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
        { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
        { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
        { id: '4', text: '👕 Giyim', action: 'search_category_giyim' },
      ]
    },
    campaigns: {
      text: '🎁 Aktif kampanyaları gösterebilirim veya size en uygun kampanyayı önerebilirim.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
        { id: '2', text: '✅ Uygun Kampanyam Var mı?', action: 'check_campaign_eligibility' },
        { id: '3', text: 'ℹ️ Kampanya Detayları', action: 'campaign_info' },
      ]
    },
    recommendations: {
      text: '⭐ Sizin için kişiselleştirilmiş ürün ve teklif önerileri sunabilirim.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Ürün Önerileri', action: 'show_recommendations' },
        { id: '2', text: '🎯 Bana Özel Kampanyalar', action: 'check_campaign_eligibility' },
        { id: '3', text: '🛒 Popüler Ürünler', action: 'view_products' },
      ]
    },
    support: {
      text: '🎧 Size nasıl yardımcı olabilirim? Sorununuzu açıklayabilir veya canlı desteğe bağlanabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📞 Canlı Destek', action: 'live_support' },
        { id: '2', text: '📧 E-posta Gönder', action: 'email_support' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '📱 WhatsApp', action: 'whatsapp_support' },
      ]
    },
    payment: {
      text: '💳 Ödeme ile ilgili hangi konuda yardıma ihtiyacınız var?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '💰 Ödeme Yöntemleri', action: 'payment_methods' },
        { id: '2', text: '📊 Taksit Seçenekleri', action: 'installment_options' },
        { id: '3', text: '🧾 Fatura Sorunu', action: 'invoice_issue' },
        { id: '4', text: '🔒 Güvenlik', action: 'payment_security' },
      ]
    },
    return: {
      text: '↩️ İade işlemi için size yardımcı olabilirim. Ne yapmak istiyorsunuz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📝 İade Talebi Oluştur', action: 'create_return' },
        { id: '2', text: '📋 İade Taleplerim', action: 'view_returns' },
        { id: '3', text: '❓ İade Koşulları', action: 'return_policy' },
        { id: '4', text: '🚚 İade Kargo', action: 'return_shipping' },
      ]
    },
    shipping: {
      text: '🚚 Kargo ve teslimat hakkında hangi bilgiye ihtiyacınız var?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⏰ Teslimat Süreleri', action: 'delivery_times' },
        { id: '2', text: '💰 Kargo Ücretleri', action: 'shipping_costs' },
        { id: '3', text: '📍 Teslimat Adresi', action: 'delivery_address' },
        { id: '4', text: '📦 Kargo Takibi', action: 'track_shipment' },
      ]
    },
    account: {
      text: '👤 Hesap işlemleri için size nasıl yardımcı olabilirim?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🔐 Şifre Sıfırlama', action: 'reset_password' },
        { id: '2', text: '📝 Profil Güncelleme', action: 'update_profile' },
        { id: '3', text: '📧 E-posta Değiştir', action: 'change_email' },
        { id: '4', text: '🏠 Adres Ekle', action: 'add_address' },
      ]
    },
    goodbye: {
      text: '👋 Teşekkür ederim! Başka bir sorunuz olursa her zaman buradayım. İyi günler!',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Değerlendir', action: 'rate_chat' },
        { id: '2', text: '🔄 Yeni Sohbet', action: 'new_chat' },
      ]
    }
  };

  private static faqData: { [key: string]: string } = {
    'sipariş nasıl takip': 'Siparişinizi takip etmek için "Hesabım > Siparişlerim" bölümüne gidin veya sipariş numaranızla takip yapın.',
    'kargo ücreti': '150 TL ve üzeri alışverişlerde kargo ücretsizdir. Altındaki siparişler için 19,90 TL kargo ücreti alınır.',
    'iade nasıl': 'Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz. "İade Taleplerim" bölümünden işlem yapın.',
    'ödeme yöntemleri': 'Kredi kartı, banka kartı, havale/EFT seçenekleri mevcuttur. Kapıda ödeme bulunmamaktadır.',
    'teslimat süresi': 'Stokta bulunan ürünler 1-3 iş günü içinde kargoya verilir. Teslimat süresi 1-5 iş günüdür.',
    'taksit': 'Kredi kartınızla 2, 3, 6, 9 ve 12 aya varan taksit seçenekleri kullanabilirsiniz.',
    'şifre unuttum': 'Giriş ekranında "Şifremi Unuttum" linkine tıklayın ve e-posta adresinizi girin.',
    'stok': 'Ürün sayfasında stok durumu gösterilir. Stokta olmayan ürünler için "Stok gelince haber ver" seçeneğini kullanın.'
  };

  static async processMessage(message: string, actionType: string = 'text'): Promise<ChatMessage> {
    const timestamp = new Date();
    const messageId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Backend API'ye mesaj gönder
      const response = await apiService.post('/chatbot/message', {
        message,
        actionType,
        userId: await this.getActiveUserId()
      });

      if (response.success && response.data) {
        // Backend'den gelen yanıtı kullan
        return {
          id: response.data.id || messageId,
          text: response.data.text,
          isBot: true,
          timestamp: new Date(response.data.timestamp || timestamp),
          type: response.data.type || 'text',
          quickReplies: response.data.quickReplies,
          data: response.data.data,
        };
      } else {
        throw new Error('Backend response failed');
      }
    } catch (error) {
      console.error('❌ Backend chatbot error, using fallback:', error);
      
      // Fallback: Yerel işleme
      return await this.processMessageLocally(message, actionType, messageId, timestamp);
    }
  }

  private static async processMessageLocally(message: string, actionType: string, messageId: string, timestamp: Date): Promise<ChatMessage> {
    // Özel eylem tipleri
    if (actionType !== 'text') {
      return await this.handleSpecialAction(actionType, message, messageId, timestamp);
    }

    // Mesaj analizi
    const intent = this.detectIntent(message.toLowerCase());
    const response = await this.generateResponse(intent, message);

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies,
      data: response.data,
    };
  }

  private static detectIntent(message: string): string {
    // Önce S.S.S. veritabanında ara
    for (const [key, answer] of Object.entries(this.faqData)) {
      if (message.includes(key)) {
        return 'faq_match';
      }
    }

    // Intent tespiti
    for (const [intent, keywords] of Object.entries(this.intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    // Sipariş numarası tespiti
    if (/\b\d{5,}\b/.test(message)) {
      return 'order_number';
    }

    // Ürün arama tespiti
    if (message.length > 3 && !this.quickResponses[message]) {
      return 'product_search_query';
    }

    return 'unknown';
  }

  private static async generateResponse(intent: string, message: string): Promise<ChatbotResponse> {
    // AnythingLLM ile akıllı yanıt dene
    const llmResponse = await this.tryAnythingLLMResponse(intent, message);
    if (llmResponse) {
      return llmResponse;
    }

    // Fallback: Geleneksel rule-based yanıtlar
    switch (intent) {
      case 'faq_match':
        return this.handleFAQQuery(message);

      case 'order_number':
        return await this.handleOrderTrackingLocal(message);

      case 'product_search_query':
        return await this.handleProductSearchLocal(message);

      case 'campaigns':
        return await this.handleCampaignsLocal();

      case 'recommendations':
        return await this.handleRecommendationsLocal();

      case 'unknown':
        return {
          text: '🤔 Tam olarak anlayamadım. Size nasıl yardımcı olabileceğimi belirtir misiniz?',
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
            { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '❓ S.S.S.', action: 'faq' },
            { id: '5', text: '⚙️ LLM Ayarları', action: 'llm_settings' },
          ]
        };

      default:
        return this.quickResponses[intent] || this.quickResponses.greeting;
    }
  }

  private static async tryAnythingLLMResponse(intent: string, message: string): Promise<ChatbotResponse | null> {
    try {
      // AnythingLLM konfigürasyonunu kontrol et
      const config = await AnythingLLMService.getConfig();
      
      if (!config || !config.enabled) {
        console.log('🔧 AnythingLLM disabled or config missing, using fallback');
        return null; // AnythingLLM aktif değil, fallback kullan
      }

      // Basit greeting ve goodbye için LLM kullanma
      if (['greeting', 'goodbye'].includes(intent)) {
        return null;
      }

      // Mesaj çok kısa veya boşsa LLM kullanma
      if (!message || message.trim().length < 3) {
        return null;
      }

      // Özel context bilgisi oluştur
      const contextInfo = this.buildContextForLLM(intent, message);
      const enhancedMessage = `${contextInfo}\n\nKullanıcı Mesajı: ${message}`;

      // AnythingLLM'den yanıt al (timeout ile)
      const llmText = await Promise.race([
        AnythingLLMService.getSmartResponse(enhancedMessage),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('LLM timeout')), 15000)
        )
      ]);
      
      // Yanıt kontrolü
      if (llmText && 
          typeof llmText === 'string' && 
          llmText.length > 10 && 
          llmText.length < 1000 &&
          !llmText.toLowerCase().includes('anythingllm') &&
          !llmText.toLowerCase().includes('error') &&
          !llmText.toLowerCase().includes('bağlan')) {
        
        console.log('✅ AnythingLLM successful response');
        // Başarılı LLM yanıtı
        return {
          text: `🤖 ${llmText}`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '✅ Yardımcı Oldu', action: 'satisfied' },
            { id: '2', text: '❓ Daha Fazla Bilgi', action: 'more_info' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '🏠 Ana Menü', action: 'greeting' },
          ]
        };
      } else {
        console.log('⚠️ AnythingLLM response not suitable, using fallback');
        // LLM yanıtı uygun değil, fallback kullan
        return null;
      }
    } catch (error: any) {
      console.error('❌ AnythingLLM Response Error:', error?.message || error);
      return null; // Hata durumunda fallback kullan
    }
  }

  private static buildContextForLLM(intent: string, message: string): string {
    const baseContext = `Sen Huglu Mobil uygulamasının yardımcı chatbot'usun. Kullanıcılara av, kamp, balık tutma ve outdoor giyim ürünleri hakkında yardım ediyorsun.

Temel Bilgiler:
- Şirket: Huglu Mobil
- Kategori: Av, Kamp, Balık, Outdoor Giyim
- Kargo: 150 TL üzeri ücretsiz, altı 19.90 TL
- İade: 14 gün içinde, orijinal ambalajında
- Teslimat: 1-5 iş günü
- Ödeme: Kredi kartı, banka kartı, havale/EFT
- Taksit: 2, 3, 6, 9, 12 ay seçenekleri

Intent: ${intent}`;

    // Intent'e özel context ekle
    switch (intent) {
      case 'product_search':
      case 'product_search_query':
        return `${baseContext}

Ürün kategorileri:
- Av malzemeleri (tüfek, fişek, av giyim, av aksesuarları)
- Kamp ekipmanları (çadır, uyku tulumu, kamp mobilyaları)
- Balık tutma (olta, misina, yem, balık giyim)
- Outdoor giyim (mont, pantolon, bot, çanta)

Kullanıcı ürün arıyor veya ürün hakkında soru soruyor.`;

      case 'order_tracking':
        return `${baseContext}

Sipariş durumları:
- Beklemede: Sipariş alındı, onay bekleniyor
- Onaylandı: Sipariş onaylandı, hazırlanıyor
- Hazırlanıyor: Ürünler paketleniyor
- Kargoda: Kargo şirketine teslim edildi
- Teslim Edildi: Müşteriye ulaştı

Kullanıcı sipariş takibi yapıyor.`;

      case 'support':
        return `${baseContext}

Destek kanalları:
- Telefon: 0212 xxx xxxx
- WhatsApp: +90 5xx xxx xxxx
- E-posta: destek@huglu.com
- Canlı destek: Uygulama içi chat

Kullanıcı destek arıyor.`;

      case 'payment':
        return `${baseContext}

Ödeme seçenekleri:
- Kredi kartı (Visa, Mastercard)
- Banka kartı
- Havale/EFT
- Kapıda ödeme (nakit veya kartla)
- Taksit seçenekleri mevcut

Kullanıcı ödeme hakkında soru soruyor.`;

      default:
        return baseContext;
    }
  }

  private static handleFAQQuery(message: string): ChatbotResponse {
    for (const [key, answer] of Object.entries(this.faqData)) {
      if (message.includes(key)) {
        return {
          text: `💡 ${answer}`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '✅ Yeterli', action: 'satisfied' },
            { id: '2', text: '❓ Daha Fazla', action: 'faq' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
          ]
        };
      }
    }

    return {
      text: '🔍 S.S.S. bölümümüzde bu sorunun cevabını bulamadım. Canlı destek ile iletişime geçebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '❓ S.S.S. Gör', action: 'faq' },
        { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    };
  }

  private static async handleOrderTrackingLocal(message: string): Promise<ChatbotResponse> {
    const orderNumber = message.match(/\b\d{5,}\b/)?.[0];
    
    if (orderNumber) {
      return {
        text: `📦 ${orderNumber} numaralı siparişinizi kontrol ediyorum...\n\n⚠️ Sipariş detayları için lütfen "Siparişlerim" sayfasına gidin veya canlı destek ile iletişime geçin.`,
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 Siparişlerim', action: 'navigate_orders' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
          { id: '3', text: '🔢 Başka Numara', action: 'enter_order_number' },
        ]
      };
    }

    return this.quickResponses.order_tracking;
  }

  private static async handleProductSearchLocal(query: string): Promise<ChatbotResponse> {
    return {
      text: `🔍 "${query}" için ürün arıyorum...\n\n⚠️ Ürün arama için lütfen "Ürünler" sayfasına gidin veya kategorilere göz atın.`,
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🛒 Ürünlere Git', action: 'view_products', data: { query } },
        { id: '2', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
        { id: '3', text: '🎯 Avcılık', action: 'search_category_avcilik' },
        { id: '4', text: '🎣 Balıkçılık', action: 'search_category_balik' },
        { id: '5', text: '👕 Giyim', action: 'search_category_giyim' },
      ]
    };
  }

  private static async handleCampaignsLocal(): Promise<ChatbotResponse> {
    return {
      text: '🎁 Aktif kampanyaları kontrol ediyorum...\n\n⚠️ Kampanya bilgileri için lütfen "Kampanyalar" sayfasına gidin.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        { id: '2', text: '🛒 Ürünlere Göz At', action: 'view_products' },
        { id: '3', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '4', text: '🏠 Ana Menü', action: 'greeting' },
      ]
    };
  }

  private static async handleRecommendationsLocal(): Promise<ChatbotResponse> {
    return {
      text: '⭐ Size özel öneriler hazırlıyorum...\n\n⚠️ Kişiselleştirilmiş öneriler için lütfen "Öneriler" sayfasına gidin.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '2', text: '🛒 Popüler Ürünler', action: 'view_products' },
        { id: '3', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        { id: '4', text: '🔍 Ürün Ara', action: 'product_search' },
      ]
    };
  }

  private static async handleSpecialAction(
    action: string, 
    message: string, 
    messageId: string, 
    timestamp: Date
  ): Promise<ChatMessage> {
    const responses: { [key: string]: ChatbotResponse } = {
      live_support: {
        text: '🎧 Canlı desteğe bağlanıyorsunuz... Ortalama bekleme süresi: 2-3 dakika\n\n📞 Telefon: 0530 312 58 13\n📱 WhatsApp: +90 530 312 58 13\n📧 E-posta: info@hugluoutdoor.com',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Telefon Et', action: 'call_support' },
          { id: '2', text: '📱 WhatsApp', action: 'whatsapp_support' },
          { id: '3', text: '📧 E-posta', action: 'email_support' },
        ]
      },
      
      faq: {
        text: '❓ S.S.S. sayfamızda en sık sorulan soruların cevaplarını bulabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📖 S.S.S. Gör', action: 'view_faq' },
          { id: '2', text: '🔍 Soru Ara', action: 'search_faq' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      view_orders: {
        text: '📋 Siparişlerinizi görüntülemek için "Hesabım > Siparişlerim" sayfasına yönlendiriyorum.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📱 Siparişlerime Git', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara ile Ara', action: 'enter_order_number' },
        ]
      },

      enter_order_number: {
        text: '🔢 Sipariş numaranızı yazın (örn: 12345). Ben sizin için takip edeceğim!',
        type: 'text'
      },

      search_order: {
        text: '🔍 Sipariş numaranızı yazın, size durumunu söyleyeyim.',
        type: 'text'
      },

      create_return: {
        text: '📝 İade talebi oluşturmak için "İade Taleplerim" sayfasına yönlendiriyorum.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 İade Taleplerim', action: 'navigate_returns' },
          { id: '2', text: '❓ İade Koşulları', action: 'return_policy' },
        ]
      },

      rate_chat: {
        text: '⭐ Bu sohbeti nasıl değerlendirirsiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⭐⭐⭐⭐⭐ Mükemmel', action: 'rate_5' },
          { id: '2', text: '⭐⭐⭐⭐ İyi', action: 'rate_4' },
          { id: '3', text: '⭐⭐⭐ Orta', action: 'rate_3' },
          { id: '4', text: '⭐⭐ Kötü', action: 'rate_2' },
        ]
      },

      satisfied: {
        text: '✅ Harika! Başka bir konuda yardıma ihtiyacınız olursa her zaman buradayım.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '⭐ Değerlendir', action: 'rate_chat' },
        ]
      },

      rate_5: {
        text: '🎉 Harika! 5 yıldız için teşekkür ederim. Sizinle yardımcı olabildiğim için mutluyum!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      rate_4: {
        text: '😊 4 yıldız için teşekkürler! Daha iyi hizmet verebilmek için çalışmaya devam ediyoruz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '🎧 Geri Bildirim', action: 'feedback' },
        ]
      },

      rate_3: {
        text: '🤔 3 yıldız için teşekkürler. Nasıl daha iyi hizmet verebiliriz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💬 Geri Bildirim Ver', action: 'feedback' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      rate_2: {
        text: '😔 Üzgünüm, beklentilerinizi karşılayamadık. Lütfen canlı destekle iletişime geçin.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
          { id: '2', text: '📧 Şikayet Gönder', action: 'complaint' },
        ]
      },

      new_chat: {
        text: '🆕 Yeni bir sohbet başlatalım! Size nasıl yardımcı olabilirim?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
          { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
          { id: '3', text: '❓ S.S.S.', action: 'faq' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      payment_methods: {
        text: '💳 Kabul ettiğimiz ödeme yöntemleri:\n\n• 💳 Kredi/Banka Kartı (3D Secure)\n• 🏦 Havale/EFT\n• 📱 Dijital Cüzdanlar\n\nKapıda ödeme bulunmamaktadır. Tüm ödemeleriniz SSL ile korunmaktadır.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📊 Taksit Seçenekleri', action: 'installment_options' },
          { id: '2', text: '🔒 Güvenlik', action: 'payment_security' },
        ]
      },

      installment_options: {
        text: '📊 Taksit seçeneklerimiz:\n\n• 2 Taksit - Komisyonsuz\n• 3 Taksit - %2.9 komisyon\n• 6 Taksit - %3.9 komisyon\n• 9 Taksit - %4.9 komisyon\n• 12 Taksit - %5.9 komisyon\n\n*Oranlar bankanıza göre değişebilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💳 Ödeme Yöntemleri', action: 'payment_methods' },
          { id: '2', text: '🎧 Daha Fazla Bilgi', action: 'live_support' },
        ]
      },

      delivery_times: {
        text: '⏰ Teslimat süreleri:\n\n• 🚚 Standart Kargo: 2-5 iş günü\n• ⚡ Hızlı Kargo: 1-2 iş günü\n• 🏪 Mağazadan Teslim: Aynı gün\n\n📍 Kargo süresi bulunduğunuz ile göre değişir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💰 Kargo Ücretleri', action: 'shipping_costs' },
          { id: '2', text: '📦 Sipariş Ver', action: 'view_products' },
        ]
      },

      shipping_costs: {
        text: '💰 Kargo ücretleri:\n\n• 🆓 150 TL üzeri: Ücretsiz\n• 📦 150 TL altı: 19.90 TL\n• ⚡ Hızlı kargo: +15 TL\n• 🏝️ Adalar: +25 TL\n\nÖzel ürünlerde farklı ücretler uygulanabilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⏰ Teslimat Süreleri', action: 'delivery_times' },
          { id: '2', text: '🛒 Alışverişe Başla', action: 'view_products' },
        ]
      },

      return_policy: {
        text: '↩️ İade koşulları:\n\n• ⏰ 14 gün içinde iade hakkı\n• 📦 Orijinal ambalajında olmalı\n• 🏷️ Etiketler zarar görmemiş olmalı\n• 🚫 Hijyen ürünleri iade edilemez\n\nHasarlı ürünlerde kargo ücreti bizden!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📝 İade Talebi', action: 'navigate_returns' },
          { id: '2', text: '🚚 İade Kargo', action: 'return_shipping' },
        ]
      },

      llm_settings: {
        text: '⚙️ AnythingLLM ayarlarını yapılandırmak için ayarlar sayfasına yönlendirileceksiniz. Bu özellik ile chatbot daha akıllı yanıtlar verebilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⚙️ Ayarları Aç', action: 'navigate_llm_settings' },
          { id: '2', text: '❓ LLM Nedir?', action: 'llm_info' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      llm_info: {
        text: '🤖 AnythingLLM, chatbot\'a RAG (Retrieval-Augmented Generation) özelliği kazandırır:\n\n✅ Daha akıllı yanıtlar\n✅ Özel dokümanlardan bilgi\n✅ Daha doğal konuşma\n✅ Sürekli öğrenme\n\nKendi LLM sunucunuzu bağlayabilir ve eğittiğiniz modeli kullanabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⚙️ Ayarları Yap', action: 'navigate_llm_settings' },
          { id: '2', text: '🔗 Daha Fazla Bilgi', action: 'llm_docs' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      more_info: {
        text: '📚 Hangi konuda daha fazla bilgi istiyorsunuz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş & Kargo', action: 'shipping' },
          { id: '2', text: '💳 Ödeme & Taksit', action: 'payment' },
          { id: '3', text: '↩️ İade & Değişim', action: 'return' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },
      campaign_info: {
        text: '🎁 Kampanyalar hakkında bilgi almak için “Aktif Kampanyalar”ı seçebilir veya size uygun kampanya olup olmadığını sorgulayabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
          { id: '2', text: '✅ Uygun muyum?', action: 'check_campaign_eligibility' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },
      view_campaigns: await (async () => {
        const resp = await ChatbotService.handleCampaignsLocal();
        return resp;
      })(),
      show_recommendations: await (async () => {
        const resp = await ChatbotService.handleRecommendationsLocal();
        return resp;
      })(),
      check_campaign_eligibility: {
        text: '🔎 Sepetiniz ve geçmişiniz üzerinden uygun kampanyaları kontrol ediyorum... (yakında)',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
          { id: '2', text: '⭐ Öneriler', action: 'show_recommendations' },
        ]
      },
      // --- Order helpers ---
      order_last_status: {
        text: '📦 Son sipariş durumunuzu kontrol ediyorum...\n\n⚠️ Sipariş detayları için lütfen "Siparişlerim" sayfasına gidin.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 Siparişlerim', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },
      cancel_order: {
        text: 'İptal etmek istediğiniz sipariş numarasını yazın (örn: 12345). İptal sadece “Beklemede” durumundaki siparişlerde mümkündür.',
        type: 'text'
      },
      track_shipment: {
        text: 'Kargo takibi için sipariş detaylarındaki takip numarasını kullanabilirsiniz. Dilerseniz kargo iletişim bilgilerini paylaşabilirim.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Kargo İletişim', action: 'cargo_contact' },
          { id: '2', text: '📋 Siparişlerim', action: 'navigate_orders' },
        ]
      },
      search_faq: {
        text: 'S.S.S. içinde aramak istediğiniz anahtar kelimeyi yazın (örn: kargo ücreti, iade süresi).',
        type: 'text'
      },
    };

    const response = responses[action] || {
      text: '🤖 Bu özellik henüz geliştiriliyor. Canlı destek ile iletişime geçebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
        { id: '2', text: '🏠 Ana Menü', action: 'greeting' },
      ]
    };

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies,
      data: response.data,
    };
  }

  // Analitik fonksiyonları
  static async logChatInteraction(userId: number, message: string, intent: string, satisfaction?: number) {
    try {
      // Backend'e analitik verilerini gönder
      await apiService.post('/chatbot/analytics', {
        userId,
        message: message.substring(0, 100), // Gizlilik için kısalt
        intent,
        satisfaction,
      });
      
      console.log('✅ Chat analytics logged to backend');
    } catch (error) {
      console.error('❌ Error logging chat interaction:', error);
      // Fallback: Local logging
      console.log('Chat Analytics (local):', {
        userId,
        message: message.substring(0, 100),
        intent,
        timestamp: new Date(),
        satisfaction,
      });
    }
  }

  static async getChatAnalytics() {
    // Mock analytics data
    return {
      totalChats: 1250,
      averageRating: 4.3,
      topIntents: [
        { intent: 'order_tracking', count: 450 },
        { intent: 'product_search', count: 320 },
        { intent: 'support', count: 280 },
      ],
      resolutionRate: 0.85,
    };
  }

  // Yardımcı fonksiyonlar
  private static async getActiveUserId(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem('currentUserId');
      const uid = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(uid) && uid > 0 ? uid : 1;
    } catch {
      return 1;
    }
  }

  private static getOrderStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Beklemede',
      'confirmed': 'Onaylandı',
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi',
      'returned': 'İade Edildi',
    };
    return statusMap[status] || status;
  }

  static async handleNavigation(action: string, navigation: any, data?: any) {
    try {
      // Root-level navigate helper to avoid nested navigator issues
      const tryNavigate = (routeName: string, params?: any) => {
        if (!navigation) return false;
        try {
          // Try current navigator
          navigation.navigate(routeName, params);
          return true;
        } catch (_) {
          // Fallback: try parent navigator
          const parent = navigation.getParent?.();
          if (parent?.navigate) {
            parent.navigate(routeName as never, params as never);
            return true;
          }
          return false;
        }
      };
      switch (action) {
        case 'navigate_orders':
          if (!tryNavigate('Orders')) throw new Error('Navigator not found for Orders');
          break;
        case 'navigate_returns':
          if (!tryNavigate('ReturnRequests')) throw new Error('Navigator not found for ReturnRequests');
          break;
        case 'view_faq':
          if (!tryNavigate('FAQ')) throw new Error('Navigator not found for FAQ');
          break;
        case 'view_products':
          if (data?.query) {
            if (!tryNavigate('ProductList', { searchQuery: data.query })) throw new Error('Navigator not found for ProductList');
          } else {
            if (!tryNavigate('ProductList')) throw new Error('Navigator not found for ProductList');
          }
          break;
        case 'order_detail':
          if (!tryNavigate('OrderDetail', { orderId: data?.orderId })) throw new Error('Navigator not found for OrderDetail');
          break;
        case 'view_categories':
          if (!tryNavigate('ProductList')) throw new Error('Navigator not found for ProductList');
          break;
        case 'search_category_kamp':
          navigation.navigate('ProductList', { category: 'Kamp' });
          break;
        case 'search_category_avcilik':
          navigation.navigate('ProductList', { category: 'Avcılık' });
          break;
        case 'search_category_balik':
          navigation.navigate('ProductList', { category: 'Balıkçılık' });
          break;
        case 'search_category_giyim':
          navigation.navigate('ProductList', { category: 'Giyim' });
          break;
        case 'call_support':
          Linking.openURL('tel:05303125813');
          break;
        case 'whatsapp_support':
          Linking.openURL('https://wa.me/905303125813?text=Merhaba, yardıma ihtiyacım var.');
          break;
        case 'email_support':
          Linking.openURL('mailto:info@hugluoutdoor.com?subject=Destek Talebi');
          break;
        case 'navigate_llm_settings':
          if (!tryNavigate('AnythingLLMSettings')) throw new Error('Navigator not found for AnythingLLMSettings');
          break;
        case 'llm_docs':
          Linking.openURL('https://docs.anythingllm.com/');
          break;
        default:
          console.log('Unknown navigation action:', action);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      throw error;
    }
  }
}
