const axios = require('axios');

// Test cart abandonment notification
async function testCartAbandonment() {
  try {
    console.log('🧪 Testing cart abandonment notification...');
    
    const baseUrl = 'http://localhost:3000';
    const testUserId = 1; // Guest user
    const testDeviceId = 'test-device-123';
    
    // First, add some items to cart
    console.log('📦 Adding items to cart...');
    
    const addToCartResponse = await axios.post(`${baseUrl}/api/cart`, {
      userId: testUserId,
      productId: 1, // Assuming product with ID 1 exists
      quantity: 2,
      variationString: '',
      selectedVariations: {},
      deviceId: testDeviceId
    });
    
    console.log('✅ Add to cart response:', addToCartResponse.data);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now test cart check before logout
    console.log('🔍 Testing cart check before logout...');
    
    const cartCheckResponse = await axios.post(`${baseUrl}/api/cart/check-before-logout`, {
      userId: testUserId,
      deviceId: testDeviceId
    });
    
    console.log('✅ Cart check response:', cartCheckResponse.data);
    
    if (cartCheckResponse.data.success && cartCheckResponse.data.hasItems) {
      console.log('🎉 Cart abandonment notification test PASSED!');
      console.log(`📊 Found ${cartCheckResponse.data.itemCount} items in cart`);
      console.log(`💰 Total price: ${cartCheckResponse.data.totalPrice} TL`);
    } else {
      console.log('❌ Cart abandonment notification test FAILED - No items found in cart');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testCartAbandonment();
