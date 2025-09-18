const fetch = require('node-fetch');

const BASE = 'https://api.zerodaysoftware.tr/api';
const HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Tenant-Id': '1',
  'X-API-Key': 'huglu_f22635b61189c2cea13eec242465148d890fef5206ec8a1b0263bf279f4ba6ad'
};

let userId = '5';
let productId = '1';
let variationId = null;
let optionId = null;
let discountCode = null;

function okEmoji(ok) { return ok ? '✅' : '❌'; }

async function callEndpoint(name, method, path, body) {
  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const resp = await fetch(url, {
      method,
      headers: HEADERS,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const contentType = resp.headers.get('content-type') || '';
    let data = null;
    try {
      data = contentType.includes('application/json') ? await resp.json() : await resp.text();
    } catch (e) {
      data = await resp.text().catch(() => null);
    }
    const brief = typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data, null, 0).slice(0, 200);
    console.log(`${okEmoji(resp.ok)} ${method} ${path} → ${resp.status} ${resp.statusText} | ${name}`);
    if (!resp.ok) {
      console.log('    ↳ body:', body ? JSON.stringify(body) : '-');
      console.log('    ↳ resp:', brief);
    }
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    clearTimeout(timeoutId);
    console.log(`${okEmoji(false)} ${method} ${path} → ERROR | ${name}`);
    console.log('    ↳ error:', err.message);
    return { ok: false, error: err };
  }
}

async function resolveDynamicIds() {
  const resProducts = await callEndpoint('Resolve: Products for IDs', 'GET', '/products');
  if (resProducts.ok && resProducts.data?.data?.products?.length) {
    productId = String(resProducts.data.data.products[0].id || productId);
  }
  const resVariations = await callEndpoint('Resolve: Variations for product', 'GET', `/products/${productId}/variations`);
  if (resVariations.ok && Array.isArray(resVariations.data?.data) && resVariations.data.data.length) {
    variationId = String(resVariations.data.data[0].id);
    const resOptions = await callEndpoint('Resolve: Options for variation', 'GET', `/variations/${variationId}/options`);
    if (resOptions.ok && Array.isArray(resOptions.data?.data) && resOptions.data.data.length) {
      optionId = String(resOptions.data.data[0].id);
    }
  }
  const resCodes = await callEndpoint('Resolve: Discount codes for user', 'GET', `/discount-codes/${userId}`);
  if (resCodes.ok && Array.isArray(resCodes.data?.data) && resCodes.data.data.length) {
    discountCode = resCodes.data.data[0].discountCode || resCodes.data.data[0].code || null;
  }
  console.log(`ℹ️ Resolved → productId=${productId}, variationId=${variationId}, optionId=${optionId}, discountCode=${discountCode}`);
}

