// Configuration - Unified under main API server (port 3000)
const API_BASE = (function() {
    try {
        return localStorage.getItem('API_BASE_OVERRIDE') || 'http://213.142.159.135:3000/api';
    } catch (_) {
        return 'http://213.142.159.135:3000/api';
    }
})();
// Güvenlik: Token localStorage üzerinden okunur.
const ADMIN_TOKEN = (function() {
    try {
        return localStorage.getItem('ADMIN_TOKEN') || '';
    } catch (_) {
        return '';
    }
})();
// Tenant API Key (X-API-Key)
const TENANT_API_KEY = (function() {
    try {
        return localStorage.getItem('TENANT_API_KEY') || '';
    } catch (_) {
        return '';
    }
})();

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const pageTitle = document.getElementById('pageTitle');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Login kontrolü: admin anahtarı yoksa login sayfasına yönlendir
    try {
        const key = ADMIN_TOKEN && ADMIN_TOKEN.trim();
        const isLoginPage = location.pathname.toLowerCase().endsWith('/login.html') || location.pathname.toLowerCase().endsWith('login.html');
        if (!key && !isLoginPage) {
            window.location.href = 'login.html';
            return;
        }
    } catch (e) {
        // herhangi bir hata durumunda login sayfasına yönlendir
        const isLoginPage = location.pathname.toLowerCase().includes('login.html');
        if (!isLoginPage) window.location.href = 'login.html';
        return;
    }
    setupEventListeners();
    checkBackendConnection();
    // Açılışta sağlık kontrol modalini göster ve tüm endpointleri tara
    try {
        openModal('backendHealthModal');
        runBackendHealthAudit();
    } catch (_) {}
    // Sadece mevcut sayfa ana panel ise bölüm ve dashboard verilerini yükle
    const isMainPanel = !!document.getElementById('dashboard-section');
    if (isMainPanel) {
        showSection('dashboard');
        const sel = document.getElementById('dashboardRange');
        if (sel) sel.value = '7';
        loadDashboardData('7');
    }
}

// Settings: Tenant API Key helpers
function saveTenantApiKey() {
    try {
        const el = document.getElementById('tenantApiKeyInput');
        const val = (el && el.value) ? el.value.trim() : '';
        if (!val) { showNotification('Anahtar boş olamaz', 'error'); return; }
        localStorage.setItem('TENANT_API_KEY', val);
        showNotification('Tenant API Key kaydedildi', 'success');
    } catch (e) { showNotification('Kaydedilemedi: ' + e.message, 'error'); }
}
function clearTenantApiKey() {
    try { localStorage.removeItem('TENANT_API_KEY'); showNotification('Anahtar silindi', 'success'); } catch(_){}
}

// Backend connection check
async function checkBackendConnection() {
    console.log('🔍 Backend bağlantısı kontrol ediliyor...');
    
    try {
        showLoading(true);
        
        // Try health check endpoint first
        const healthResponse = await fetch(`${API_BASE}/health`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Backend sağlıklı:', healthData);
            showNotification('Backend bağlantısı başarılı!', 'success');
            
            // Load dashboard data after successful connection
            loadDashboardData();
        } else {
            throw new Error(`Health check failed: ${healthResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ Backend bağlantı hatası:', error);
        
        showConnectionError();
        
        // Try to load dashboard data anyway (maybe health endpoint doesn't exist)
        console.log('🔄 Health check başarısız, dashboard verilerini yüklemeye çalışıyor...');
        loadDashboardData();
    } finally {
        showLoading(false);
    }
}

function showConnectionError() {
    const errorHtml = `
        <div class="connection-error">
            <div class="error-icon">⚠️</div>
            <h3>Uzak Sunucu Bağlantı Sorunu</h3>
            <p>Admin paneli uzak sunucuya bağlanamıyor.</p>
            <div class="error-details">
                <p><strong>Kontrol edilecekler:</strong></p>
                <ul>
                    <li>Uzak sunucu çalışıyor mu? (213.142.159.135:3000)</li>
                    <li>URL doğru mu: <code>${API_BASE}</code></li>
                    <li>CORS ayarları yapıldı mı?</li>
                    <li>İnternet bağlantısı var mı?</li>
                    <li>Firewall engellemesi var mı?</li>
                </ul>
                <div class="connection-info">
                    <p><strong>Bağlantı Bilgileri:</strong></p>
                    <p>🌐 Uzak Sunucu: 213.142.159.135:3000</p>
                    <p>🔧 Admin Panel: herhangi bir origin (CORS açık)</p>
                    <p>📡 API Endpoint: ${API_BASE}</p>
                </div>
            </div>
            <div class="error-actions">
                <button onclick="checkBackendConnection()" class="btn-primary">
                    <i class="fas fa-sync"></i> Tekrar Dene
                </button>
                <button onclick="testConnection()" class="btn-secondary">
                    <i class="fas fa-network-wired"></i> Bağlantı Testi
                </button>
                <button onclick="openBackendInstructions()" class="btn-secondary">
                    <i class="fas fa-question-circle"></i> Yardım
                </button>
            </div>
        </div>
    `;
    
    // Show error in dashboard
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.innerHTML = errorHtml;
    }
}

// Bağlantı testi fonksiyonu
async function testConnection() {
    showLoading(true);
    showNotification('Bağlantı testi yapılıyor...', 'info');
    
    try {
        // Ping testi
        const pingStart = Date.now();
        const pingResponse = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            mode: 'cors'
        });
        const pingTime = Date.now() - pingStart;
        
        if (pingResponse.ok) {
            const healthData = await pingResponse.json();
            showNotification(`✅ Bağlantı başarılı! Ping: ${pingTime}ms`, 'success');
            console.log('Health check data:', healthData);
        } else {
            throw new Error(`HTTP ${pingResponse.status}: ${pingResponse.statusText}`);
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        showNotification(`❌ Bağlantı başarısız: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function openBackendInstructions() {
    const instructions = `
Uzak Sunucu Bağlantı Sorunları:

1. Uzak Sunucu Kontrolü:
   - IP: 213.142.159.135
   - Port: 3000
   - URL: http://213.142.159.135:3000/api

2. CORS Ayarları:
   - Uzak sunucuda CORS tüm origin'lere açık olmalı
   - origin: true ayarı yapılmış olmalı

3. Firewall Kontrolü:
   - Port 3000'in açık olduğundan emin olun
   - İnternet bağlantınızı kontrol edin

4. Test Komutları:
   - curl http://213.142.159.135:3000/api/health
   - ping 213.142.159.135

5. Admin Panel:
   - localhost:8080'de çalışıyor
   - Uzak sunucuya API istekleri gönderiyor
    `;
    
    alert(instructions);
}

// Backend Health Audit - tüm kritik endpointleri tarar ve sonuçları modale yazar
async function runBackendHealthAudit() {
    const resultsEl = document.getElementById('backendHealthResults');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="loading">Kontroller yapılıyor...</div>';

    const endpoints = [
        { name: 'Health', method: 'GET', path: '/health' },
        { name: 'Admin Stats', method: 'GET', path: '/admin/stats' },
        { name: 'Admin Charts', method: 'GET', path: '/admin/charts' },
        { name: 'Top Customers', method: 'GET', path: '/admin/top-customers' },
        { name: 'Users', method: 'GET', path: '/admin/users' },
        { name: 'Orders', method: 'GET', path: '/admin/orders' },
        { name: 'Products', method: 'GET', path: '/admin/products' },
        { name: 'Campaigns', method: 'GET', path: '/campaigns' },
        { name: 'Segments', method: 'GET', path: '/campaigns/segments' },
        { name: 'XML Manual Sync', method: 'POST', path: '/sync/products' },
        { name: 'Recommendations (get)', method: 'GET', path: '/recommendations/user/1' },
        { name: 'Recommendations (event)', method: 'POST', path: '/recommendations/event' },
    ];

    // Yardımcı: tek tek endpoint testi
    async function testEndpoint(ep) {
        const url = `${API_BASE}${ep.path}`;
        const start = Date.now();
        try {
            const res = await fetch(url, {
                method: ep.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ADMIN_TOKEN ? ('Bearer ' + ADMIN_TOKEN) : undefined,
                    'X-API-Key': TENANT_API_KEY || undefined
                },
                body: ep.method === 'POST' || ep.method === 'PUT' ? '{}' : undefined,
            });
            const ms = Date.now() - start;
            let bodyText = '';
            try { bodyText = await res.text(); } catch (_) {}
            let message = res.ok ? 'OK' : `HTTP ${res.status}`;
            // Sık görülen hata ayıklama ipuçları
            let hint = '';
            if (res.status === 401 || res.status === 403) hint = ' (Yetkilendirme gerekli - ADMIN_TOKEN eksik/yanlış)';
            if (res.status === 404) hint = ' (Endpoint yok veya yol farklı)';
            if (res.status === 500) hint = ' (Sunucu hatası - logları kontrol edin)';
            return { name: ep.name, path: ep.path, method: ep.method, ok: res.ok, status: res.status, ms, message: message + hint, sample: bodyText.slice(0, 180) };
        } catch (err) {
            const ms = Date.now() - start;
            return { name: ep.name, path: ep.path, method: ep.method, ok: false, status: 0, ms, message: 'Bağlantı hatası: ' + err.message, sample: '' };
        }
    }

    const results = await Promise.all(endpoints.map(testEndpoint));

    const okCount = results.filter(r => r.ok).length;
    const failCount = results.length - okCount;

    const rows = results.map(r => `
        <tr>
            <td><code>${r.method}</code></td>
            <td><code>${r.path}</code></td>
            <td>${r.ok ? '✅' : '❌'}</td>
            <td>${r.status || '-'}</td>
            <td>${r.ms} ms</td>
            <td>${escapeHtml(r.message)}</td>
        </tr>`).join('');

    resultsEl.innerHTML = `
        <div class="section-header" style="margin:0 0 10px 0;display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div>
                <h3 style="margin:0;font-size:16px">Backend Sağlık Özeti</h3>
                <small>API: <code>${API_BASE}</code></small>
            </div>
            <div>
                <span class="badge" style="background:#16a34a;color:#fff;padding:4px 8px;border-radius:6px;margin-right:6px;">Başarılı: ${okCount}</span>
                <span class="badge" style="background:#dc2626;color:#fff;padding:4px 8px;border-radius:6px;">Hatalı: ${failCount}</span>
            </div>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Durum</th>
                        <th>Kod</th>
                        <th>Süre</th>
                        <th>Mesaj</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
        <div style="margin-top:10px">
            <small>Not: Yetkilendirme isteyen endpointler için 401/403 normaldir. <code>ADMIN_TOKEN</code> yerleşik değilse yerel storage'a ekleyin.</small>
        </div>
    `;
}

// ================= Kişiselleştirme UI =================
async function persRebuildProfile() {
    try {
        const userId = parseInt(document.getElementById('persUserId').value || '');
        if (!userId) { showNotification('Kullanıcı ID girin', 'error'); return; }
        showLoading(true);
        const res = await fetch(`${API_BASE}/recommendations/user/${userId}/rebuild-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': TENANT_API_KEY
            },
            body: '{}'
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'İşlem başarısız');
        const profile = data.data.profile || {};
        document.getElementById('persInterests').textContent = JSON.stringify(profile.interests || {}, null, 2);
        document.getElementById('persBrands').textContent = JSON.stringify(profile.brands || {}, null, 2);
        showNotification('Profil güncellendi', 'success');
    } catch (e) {
        showNotification(e.message, 'error');
    } finally { showLoading(false); }
}

async function persLoadRecommendations() {
    try {
        const userId = parseInt(document.getElementById('persUserId').value || '');
        if (!userId) { showNotification('Kullanıcı ID girin', 'error'); return; }
        showLoading(true);
        const res = await fetch(`${API_BASE}/recommendations/user/${userId}?limit=20`, {
            headers: { 'X-API-Key': TENANT_API_KEY }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Öneriler alınamadı');
        const list = data.data.recommendations || [];
        const grid = document.getElementById('persRecsGrid');
        if (!grid) return;
        if (!list.length) { grid.innerHTML = '<div class="no-data">Öneri yok</div>'; return; }
        grid.innerHTML = list.map(p => {
            const brandPill = `<span class="pill"><span class="dot"></span>${escapeHtml(p.brand || '-')}</span>`;
            const catPill = `<span class="pill" style="background:#ecfeff;color:#115e59"><span class="dot" style="background:#14b8a6"></span>${escapeHtml(p.category || '-')}</span>`;
            return `
            <div class="rec-card">
                <div class="rec-title">Ürün #${p.productId || '-'}</div>
                <div class="rec-meta">${catPill} ${brandPill}</div>
                <div class="rec-price">${p.price != null ? Number(p.price).toFixed(2) + ' TL' : '-'}</div>
            </div>`;
        }).join('');
    } catch (e) {
        showNotification(e.message, 'error');
    } finally { showLoading(false); }
}

async function persSendEvent() {
    try {
        const userId = parseInt(document.getElementById('persUserId').value || '');
        if (!userId) { showNotification('Kullanıcı ID girin', 'error'); return; }
        const eventType = document.getElementById('persEventType').value;
        const productId = parseInt(document.getElementById('persProductId').value || '');
        const searchQuery = document.getElementById('persSearchQuery').value || '';
        const filterText = document.getElementById('persFilterDetails').value || '';
        let filterDetails = null;
        if (filterText) {
            try { filterDetails = JSON.parse(filterText); } catch(_) { filterDetails = filterText; }
        }
        showLoading(true);
        const res = await fetch(`${API_BASE}/recommendations/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': TENANT_API_KEY
            },
            body: JSON.stringify({ userId, eventType, productId: isNaN(productId) ? undefined : productId, searchQuery: searchQuery || undefined, filterDetails })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Event kaydedilemedi');
        showNotification('Event kaydedildi ve öneriler güncellendi', 'success');
        // Öneri listesini tazele
        persLoadRecommendations();
    } catch (e) {
        showNotification(e.message, 'error');
    } finally { showLoading(false); }
}

// Kullanıcı ID girildiğinde otomatik profil çek
document.addEventListener('DOMContentLoaded', function() {
    try {
        const userEl = document.getElementById('persUserId');
        if (userEl) {
            const loadProfile = async () => {
                const userId = parseInt(userEl.value || '');
                if (!userId) return;
                try {
                    const res = await fetch(`${API_BASE}/recommendations/user/${userId}/profile`, {
                        headers: { 'X-API-Key': TENANT_API_KEY }
                    });
                    if (!res.ok) return;
                    const data = await res.json();
                    if (data && data.success && data.data && data.data.profile) {
                        const profile = data.data.profile;
                        document.getElementById('persInterests').textContent = JSON.stringify(profile.interests || {}, null, 2);
                        document.getElementById('persBrands').textContent = JSON.stringify(profile.brands || {}, null, 2);
                        renderTagCloud(profile.interests || {}, 'persInterestsTags');
                        renderTagCloud(profile.brands || {}, 'persBrandsTags');
                        setProfileSummary(profile);
                    }
                } catch(_) {}
            };
            userEl.addEventListener('change', loadProfile);
            userEl.addEventListener('blur', loadProfile);
        }
    } catch(_) {}

    // Mock veri butonu ve otomatik doldurma
    try {
        const persSection = document.getElementById('personalization-section');
        if (persSection) {
            const actions = persSection.querySelector('.header-actions');
            if (actions) {
                const mockBtn = document.createElement('button');
                mockBtn.className = 'btn-secondary';
                mockBtn.innerHTML = '<i class="fas fa-vial"></i> Mock Doldur';
                mockBtn.onclick = fillPersonalizationMock;
                actions.appendChild(mockBtn);
            }
        }
    } catch(_) {}
});

function renderTagCloud(obj, targetId) {
    try {
        const el = document.getElementById(targetId);
        if (!el) return;
        const entries = Object.entries(obj || {}).sort((a,b) => b[1]-a[1]).slice(0, 20);
        if (!entries.length) { el.innerHTML = '<span class="text-muted">Veri yok</span>'; return; }
        el.innerHTML = entries.map(([k,v]) => `<span class="pill"><span class="dot"></span>${escapeHtml(k)} <small style="opacity:.7">${Number(v).toFixed(1)}</small></span>`).join(' ');
    } catch(_) {}
}

function setProfileSummary(profile) {
    try {
        const price = (profile.avgPriceMin != null && profile.avgPriceMax != null) ? `${Number(profile.avgPriceMin).toFixed(0)} - ${Number(profile.avgPriceMax).toFixed(0)} TL` : '-';
        const disc = profile.discountAffinity != null ? `${Math.round(Number(profile.discountAffinity) * 100)}%` : '-';
        const total = profile.totalEvents != null ? String(profile.totalEvents) : '-';
        const bandEl = document.getElementById('persPriceBand');
        const discEl = document.getElementById('persDiscountAffinity');
        const totEl = document.getElementById('persTotalEvents');
        if (bandEl) bandEl.textContent = price;
        if (discEl) discEl.textContent = disc;
        if (totEl) totEl.textContent = total;
    } catch(_) {}
}

function fillPersonalizationMock() {
    try {
        // Mock profil
        const interests = { 'mont': 12.4, 'hoodie': 8.9, 'pantolon': 5.1 };
        const brands = { 'Huglu': 9.7, 'NorthPeak': 6.2, 'StormX': 3.5 };
        document.getElementById('persInterests').textContent = JSON.stringify(interests, null, 2);
        document.getElementById('persBrands').textContent = JSON.stringify(brands, null, 2);
        renderTagCloud(interests, 'persInterestsTags');
        renderTagCloud(brands, 'persBrandsTags');
        setProfileSummary({ avgPriceMin: 500, avgPriceMax: 1500, discountAffinity: 0.6, totalEvents: 42 });
        // Mock öneriler
        const mockRecs = [
            { productId: 101, category: 'mont', brand: 'Huglu', price: 1299.90 },
            { productId: 202, category: 'hoodie', brand: 'NorthPeak', price: 699.00 },
            { productId: 303, category: 'pantolon', brand: 'StormX', price: 549.50 }
        ];
        const grid = document.getElementById('persRecsGrid');
        if (!grid) return;
        grid.innerHTML = mockRecs.map(p => `
            <div class="rec-card">
                <div class="rec-title">Ürün #${p.productId}</div>
                <div class="rec-meta"><span class="pill" style="background:#ecfeff;color:#115e59"><span class="dot" style="background:#14b8a6"></span>${escapeHtml(p.category)}</span>
                <span class="pill"><span class="dot"></span>${escapeHtml(p.brand)}</span></div>
                <div class="rec-price">${Number(p.price).toFixed(2)} TL</div>
            </div>
        `).join('');
        showNotification('Mock veriler yüklendi', 'success');
    } catch (e) {
        showNotification('Mock doldurulamadı: ' + e.message, 'error');
    }
}

// XSS'e karşı küçük yardımcı
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Global erişim
window.runBackendHealthAudit = runBackendHealthAudit;

function setupEventListeners() {
    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const href = (this.getAttribute('href') || '').trim();
            if (this.dataset.external === 'true' || (href && !href.startsWith('#') && href.endsWith('.html'))) {
                // Harici linkler normal davranır
                return;
            }
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
            setActiveNavItem(this);
        });
    });
    
    // Responsive sidebar
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    }
    
    window.addEventListener('resize', function() {
        if (!sidebar) return;
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    });
}

