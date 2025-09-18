const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🔍 API test başlatılıyor...');
    
    // Health check
    console.log('\n1. Health Check:');
    const healthResponse = await fetch('https://api.zerodaysoftware.tr/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData);
    
    // User level check
    console.log('\n2. User Level Check:');
    const levelResponse = await fetch('https://api.zerodaysoftware.tr/api/user-level/5', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': 'huglu_f22635b61189c2cea13eec242465148d890fef5206ec8a1b0263bf279f4ba6ad'
      }
    });
    const levelData = await levelResponse.json();
    console.log('✅ User Level:', JSON.stringify(levelData, null, 2));
    
    // EXP history check
    console.log('\n3. EXP History Check:');
    const historyResponse = await fetch('https://api.zerodaysoftware.tr/api/user-level/5/history?page=1&limit=10', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': 'huglu_f22635b61189c2cea13eec242465148d890fef5206ec8a1b0263bf279f4ba6ad'
      }
    });
    const historyData = await historyResponse.json();
    console.log('✅ EXP History:', JSON.stringify(historyData, null, 2));
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testAPI();