async function main() {
  console.log('🔎 Tüm endpoint testleri başlatılıyor...');

  await resolveDynamicIds();

  const tests = [
    ['Health', 'GET', '/health'],
    ['Products list', 'GET', '/products'],
    // Use simpler search query to reduce DB stress
    ['Products search', 'GET', '/products/search?q=a'],
    ['Price range', 'GET', '/products/price-range'],
    ['Categories', 'GET', '/categories'],
    ['Brands', 'GET', '/brands'],
    ['Product detail', 'GET', `/products/${productId}`]
  ];

  let passed = 0; let failed = 0;
  for (const [name, method, path] of tests) {
    const res = await callEndpoint(name, method, path);
    if (res.ok) passed++; else failed++;
  }

  // Variations (guarded)
  if (variationId) {
    const vr = await callEndpoint('Product variations', 'GET', `/products/${productId}/variations`);
    if (vr.ok) passed++; else failed++;
    const vo = await callEndpoint('Variation options', 'GET', `/variations/${variationId}/options`);
    if (vo.ok) passed++; else failed++;
    if (optionId) {
      const vod = await callEndpoint('Variation option detail', 'GET', `/variation-options/${optionId}`);
      if (vod.ok) passed++; else failed++;
    } else {
      console.log('⏭️ Skip Variation option detail (optionId not found)');
    }
  } else {
    console.log('⏭️ Skip variations (no variationId)');
  }

  // Cart & reviews & campaigns
  const moreTests = [
    ['Get cart by user', 'GET', `/cart/${userId}`],
    ['Get cart items by user', 'GET', `/cart/user/${userId}`],
    ['Get cart total', 'GET', `/cart/user/${userId}/total`],
    ['Get cart total detailed', 'GET', `/cart/user/${userId}/total-detailed`],
    ['Product reviews', 'GET', `/reviews/product/${productId}`],
    ['Flash deals', 'GET', '/flash-deals'],
    ['Campaigns (tenant)', 'GET', '/campaigns'],
    ['Campaign segments (tenant)', 'GET', '/campaigns/segments'],
    ['Campaign analytics', 'GET', `/campaigns/analytics/${userId}`],
    ['Campaign recommendations', 'GET', `/campaigns/recommendations/${userId}`],
    ['Available campaigns', 'GET', `/campaigns/available/${userId}`],
    ['Discount wheel check', 'GET', `/discount-wheel/check/device-${userId}`],
    ['Discount codes for user', 'GET', `/discount-codes/${userId}`]
  ];
  for (const [name, method, path] of moreTests) {
    const res = await callEndpoint(name, method, path);
    if (res.ok) passed++; else failed++;
  }

  // Wallet
  const wb = await callEndpoint('Wallet balance', 'GET', `/wallet/balance/${userId}`);
  if (wb.ok) passed++; else failed++;
  const wt = await callEndpoint('Wallet transactions', 'GET', `/wallet/transactions/${userId}`);
  if (wt.ok) passed++; else failed++;

  // Orders
  const uo = await callEndpoint('User orders', 'GET', `/orders/user/${userId}`);
  if (uo.ok) passed++; else failed++;
  const ro = await callEndpoint('Returnable orders', 'GET', `/orders/returnable?userId=${encodeURIComponent(userId)}`);
  if (ro.ok) passed++; else failed++;

  // Payments (expected 404 in prod)
  await callEndpoint('Test cards (expected 404 in prod)', 'GET', '/payments/test-cards');

  // Chatbot
  const cf = await callEndpoint('Chatbot FAQ', 'GET', '/chatbot/faq');
  if (cf.ok) passed++; else failed++;

  // User level & social
  const ul = await callEndpoint('User level', 'GET', `/user-level/${userId}`);
  if (ul.ok) passed++; else failed++;
  const uh = await callEndpoint('EXP history', 'GET', `/user-level/${userId}/history`);
  if (uh.ok) passed++; else failed++;
  const st = await callEndpoint('Social tasks', 'GET', `/social-tasks/${userId}`);
  if (st.ok) passed++; else failed++;
  const gd = await callEndpoint('Group discounts', 'GET', `/group-discounts/${userId}`);
  if (gd.ok) passed++; else failed++;
  const cp = await callEndpoint('Competitions', 'GET', `/competitions/${userId}`);
  if (cp.ok) passed++; else failed++;
  const cs = await callEndpoint('Cart sharing', 'GET', `/cart-sharing/${userId}`);
  if (cs.ok) passed++; else failed++;
  const bt = await callEndpoint('Buy together', 'GET', `/buy-together/${userId}`);
  if (bt.ok) passed++; else failed++;

  // Validate discount code if any exists
  if (discountCode) {
    const vd = await callEndpoint('Validate discount code', 'POST', '/discount-codes/validate', { discountCode, userId, orderAmount: 1000 });
    if (vd.ok) passed++; else failed++;
  } else {
    console.log('⏭️ Skip discount code validation (no code available)');
  }

  // Chatbot message
  const cm = await callEndpoint('Chatbot message', 'POST', '/chatbot/message', { message: 'Merhaba', context: { userId } });
  if (cm.ok) passed++; else failed++;

  console.log(`\n🧾 Özet → Başarılı: ${passed}, Hatalı: ${failed}, Toplam: ${passed + failed}`);
}

main().catch(e => {
  console.error('Top-level error:', e);
  process.exit(1);
});