function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('collapsed');
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'users': 'Kullanıcı Yönetimi',
        'orders': 'Sipariş Yönetimi',
        'carts': 'Sepetler',
        'products': 'Ürün Yönetimi',
        'product-detail': 'Ürün Detayları',
        'campaigns': 'Kampanya Yönetimi',
        'segments': 'Müşteri Segmentleri',
        'analytics': 'Analitik ve Raporlar',
        'live': 'Canlı Veriler',
        'wallets': 'Müşteri Bakiyeleri',
        'dealership': 'Bayilik Başvuruları',
        'tenants': 'Tenant Yönetimi',
        'custom-production': 'Özel Üretim',
        'personalization': 'Kişiselleştirme ve Öneriler',
        'settings': 'Ayarlar',
        'security': 'Güvenlik Olayları'
    };
    
    if (pageTitle) pageTitle.textContent = titles[sectionName] || 'Dashboard';
    
    // Load section data
    loadSectionData(sectionName);
}

function setActiveNavItem(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function showLoading(show = true) {
    if (!loadingOverlay) return;
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Genel modal açma fonksiyonu (varsa kullan, yoksa basit göster)
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
}

// Basit istek kuyruğu, önbellek ve tekrar çağrı azaltma
const __REQ_MAX_CONCURRENCY = 4;
let __reqActive = 0;
const __reqQueue = [];
const __reqCache = new Map(); // key -> { time, data }

function enqueueRequest(task){
    return new Promise((resolve, reject)=>{
        __reqQueue.push({ task, resolve, reject });
        processQueue();
    });
}

function processQueue(){
    while (__reqActive < __REQ_MAX_CONCURRENCY && __reqQueue.length){
        const { task, resolve, reject } = __reqQueue.shift();
        __reqActive++;
        task().then((v)=>{ __reqActive--; processQueue(); resolve(v); })
             .catch((e)=>{ __reqActive--; processQueue(); reject(e); });
    }
}

function buildCacheKey(url, options){
    const method = (options.method || 'GET').toUpperCase();
    return `${method} ${url}`;
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    console.log(`🔄 API Request: ${endpoint}`);
    
    try {
        const url = `${API_BASE}${endpoint}`;
        console.log(`📡 Requesting: ${url}`);
        const method = (options.method || 'GET').toUpperCase();
        const isCacheableGet = method === 'GET';
        const cacheKey = buildCacheKey(url, options);
        const now = Date.now();
        // 5 sn GET önbellek
        if (isCacheableGet && __reqCache.has(cacheKey)) {
            const c = __reqCache.get(cacheKey);
            if (now - c.time < 5000) {
                return c.data;
            }
        }

        const doFetch = async () => {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ADMIN_TOKEN ? ('Bearer ' + ADMIN_TOKEN) : undefined,
                    'X-API-Key': TENANT_API_KEY ? TENANT_API_KEY : undefined,
                    ...options.headers
                }
            });
            return response;
        };

        const response = await enqueueRequest(doFetch);
        
        console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (jsonError) {
                console.warn('Could not parse error response as JSON:', jsonError);
            }
            const err = new Error(errorMessage);
            err.status = response.status;
            err.endpoint = endpoint;
            throw err;
        }
        
        const data = await response.json();
        if (isCacheableGet) {
            __reqCache.set(cacheKey, { time: now, data });
        }
        console.log(`✅ API Success: ${endpoint}`, data);
        return data;
        
    } catch (error) {
        console.error(`❌ API Error for ${endpoint}:`, error);
        
        if (error && (error.status === 401 || error.status === 403)) {
            showNotification('Yetkilendirme hatası. Lütfen Ayarlar > Tenant API Key alanına geçerli anahtarı girin.', 'error');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            const connectionError = `Backend sunucusuna bağlanılamıyor. Sunucu çalışıyor mu?\n\nKontrol edin:\n1. Backend sunucusu port 3000'de çalışıyor mu?\n2. URL doğru mu: ${API_BASE}\n3. CORS ayarları yapıldı mı?`;
            showNotification(connectionError, 'error');
            console.error('🔍 Connection troubleshooting:', {
                apiBase: API_BASE,
                endpoint: endpoint,
                fullUrl: `${API_BASE}${endpoint}`,
                error: error.message
            });
        } else {
            showNotification('API Hatası: ' + error.message, 'error');
        }
        
        throw error;
    }
}

