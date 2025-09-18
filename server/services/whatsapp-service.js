const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  }

  // WhatsApp mesaj gönder
  async sendMessage(to, message, templateName = null, templateParams = []) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        console.log('⚠️ WhatsApp credentials not configured, sending mock message');
        return this.sendMockMessage(to, message);
      }

      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      let payload;
      
      if (templateName) {
        // Template mesajı
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'tr' },
            components: templateParams.length > 0 ? [{
              type: 'body',
              parameters: templateParams.map(param => ({
                type: 'text',
                text: param
              }))
            }] : []
          }
        };
      } else {
        // Normal mesaj
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        };
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp message sent successfully:', response.data);
      return { success: true, data: response.data };

    } catch (error) {
      console.error('❌ WhatsApp send error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Para yükleme bildirimi gönder
  async sendRechargeNotification(tenantId, userId, requestId, amount, bankInfo) {
    try {
      // Admin telefon numarası (gerçek uygulamada veritabanından alınacak)
      const adminPhone = process.env.ADMIN_PHONE || '905551234567';
      
      const message = `💰 YENİ PARA YÜKLEME İSTEĞİ

📋 İstek ID: ${requestId}
👤 Kullanıcı ID: ${userId}
💵 Tutar: ₺${amount}
🏦 Ödeme: EFT/Havale
📱 Gönderen: ${bankInfo?.senderName || 'Bilinmiyor'}
📞 Telefon: ${bankInfo?.senderPhone || 'Bilinmiyor'}

⏰ Tarih: ${new Date().toLocaleString('tr-TR')}

🔗 Admin Panel: ${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}

Lütfen admin panelinden onaylayın.`;

      const result = await this.sendMessage(adminPhone, message);
      
      if (result.success) {
        console.log('📱 Recharge notification sent to admin');
      } else {
        console.error('❌ Failed to send recharge notification');
      }
      
      return result;

    } catch (error) {
      console.error('❌ Recharge notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sipariş bildirimi gönder
  async sendOrderNotification(tenantId, orderId, customerInfo, orderDetails) {
    try {
      const adminPhone = process.env.ADMIN_PHONE || '905551234567';
      
      const message = `🛒 YENİ SİPARİŞ

📋 Sipariş ID: ${orderId}
👤 Müşteri: ${customerInfo.name}
📧 E-posta: ${customerInfo.email}
📞 Telefon: ${customerInfo.phone}
💵 Tutar: ₺${orderDetails.totalAmount}
📦 Ürün Sayısı: ${orderDetails.itemCount}

⏰ Tarih: ${new Date().toLocaleString('tr-TR')}

🔗 Admin Panel: ${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}`;

      return await this.sendMessage(adminPhone, message);

    } catch (error) {
      console.error('❌ Order notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Müşteriye onay bildirimi gönder
  async sendApprovalNotification(customerPhone, amount, newBalance) {
    try {
      const message = `✅ PARA YÜKLEME ONAYLANDI

💵 Yüklenen Tutar: ₺${amount}
💰 Yeni Bakiye: ₺${newBalance}
⏰ Tarih: ${new Date().toLocaleString('tr-TR')}

Teşekkür ederiz! 🎉`;

      return await this.sendMessage(customerPhone, message);

    } catch (error) {
      console.error('❌ Approval notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mock mesaj gönder (test için)
  async sendMockMessage(to, message) {
    console.log('📱 MOCK WhatsApp Message:');
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log('---');
    
    return { success: true, mock: true };
  }

  // Webhook doğrulama
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('✅ WhatsApp webhook verified');
      return challenge;
    } else {
      console.log('❌ WhatsApp webhook verification failed');
      return null;
    }
  }

  // Webhook mesaj işleme
  async processWebhookMessage(body) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (!value?.messages) {
        return { success: false, message: 'No messages found' };
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      
      console.log('📱 Received WhatsApp message:', {
        from: message.from,
        type: message.type,
        contact: contact?.profile?.name
      });

      // Mesaj tipine göre işle
      if (message.type === 'text') {
        return await this.handleTextMessage(message, contact);
      }

      return { success: true, message: 'Message processed' };

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Metin mesajı işle
  async handleTextMessage(message, contact) {
    const text = message.text.body.toLowerCase();
    const from = message.from;
    const contactName = contact?.profile?.name || 'Bilinmeyen';

    console.log(`📱 Text from ${contactName} (${from}): ${text}`);

    // Basit komut işleme
    if (text.includes('merhaba') || text.includes('selam')) {
      await this.sendMessage(from, `Merhaba ${contactName}! 👋\n\nHuglu Outdoor'a hoş geldiniz! Size nasıl yardımcı olabilirim?`);
    } else if (text.includes('sipariş') || text.includes('takip')) {
      await this.sendMessage(from, `Sipariş takibi için lütfen sipariş numaranızı paylaşın. 📦\n\nVeya uygulamamızdan "Siparişlerim" bölümünü kontrol edebilirsiniz.`);
    } else if (text.includes('yardım') || text.includes('destek')) {
      await this.sendMessage(from, `🎧 Destek için:\n\n📞 Telefon: 0530 312 58 13\n📧 E-posta: info@hugluoutdoor.com\n🌐 Web: www.hugluoutdoor.com\n\nSize nasıl yardımcı olabilirim?`);
    } else {
      await this.sendMessage(from, `Teşekkür ederiz! Mesajınız alındı. En kısa sürede size dönüş yapacağız. 🙏\n\nAcil durumlar için: 0530 312 58 13`);
    }

    return { success: true };
  }
}

module.exports = new WhatsAppService();
