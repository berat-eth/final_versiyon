const axios = require('axios');

// Test all notification types
async function testAllNotifications() {
  try {
    console.log('🧪 Testing all notification types...');
    
    const baseUrl = 'http://localhost:3000';
    const testUserId = 1;
    
    // 1. Order Status Notifications
    console.log('\n📋 Testing Order Status Notifications...');
    
    await testOrderStatus(baseUrl, testUserId);
    await testStockNotifications(baseUrl, testUserId);
    await testPriceNotifications(baseUrl, testUserId);
    await testCampaignNotifications(baseUrl, testUserId);
    await testWalletNotifications(baseUrl, testUserId);
    await testSecurityNotifications(baseUrl, testUserId);
    await testPersonalizedNotifications(baseUrl, testUserId);
    await testScheduledNotifications(baseUrl, testUserId);
    
    console.log('\n✅ All notification tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function testOrderStatus(baseUrl, userId) {
  const statuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
  
  for (const status of statuses) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/order-status`, {
        userId,
        orderId: 12345,
        status,
        orderDetails: { trackingCode: 'ABC123' }
      });
      console.log(`  ✅ ${status}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${status}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testStockNotifications(baseUrl, userId) {
  const stockTypes = ['low_stock', 'back_in_stock', 'out_of_stock'];
  
  for (const stockType of stockTypes) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/stock`, {
        userId,
        productId: 1,
        productName: 'Test Ürün',
        stockType
      });
      console.log(`  ✅ ${stockType}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${stockType}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testPriceNotifications(baseUrl, userId) {
  const priceChanges = [
    { type: 'decreased', percentage: 20, newPrice: 80 },
    { type: 'increased', percentage: 10, newPrice: 110 }
  ];
  
  for (const priceChange of priceChanges) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/price`, {
        userId,
        productId: 1,
        productName: 'Test Ürün',
        priceChange
      });
      console.log(`  ✅ ${priceChange.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${priceChange.type}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testCampaignNotifications(baseUrl, userId) {
  const campaigns = [
    { type: 'new_campaign', name: 'Yeni Kampanya', description: '100 TL üzeri %15 indirim' },
    { type: 'ending_soon', name: 'Son Saatler', timeLeft: '2 saat' },
    { type: 'personal_offer', name: 'Özel Teklif', description: 'Sadece sizin için' }
  ];
  
  for (const campaign of campaigns) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/campaign`, {
        userId,
        campaign
      });
      console.log(`  ✅ ${campaign.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${campaign.type}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testWalletNotifications(baseUrl, userId) {
  const walletActions = [
    { action: 'deposit', amount: 100, balance: 250 },
    { action: 'withdraw', amount: 50, balance: 200 },
    { action: 'payment', amount: 75, balance: 125 }
  ];
  
  for (const wallet of walletActions) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/wallet`, {
        userId,
        walletAction: wallet.action,
        amount: wallet.amount,
        balance: wallet.balance
      });
      console.log(`  ✅ ${wallet.action}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${wallet.action}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testSecurityNotifications(baseUrl, userId) {
  const securityEvents = [
    { event: 'new_login', details: { device: 'iPhone 15' } },
    { event: 'password_changed' },
    { event: 'suspicious_activity' },
    { event: 'account_locked' }
  ];
  
  for (const security of securityEvents) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/security`, {
        userId,
        securityEvent: security.event,
        details: security.details
      });
      console.log(`  ✅ ${security.event}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${security.event}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testPersonalizedNotifications(baseUrl, userId) {
  const recommendations = [
    { type: 'similar_products', productName: 'Test Ürün' },
    { type: 'complementary_products', productName: 'Test Ürün' },
    { type: 'trending_products' }
  ];
  
  for (const recommendation of recommendations) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/personalized`, {
        userId,
        recommendation
      });
      console.log(`  ✅ ${recommendation.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${recommendation.type}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

async function testScheduledNotifications(baseUrl, userId) {
  const scheduledTypes = [
    { type: 'weekly_summary', data: { viewedProducts: 15 } },
    { type: 'monthly_report', data: { orders: 5, totalSpent: 500 } },
    { type: 'birthday_wish', data: {} },
    { type: 'anniversary', data: { years: 2 } }
  ];
  
  for (const scheduled of scheduledTypes) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/scheduled`, {
        userId,
        scheduleType: scheduled.type,
        data: scheduled.data
      });
      console.log(`  ✅ ${scheduled.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ ${scheduled.type}: ${error.response?.data?.message || 'Error'}`);
    }
  }
}

// Run the test
testAllNotifications();