// Dashboard Functions
async function loadDashboardData(range) {
    try {
        showLoading(true);
    const q = range ? `?range=${encodeURIComponent(range)}` : '';
        // Load in iki dalga: kritikler önce, diğerleri sonra
        const [statsRes, chartsRes] = await Promise.allSettled([
            apiRequest('/admin/stats' + q),
            apiRequest('/admin/charts' + q)
        ]);
        
        if (statsRes.status === 'fulfilled' && statsRes.value.success) {
            updateDashboardStats(statsRes.value.data);
        }
        
        // Inventory: update stock/category cards and charts if available
        const categoriesOk = categoriesRes && categoriesRes.status === 'fulfilled' && categoriesRes.value && categoriesRes.value.success;
        const productsOk = productsRes && productsRes.status === 'fulfilled' && productsRes.value && productsRes.value.success;
        const categories = categoriesOk ? (categoriesRes.value.data || []) : [];
        const products = productsOk ? (productsRes.value.data || []) : [];

        if (categoriesOk || productsOk) {
            updateDashboardInventoryStats(products, categories);
            initializeDashboardInventoryCharts(products, categories);
        }
        if (chartsRes.status === 'fulfilled' && chartsRes.value.success) {
            window.__lastChartData = chartsRes.value.data;
            initializeCharts(chartsRes.value.data);
        }
        // ikinci dalga: daha az kritik
        const [topCustomersRes, categoriesRes, productsRes] = await Promise.allSettled([
            apiRequest('/admin/top-customers'),
            apiRequest('/admin/categories'),
            apiRequest('/admin/products')
        ]);
        if (topCustomersRes.status === 'fulfilled' && topCustomersRes.value.success) {
            updateTopCustomersTable(topCustomersRes.value.data);
        } else {
            const tbody = document.getElementById('topCustomersTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading">Veri bulunamadı</td></tr>';
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Dashboard verileri yüklenirken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

function refreshDashboardWithRange() {
    const sel = document.getElementById('dashboardRange');
    const range = sel ? sel.value : '7';
    // Sık tekrarı engellemek için küçük bir debounce
    clearTimeout(window.__dashDeb || 0);
    window.__dashDeb = setTimeout(()=>loadDashboardData(range), 250);
}
window.refreshDashboardWithRange = refreshDashboardWithRange;

// Security Events
async function loadSecurityEvents(){
    try{
        showLoading(true);
        const range = document.getElementById('secRange')?.value || '7';
        const uq = document.getElementById('secUserQuery')?.value || '';
        const ip = document.getElementById('secIpQuery')?.value || '';
        const params = new URLSearchParams();
        if(range) params.append('range', range);
        if(uq) params.append('q', uq);
        if(ip) params.append('ip', ip);
        const res = await apiRequest(`/admin/security/login-attempts${params.toString() ? ('?' + params.toString()) : ''}`);
        if(!res.success) throw new Error(res.message || 'Güvenlik olayları alınamadı');
        renderSecurityEvents(res.data || []);
    }catch(e){
        const tbody = document.getElementById('securityTableBody');
        if(tbody) tbody.innerHTML = `<tr><td colspan="6" class="loading">${e.message || 'Yükleme hatası'}</td></tr>`;
    }finally{
        showLoading(false);
    }
}

function renderSecurityEvents(items){
    const tbody = document.getElementById('securityTableBody');
    if(!tbody) return;
    if(!Array.isArray(items) || items.length === 0){
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Kayıt bulunamadı</td></tr>';
        return;
    }
    tbody.innerHTML = items.map(it => `
        <tr>
            <td>${formatDate(it.timestamp) || '-'}</td>
            <td>${safeString(it.username || it.email || it.user || '-')}</td>
            <td>${safeString(it.ip || '-')}</td>
            <td>${safeString(it.attempts || 1)}</td>
            <td><span class="status-badge ${it.status==='blocked'?'cancelled':'pending'}">${safeString(it.status || 'failed')}</span></td>
            <td>${safeString(it.reason || it.message || 'Hatalı şifre')}</td>
        </tr>
    `).join('');
}

function refreshSecurityEvents(){ loadSecurityEvents(); }
window.refreshSecurityEvents = refreshSecurityEvents;

function updateDashboardStats(stats) {
    console.log('📊 Updating dashboard stats:', stats);
    
    try {
        document.getElementById('totalUsers').textContent = safeString(stats.users, '0');
        document.getElementById('totalProducts').textContent = safeString(stats.products, '0');
        document.getElementById('totalOrders').textContent = safeString(stats.orders, '0');
        document.getElementById('monthlyRevenue').textContent = `${formatCurrency(stats.monthlyRevenue)} ₺`;
        
        console.log('✅ Dashboard stats updated successfully');
    } catch (error) {
        console.error('❌ Error updating dashboard stats:', error);
        showNotification('Dashboard güncellenirken hata oluştu', 'error');
    }
}

// Chart variables to store chart instances
let salesChart, ordersChart, revenueChart, productsChart, dashboardCategoryChart, dashboardStockChart;
// Analytics page charts
let segmentDistributionChart, campaignPerformanceChart, categoryDistributionChartAnalytics, stockStatusChartAnalytics;

function initializeCharts(data) {
    console.log('📈 Initializing charts with data:', data);
    
    try {
        // Destroy existing charts if they exist
        if (salesChart) salesChart.destroy();
        if (ordersChart) ordersChart.destroy();
        if (revenueChart) revenueChart.destroy();
        if (productsChart) productsChart.destroy();
        
        // Initialize all charts
        createSalesChart(data.dailySales);
        createOrdersChart(data.orderStatuses);
        createRevenueChart(data.monthlyRevenue);
        createProductsChart(data.topProducts);
        
        console.log('✅ All charts initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing charts:', error);
        showNotification('Grafikler yüklenirken hata oluştu', 'error');
    }
}

function updateDashboardInventoryStats(products = [], categories = []) {
    try {
        const lowOrOutCount = products.reduce((acc, p) => {
            const status = (typeof getStockStatus === 'function') ? getStockStatus(p.stock) : (p?.stock <= 0 ? 'out' : (p?.stock <= 5 ? 'low' : (p?.stock < 20 ? 'medium' : 'high')));
            return acc + ((status === 'low' || status === 'out') ? 1 : 0);
        }, 0);
        const catCount = categories.length > 0 ? categories.length : uniqueCategoryCount(products);

        const lowEl = document.getElementById('totalLowStock');
        const catEl = document.getElementById('totalCategories');
        if (lowEl) lowEl.textContent = String(lowOrOutCount);
        if (catEl) catEl.textContent = String(catCount);
    } catch (e) {
        console.warn('Dashboard stok/kategori özetleri güncellenemedi:', e);
    }
}

function uniqueCategoryCount(products = []) {
    const set = new Set();
    for (const p of products) {
        if (p && p.category) set.add(p.category);
        else if (p && p.categoryName) set.add(p.categoryName);
    }
    return set.size;
}

function initializeDashboardInventoryCharts(products = [], categories = []) {
    try {
        // Category distribution by product count (top 12)
        const catCountsMap = new Map();
        for (const p of products) {
            const key = p?.categoryName || p?.category || 'Diğer';
            catCountsMap.set(key, (catCountsMap.get(key) || 0) + 1);
        }
        const catLabels = Array.from(catCountsMap.keys()).slice(0, 12);
        const catData = catLabels.map(l => catCountsMap.get(l));

        const catCanvas = document.getElementById('dashboardCategoryChart');
        if (catCanvas) {
            const ctx = catCanvas.getContext('2d');
            if (dashboardCategoryChart) dashboardCategoryChart.destroy();
            dashboardCategoryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: catLabels,
                    datasets: [{
                        label: 'Ürün Adedi',
                        data: catData,
                        backgroundColor: 'rgba(38, 198, 218, 0.25)',
                        borderColor: '#26c6da',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Stock status doughnut
        const stockBuckets = { Yüksek: 0, Orta: 0, Düşük: 0, StokYok: 0 };
        for (const p of products) {
            const status = (typeof getStockStatus === 'function') ? getStockStatus(p.stock) : (p?.stock <= 0 ? 'out' : (p?.stock <= 5 ? 'low' : (p?.stock < 20 ? 'medium' : 'high')));
            if (status === 'high') stockBuckets.Yüksek++;
            else if (status === 'medium') stockBuckets.Orta++;
            else if (status === 'low') stockBuckets.Düşük++;
            else stockBuckets.StokYok++;
        }

        const stockCanvas = document.getElementById('dashboardStockChart');
        if (stockCanvas) {
            const ctx2 = stockCanvas.getContext('2d');
            if (dashboardStockChart) dashboardStockChart.destroy();
            dashboardStockChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stockBuckets),
                    datasets: [{
                        data: Object.values(stockBuckets),
                        backgroundColor: ['#43e97b', '#feca57', '#ff6b6b', '#e2e3e5'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    } catch (e) {
        console.warn('Dashboard envanter grafikleri oluşturulurken hata:', e);
    }
}

function updateTopCustomersTable(customers) {
    const tbody = document.getElementById('topCustomersTableBody');
    if (!tbody) return;
    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Kayıt bulunamadı</td></tr>';
        return;
    }
    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>${safeString(c.name)}</td>
            <td>${safeString(c.email)}</td>
            <td>${safeString(c.phone)}</td>
            <td>${safeString(c.orderCount, '0')}</td>
            <td>${formatCurrency(c.totalSpent)} ₺</td>
            <td>${formatDate(c.lastOrderAt)}</td>
        </tr>
    `).join('');
}

function createSalesChart(dailySales) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Generate last 7 days labels
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }));
    }
    
    // Map data to labels
    const salesData = labels.map(label => {
        const found = dailySales.find(sale => {
            const saleDate = new Date(sale.date);
            const labelDate = saleDate.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
            return labelDate === label;
        });
        return found ? found.revenue : 0;
    });
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Günlük Satış (₺)',
                data: salesData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' ₺';
                        }
                    }
                }
            }
        }
    });
}

function createOrdersChart(orderStatuses) {
    const ctx = document.getElementById('ordersChart').getContext('2d');
    
    const statusColors = {
        'pending': '#ffc107',
        'processing': '#17a2b8',
        'shipped': '#6c757d',
        'delivered': '#28a745',
        'cancelled': '#dc3545'
    };
    
    const statusLabels = {
        'pending': 'Beklemede',
        'processing': 'İşleniyor',
        'shipped': 'Kargoda',
        'delivered': 'Teslim Edildi',
        'cancelled': 'İptal'
    };
    
    const labels = orderStatuses.map(status => statusLabels[status.status] || status.status);
    const data = orderStatuses.map(status => status.count);
    const colors = orderStatuses.map(status => statusColors[status.status] || '#6c757d');
    
    ordersChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

function createRevenueChart(monthlyRevenue) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    const labels = monthlyRevenue.map(item => {
        const [year, month] = item.month.split('-');
        return new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
    });
    
    const data = monthlyRevenue.map(item => item.revenue);
    
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Aylık Gelir (₺)',
                data: data,
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: '#28a745',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('tr-TR') + ' ₺';
                        }
                    }
                }
            }
        }
    });
}

function createProductsChart(topProducts) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    
    const labels = topProducts.map(product => {
        // Truncate long product names
        return product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name;
    });
    
    const data = topProducts.map(product => product.totalSold);
    
    const colors = [
        '#667eea',
        '#764ba2',
        '#f093fb',
        '#f5576c',
        '#4facfe'
    ];
    
    productsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Satış Adedi',
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Users Functions
async function loadUsers() {
    try {
        showLoading(true);
        const usersData = await apiRequest('/admin/users');
        // Load wallets and coupons in parallel (optional)
        let walletsMap = new Map();
        try {
            const walletsRes = await apiRequest('/admin/wallets');
            if (walletsRes.success && Array.isArray(walletsRes.data)) {
                walletsRes.data.forEach(w => walletsMap.set(w.userId, w));
            }
        } catch {}

        let couponsMap = new Map();
        try {
            const couponsRes = await apiRequest('/admin/coupons');
            if (couponsRes.success && Array.isArray(couponsRes.data)) {
                couponsRes.data.forEach(c => {
                    const arr = couponsMap.get(c.userId) || [];
                    arr.push(c);
                    couponsMap.set(c.userId, arr);
                });
            }
        } catch {}
 
        if (usersData.success) {
            updateUsersTable(usersData.data, walletsMap, couponsMap);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr><td colspan="8" class="loading">Kullanıcılar yüklenirken hata oluştu</td></tr>
        `;
    } finally {
        showLoading(false);
    }
}

function updateUsersTable(users, walletsMap = new Map(), couponsMap = new Map()) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Kullanıcı bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${safeString(user.id)}</td>
            <td>${safeString(user.name)}</td>
            <td>${safeString(user.email)}</td>
            <td>${safeString(user.phone)}</td>
            <td>${safeString(user.tenantName)}</td>
            <td>${(walletsMap.get(user.id) ? formatCurrency(walletsMap.get(user.id).balance) + ' ' + safeString(walletsMap.get(user.id).currency || 'TRY') : '-')}</td>
            <td>${(couponsMap.get(user.id) ? couponsMap.get(user.id).map(c => safeString(c.code)).join(', ') : '-')}</td>
            <td>${formatDate(user.createdAt)}</td>
        </tr>
    `).join('');
}

async function setUserRole(userId, role) {
    try {
        showLoading(true);
        await apiRequest(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
        showNotification('Kullanıcı rolü güncellendi', 'success');
        loadUsers();
    } catch (e) {
        showNotification('Rol güncellenemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function toggleUserStatus(userId) {
    try {
        showLoading(true);
        // Sunucu tarafında bool tersine çeviremediğimiz için varsayılan true gönderelim
        await apiRequest(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: true })
        });
        showNotification('Kullanıcı durumu güncellendi', 'success');
        loadUsers();
    } catch (e) {
        showNotification('Durum güncellenemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function resetUserPassword(userId) {
    try {
        showLoading(true);
        const res = await apiRequest(`/admin/users/${userId}/reset-password`, { method: 'POST' });
        const newPwd = res?.data?.newPassword;
        showNotification('Şifre sıfırlandı' + (newPwd ? `: ${newPwd}` : ''), 'success');
    } catch (e) {
        showNotification('Şifre sıfırlanamadı: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.setUserRole = setUserRole;
window.toggleUserStatus = toggleUserStatus;
window.resetUserPassword = resetUserPassword;

// Orders Functions
async function loadOrders() {
    try {
        showLoading(true);
        const ordersData = await apiRequest('/admin/orders');
        
        if (ordersData.success) {
            updateOrdersTable(ordersData.data);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersTableBody').innerHTML = `
            <tr><td colspan="7" class="loading">Siparişler yüklenirken hata oluştu</td></tr>
        `;
    } finally {
        showLoading(false);
    }
}

function updateOrdersTable(orders) {
    console.log('📦 Updating orders table:', orders);
    
    const tbody = document.getElementById('ordersTableBody');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Sipariş bulunamadı</td></tr>';
        return;
    }
    
    try {
        tbody.innerHTML = orders.map((order, index) => {
            console.log(`📋 Processing order ${index + 1}:`, order);
            
            // Format product items
            let productsHtml = '';
            if (order.items && order.items.length > 0) {
                productsHtml = order.items.map(item => `
                    <div class="order-item">
                        <span class="product-name">${safeString(item.productName)}</span>
                        <span class="product-quantity">x${safeString(item.quantity)}</span>
                        <span class="product-price">${formatCurrency(item.price)} ₺</span>
                    </div>
                `).join('');
            } else {
                productsHtml = '<span class="no-items">Ürün bilgisi yok</span>';
            }
            
            return `
            <tr>
                <td>${safeString(order.id)}</td>
                <td>
                    <div class="customer-info">
                        <strong>${safeString(order.userName)}</strong>
                        <small>${safeString(order.userEmail, '')}</small>
                    </div>
                </td>
                <td>
                    <div class="order-products collapsed" id="order-products-${safeString(order.id)}">
                        ${productsHtml}
                        ${order.items && order.items.length > 1 ? `<small class="item-count">${order.items.length} ürün</small>` : ''}
                    </div>
                    <div style="margin-top:6px;">
                        <button class="order-toggle" onclick="toggleOrderProducts('${safeString(order.id)}')">
                            <i class="fas fa-chevron-down"></i> Aç/Kapat
                        </button>
                    </div>
                </td>
                <td class="order-total">${formatCurrency(order.totalAmount)} ₺</td>
                <td><span class="status-badge ${safeString(order.status, 'pending')}">${getStatusText(order.status)}</span></td>
                <td>${formatDate(order.createdAt)}</td>
                <td>
                    <div class="order-actions">
                        <button onclick="showOrderDetails(${order.id})" class="btn-secondary" style="margin-bottom: 5px;">
                            <i class="fas fa-eye"></i> Detay
                        </button>
                        <select onchange="updateOrderStatus(${order.id}, this.value)" class="btn-secondary order-status-select">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Beklemede</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>İşleniyor</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Kargoda</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Teslim Edildi</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>İptal</option>
                        </select>
                        <button onclick="printShippingLabel(${order.id})" class="btn-secondary">
                            <i class="fas fa-print"></i> Kargo Fişi
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
        
        console.log('✅ Orders table updated successfully');
    } catch (error) {
        console.error('❌ Error updating orders table:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Tablo güncellenirken hata oluştu</td></tr>';
        showNotification('Sipariş tablosu güncellenirken hata oluştu', 'error');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        showLoading(true);
        await apiRequest(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        showNotification('Sipariş durumu güncellendi', 'success');
        loadOrders(); // Refresh the table
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Sipariş durumu güncellenirken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

function toggleOrderProducts(orderId){
  const el = document.getElementById(`order-products-${orderId}`);
  if(!el) return;
  el.classList.toggle('collapsed');
}
window.toggleOrderProducts = toggleOrderProducts;

async function printShippingLabel(orderId) {
    try {
        showLoading(true);
        const res = await apiRequest(`/admin/orders/${orderId}/shipping-label`, { method: 'POST' });
        if (!res.success) throw new Error(res.message || 'Kargo fişi oluşturulamadı');

        const d = res.data;
        const logoSrc = (function(){
            try { return new URL('../assets/iconns.png', window.location.href).href; } catch(_) { return ''; }
        })();
        const labelHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kargo Fişi #${d.orderId}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#000;padding:16px}
.label{width:800px;border:1px dashed #000;padding:16px}
.row{display:flex;justify-content:space-between;margin-bottom:8px}
.box{border:1px solid #000;padding:8px;border-radius:4px}
.items{margin-top:12px;border-top:1px solid #000;padding-top:8px}
.barcode{font-weight:700;font-size:20px}
._footerLogo{display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:24px;padding-top:16px;border-top:1px dashed #999}
._footerLogo img{width:260px;max-width:100%;height:auto;object-fit:contain;border-radius:12px}
._footerLogo .brand{margin-top:10px;font-weight:800;font-size:28px;letter-spacing:1px}
@media print{button{display:none}}
</style></head><body>
<div class="label">
 <div class="row"><div class="box"><strong>GÖNDEREN:</strong> ${d.shipFrom}</div><div class="box"><strong>TARİH:</strong> ${d.createdAt}</div></div>
 <div class="row"><div class="box" style="flex:1;margin-right:8px"><strong>ALICI:</strong><br>${d.shipTo.name}<br>${d.shipTo.address}<br>${d.shipTo.district} / ${d.shipTo.city}<br>Tel: ${d.shipTo.phone}</div>
 <div class="box" style="width:240px;text-align:center"><div class="barcode">${d.barcode}</div><div>Sipariş #${d.orderId}</div></div></div>
 <div class="items">
   <strong>İçerik (${d.totalItems} kalem):</strong>
   <ol>
     ${d.items.map(i => `<li>${i.qty} x ${i.name}</li>`).join('')}
   </ol>
 </div>
  <div class="_footerLogo">
    <img src="${logoSrc}" alt="Logo" onerror="this.style.display='none'">
    <div class="brand">Huğlu Outdoor</div>
  </div>
</div>
<button onclick="window.print()" style="margin-top:12px;padding:8px 12px">Yazdır</button>
</body></html>`;

        const w = window.open('', '_blank');
        w.document.write(labelHtml);
        w.document.close();
        // Bazı tarayıcılarda print'i yüklenmeden tetiklememek için
        w.onload = () => w.print();
    } catch (e) {
        showNotification('Kargo fişi oluşturulamadı: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.printShippingLabel = printShippingLabel;

// Tenants Functions
async function loadTenants() {
    try {
        showLoading(true);
        const tenantsData = await apiRequest('/tenants');
        
        if (tenantsData.success) {
            updateTenantsTable(tenantsData.data);
        }
    } catch (error) {
        console.error('Error loading tenants:', error);
        document.getElementById('tenantsTableBody').innerHTML = `
            <tr><td colspan="6" class="loading">Tenants yüklenirken hata oluştu</td></tr>
        `;
    } finally {
        showLoading(false);
    }
}

function updateTenantsTable(tenants) {
    const tbody = document.getElementById('tenantsTableBody');
    
    if (!tenants || tenants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Tenant bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = tenants.map(tenant => `
        <tr>
            <td>${safeString(tenant.id)}</td>
            <td>${safeString(tenant.name)}</td>
            <td>${safeString(tenant.domain)}</td>
            <td>${safeString(tenant.subdomain)}</td>
            <td><span class="status-badge ${tenant.isActive ? 'online' : 'cancelled'}">${tenant.isActive ? 'Aktif' : 'Pasif'}</span></td>
            <td>${formatDate(tenant.createdAt)}</td>
        </tr>
    `).join('');
}

// Product Sync Function
async function triggerProductSync() {
    try {
        showLoading(true);
        await apiRequest('/sync/products', { method: 'POST' });
        showNotification('Ürün senkronizasyonu başlatıldı', 'success');
        try { await loadSyncLogs(); } catch(_){}
    } catch (error) {
        console.error('Error triggering product sync:', error);
        showNotification('Ürün senkronizasyonu başlatılırken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadSyncLogs(){
  const root = document.getElementById('syncLogsContainer');
  if (!root) return;
  try {
    const res = await apiRequest('/admin/sync/logs');
    const items = Array.isArray(res.data) ? res.data : [];
    if (!items.length) { root.innerHTML = '<div class="loading">Kayıt bulunamadı</div>'; return; }
    const rows = items.map(i => `
      <tr>
        <td>${formatDate(i.startedAt)}</td>
        <td>${i.durationMs != null ? (i.durationMs + ' ms') : '-'}</td>
        <td>${i.success ? '✅' : '❌'}</td>
        <td>${escapeHtml(i.message || '')}</td>
      </tr>
    `).join('');
    root.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Başlangıç</th>
            <th>Süre</th>
            <th>Durum</th>
            <th>Mesaj</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (e) {
    root.innerHTML = '<div class="error">Loglar yüklenemedi</div>';
  }
}

window.loadSyncLogs = loadSyncLogs;

// Section Data Loading
function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'carts':
            loadCarts();
            break;
        case 'products':
            loadProducts();
            break;
        case 'campaigns':
            loadCampaigns();
            break;
    case 'dealership':
      loadDealershipApplications();
      break;
        case 'segments':
            loadSegments();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'live':
            loadLive();
            break;
        case 'tenants':
            loadTenants();
            break;
        case 'custom-production':
            loadCustomProductions();
            break;
        case 'wallets':
            loadWallets();
            break;
        case 'security':
            loadSecurityEvents();
            break;
        default:
            break;
    }
}

// Dealership Applications
async function loadDealershipApplications() {
  try {
    showLoading(true);
    const minInput = document.getElementById('filterRevenueMin');
    const maxInput = document.getElementById('filterRevenueMax');
    const statusInput = document.getElementById('filterStatus');
    const params = new URLSearchParams();
    if (minInput && minInput.value) params.append('minRevenue', minInput.value);
    if (maxInput && maxInput.value) params.append('maxRevenue', maxInput.value);
    if (statusInput && statusInput.value) params.append('status', statusInput.value);
    const res = await apiRequest(`/dealership/applications${params.toString() ? ('?' + params.toString()) : ''}`);
    if (!res.success) throw new Error(res.message || 'Başvurular yüklenemedi');
    renderDealershipApplications(res.data || []);
  } catch (e) {
    document.getElementById('dealershipApplications').innerHTML = `<div class="error">${e.message || 'Başvurular yüklenemedi'}</div>`;
  } finally {
    showLoading(false);
  }
}

function renderDealershipApplications(items) {
  const root = document.getElementById('dealershipApplications');
  if (!Array.isArray(items) || items.length === 0) {
    root.innerHTML = '<div class="loading">Kayıt bulunamadı</div>';
    return;
  }
  const rows = items.map((it) => `
    <tr>
      <td><input type="checkbox" class="dealership-select" value="${safeString(it.id)}"/></td>
      <td>${safeString(it.companyName)}</td>
      <td>${safeString(it.fullName)}</td>
      <td>${safeString(it.phone)}</td>
      <td>${safeString(it.email)}</td>
      <td>${safeString(it.city)}</td>
      <td>${typeof it.estimatedMonthlyRevenue === 'number' ? it.estimatedMonthlyRevenue.toLocaleString('tr-TR') : '-'}</td>
      <td><span class="status-badge">${safeString(it.status || 'new')}</span></td>
      <td>
        <button class="btn-secondary" onclick="updateDealershipStatus(${safeString(it.id)}, 'reviewing')"><i class="fas fa-hourglass-half"></i></button>
        <button class="btn-secondary" onclick="updateDealershipStatus(${safeString(it.id)}, 'approved')"><i class="fas fa-check"></i></button>
        <button class="btn-secondary" onclick="updateDealershipStatus(${safeString(it.id)}, 'rejected')"><i class="fas fa-times"></i></button>
      </td>
      <td>${formatDate(it.createdAt || it.timestamp)}</td>
    </tr>
  `).join('');
  root.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th><input type="checkbox" id="dealership-select-all"/></th>
          <th>Firma</th>
          <th>Yetkili</th>
          <th>Telefon</th>
          <th>E-posta</th>
          <th>Şehir</th>
          <th>Aylık Ciro (TL)</th>
          <th>Durum</th>
          <th>İşlemler</th>
          <th>Başvuru Tarihi</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
  const all = document.getElementById('dealership-select-all');
  if (all) all.addEventListener('change', function(){
    document.querySelectorAll('.dealership-select').forEach(cb => { cb.checked = all.checked; });
  });
}

async function updateDealershipStatus(id, status){
  try {
    await apiRequest(`/dealership/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    showNotification('Durum güncellendi', 'success');
    loadDealershipApplications();
  } catch (e) {
    showNotification('Durum güncelleme hatası: ' + (e.message || ''), 'error');
  }
}

async function dealershipBatchUpdate(status){
  const ids = Array.from(document.querySelectorAll('.dealership-select:checked')).map(cb => cb.value);
  if (!ids.length) { showNotification('Lütfen kayıt seçin', 'error'); return; }
  try {
    await apiRequest('/dealership/applications/batch-status', { method: 'POST', body: JSON.stringify({ ids, status }) });
    showNotification('Toplu durum güncellendi', 'success');
    loadDealershipApplications();
  } catch (e) {
    showNotification('Toplu güncelleme hatası: ' + (e.message || ''), 'error');
  }
}

window.dealershipBatchUpdate = dealershipBatchUpdate;
window.updateDealershipStatus = updateDealershipStatus;

window.loadDealershipApplications = loadDealershipApplications;

// Products Functions
async function loadProducts() {
    try {
        showLoading(true);
        // Filtre parametrelerini oku
        const params = new URLSearchParams();
        const q = document.getElementById('productSearch');
        const brand = document.getElementById('productBrand');
        const minPrice = document.getElementById('minPrice');
        const maxPrice = document.getElementById('maxPrice');
        const stockStatus = document.getElementById('stockStatus');
        const hasVariations = document.getElementById('hasVariations');
        if (q && q.value) params.append('q', q.value.trim());
        if (brand && brand.value) params.append('brand', brand.value.trim());
        if (minPrice && minPrice.value) params.append('minPrice', minPrice.value);
        if (maxPrice && maxPrice.value) params.append('maxPrice', maxPrice.value);
        if (stockStatus && stockStatus.value) params.append('stock', stockStatus.value);
        if (hasVariations && hasVariations.value) params.append('variations', hasVariations.value);

        const url = params.toString() ? (`/admin/products?${params.toString()}`) : '/admin/products';
        const productsData = await apiRequest(url);
        
        if (productsData.success) {
            updateProductsTable(productsData.data);
            updateProductStats(productsData.data);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsTableBody').innerHTML = `
            <tr><td colspan="8" class="loading">Ürünler yüklenirken hata oluştu</td></tr>
        `;
    } finally {
        showLoading(false);
    }
}

function updateProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Ürün bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${safeString(product.id)}</td>
            <td>
                <div class="product-info">
                    <strong>${safeString(product.name)}</strong>
                    ${product.brand ? `<small>${safeString(product.brand)}</small>` : ''}
                </div>
            </td>
            <td>${safeString(product.category)}</td>
            <td class="product-price">${formatCurrency(product.price)} ₺</td>
            <td>
                <span class="stock-status ${getStockStatus(product.stock)}">${safeString(product.stock)}</span>
            </td>
            <td>
                ${product.hasVariations ? 
                    '<span class="variation-indicator"><i class="fas fa-layer-group"></i> Var</span>' : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>${formatDate(product.lastUpdated)}</td>
            <td>
                <div class="product-actions">
                    <button onclick="viewProduct(${product.id})" class="btn-secondary">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editProduct(${product.id})" class="btn-secondary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="btn-secondary">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateProductStats(products) {
    const totalProducts = products.length;
    const totalVariations = products.filter(p => p.hasVariations).length;
    const lowStock = products.filter(p => p.stock < 10).length;
    
    document.getElementById('totalProductsCount').textContent = totalProducts;
    document.getElementById('totalVariationsCount').textContent = totalVariations;
    document.getElementById('lowStockCount').textContent = lowStock;
}

function getStockStatus(stock) {
    if (stock === 0) return 'out';
    if (stock < 10) return 'low';
    if (stock < 50) return 'medium';
    return 'high';
}

// Ürün filtreleme butonları
function applyProductFilters(){
  loadProducts();
}
function clearProductFilters(){
  const ids = ['productSearch','productBrand','minPrice','maxPrice','stockStatus','hasVariations'];
  ids.forEach(id=>{ const el = document.getElementById(id); if(el){ if(el.tagName==='SELECT'){ el.value=''; } else { el.value=''; } } });
  loadProducts();
}
window.applyProductFilters = applyProductFilters;
window.clearProductFilters = clearProductFilters;

// Campaigns Functions
async function loadCampaigns() {
    try {
        showLoading(true);
        const qInput = document.getElementById('campaignSearch');
        const statusSel = document.getElementById('campaignStatusFilter');
        const sizeSel = document.getElementById('campaignPageSize');
        window.__campaignsPage = window.__campaignsPage || 1;
        const page = window.__campaignsPage;
        const pageSize = sizeSel && sizeSel.value ? parseInt(sizeSel.value) : 20;
        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        if (qInput && qInput.value) params.append('q', qInput.value.trim());
        if (statusSel && statusSel.value) params.append('status', statusSel.value);
        const campaignsData = await apiRequest('/campaigns?' + params.toString());
        
        if (campaignsData.success) {
            updateCampaignsTable(campaignsData.data);
            updateCampaignStats(campaignsData.data);
            if (campaignsData.meta) {
                const metaEl = document.getElementById('campaignsMeta');
                const pageInfo = document.getElementById('campaignsPageInfo');
                const totalPages = Math.max(1, Math.ceil((campaignsData.meta.total || 0) / (campaignsData.meta.pageSize || pageSize)));
                if (metaEl) metaEl.textContent = `Toplam: ${campaignsData.meta.total || 0}`;
                if (pageInfo) pageInfo.textContent = `${campaignsData.meta.page || page}/${totalPages}`;
                window.__campaignsTotalPages = totalPages;
            }
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
        const tbody = document.getElementById('campaignsTableBody');
        const msg = (error && (error.status === 401 || error.status === 403))
            ? 'Yetkilendirme gerekiyor. Lütfen ADMIN_TOKEN ayarlayın.'
            : 'Kampanyalar yüklenirken hata oluştu';
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="loading">${msg}</td></tr>`;
        if (error && error.message) showNotification('Kampanya API Hatası: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function nextCampaignPage(){
  window.__campaignsPage = Math.min((window.__campaignsTotalPages || 1), (window.__campaignsPage || 1) + 1);
  loadCampaigns();
}
function prevCampaignPage(){
  window.__campaignsPage = Math.max(1, (window.__campaignsPage || 1) - 1);
  loadCampaigns();
}
window.nextCampaignPage = nextCampaignPage;
window.prevCampaignPage = prevCampaignPage;

function updateCampaignsTable(campaigns) {
    const tbody = document.getElementById('campaignsTableBody');
    
    if (!campaigns || campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Kampanya bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = campaigns.map(campaign => `
        <tr>
            <td>${safeString(campaign.id)}</td>
            <td>
                <div class="campaign-info">
                    <strong>${safeString(campaign.name)}</strong>
                    ${campaign.description ? `<small>${safeString(campaign.description)}</small>` : ''}
                </div>
            </td>
            <td><span class="campaign-type ${campaign.type}">${getCampaignTypeText(campaign.type)}</span></td>
            <td><span class="status-badge ${campaign.status}">${getStatusText(campaign.status)}</span></td>
            <td>${safeString(campaign.segmentName, 'Tüm Müşteriler')}</td>
            <td>${formatDiscount(campaign.discountValue, campaign.discountType)}</td>
            <td>${safeString(campaign.usedCount)}/${safeString(campaign.usageLimit, '∞')}</td>
            <td>${formatDate(campaign.startDate)}</td>
            <td>
                <div class="campaign-actions">
                    <button onclick="viewCampaign(${campaign.id})" class="btn-secondary">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editCampaign(${campaign.id})" class="btn-secondary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCampaign(${campaign.id})" class="btn-secondary">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateCampaignStats(campaigns) {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalUsage = campaigns.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    
    document.getElementById('totalCampaignsCount').textContent = totalCampaigns;
    document.getElementById('activeCampaignsCount').textContent = activeCampaigns;
    document.getElementById('campaignUsageCount').textContent = totalUsage;
}

// Segments Functions
async function loadSegments() {
    try {
        showLoading(true);
        const segmentsData = await apiRequest('/campaigns/segments');
        
        if (segmentsData.success) {
            updateSegmentsTable(segmentsData.data);
            updateSegmentStats(segmentsData.data);
        }
    } catch (error) {
        console.error('Error loading segments:', error);
        const tbody = document.getElementById('segmentsTableBody');
        const msg = (error && (error.status === 401 || error.status === 403))
            ? 'Yetkilendirme gerekiyor. Lütfen ADMIN_TOKEN ayarlayın.'
            : 'Segmentler yüklenirken hata oluştu';
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="loading">${msg}</td></tr>`;
        if (error && error.message) showNotification('Segment API Hatası: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function updateSegmentsTable(segments) {
    const tbody = document.getElementById('segmentsTableBody');
    
    if (!segments || segments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Segment bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = segments.map(segment => `
        <tr>
            <td>${safeString(segment.id)}</td>
            <td>
                <div class="segment-info">
                    <strong>${safeString(segment.name)}</strong>
                </div>
            </td>
            <td>${safeString(segment.description, 'Açıklama yok')}</td>
            <td>
                <div class="criteria-preview">
                    ${Object.entries(segment.criteria).map(([key, value]) => 
                        `<span class="criteria-tag">${getCriteriaLabel(key)}: ${value}</span>`
                    ).join('')}
                </div>
            </td>
            <td>${safeString(segment.customerCount, '0')}</td>
            <td><span class="status-badge ${segment.isActive ? 'active' : 'paused'}">${segment.isActive ? 'Aktif' : 'Pasif'}</span></td>
            <td>${formatDate(segment.createdAt)}</td>
            <td>
                <div class="segment-actions">
                    <button onclick="viewSegment(${segment.id})" class="btn-secondary">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editSegment(${segment.id})" class="btn-secondary">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteSegment(${segment.id})" class="btn-secondary">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateSegmentStats(segments) {
    const totalSegments = segments.length;
    const totalCustomers = segments.reduce((sum, s) => sum + (s.customerCount || 0), 0);
    
    document.getElementById('totalSegmentsCount').textContent = totalSegments;
    document.getElementById('totalCustomersInSegments').textContent = totalCustomers;
}

// Analytics Functions
let __analyticsInflight = null;
async function loadAnalytics() {
    try {
        showLoading(true);
        const rangeSel = document.getElementById('analyticsRange');
        const q = rangeSel && rangeSel.value ? `?range=${encodeURIComponent(rangeSel.value)}` : '';
        if (__analyticsInflight) { try { await __analyticsInflight; } catch(_){} }
        // Load analytics data (gerçek veriler, mock yok)
        const promise = Promise.allSettled([
            apiRequest('/campaigns/segments' + q),
            apiRequest('/campaigns' + q),
            apiRequest('/admin/products' + q)
        ]);
        __analyticsInflight = promise;
        const [segmentRes, campaignRes, productRes] = await promise;
        __analyticsInflight = null;

        if (segmentRes.status !== 'fulfilled' || !segmentRes.value?.success) {
            throw Object.assign(new Error('Segment verileri alınamadı'), { endpoint: '/campaigns/segments' });
        }
        if (campaignRes.status !== 'fulfilled' || !campaignRes.value?.success) {
            throw Object.assign(new Error('Kampanya verileri alınamadı'), { endpoint: '/campaigns' });
        }
        if (productRes.status !== 'fulfilled' || !productRes.value?.success) {
            throw Object.assign(new Error('Ürün verileri alınamadı'), { endpoint: '/admin/products' });
        }

        const segments = segmentRes.value.data || [];
        const campaigns = campaignRes.value.data || [];
        const products = productRes.value.data || [];

        // cache optional aggregate for charts
        window.__lastChartData = {
          categorySales: Array.isArray(products) ? aggregateCategorySales(products) : []
        };

        createSegmentDistributionChart(segments);
        createCampaignPerformanceChart(campaigns);
        updateCampaignPerformanceTable(campaigns);
        createCategoryDistributionChart(products);
        createStockStatusChart(products);
        updateTopProductsTable(products);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        const msg = (error && (error.status === 401 || error.status === 403))
            ? 'Analitik için yetkilendirme gerekiyor. Lütfen Ayarlar > Tenant API Key alanını doldurun.'
            : `Analitik veriler yüklenirken hata oluştu${error?.endpoint ? ` (${error.endpoint})` : ''}`;
        showNotification(msg + (error && error.message ? ` (${error.message})` : ''), 'error');
    } finally {
        showLoading(false);
    }
}

// Refresh Functions
function refreshUsers() {
    loadUsers();
}

function refreshOrders() {
    loadOrders();
}

function refreshProducts() {
    loadProducts();
}

function refreshCampaigns() {
    loadCampaigns();
}

function refreshSegments() {
    loadSegments();
}

function refreshAnalytics() {
    loadAnalytics();
}

function refreshTenants() {
    loadTenants();
}

function refreshDashboard() {
    loadDashboardData();
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.warn('Invalid date string:', dateString);
        return '-';
    }
}

// ===== Chatbot Admin =====
async function loadChatbotConfig(){
  try{
    showLoading(true);
    const res = await apiRequest('/admin/chatbot/config');
    const data = res && res.success ? res.data : getMockChatbotConfig();
    setChatbotForm(data);
    renderFaqTable(data.faq || []);
  }catch(e){
    const data = getMockChatbotConfig();
    setChatbotForm(data);
    renderFaqTable(data.faq || []);
    showNotification('Chatbot ayarları mock ile yüklendi', 'info');
  }finally{
    showLoading(false);
  }
}

async function saveChatbotConfig(){
  try{
    const payload = collectChatbotForm();
    await apiRequest('/admin/chatbot/config', { method:'PUT', body: JSON.stringify(payload) });
    showNotification('Chatbot ayarları kaydedildi', 'success');
  }catch(e){
    showNotification('Kaydetme başarısız, lütfen tekrar deneyin', 'error');
  }
}

function collectChatbotForm(){
  return {
    enabled: document.getElementById('cbEnabled') ? (document.getElementById('cbEnabled').value === 'true') : true,
    defaultLang: document.getElementById('cbDefaultLang') ? document.getElementById('cbDefaultLang').value : 'tr',
    welcome: document.getElementById('cbWelcome') ? document.getElementById('cbWelcome').value : 'Merhaba!'
    ,faq: window.__cbFaq || []
  };
}

function setChatbotForm(cfg){
  const en = document.getElementById('cbEnabled'); if(en) en.value = String(!!cfg.enabled);
  const lang = document.getElementById('cbDefaultLang'); if(lang) lang.value = cfg.defaultLang || 'tr';
  const wel = document.getElementById('cbWelcome'); if(wel) wel.value = cfg.welcome || 'Merhaba!';
  window.__cbFaq = (cfg.faq || []).slice();
}

function renderFaqTable(list){
  const tbody = document.getElementById('faqTableBody');
  if(!tbody) return;
  if(!list || list.length===0){ tbody.innerHTML = '<tr><td colspan="3" class="loading">Kayıt yok</td></tr>'; return; }
  tbody.innerHTML = list.map((x,idx)=>`
    <tr>
      <td>${safeString(x.q)}</td>
      <td>${safeString(x.a)}</td>
      <td>
        <button class="btn-secondary" onclick="editFaqItem(${idx})"><i class="fas fa-edit"></i></button>
        <button class="btn-secondary" onclick="removeFaqItem(${idx})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function addFaqItem(){
  const q = document.getElementById('faqQ');
  const a = document.getElementById('faqA');
  if(!q || !a || !q.value || !a.value){ showNotification('Soru ve cevap zorunlu', 'error'); return; }
  window.__cbFaq = window.__cbFaq || [];
  window.__cbFaq.push({ q: q.value.trim(), a: a.value.trim() });
  q.value = ''; a.value = '';
  renderFaqTable(window.__cbFaq);
}

function editFaqItem(index){
  const item = (window.__cbFaq || [])[index];
  if(!item) return;
  const newQ = prompt('Soru', item.q);
  if(newQ === null) return;
  const newA = prompt('Cevap', item.a);
  if(newA === null) return;
  window.__cbFaq[index] = { q: newQ, a: newA };
  renderFaqTable(window.__cbFaq);
}

function removeFaqItem(index){
  if(!confirm('Silmek istiyor musunuz?')) return;
  (window.__cbFaq || []).splice(index,1);
  renderFaqTable(window.__cbFaq);
}

function getMockChatbotConfig(){
  return {
    enabled: true,
    defaultLang: 'tr',
    welcome: 'Merhaba! Size nasıl yardımcı olabilirim?',
    faq: [
      { q: 'Kargo ne zaman gelir?', a: 'Siparişler 1-3 iş günü içinde kargoya verilir.' },
      { q: 'İade şartları nelerdir?', a: '14 gün içinde koşulsuz iade hakkınız vardır.' }
    ]
  };
}

window.loadChatbotConfig = loadChatbotConfig;
window.saveChatbotConfig = saveChatbotConfig;
window.addFaqItem = addFaqItem;
window.editFaqItem = editFaqItem;
window.removeFaqItem = removeFaqItem;

// ===== OpenWebUI-like Chat =====
async function sendChatMessage(){
  const input = document.getElementById('chatInput');
  const messagesEl = document.getElementById('chatMessages');
  if(!input || !messagesEl || !input.value) return;
  const content = input.value; input.value = '';
  appendChat('user', content);
  try{
    const payload = buildChatPayload(content);
    const resp = await chatRequest(payload);
    const text = (resp && resp.message) || (resp && resp.choices && resp.choices[0] && (resp.choices[0].message?.content || resp.choices[0].delta?.content)) || 'Yanıt alınamadı.';
    appendChat('assistant', text);
  }catch(e){
    appendChat('assistant', 'Mock yanıt: Şu an sunucuya bağlanamıyorum, lütfen daha sonra tekrar deneyin.');
  }
}

function buildChatPayload(userText){
  const model = document.getElementById('llmModel')?.value || 'gpt-4o-mini';
  const system = document.getElementById('llmSystem')?.value || '';
  const temperature = parseFloat(document.getElementById('llmTemp')?.value || '0.7');
  const max_tokens = parseInt(document.getElementById('llmMaxTokens')?.value || '512', 10);
  const history = window.__chatHistory || [];
  const messages = [];
  if(system) messages.push({ role:'system', content: system });
  history.forEach(m=>messages.push(m));
  messages.push({ role:'user', content: userText });
  window.__chatHistory = history.concat([{ role:'user', content: userText }]);
  return { model, messages, temperature, max_tokens };
}

async function chatRequest(payload){
  // 1) Öncelik: backend proxy (varsa)
  try{
    const res = await apiRequest('/admin/chatbot/chat', { method:'POST', body: JSON.stringify(payload) });
    if(res && res.success && res.data){
      window.__chatHistory.push({ role:'assistant', content: res.data.message });
      return { message: res.data.message };
    }
  }catch(e){ /* proxy başarısız olabilir, aşağıda doğrudan LLM çağrısı denenir */ }

  // 2) Doğrudan LLM sağlayıcıya istek (AI ayarlarına göre)
  try{
    const s = JSON.parse(localStorage.getItem('aiSettings') || '{}');
    const serverUrl = (s.serverUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const apiKey = s.apiKey || '';
    const model = payload.model || s.defaultModel || 'gpt-4o-mini';
    const body = { ...payload, model };

    const resp = await fetch(`${serverUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(body)
    });

    if(resp.ok){
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.delta?.content || '';
      const answer = text || 'Yanıt boş döndü.';
      window.__chatHistory.push({ role:'assistant', content: answer });
      return { message: answer };
    }
  }catch(e){ /* doğrudan çağrı da başarısızsa mock'a düş */ }

  // 3) Mock fallback
  const mock = `Bu bir demo yanıtıdır. Model: ${payload.model}.`;
  window.__chatHistory.push({ role:'assistant', content: mock });
  return { message: mock };
}

function appendChat(role, text){
  const wrap = document.getElementById('chatMessages');
  if(!wrap) return;
  const div = document.createElement('div');
  div.className = `chat-bubble ${role==='user' ? 'chat-user' : 'chat-assistant'}`;
  div.textContent = text;
  wrap.appendChild(div);
  const win = document.getElementById('chatWindow');
  if(win) win.scrollTop = win.scrollHeight;
}

function clearChat(){
  window.__chatHistory = [];
  const wrap = document.getElementById('chatMessages');
  if(wrap) wrap.innerHTML = '';
}

window.sendChatMessage = sendChatMessage;
window.clearChat = clearChat;
// ===== AI Settings (for AI page) =====
function loadAiSettings(){
  const s = JSON.parse(localStorage.getItem('aiSettings') || '{}');
  const defModel = document.getElementById('aiDefaultModel'); if(defModel && s.defaultModel) defModel.value = s.defaultModel;
  const key = document.getElementById('aiApiKey'); if(key && s.apiKey) key.value = s.apiKey;
  const url = document.getElementById('aiServerUrl'); if(url && s.serverUrl) url.value = s.serverUrl;
}

function saveAiSettings(){
  const s = {
    defaultModel: document.getElementById('aiDefaultModel')?.value || 'gpt-4o-mini',
    apiKey: document.getElementById('aiApiKey')?.value || '',
    serverUrl: document.getElementById('aiServerUrl')?.value || 'https://api.openai.com/v1'
  };
  localStorage.setItem('aiSettings', JSON.stringify(s));
  showNotification('Yapay zeka ayarları kaydedildi', 'success');
}

window.loadAiSettings = loadAiSettings;
window.saveAiSettings = saveAiSettings;
function formatCurrency(value, decimals = 2) {
    try {
        const num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return num.toFixed(decimals);
    } catch (error) {
        console.warn('Invalid currency value:', value);
        return '0.00';
    }
}

function safeString(value, defaultValue = '-') {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    return String(value);
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Beklemede',
        'processing': 'İşleniyor',
        'shipped': 'Kargoda',
        'delivered': 'Teslim Edildi',
        'cancelled': 'İptal'
    };
    
    return statusTexts[status] || status;
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else if (type === 'error') {
        notification.style.background = '#dc3545';
    } else {
        notification.style.background = '#17a2b8';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Auth utils
function logoutAdmin() {
    try {
        localStorage.removeItem('ADMIN_KEY');
    } catch (_) {}
    window.location.href = 'login.html';
}
window.logoutAdmin = logoutAdmin;

// Order Details Modal Functions
async function showOrderDetails(orderId) {
    try {
        showLoading(true);
        
        // Get order details
        const orderData = await apiRequest(`/admin/orders/${orderId}`);
        
        if (orderData.success) {
            displayOrderModal(orderData.data);
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        showNotification('Sipariş detayları yüklenirken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

function displayOrderModal(order) {
    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('orderModalBody');
    
    let productsHtml = '';
    if (order.items && order.items.length > 0) {
        productsHtml = `
            <div class="order-products-detail">
                <h4>Sipariş Edilen Ürünler (${order.items.length} adet)</h4>
                ${order.items.map(item => `
                    <div class="product-detail-item">
                        ${item.productImage ? 
                            `<img src="${item.productImage}" alt="${item.productName}" class="product-image" onerror="this.style.display='none'">` : 
                            '<div class="product-image" style="background: #f0f2f5; display: flex; align-items: center; justify-content: center; color: #999;"><i class="fas fa-image"></i></div>'
                        }
                        <div class="product-detail-info">
                            <div class="product-detail-name">${safeString(item.productName)}</div>
                            <div class="product-detail-meta">
                                <span>Adet: ${safeString(item.quantity)}</span>
                                <span>Birim Fiyat: ${formatCurrency(item.price)} ₺</span>
                                <span>Toplam: ${formatCurrency(parseFloat(item.price) * parseFloat(item.quantity))} ₺</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div class="order-detail-item">
            <span class="order-detail-label">Sipariş ID:</span>
            <span class="order-detail-value">#${safeString(order.id)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Müşteri:</span>
            <span class="order-detail-value">${safeString(order.userName)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Email:</span>
            <span class="order-detail-value">${safeString(order.userEmail)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Durum:</span>
            <span class="order-detail-value">
                <span class="status-badge ${safeString(order.status, 'pending')}">${getStatusText(order.status)}</span>
            </span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Toplam Tutar:</span>
            <span class="order-detail-value" style="font-weight: 600; color: #28a745; font-size: 16px;">
                ${formatCurrency(order.totalAmount)} ₺
            </span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Ödeme Yöntemi:</span>
            <span class="order-detail-value">${safeString(order.paymentMethod)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Şehir:</span>
            <span class="order-detail-value">${safeString(order.city)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">İlçe:</span>
            <span class="order-detail-value">${safeString(order.district)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Tam Adres:</span>
            <span class="order-detail-value">${safeString(order.fullAddress || order.shippingAddress)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Sipariş Tarihi:</span>
            <span class="order-detail-value">${formatDate(order.createdAt)}</span>
        </div>
        <div class="order-detail-item">
            <span class="order-detail-label">Tenant:</span>
            <span class="order-detail-value">${safeString(order.tenantName)}</span>
        </div>
        ${productsHtml}
    `;
    
    modal.classList.remove('hidden');
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    modal.classList.add('hidden');
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeOrderModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeOrderModal();
    }
});

// Helper Functions
function getCampaignTypeText(type) {
    const typeMap = {
        'discount': 'İndirim',
        'free_shipping': 'Ücretsiz Kargo',
        'bundle': 'Paket Kampanyası',
        'loyalty': 'Sadakat Programı',
        'seasonal': 'Mevsimsel',
        'birthday': 'Doğum Günü',
        'abandoned_cart': 'Terk Edilen Sepet'
    };
    return typeMap[type] || type;
}

function formatDiscount(value, type) {
    if (!value) return '-';
    if (type === 'percentage') return `${value}%`;
    if (type === 'fixed') return `${value} ₺`;
    return value;
}

function getCriteriaLabel(key) {
    const labelMap = {
        'minOrders': 'Min Sipariş',
        'maxOrders': 'Max Sipariş',
        'minSpent': 'Min Harcama',
        'maxSpent': 'Max Harcama',
        'lastOrderDays': 'Son Sipariş',
        'rfmScore': 'RFM Skoru'
    };
    return labelMap[key] || key;
}

// Modal Functions
function openCreateCampaignModal() {
    document.getElementById('createCampaignModal').classList.remove('hidden');
    loadSegmentsForSelect();
}

function openCreateSegmentModal() {
    document.getElementById('createSegmentModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

async function loadSegmentsForSelect() {
    try {
        const segmentsData = await apiRequest('/campaigns/segments');
        const select = document.getElementById('targetSegment');
        
        if (segmentsData.success) {
            select.innerHTML = '<option value="">Tüm Müşteriler</option>';
            segmentsData.data.forEach(segment => {
                const option = document.createElement('option');
                option.value = segment.id;
                option.textContent = segment.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading segments for select:', error);
    }
}

// Chart Functions
function createSegmentDistributionChart(segments) {
    const el = document.getElementById('segmentDistributionChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (window.segmentDistributionChart) {
        try { window.segmentDistributionChart.destroy(); } catch(_) {}
    }
    const labels = segments.map(s => s.name);
    const data = segments.map(s => s.customerCount || 0);
    window.segmentDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function createCampaignPerformanceChart(campaigns) {
    const el = document.getElementById('campaignPerformanceChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (window.campaignPerformanceChart) {
        try { window.campaignPerformanceChart.destroy(); } catch(_) {}
    }
    const labels = campaigns.map(c => c.name);
    const data = campaigns.map(c => c.usedCount || 0);
    window.campaignPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Kullanım Sayısı', data, backgroundColor: '#667eea' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function createCategoryDistributionChart(products) {
    const el = document.getElementById('categoryDistributionChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (window.categoryDistributionChartAnalytics) {
        try { window.categoryDistributionChartAnalytics.destroy(); } catch(_) {}
    }
    if (window.__lastChartData && Array.isArray(window.__lastChartData.categorySales) && window.__lastChartData.categorySales.length > 0) {
        const labels = window.__lastChartData.categorySales.map(c => c.category || 'Diğer');
        const data = window.__lastChartData.categorySales.map(c => c.revenue);
        window.categoryDistributionChartAnalytics = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: ['#667eea','#764ba2','#f093fb','#f5576c','#4facfe','#43e97b','#38f9d7'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }
    const categoryCount = {};
    products.forEach(p => { categoryCount[p.category] = (categoryCount[p.category] || 0) + 1; });
    const labelsFallback = Object.keys(categoryCount);
    const dataFallback = Object.values(categoryCount);
    window.categoryDistributionChartAnalytics = new Chart(ctx, { type: 'pie', data: { labels: labelsFallback, datasets: [{ data: dataFallback, backgroundColor: ['#667eea','#764ba2','#f093fb','#f5576c','#4facfe'] }] }, options: { responsive: true, maintainAspectRatio: false } });
}

function createStockStatusChart(products) {
    const el = document.getElementById('stockStatusChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (window.stockStatusChartAnalytics) {
        try { window.stockStatusChartAnalytics.destroy(); } catch(_) {}
    }
    const stockStatus = {
        'Yüksek': products.filter(p => p.stock >= 50).length,
        'Orta': products.filter(p => p.stock >= 10 && p.stock < 50).length,
        'Düşük': products.filter(p => p.stock > 0 && p.stock < 10).length,
        'Tükendi': products.filter(p => p.stock === 0).length
    };
    window.stockStatusChartAnalytics = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(stockStatus), datasets: [{ data: Object.values(stockStatus), backgroundColor: ['#28a745', '#ffc107', '#fd7e14', '#dc3545'] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateTopProductsTable(products) {
    const tbody = document.getElementById('topProductsTableBody');
    
    // Sort by stock (assuming higher stock = more popular)
    const sortedProducts = products.sort((a, b) => b.stock - a.stock).slice(0, 5);
    
    tbody.innerHTML = sortedProducts.map(product => `
        <tr>
            <td>${safeString(product.name)}</td>
            <td>${safeString(product.stock)}</td>
            <td>${formatCurrency(product.price * product.stock)} ₺</td>
            <td>${safeString(product.category)}</td>
        </tr>
    `).join('');
}

function updateCampaignPerformanceTable(campaigns) {
    const tbody = document.getElementById('campaignPerformanceTableBody');
    
    tbody.innerHTML = campaigns.map(campaign => `
        <tr>
            <td>${safeString(campaign.name)}</td>
            <td>${safeString(campaign.usedCount)}</td>
            <td>${((campaign.usedCount / (campaign.usageLimit || 1)) * 100).toFixed(1)}%</td>
            <td>${formatCurrency(campaign.usedCount * (campaign.discountValue || 0))} ₺</td>
        </tr>
    `).join('');
}

// ===== Mock Data Helpers =====
function getMockSegments(){
  return [
    { id: 1, name: 'Yüksek Değer', customerCount: 120 },
    { id: 2, name: 'Sık Alışveriş', customerCount: 260 },
    { id: 3, name: 'Yeni Müşteri', customerCount: 180 },
    { id: 4, name: 'İndirim Avcısı', customerCount: 95 },
  ];
}

function getMockCampaigns(){
  return [
    { id: 101, name: 'Eylül %10', usedCount: 340, type: 'discount', status: 'active', usageLimit: 2000, discountValue: 10, discountType: 'percentage' },
    { id: 102, name: 'Kargo Bedava', usedCount: 190, type: 'free_shipping', status: 'active', usageLimit: 1200, discountValue: 0, discountType: 'fixed' },
    { id: 103, name: '3 Al 2 Öde', usedCount: 75, type: 'bundle', status: 'paused', usageLimit: 800, discountValue: 1, discountType: 'buy_x_get_y' },
  ];
}

function getMockProducts(){
  const categories = ['Giyim','Outdoor','Mutfak','Elektronik','Aksesuar'];
  const products = [];
  for(let i=1;i<=25;i++){
    products.push({
      id: i,
      name: `Mock Ürün ${i}`,
      brand: i%2===0 ? 'HGL' : 'N/A',
      category: categories[i % categories.length],
      price: Math.round((100 + Math.random()*900)*100)/100,
      stock: Math.floor(Math.random()*120),
      hasVariations: i%3===0,
      lastUpdated: new Date().toISOString()
    });
  }
  return products;
}

function aggregateCategorySales(products){
  const map = new Map();
  products.forEach(p=>{
    const key = p.category || 'Diğer';
    const prev = map.get(key) || 0;
    map.set(key, prev + (p.price * Math.max(1, Math.min(5, Math.floor(p.stock/10)))));
  });
  return Array.from(map.entries()).map(([category, revenue])=>({category, revenue: Number(revenue.toFixed(2))}));
}

// Product Detail Functions
let currentProductId = null;

function viewProduct(id) {
    console.log('View product:', id);
    currentProductId = id;
    showProductDetail(id);
}

function showProductDetail(productId) {
    try {
        showLoading(true);
        
        // Show product detail section
        showSection('product-detail');
        
        // Load product details
        loadProductDetail(productId);
        
    } catch (error) {
        console.error('Error showing product detail:', error);
        showNotification('Ürün detayları yüklenirken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadProductDetail(productId) {
    try {
        console.log('📦 Loading product detail for ID:', productId);
        
        // Get product details
        const productData = await apiRequest(`/admin/products/${productId}`);
        
        if (productData.success) {
            displayProductDetail(productData.data);
        } else {
            throw new Error(productData.message || 'Ürün bulunamadı');
        }
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        showNotification('Ürün detayları yüklenirken hata oluştu: ' + error.message, 'error');
    }
}

function displayProductDetail(product) {
    console.log('📦 Displaying product detail:', product);
    
    // Update basic product info
    document.getElementById('productDetailId').textContent = product.id;
    document.getElementById('productDetailName').textContent = product.name || 'Ürün Adı';
    document.getElementById('productDetailCategory').textContent = product.category || '-';
    document.getElementById('productDetailBrand').textContent = product.brand || '-';
    document.getElementById('productDetailPrice').textContent = formatCurrency(product.price) + ' ₺';
    document.getElementById('productDetailStock').textContent = product.stock || '0';
    document.getElementById('productDetailDescription').textContent = product.description || 'Açıklama bulunmuyor';
    
    // Update product image
    const productImage = document.getElementById('productDetailImage');
    if (product.image) {
        productImage.src = product.image;
    } else {
        productImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMmY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Load additional data
    loadProductVariations(product.id);
    loadProductOrders(product.id);
    loadProductAnalytics(product.id);
}

async function loadProductVariations(productId) {
    try {
        // This would typically come from an API endpoint
        // For now, we'll show a placeholder
        const variationsList = document.getElementById('productVariationsList');
        variationsList.innerHTML = '<p class="no-data">Varyasyon verisi henüz mevcut değil</p>';
    } catch (error) {
        console.error('Error loading product variations:', error);
    }
}

async function loadProductOrders(productId) {
    try {
        // This would typically come from an API endpoint
        // For now, we'll show a placeholder
        const ordersList = document.getElementById('productOrdersList');
        ordersList.innerHTML = '<p class="no-data">Sipariş verisi henüz mevcut değil</p>';
    } catch (error) {
        console.error('Error loading product orders:', error);
    }
}

async function loadProductAnalytics(productId) {
    try {
        // This would typically come from an API endpoint
        // For now, we'll show placeholder data
        document.getElementById('totalSales').textContent = '0';
        document.getElementById('totalRevenue').textContent = '0 ₺';
        document.getElementById('averageRating').textContent = 'N/A';
        document.getElementById('viewCount').textContent = '0';
    } catch (error) {
        console.error('Error loading product analytics:', error);
    }
}

function goBackToProducts() {
    showSection('products');
    currentProductId = null;
}

function editProductDetail() {
    if (!currentProductId) {
        showNotification('Ürün seçilmedi', 'error');
        return;
    }
    
    openEditProductModal(currentProductId);
}

function deleteProductDetail() {
    if (!currentProductId) {
        showNotification('Ürün seçilmedi', 'error');
        return;
    }
    
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        deleteProduct(currentProductId);
    }
}

function showProductTab(tabName) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab panel
    const selectedPanel = document.getElementById(tabName + '-tab');
    if (selectedPanel) {
        selectedPanel.classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Placeholder functions for future implementation
function editProduct(id) {
    console.log('Edit product:', id);
    currentProductId = id;
    openEditProductModal(id);
}

function viewCampaign(id) {
    console.log('View campaign:', id);
    showNotification('Kampanya detayları yakında eklenecek', 'info');
}

function editCampaign(id) {
    console.log('Edit campaign:', id);
    showNotification('Kampanya düzenleme yakında eklenecek', 'info');
}

function deleteCampaign(id) {
    if (confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
        console.log('Delete campaign:', id);
        showNotification('Kampanya silme yakında eklenecek', 'info');
    }
}

function viewSegment(id) {
    console.log('View segment:', id);
    showNotification('Segment detayları yakında eklenecek', 'info');
}

function editSegment(id) {
    console.log('Edit segment:', id);
    showNotification('Segment düzenleme yakında eklenecek', 'info');
}

function deleteSegment(id) {
    if (confirm('Bu segmenti silmek istediğinizden emin misiniz?')) {
        console.log('Delete segment:', id);
        showNotification('Segment silme yakında eklenecek', 'info');
    }
}

async function createAutomaticSegments() {
    try {
        showLoading(true);
        await apiRequest('/campaigns/segments/auto-create', { method: 'POST' });
        showNotification('Otomatik segmentler oluşturuldu', 'success');
        loadSegments();
    } catch (error) {
        console.error('Error creating automatic segments:', error);
        showNotification('Otomatik segmentler oluşturulurken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

// Form Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Campaign form handler
    const campaignForm = document.getElementById('createCampaignForm');
    if (campaignForm) {
        campaignForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const campaignData = Object.fromEntries(formData.entries());
            
            try {
                showLoading(true);
                await apiRequest('/campaigns', {
                    method: 'POST',
                    body: JSON.stringify(campaignData)
                });
                
                showNotification('Kampanya başarıyla oluşturuldu', 'success');
                closeModal('createCampaignModal');
                loadCampaigns();
            } catch (error) {
                console.error('Error creating campaign:', error);
                showNotification('Kampanya oluşturulurken hata oluştu', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
    
    // Segment form handler
    const segmentForm = document.getElementById('createSegmentForm');
    if (segmentForm) {
        segmentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const segmentData = {
                name: formData.get('name'),
                description: formData.get('description'),
                criteria: {
                    minOrders: formData.get('minOrders') ? parseInt(formData.get('minOrders')) : undefined,
                    maxOrders: formData.get('maxOrders') ? parseInt(formData.get('maxOrders')) : undefined,
                    minSpent: formData.get('minSpent') ? parseFloat(formData.get('minSpent')) : undefined,
                    maxSpent: formData.get('maxSpent') ? parseFloat(formData.get('maxSpent')) : undefined,
                    lastOrderDays: formData.get('lastOrderDays') ? parseInt(formData.get('lastOrderDays')) : undefined
                }
            };
            
            // Remove undefined values
            Object.keys(segmentData.criteria).forEach(key => {
                if (segmentData.criteria[key] === undefined) {
                    delete segmentData.criteria[key];
                }
            });
            
            try {
                showLoading(true);
                await apiRequest('/campaigns/segments', {
                    method: 'POST',
                    body: JSON.stringify(segmentData)
                });
                
                showNotification('Segment başarıyla oluşturuldu', 'success');
                closeModal('createSegmentModal');
                loadSegments();
            } catch (error) {
                console.error('Error creating segment:', error);
                showNotification('Segment oluşturulurken hata oluştu', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
});

// ==================== FLASH DEALS FUNCTIONS ====================

let categories = [];
let products = [];

// Load categories and products for flash deal target selection
async function loadCategoriesAndProducts() {
    try {
        console.log('📂 Loading categories and products for flash deal...');
        
        // Load categories
        const categoriesData = await apiRequest('/admin/categories');
        if (categoriesData.success) {
            categories = categoriesData.data;
            console.log('📂 Categories loaded:', categories.length);
        } else {
            console.error('Failed to load categories:', categoriesData.message);
        }
        
        // Load products
        const productsData = await apiRequest('/admin/products');
        if (productsData.success) {
            products = productsData.data;
            console.log('📦 Products loaded:', products.length);
        } else {
            console.error('Failed to load products:', productsData.message);
        }
    } catch (error) {
        console.error('Error loading categories and products:', error);
        showNotification('Kategori ve ürün bilgileri yüklenirken hata oluştu', 'error');
    }
}

// Update discount input suffix based on type
function updateDiscountInput() {
    const discountType = document.getElementById('flashDealDiscountType').value;
    const suffix = document.getElementById('discountValueSuffix');
    
    if (discountType === 'percentage') {
        suffix.textContent = '%';
        document.getElementById('flashDealDiscountValue').max = 100;
    } else if (discountType === 'fixed') {
        suffix.textContent = '₺';
        document.getElementById('flashDealDiscountValue').max = 999999;
    }
}

// Update target selection based on target type
function updateTargetSelection() {
    const targetType = document.getElementById('flashDealTargetType').value;
    const targetSelect = document.getElementById('flashDealTargetId');
    
    console.log('🎯 Updating target selection for type:', targetType);
    console.log('📂 Available categories:', categories.length);
    console.log('📦 Available products:', products.length);
    
    // Clear existing options
    targetSelect.innerHTML = '<option value="">Seçiniz</option>';
    
    if (targetType === 'category') {
        targetSelect.disabled = false;
        if (categories.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Kategori bulunamadı';
            option.disabled = true;
            targetSelect.appendChild(option);
        } else {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                targetSelect.appendChild(option);
            });
        }
    } else if (targetType === 'product') {
        targetSelect.disabled = false;
        if (products.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Ürün bulunamadı';
            option.disabled = true;
            targetSelect.appendChild(option);
        } else {
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                targetSelect.appendChild(option);
            });
        }
    } else {
        targetSelect.disabled = true;
    }
}

// Open flash deal modal
async function openCreateFlashDealModal() {
    try {
        // Set default dates
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('flashDealStartDate').value = tomorrow.toISOString().slice(0, 16);
        document.getElementById('flashDealEndDate').value = nextWeek.toISOString().slice(0, 16);
        
        // Show modal first
        document.getElementById('createFlashDealModal').classList.remove('hidden');
        
        // Show loading
        showLoading(true);
        
        // Load categories and products
        await loadCategoriesAndProducts();
        
        // Reset form
        document.getElementById('createFlashDealForm').reset();
        document.getElementById('flashDealTargetId').disabled = true;
        document.getElementById('flashDealTargetId').innerHTML = '<option value="">Önce hedef türü seçin</option>';
        
    } catch (error) {
        console.error('Error opening flash deal modal:', error);
        showNotification('Flash indirim modal\'ı açılırken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
}

// Show campaign tab
function showCampaignTab(tabName) {
    // Hide all tab panels
    document.querySelectorAll('#campaigns-section .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('#campaigns-section .tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab panel
    const selectedPanel = document.getElementById(tabName + '-campaigns-tab');
    if (selectedPanel) {
        selectedPanel.classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for the selected tab
    if (tabName === 'flash') {
        loadFlashDeals();
    }
}

// Load flash deals
async function loadFlashDeals() {
    try {
        console.log('⚡ Loading flash deals');
        showLoading(true);
        
        const response = await apiRequest('/admin/flash-deals');
        
        if (response.success) {
            displayFlashDeals(response.data);
            updateFlashDealsStats(response.data);
        } else {
            throw new Error(response.message || 'Flash indirimleri yüklenemedi');
        }
    } catch (error) {
        console.error('Error loading flash deals:', error);
        showNotification('Flash indirimleri yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Display flash deals in table
function displayFlashDeals(flashDeals) {
    const tbody = document.getElementById('flashDealsTableBody');
    
    if (flashDeals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">Flash indirim bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = flashDeals.map(deal => {
        const now = new Date();
        const startDate = new Date(deal.start_date);
        const endDate = new Date(deal.end_date);
        
        let status = 'Beklemede';
        let statusClass = 'pending';
        
        if (deal.is_active) {
            if (now >= startDate && now <= endDate) {
                status = 'Aktif';
                statusClass = 'active';
            } else if (now > endDate) {
                status = 'Süresi Dolmuş';
                statusClass = 'expired';
            }
        } else {
            status = 'Pasif';
            statusClass = 'inactive';
        }
        
        const discountValue = deal.discount_type === 'percentage' 
            ? `%${deal.discount_value}` 
            : `${deal.discount_value} ₺`;
        
        return `
            <tr>
                <td>${deal.id}</td>
                <td>${deal.name}</td>
                <td>${deal.discount_type === 'percentage' ? 'Yüzde' : 'Sabit Tutar'}</td>
                <td>${discountValue}</td>
                <td>${deal.target_name || '-'}</td>
                <td>${formatDateTime(deal.start_date)}</td>
                <td>${formatDateTime(deal.end_date)}</td>
                <td><span class="status ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn-sm btn-primary" onclick="editFlashDeal(${deal.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteFlashDeal(${deal.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update flash deals statistics
function updateFlashDealsStats(flashDeals) {
    const totalCount = flashDeals.length;
    const activeCount = flashDeals.filter(deal => {
        const now = new Date();
        const startDate = new Date(deal.start_date);
        const endDate = new Date(deal.end_date);
        return deal.is_active && now >= startDate && now <= endDate;
    }).length;
    
    const averageDiscount = flashDeals.length > 0 
        ? (flashDeals.reduce((sum, deal) => sum + parseFloat(deal.discount_value), 0) / flashDeals.length).toFixed(1)
        : 0;
    
    document.getElementById('totalFlashDealsCount').textContent = totalCount;
    document.getElementById('activeFlashDealsCount').textContent = activeCount;
    document.getElementById('averageFlashDiscount').textContent = averageDiscount + (flashDeals[0]?.discount_type === 'percentage' ? '%' : '₺');
}

// Create flash deal
async function createFlashDeal(formData) {
    try {
        console.log('⚡ Creating flash deal:', formData);
        
        const response = await apiRequest('/admin/flash-deals', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            showNotification('Flash indirim başarıyla oluşturuldu!', 'success');
            closeModal('createFlashDealModal');
            loadFlashDeals();
        } else {
            throw new Error(response.message || 'Flash indirim oluşturulamadı');
        }
    } catch (error) {
        console.error('Error creating flash deal:', error);
        showNotification('Flash indirim oluşturulurken hata oluştu: ' + error.message, 'error');
    }
}

// Edit flash deal
function editFlashDeal(id) {
    console.log('Edit flash deal:', id);
    showNotification('Flash indirim düzenleme özelliği yakında eklenecek', 'info');
}

// Delete flash deal
async function deleteFlashDeal(id) {
    if (!confirm('Bu flash indirimi silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        console.log('⚡ Deleting flash deal:', id);
        
        const response = await apiRequest(`/admin/flash-deals/${id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('Flash indirim başarıyla silindi!', 'success');
            loadFlashDeals();
        } else {
            throw new Error(response.message || 'Flash indirim silinemedi');
        }
    } catch (error) {
        console.error('Error deleting flash deal:', error);
        showNotification('Flash indirim silinirken hata oluştu: ' + error.message, 'error');
    }
}

// Handle flash deal form submission
document.addEventListener('DOMContentLoaded', function() {
    const flashDealForm = document.getElementById('createFlashDealForm');
    if (flashDealForm) {
        flashDealForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(flashDealForm);
            const data = Object.fromEntries(formData.entries());
            
            // Validate required fields
            if (!data.name || !data.discount_type || !data.discount_value || !data.target_type || !data.start_date || !data.end_date) {
                showNotification('Lütfen tüm gerekli alanları doldurun', 'error');
                return;
            }
            
            // Validate target selection
            if (data.target_type !== 'all' && !data.target_id) {
                showNotification('Lütfen bir hedef seçin', 'error');
                return;
            }
            
            createFlashDeal(data);
        });
    }
});

// Export functions for global access
window.refreshUsers = refreshUsers;
window.refreshOrders = refreshOrders;
function refreshCarts() { loadCarts(); }
window.refreshProducts = refreshProducts;
window.refreshCampaigns = refreshCampaigns;
window.refreshSegments = refreshSegments;
window.refreshAnalytics = refreshAnalytics;
function refreshLive() { loadLive(); }
window.refreshTenants = refreshTenants;
window.refreshDashboard = refreshDashboard;
window.triggerProductSync = triggerProductSync;
window.updateOrderStatus = updateOrderStatus;
window.checkBackendConnection = checkBackendConnection;
window.testConnection = testConnection;
window.openBackendInstructions = openBackendInstructions;
window.showOrderDetails = showOrderDetails;
window.closeOrderModal = closeOrderModal;
window.openCreateCampaignModal = openCreateCampaignModal;
window.openCreateSegmentModal = openCreateSegmentModal;
window.closeModal = closeModal;
window.createAutomaticSegments = createAutomaticSegments;
window.viewProduct = viewProduct;
window.editProduct = editProduct;
window.showProductDetail = showProductDetail;
window.goBackToProducts = goBackToProducts;
window.editProductDetail = editProductDetail;
window.deleteProductDetail = deleteProductDetail;
window.showProductTab = showProductTab;
window.openCreateFlashDealModal = openCreateFlashDealModal;
window.showCampaignTab = showCampaignTab;
window.loadFlashDeals = loadFlashDeals;
window.editFlashDeal = editFlashDeal;
window.deleteFlashDeal = deleteFlashDeal;
window.updateDiscountInput = updateDiscountInput;
window.updateTargetSelection = updateTargetSelection;
window.createWeeklyFlashDeal = async function createWeeklyFlashDeal() {
    try {
        const name = prompt('Kampanya adı (ör: Haftalık Flash İndirim):', 'Haftalık Flash İndirim');
        if (!name) return;
        const discountType = prompt('İndirim türü (percentage|fixed):', 'percentage');
        if (!discountType) return;
        const discountValueStr = prompt(`İndirim değeri (${discountType === 'fixed' ? 'TL' : '%'}):`, discountType === 'fixed' ? '50' : '15');
        if (!discountValueStr) return;
        const discountValue = parseFloat(discountValueStr);
        if (isNaN(discountValue)) return alert('Geçersiz indirim değeri');
        const productIdsStr = prompt('Kapsanacak ürün ID listesi (virgülle ayrılmış, boş bırakılırsa tüm ürünlere uygulanır):', '');
        const minOrderStr = prompt('Minimum sipariş tutarı (opsiyonel):', '0');
        const minOrderAmount = parseFloat(minOrderStr || '0') || 0;

        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const body = {
            name,
            description: 'Yönetim panelinden oluşturulan 1 haftalık flash indirim',
            type: 'discount',
            status: 'active',
            discountType,
            discountValue,
            minOrderAmount,
            applicableProducts: productIdsStr ? productIdsStr.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)) : null,
            startDate: new Date().toISOString(),
            endDate,
            isActive: true
        };

        showLoading(true);
        const res = await apiRequest('/campaigns', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        if (res && res.success) {
            showNotification('Haftalık flash indirim oluşturuldu', 'success');
            refreshCampaigns();
        } else {
            showNotification('Flash indirim oluşturulamadı', 'error');
        }
    } catch (e) {
        console.error('Flash deal create error:', e);
        showNotification('Flash indirim oluşturulurken hata oluştu', 'error');
    } finally {
        showLoading(false);
    }
};

// ==================== CUSTOM PRODUCTION FUNCTIONS ====================
async function loadCustomProductions() {
    try {
        showLoading(true);
        const res = await apiRequest('/api/admin/custom-production-requests');
        const tbody = document.getElementById('customProductionTableBody');
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Kayıt bulunamadı</td></tr>';
            return;
        }
        tbody.innerHTML = res.data.map(r => `
            <tr>
                <td>#${safeString(r.id)}</td>
                <td>${safeString(r.userId)}</td>
                <td><span class="status-badge ${safeString(r.status)}">${safeString(r.status)}</span></td>
                <td>${safeString(r.totalQuantity)}</td>
                <td>${formatCurrency(r.totalAmount)} ₺</td>
                <td>${r.quoteAmount ? `${formatCurrency(r.quoteAmount)} ${safeString(r.quoteCurrency)}` : '-'}</td>
                <td>${formatDate(r.createdAt)}</td>
                <td>
                    <div class="order-actions" style="min-width:200px;">
                        <button class="btn-secondary" onclick="openSetQuote(${r.id})"><i class="fas fa-file-invoice-dollar"></i> Teklif</button>
                        <select onchange="updateCustomStatus(${r.id}, this.value)" class="btn-secondary order-status-select">
                            ${['pending','review','design','production','shipped','completed','cancelled'].map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading custom productions:', e);
        document.getElementById('customProductionTableBody').innerHTML = '<tr><td colspan="8" class="loading">Yüklenirken hata oluştu</td></tr>';
    } finally {
        showLoading(false);
    }
}

async function updateCustomStatus(id, status) {
    try {
        showLoading(true);
        await apiRequest(`/api/admin/custom-production-requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
        showNotification('Durum güncellendi', 'success');
        loadCustomProductions();
    } catch (e) {
        showNotification('Durum güncellenemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function openSetQuote(id) {
    const amount = prompt('Teklif tutarı (₺):');
    if (!amount) return;
    const notes = prompt('Teklif notu (opsiyonel):', '') || '';
    const validUntil = prompt('Geçerlilik (YYYY-MM-DD hh:mm:ss) opsiyonel:', '') || null;
    try {
        showLoading(true);
        await apiRequest(`/api/admin/custom-production-requests/${id}/quote`, { method: 'POST', body: JSON.stringify({ quoteAmount: parseFloat(amount), quoteNotes: notes, quoteValidUntil: validUntil }) });
        showNotification('Teklif gönderildi', 'success');
        loadCustomProductions();
    } catch (e) {
        showNotification('Teklif gönderilemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.loadCustomProductions = loadCustomProductions;
window.updateCustomStatus = updateCustomStatus;
window.openSetQuote = openSetQuote;

// ==================== PRODUCT CRUD (CREATE/EDIT/DELETE) ====================
function openCreateProductModal() {
    currentProductId = null;
    ensureCategoriesLoaded();
    const m = document.getElementById('productModal');
    if (!m) return;
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productStock').value = '0';
    document.getElementById('productBrand').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productTaxRate').value = '0';
    document.getElementById('productPriceIncludesTax').value = 'false';
    m.classList.remove('hidden');
}

async function openEditProductModal(productId) {
    try {
        showLoading(true);
        const res = await apiRequest(`/admin/products/${productId}`);
        if (!res.success) throw new Error(res.message || 'Ürün bulunamadı');
        const p = res.data;
        document.getElementById('productName').value = p.name || '';
        document.getElementById('productPrice').value = p.price || '';
        await ensureCategoriesLoaded();
        document.getElementById('productCategory').value = p.category || '';
        document.getElementById('productStock').value = p.stock || 0;
        document.getElementById('productBrand').value = p.brand || '';
        document.getElementById('productImage').value = p.image || '';
        document.getElementById('productDescription').value = p.description || '';
        document.getElementById('productTaxRate').value = ((p.taxRate ?? 0).toString());
        document.getElementById('productPriceIncludesTax').value = (p.priceIncludesTax ? 'true' : 'false');
        document.getElementById('productModal').classList.remove('hidden');
    } catch (e) {
        showNotification('Ürün yüklenemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            try {
                showLoading(true);
                const body = {
                    name: document.getElementById('productName').value,
                    price: parseFloat((document.getElementById('productPrice').value || '').replace(',', '.')),
                    category: document.getElementById('productCategory').value || null,
                    stock: parseInt(document.getElementById('productStock').value || '0', 10),
                    brand: document.getElementById('productBrand').value || null,
                    image: document.getElementById('productImage').value || null,
                    description: document.getElementById('productDescription').value || null,
                    taxRate: parseFloat(document.getElementById('productTaxRate').value || '0'),
                    priceIncludesTax: document.getElementById('productPriceIncludesTax').value === 'true'
                };
                if (currentProductId) {
                    await apiRequest(`/admin/products/${currentProductId}`, { method: 'PUT', body: JSON.stringify(body) });
                    showNotification('Ürün güncellendi', 'success');
                } else {
                    await apiRequest('/admin/products', { method: 'POST', body: JSON.stringify(body) });
                    showNotification('Ürün oluşturuldu', 'success');
                }
                closeModal('productModal');
                refreshProducts();
            } catch (err) {
                showNotification('Kaydedilemedi: ' + err.message, 'error');
            } finally {
                showLoading(false);
            }
        });
    }
});

async function deleteProduct(productId) {
    try {
        showLoading(true);
        await apiRequest(`/admin/products/${productId}`, { method: 'DELETE' });
        showNotification('Ürün silindi', 'success');
        refreshProducts();
    } catch (e) {
        showNotification('Silinemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.openCreateProductModal = openCreateProductModal;
window.deleteProduct = deleteProduct;
window.openEditProductModal = openEditProductModal;

// ==================== CARTS (ADMIN) ====================
async function loadCarts() {
    try {
        showLoading(true);
        const res = await apiRequest('/admin/carts');
        const tbody = document.getElementById('cartsTableBody');
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Kayıt bulunamadı</td></tr>';
            return;
        }
        tbody.innerHTML = res.data.map(r => `
            <tr>
                <td>${safeString(r.userName)}</td>
                <td>${safeString(r.userEmail)}</td>
                <td>${safeString(r.itemLines)}</td>
                <td>${safeString(r.totalQuantity)}</td>
                <td><button class="btn-secondary" onclick="viewCart(${r.userId})"><i class="fas fa-eye"></i> Detay</button></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading carts:', e);
        document.getElementById('cartsTableBody').innerHTML = '<tr><td colspan="5" class="loading">Yüklenirken hata oluştu</td></tr>';
    } finally {
        showLoading(false);
    }
}

async function viewCart(userId) {
    try {
        showLoading(true);
        const res = await apiRequest(`/admin/carts/${userId}`);
        if (!res.success) throw new Error(res.message || 'Sepet getirilemedi');
        const { user, items, totalQuantity } = res.data;
        const body = document.getElementById('cartModalBody');
        body.innerHTML = `
            <div class="info-card">
                <p><strong>Kullanıcı:</strong> ${safeString(user.name)} (${safeString(user.email)})</p>
                <p><strong>Toplam Adet:</strong> ${safeString(totalQuantity)}</p>
            </div>
            <div class="table-container" style="margin-top:12px;">
                <table class="data-table">
                    <thead><tr><th>Ürün</th><th>Adet</th><th>Fiyat</th></tr></thead>
                    <tbody>
                        ${items.map(i => `
                          <tr>
                            <td>${safeString(i.productName)}</td>
                            <td>${safeString(i.quantity)}</td>
                            <td>${formatCurrency(i.productPrice)} ₺</td>
                          </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('cartModal').classList.remove('hidden');
    } catch (e) {
        showNotification('Sepet detayı yüklenemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.loadCarts = loadCarts;
window.viewCart = viewCart;

// ==================== LIVE DATA ====================
async function loadLive() {
    try {
        showLoading(true);
        const res = await apiRequest('/admin/live-views');
        const tbody = document.getElementById('liveTableBody');
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Kayıt bulunamadı</td></tr>';
            return;
        }
        tbody.innerHTML = res.data.map(v => `
            <tr>
                <td>${safeString(v.userId)}</td>
                <td>${safeString(v.productName)} (#${safeString(v.productId)})</td>
                <td>${formatDate(v.viewedAt)}</td>
                <td>${safeString(v.dwellSeconds)}</td>
                <td>${v.addedToCart ? 'Evet' : 'Hayır'}</td>
                <td>${v.purchased ? 'Evet' : 'Hayır'}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading live data:', e);
        document.getElementById('liveTableBody').innerHTML = '<tr><td colspan="6" class="loading">Yüklenirken hata oluştu</td></tr>';
    } finally {
        showLoading(false);
    }
}

// ==================== WALLETS (ADMIN) ====================
async function loadWallets() {
    try {
        showLoading(true);
        const res = await apiRequest('/admin/wallets');
        const tbody = document.getElementById('walletsTableBody');
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">Kayıt bulunamadı</td></tr>';
            return;
        }
        tbody.innerHTML = res.data.map(w => `
            <tr>
                <td>${safeString(w.userName)}</td>
                <td>${safeString(w.userEmail)}</td>
                <td>${formatCurrency(w.balance)} ${safeString(w.currency || 'TRY')}</td>
                <td>
                    <button class="btn-secondary" onclick="adjustWallet(${w.userId}, 50)">+50</button>
                    <button class="btn-secondary" onclick="adjustWallet(${w.userId}, -50)">-50</button>
                    <button class="btn-secondary" onclick="promptAdjust(${w.userId})">Düzenle</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        document.getElementById('walletsTableBody').innerHTML = '<tr><td colspan="4" class="loading">Yüklenirken hata oluştu</td></tr>';
    } finally {
        showLoading(false);
    }
}

function promptAdjust(userId) {
    const val = prompt('Tutar (+/-):', '0');
    if (!val) return;
    const amount = parseFloat(val.replace(',', '.'));
    if (isNaN(amount)) return alert('Geçersiz tutar');
    const reason = prompt('Açıklama (opsiyonel):', 'Admin düzenleme') || 'Admin adjustment';
    adjustWallet(userId, amount, reason);
}

async function adjustWallet(userId, amount, reason = 'Admin adjustment') {
    try {
        showLoading(true);
        await apiRequest('/admin/wallets/adjust', { method: 'POST', body: JSON.stringify({ userId, amount, reason }) });
        showNotification('Bakiye güncellendi', 'success');
        loadWallets();
    } catch (e) {
        showNotification('Bakiye güncellenemedi: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
}

window.loadWallets = loadWallets;
window.promptAdjust = promptAdjust;
window.adjustWallet = adjustWallet;

// Load categories once for product modal
let _categoriesLoaded = false;
async function ensureCategoriesLoaded() {
    try {
        if (_categoriesLoaded) return;
        const res = await apiRequest('/admin/categories');
        if (res.success) {
            const sel = document.getElementById('productCategory');
            if (sel) {
                sel.innerHTML = '<option value="">Seçiniz</option>' +
                  res.data.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            }
            _categoriesLoaded = true;
        }
    } catch (e) {
        console.warn('Kategoriler yüklenemedi:', e);
    }
}
