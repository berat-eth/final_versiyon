const axios = require('axios');

// Test all notification types with remote servers
async function testAllNotifications() {
  try {
    console.log('🧪 Testing all notification types with remote servers...');
    
    // Uzak sunucu URL'leri
    const remoteServers = [
      'https://huglu-mobil-api.vercel.app',
      'https://huglu-mobil-api.onrender.com',
      'https://api.huglu.com',
      'https://huglu-api.herokuapp.com',
      'https://huglu-mobil-api.netlify.app'
    ];
    
    let baseUrl = 'http://localhost:3000'; // Fallback
    let serverFound = false;
    
    // Uzak sunuculardan birini test et
    for (const server of remoteServers) {
      try {
        console.log(`🔍 Testing server: ${server}`);
        const response = await axios.get(`${server}/api/health`, { timeout: 5000 });
        if (response.status === 200) {
          baseUrl = server;
          serverFound = true;
          console.log(`✅ Using server: ${server}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Server ${server} not available: ${error.message}`);
      }
    }
    
    if (!serverFound) {
      console.log('⚠️ No remote server found, trying localhost...');
      try {
        const response = await axios.get('http://localhost:3000/api/health', { timeout: 3000 });
        if (response.status === 200) {
          baseUrl = 'http://localhost:3000';
          serverFound = true;
          console.log('✅ Using localhost server');
        }
      } catch (error) {
        console.log('❌ Localhost server not available');
      }
    }
    
    if (!serverFound) {
      console.log('❌ No server available for testing');
      return;
    }
    
    const testUserId = 1;
    
    // Test all notification types
    console.log('\n📋 Testing Order Status Notifications...');
    await testOrderStatus(baseUrl, testUserId);
    
    console.log('\n📦 Testing Stock Notifications...');
    await testStockNotifications(baseUrl, testUserId);
    
    console.log('\n💰 Testing Price Notifications...');
    await testPriceNotifications(baseUrl, testUserId);
    
    console.log('\n🎯 Testing Campaign Notifications...');
    await testCampaignNotifications(baseUrl, testUserId);
    
    console.log('\n💳 Testing Wallet Notifications...');
    await testWalletNotifications(baseUrl, testUserId);
    
    console.log('\n🔐 Testing Security Notifications...');
    await testSecurityNotifications(baseUrl, testUserId);
    
    console.log('\n🎨 Testing Personalized Notifications...');
    await testPersonalizedNotifications(baseUrl, testUserId);
    
    console.log('\n⏰ Testing Scheduled Notifications...');
    await testScheduledNotifications(baseUrl, testUserId);
    
    console.log('\n✅ All notification tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Common request configuration
const requestConfig = {
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'test-key',
    'User-Agent': 'Notification-Test-Client/1.0'
  }
};

async function testOrderStatus(baseUrl, userId) {
  const statuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
  
  for (const status of statuses) {
    try {
      const response = await axios.post(`${baseUrl}/api/notifications/order-status`, {
        userId,
        orderId: 12345,
        status,
        orderDetails: { trackingCode: 'ABC123' }
      }, requestConfig);
      console.log(`  ✅ ${status}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${status}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${stockType}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${stockType}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${priceChange.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${priceChange.type}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${campaign.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${campaign.type}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${wallet.action}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${wallet.action}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${security.event}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${security.event}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${recommendation.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${recommendation.type}: ${errorMsg} (Status: ${statusCode})`);
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
      }, requestConfig);
      console.log(`  ✅ ${scheduled.type}: ${response.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 'No response';
      console.log(`  ❌ ${scheduled.type}: ${errorMsg} (Status: ${statusCode})`);
    }
  }
}

// Server health check
async function checkServerHealth(baseUrl) {
  try {
    console.log(`\n🏥 Checking server health: ${baseUrl}`);
    const response = await axios.get(`${baseUrl}/api/health`, { timeout: 5000 });
    console.log(`✅ Server is healthy: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.log(`❌ Server health check failed: ${error.message}`);
    return false;
  }
}

// Run the test
console.log('🚀 Starting notification system test...');
testAllNotifications();
