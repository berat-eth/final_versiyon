const express = require('express');
// Load environment variables from envai file
try { 
  require('dotenv').config({ path: '../.env' }); 
  console.log('✅ Environment variables loaded from envai file');
} catch (error) {
  console.warn('⚠️ Could not load envai file, using defaults:', error.message);
}
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const XmlSyncService = require('./services/xml-sync-service');
const IyzicoService = require('./services/iyzico-service');
const WhatsAppService = require('./services/whatsapp-service');
const { createDatabaseSchema } = require('./database-schema');
const userDataRoutes = require('./routes/user-data');
const userSpecificDataRoutes = require('./routes/user-specific-data');
const { RecommendationService } = require('./services/recommendation-service');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// Security modules (simplified)
const DatabaseSecurity = require('./security/database-security');
const InputValidation = require('./security/input-validation');

// Security utilities
const SALT_ROUNDS = 12;

// Password hashing
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

// Password verification
async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('❌ Error verifying password:', error);
    return false;
  }
}


// Generate secure API key
function generateSecureApiKey() {
  return 'huglu_' + crypto.randomBytes(32).toString('hex');
}
// In-memory FTP backup settings (persist simple in DB if needed later)
let __ftpBackupConfig = { enabled: false, host: '', port: 21, user: '', password: '', remoteDir: '/', schedule: '0 3 * * *' };

// Helper: run full backup and upload to FTP
async function runFtpBackupNow() {
  try {
    // 1) Build backup JSON via internal call
    const [tenantRows] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
    if (tenantRows.length === 0) throw new Error('Aktif tenant yok');
    const tenantId = tenantRows[0].id;

    const tables = [
      'tenants','users','categories','products','product_variations','product_variation_options','orders','order_items','cart','user_wallets','wallet_transactions','wallet_recharge_requests','custom_production_requests','custom_production_items','reviews','security_events','chatbot_analytics','referral_earnings','recommendations','customer_segments','customer_segment_assignments','campaigns','campaign_usage','customer_analytics','discount_wheel_spins'
    ];
    const data = {};
    for (const t of tables) {
      try {
        let rows;
        if (t === 'tenants') {
          [rows] = await poolWrapper.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
        } else {
          try { [rows] = await poolWrapper.execute(`SELECT * FROM ${t} WHERE tenantId = ?`, [tenantId]); }
          catch { [rows] = await poolWrapper.execute(`SELECT * FROM ${t}`); }
        }
        data[t] = rows;
      } catch { data[t] = []; }
    }
    const payload = JSON.stringify({ success: true, tenantId, exportedAt: new Date().toISOString(), data });

    // 2) Save temp file
    const tmpDir = path.join(__dirname, '..', 'tmp');
    try { if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    const fileName = `huglu-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, payload);

    // 3) Upload via FTP
    const client = new ftp.Client(15000);
    client.ftp.verbose = false;
    try {
      await client.access({
        host: __ftpBackupConfig.host,
        port: __ftpBackupConfig.port || 21,
        user: __ftpBackupConfig.user,
        password: __ftpBackupConfig.password,
        secure: false
      });
      if (__ftpBackupConfig.remoteDir && __ftpBackupConfig.remoteDir !== '/') {
        try { await client.ensureDir(__ftpBackupConfig.remoteDir); } catch {}
        await client.cd(__ftpBackupConfig.remoteDir);
      }
      await client.uploadFrom(filePath, fileName);
    } finally {
      client.close();
      try { fs.unlinkSync(filePath); } catch {}
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// Admin FTP backup config routes are registered AFTER app initialization (see below)

// HTML entity decoder utility
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;
  
  const htmlEntities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
    '&bull;': '•',
    '&middot;': '·',
    '&laquo;': '«',
    '&raquo;': '»',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢'
  };
  
  let decodedText = text;
  
  // Replace HTML entities
  Object.keys(htmlEntities).forEach(entity => {
    const regex = new RegExp(entity, 'g');
    decodedText = decodedText.replace(regex, htmlEntities[entity]);
  });
  
  // Replace numeric HTML entities (&#123; format)
  decodedText = decodedText.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });
  
  // Replace hex HTML entities (&#x1A; format)
  decodedText = decodedText.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Clean up extra whitespace
  decodedText = decodedText.replace(/\s+/g, ' ').trim();
  
  return decodedText;
}

// Clean product data function
function cleanProductData(product) {
  if (!product) return product;
  
  const cleaned = { ...product };
  
  // Clean text fields that might contain HTML entities
  if (cleaned.name) cleaned.name = decodeHtmlEntities(cleaned.name);
  if (cleaned.description) cleaned.description = decodeHtmlEntities(cleaned.description);
  if (cleaned.category) cleaned.category = decodeHtmlEntities(cleaned.category);
  if (cleaned.brand) cleaned.brand = decodeHtmlEntities(cleaned.brand);
  
  return cleaned;
}

const os = require('os');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

// Network detection helper
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }
  return 'localhost';
}

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(hpp());

// CORS - Tüm origin'lere izin ver
app.use(cors({
  origin: true, // Tüm origin'lere izin ver
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  // Yalnız X-API-Key + gerekli standart başlıklar
  allowedHeaders: ['Content-Type','X-Requested-With','X-API-Key']
}));

app.use(express.json());

// Serve Admin Panel statically at /admin
try {
  const adminPanelPath = path.join(__dirname, '../admin-panel');
  app.use('/admin', require('express').static(adminPanelPath));
  // Also serve shared assets for admin panel
  const assetsPath = path.join(__dirname, '../assets');
  app.use('/admin/assets', require('express').static(assetsPath));
  console.log('✅ Admin panel static hosting enabled at /admin');
} catch (e) {
  console.warn('⚠️ Could not enable admin panel static hosting:', e.message);
}

// Helper: resolve numeric internal user id from external/userId string
async function resolveInternalUserId(externalUserId, tenantId) {
  try {
    if (externalUserId == null) return null;
    const raw = String(externalUserId);
    if (/^\d+$/.test(raw)) {
      // Could already be internal numeric id; verify existence
      const [rows] = await poolWrapper.execute('SELECT id FROM users WHERE id = ? AND tenantId = ? LIMIT 1', [parseInt(raw, 10), tenantId]);
      if (rows.length) return parseInt(raw, 10);
    }
    // Try by external short user_id
    const [found] = await poolWrapper.execute('SELECT id FROM users WHERE user_id = ? AND tenantId = ? LIMIT 1', [raw, tenantId]);
    return found.length ? found[0].id : null;
  } catch (e) {
    console.error('resolveInternalUserId error:', e);
    return null;
  }
}


if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.body) {
      console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
      console.log('📤 Request Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/users/login', authLimiter);
app.use('/api/admin', authLimiter);

// SQL Query Logger Middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.method !== 'GET') {
      console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log('📤 Request Body:', JSON.stringify(req.body, null, 2));
      }
    }
    originalSend.call(this, data);
  };
  next();
});

// Initialize security modules
const dbSecurity = new DatabaseSecurity();
const inputValidator = new InputValidation();

// Basic request size limiting
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global API Key Authentication for all API routes (except health and admin login)
app.use('/api', (req, res, next) => {
  // req.path burada '/api' mount edildiği için relatif: '/health', '/admin/...'
  const path = req.path || '';

  // Skip API key check for specific endpoints
  const skipApiKeyPaths = [
    '/health',
    '/admin/login',
    '/tenants', // Tenant creation doesn't require API key
    '/users' // User registration doesn't require API key
  ];

  if (skipApiKeyPaths.includes(path)) {
    return next();
  }

  // Tüm /api (admin dahil) istekleri için: yalnız X-API-Key zorunlu
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'API key required. Please provide X-API-Key header.' 
    });
  }

  // X-API-Key doğrulaması (tenant tablosu)
  poolWrapper.execute(
    'SELECT id, name, domain, subdomain, settings, isActive FROM tenants WHERE apiKey = ? AND isActive = true',
    [apiKey]
  ).then(([rows]) => {
    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive API key' 
      });
    }
    
    req.tenant = rows[0];
    if (req.tenant.settings) {
      try { 
        req.tenant.settings = JSON.parse(req.tenant.settings); 
      } catch(_) {} 
    }
    next();
  }).catch(error => {
    console.error('❌ Error authenticating API key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error authenticating API key' 
    });
  });
});

// Global SQL Injection Guard for all API routes
app.use('/api', (req, res, next) => {
  try {
    // Reject overly long string inputs (basic hardening)
    const MAX_LEN = 500;
    const rejectLongStrings = (obj) => {
      const stack = [obj];
      while (stack.length) {
        const cur = stack.pop();
        if (cur == null) continue;
        if (typeof cur === 'string') {
          if (cur.length > MAX_LEN) return true;
        } else if (Array.isArray(cur)) {
          cur.forEach(v => stack.push(v));
        } else if (typeof cur === 'object') {
          Object.values(cur).forEach(v => stack.push(v));
        }
      }
      return false;
    };

    if (rejectLongStrings({ params: req.params, query: req.query, body: req.body })) {
      return res.status(400).json({ success: false, message: 'Input too long' });
    }

    // Generic numeric id validation for :id-like params
    if (req.params && typeof req.params === 'object') {
      for (const [k, v] of Object.entries(req.params)) {
        if (/id$/i.test(k)) {
          const num = Number(v);
          if (!Number.isInteger(num) || num <= 0) {
            return res.status(400).json({ success: false, message: `Invalid ${k}` });
          }
        }
      }
    }

    const hasSqlPatterns = inputValidator.scanObjectForSqlInjection({ params: req.params, query: req.query, body: req.body });
    if (hasSqlPatterns) return res.status(400).json({ success: false, message: 'Invalid input detected' });
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }
});

// Secure database configuration
const dbConfig = dbSecurity.getSecureDbConfig();

// Create database pool
let pool;
let xmlSyncService;
let profileScheduler;

// SQL Query Logger Wrapper
function logQuery(sql, params, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`\n📊 [SQL QUERY] ${duration}ms`);
  console.log(`🔍 SQL: ${sql}`);
  if (params && params.length > 0) {
    console.log(`📝 Params: ${JSON.stringify(params)}`);
  }
  console.log(`⏱️  Duration: ${duration}ms`);
}

// Wrapped pool methods for logging
const poolWrapper = {
  async execute(sql, params) {
    const startTime = Date.now();
    try {
      const result = await pool.execute(sql, params);
      logQuery(sql, params, startTime);
      return result;
    } catch (error) {
      logQuery(sql, params, startTime);
      console.error(`❌ SQL Error: ${error.message}`);
      throw error;
    }
  },
  
  async query(sql, params) {
    const startTime = Date.now();
    try {
      const result = await pool.query(sql, params);
      logQuery(sql, params, startTime);
      return result;
    } catch (error) {
      logQuery(sql, params, startTime);
      console.error(`❌ SQL Error: ${error.message}`);
      throw error;
    }
  },
  
  async getConnection() {
    try {
      const connection = await pool.getConnection();
      
      // Wrap connection methods for logging
      const originalExecute = connection.execute;
      const originalQuery = connection.query;
      const originalBeginTransaction = connection.beginTransaction;
      const originalCommit = connection.commit;
      const originalRollback = connection.rollback;
      
      connection.execute = async function(sql, params) {
        const startTime = Date.now();
        try {
          const result = await originalExecute.call(this, sql, params);
          logQuery(sql, params, startTime);
          return result;
        } catch (error) {
          logQuery(sql, params, startTime);
          console.error(`❌ SQL Error: ${error.message}`);
          throw error;
        }
      };
      
      connection.query = async function(sql, params) {
        const startTime = Date.now();
        try {
          const result = await originalQuery.call(this, sql, params);
          logQuery(sql, params, startTime);
          return result;
        } catch (error) {
          logQuery(sql, params, startTime);
          console.error(`❌ SQL Error: ${error.message}`);
          throw error;
        }
      };
      
      connection.beginTransaction = async function() {
        console.log('🔄 Transaction started');
        return await originalBeginTransaction.call(this);
      };
      
      connection.commit = async function() {
        console.log('✅ Transaction committed');
        return await originalCommit.call(this);
      };
      
      connection.rollback = async function() {
        console.log('🔄 Transaction rolled back');
        return await originalRollback.call(this);
      };
      
      return connection;
    } catch (error) {
      console.error(`❌ Error getting connection: ${error.message}`);
      throw error;
    }
  }
};

// Create user_exp_transactions table if not exists
async function createUserExpTransactionsTable() {
  try {
    if (!poolWrapper) {
      console.error('❌ poolWrapper not initialized yet');
      return;
    }
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS user_exp_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        tenantId VARCHAR(255) NOT NULL,
        source VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        description TEXT,
        orderId VARCHAR(255),
        productId VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_tenant (userId, tenantId),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log('✅ user_exp_transactions table created/verified');
  } catch (error) {
    console.error('❌ Error creating user_exp_transactions table:', error);
  }
}

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Test connection with security
    const connection = await pool.getConnection();
    const secureConnection = dbSecurity.secureConnection(connection);
    console.log('✅ Database connected securely');
    secureConnection.release();
    
    // Create database schema
    await createDatabaseSchema(pool);
    
    // Create user level system tables
    await createUserExpTransactionsTable();
    
    // Initialize XML Sync Service
    xmlSyncService = new XmlSyncService(pool);
    console.log('📡 XML Sync Service initialized');

    // Initialize Profile Scheduler (every 30 minutes)
    try {
      const { RecommendationService } = require('./services/recommendation-service');
      const recSvc = new RecommendationService(poolWrapper);
      profileScheduler = setInterval(async () => {
        try {
          // Son 24 saatte aktivitesi olan kullanıcıları profil güncelle
          const [users] = await poolWrapper.execute(
            `SELECT DISTINCT userId FROM user_events WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND tenantId IS NOT NULL`
          );
          for (const u of users) {
            // tenant bazlı kullanıcıları çek
            const [tenants] = await poolWrapper.execute(
              `SELECT DISTINCT tenantId FROM user_events WHERE userId = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
              [u.userId]
            );
            for (const t of tenants) {
              await recSvc.updateUserProfile(t.tenantId, u.userId);
              await recSvc.generateRecommendations(t.tenantId, u.userId, 20);
            }
          }
          console.log(`🕒 Profiles refreshed: ${users.length} users`);
        } catch (e) {
          console.warn('⚠️ Profile scheduler error:', e.message);
        }
      }, 30 * 60 * 1000);
      console.log('⏱️ Profile Scheduler started (every 30 minutes)');
    } catch (e) {
      console.warn('⚠️ Could not start Profile Scheduler:', e.message);
    }
    
    // Log security initialization
    dbSecurity.logDatabaseAccess('system', 'DATABASE_INIT', 'system', {
      ip: 'localhost',
      userAgent: 'server-init'
    });
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    dbSecurity.logDatabaseAccess('system', 'DATABASE_ERROR', 'system', {
      error: error.message,
      ip: 'localhost'
    });
    throw error;
  }
}

// Ensure a default tenant with a known API key exists/active (idempotent)
async function ensureDefaultTenantApiKey() {
  try {
    const DEFAULT_KEY = 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
    const DEFAULT_NAME = 'Default Tenant';
    await poolWrapper.execute(
      `INSERT INTO tenants (id, name, apiKey, isActive, createdAt)
       VALUES (1, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE apiKey = VALUES(apiKey), isActive = 1, name = VALUES(name)`,
      [DEFAULT_NAME, DEFAULT_KEY]
    );
    console.log('✅ Default tenant API key ensured/updated');
  } catch (error) {
    console.warn('⚠️ Could not ensure default tenant API key:', error.message);
  }
}

// Health check endpoint (no authentication required)
app.get('/api/health', async (req, res) => {
  try {
    // Quick database check
    const connection = await pool.getConnection();
    connection.release();
    
    // Quick response
    res.json({ 
      success: true, 
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Security endpoints
// Security endpoints removed - keeping only basic API key authentication

// User Data Routes
app.use('/api/user-data', userDataRoutes);

// User Specific Data Routes
app.use('/api/user-specific', userSpecificDataRoutes);

// Recommendations Routes
try {
  const recRoutesFactory = require('./routes/recommendations');
  // Delay init until after poolWrapper is defined
  process.nextTick(() => {
    try {
      const recommendationService = new RecommendationService(poolWrapper);
      const recRouter = recRoutesFactory(poolWrapper, recommendationService);
      app.use('/api/recommendations', recRouter);
      console.log('✅ Recommendations routes mounted at /api/recommendations');
    } catch (e) {
      console.warn('⚠️ Failed to mount recommendations routes:', e.message);
    }
  });
} catch (e) {
  console.warn('⚠️ Recommendations routes could not be required:', e.message);
}

// Dealership Applications Routes
try {
  const dealershipRoutes = require('./routes/dealership');
  app.use('/api/dealership', dealershipRoutes);
  console.log('✅ Dealership routes mounted at /api/dealership');
} catch (e) {
  console.warn('⚠️ Dealership routes could not be mounted:', e.message);
}

// Helper: generate unique 8-digit user_id
async function generateUnique8DigitUserId() {
  const min = 10000000;
  const max = 99999999;
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = String(Math.floor(Math.random() * (max - min + 1)) + min);
    const [exists] = await poolWrapper.execute('SELECT id FROM users WHERE user_id = ? LIMIT 1', [candidate]);
    if (!exists || exists.length === 0) return candidate;
  }
  throw new Error('Could not generate unique 8-digit user_id');
}

// Helper: ensure a specific user (by PK id) has 8-digit user_id; returns user_id
async function ensureUserHasExternalId(userPk) {
  if (!userPk) throw new Error('userPk required');
  const [[row]] = await poolWrapper.execute('SELECT user_id FROM users WHERE id = ? LIMIT 1', [userPk]);
  if (!row) throw new Error('User not found');
  if (row.user_id && String(row.user_id).length === 8) return row.user_id;
  const newId = await generateUnique8DigitUserId();
  await poolWrapper.execute('UPDATE users SET user_id = ? WHERE id = ?', [newId, userPk]);
  return newId;
}

// Helper: resolve user key (either numeric PK or 8-digit external user_id) to numeric PK
async function resolveUserKeyToPk(userKey, tenantId = 1) {
  if (userKey == null) throw new Error('userKey required');
  const key = String(userKey).trim();
  // If it looks like an 8-digit external id
  if (/^\d{8}$/.test(key)) {
    const [[row]] = await poolWrapper.execute(
      'SELECT id FROM users WHERE user_id = ? AND tenantId = ? LIMIT 1',
      [key, tenantId]
    );
    if (!row) throw new Error('User not found for external id');
    return row.id;
  }
  // Else, try numeric PK
  const num = Number(key);
  if (!Number.isInteger(num) || num <= 0) throw new Error('Invalid user key');
  return num;
}

// Admin: Reset all users' external 8-digit user_id
app.post('/api/admin/users/reset-user-ids', async (req, res) => {
  try {
    // Fetch all users' numeric primary keys
    const [users] = await poolWrapper.execute('SELECT id FROM users ORDER BY id ASC', []);
    if (!users || users.length === 0) {
      return res.json({ success: true, data: { updated: 0 }, message: 'No users to update' });
    }

    // Ensure uniqueness by checking DB per generated id
    let updatedCount = 0;
    const mapping = [];
    for (const row of users) {
      const newId = await generateUnique8DigitUserId();
      await poolWrapper.execute('UPDATE users SET user_id = ? WHERE id = ?', [newId, row.id]);
      updatedCount++;
      mapping.push({ id: row.id, user_id: newId });
    }

    res.json({ success: true, data: { updated: updatedCount, mapping } });
  } catch (error) {
    console.error('❌ Error resetting user IDs:', error);
    res.status(500).json({ success: false, message: 'Error resetting user IDs' });
  }
});

// Admin: Ensure ONE user has an 8-digit user_id (idempotent)
app.post('/api/admin/users/:id/ensure-user-id', async (req, res) => {
  try {
    const userPk = parseInt(req.params.id, 10);
    if (!Number.isInteger(userPk) || userPk <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const user_id = await ensureUserHasExternalId(userPk);
    res.json({ success: true, data: { id: userPk, user_id } });
  } catch (error) {
    console.error('❌ ensure-user-id error:', error);
    res.status(500).json({ success: false, message: 'ensure-user-id failed' });
  }
});

// Admin: Ensure all users missing user_id get a new 8-digit id (non-destructive)
app.post('/api/admin/users/ensure-missing-user-ids', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute('SELECT id FROM users WHERE (user_id IS NULL OR LENGTH(user_id) <> 8)', []);
    let updated = 0;
    const mapping = [];
    for (const r of rows) {
      const newId = await generateUnique8DigitUserId();
      await poolWrapper.execute('UPDATE users SET user_id = ? WHERE id = ?', [newId, r.id]);
      updated++;
      mapping.push({ id: r.id, user_id: newId });
    }
    res.json({ success: true, data: { updated, mapping } });
  } catch (error) {
    console.error('❌ ensure-missing-user-ids error:', error);
    res.status(500).json({ success: false, message: 'ensure-missing-user-ids failed' });
  }
});

// User Addresses Endpoints

// Get user's addresses
app.get('/api/user-addresses', async (req, res) => {
  try {
    const { userId, addressType } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    let query = `
      SELECT * FROM user_addresses 
      WHERE userId = ? AND tenantId = ?
    `;
    let params = [userId, req.tenant.id];

    if (addressType && (addressType === 'shipping' || addressType === 'billing')) {
      query += ' AND addressType = ?';
      params.push(addressType);
    }

    query += ' ORDER BY isDefault DESC, createdAt DESC';

    const [addresses] = await poolWrapper.execute(query, params);

    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error('❌ Error fetching user addresses:', error);
    res.status(500).json({ success: false, message: 'Error fetching addresses' });
  }
});

// Create new address
app.post('/api/user-addresses', async (req, res) => {
  try {
    const { userId, addressType, fullName, phone, address, city, district, postalCode, isDefault } = req.body;
    
    if (!userId || !addressType || !fullName || !phone || !address || !city) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid address type. Must be shipping or billing' 
      });
    }

    // If this is default address, remove default from others of same type
    if (isDefault) {
      await poolWrapper.execute(
        'UPDATE user_addresses SET isDefault = false WHERE userId = ? AND tenantId = ? AND addressType = ?',
        [userId, req.tenant.id, addressType]
      );
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO user_addresses (userId, tenantId, addressType, fullName, phone, address, city, district, postalCode, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, req.tenant.id, addressType, fullName, phone, address, city, district || null, postalCode || null, isDefault || false]);

    res.json({ 
      success: true, 
      data: { addressId: result.insertId },
      message: 'Address created successfully' 
    });
  } catch (error) {
    console.error('❌ Error creating address:', error);
    res.status(500).json({ success: false, message: 'Error creating address' });
  }
});

// Update address
app.put('/api/user-addresses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { addressType, fullName, phone, address, city, district, postalCode, isDefault } = req.body;
    
    if (!addressType || !fullName || !phone || !address || !city) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (addressType !== 'shipping' && addressType !== 'billing') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid address type. Must be shipping or billing' 
      });
    }

    // If this is default address, remove default from others of same type
    if (isDefault) {
      await poolWrapper.execute(
        'UPDATE user_addresses SET isDefault = false WHERE userId = (SELECT userId FROM user_addresses WHERE id = ?) AND tenantId = ? AND addressType = ? AND id != ?',
        [id, req.tenant.id, addressType, id]
      );
    }

    await poolWrapper.execute(`
      UPDATE user_addresses 
      SET addressType = ?, fullName = ?, phone = ?, address = ?, city = ?, district = ?, postalCode = ?, isDefault = ?, updatedAt = NOW()
      WHERE id = ? AND tenantId = ?
    `, [addressType, fullName, phone, address, city, district || null, postalCode || null, isDefault || false, id, req.tenant.id]);

    res.json({ success: true, message: 'Address updated successfully' });
  } catch (error) {
    console.error('❌ Error updating address:', error);
    res.status(500).json({ success: false, message: 'Error updating address' });
  }
});

// Delete address
app.delete('/api/user-addresses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await poolWrapper.execute(
      'DELETE FROM user_addresses WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );
    
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting address:', error);
    res.status(500).json({ success: false, message: 'Error deleting address' });
  }
});

// Set default address
app.put('/api/user-addresses/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get address details first
    const [address] = await poolWrapper.execute(
      'SELECT userId, addressType FROM user_addresses WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );
    
    if (address.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    
    const { userId, addressType } = address[0];
    
    // Remove default from others of same type
    await poolWrapper.execute(
      'UPDATE user_addresses SET isDefault = false WHERE userId = ? AND tenantId = ? AND addressType = ?',
      [userId, req.tenant.id, addressType]
    );
    
    // Set this address as default
    await poolWrapper.execute(
      'UPDATE user_addresses SET isDefault = true WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );
    
    res.json({ success: true, message: 'Default address updated successfully' });
  } catch (error) {
    console.error('❌ Error setting default address:', error);
    res.status(500).json({ success: false, message: 'Error setting default address' });
  }
});

// Wallet Transfer Endpoints

// Transfer money between users
app.post('/api/wallet/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, description } = req.body;
    
    if (!fromUserId || !toUserId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing or invalid required fields' 
      });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot transfer to yourself' 
      });
    }

    // Check if both users exist
    const [fromUser] = await poolWrapper.execute(
      'SELECT id, name FROM users WHERE id = ? AND tenantId = ?',
      [fromUserId, req.tenant.id]
    );
    
    const [toUser] = await poolWrapper.execute(
      'SELECT id, name FROM users WHERE id = ? AND tenantId = ?',
      [toUserId, req.tenant.id]
    );

    if (fromUser.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sender user not found' 
      });
    }

    if (toUser.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Receiver user not found' 
      });
    }

    // Check sender's balance
    const [senderBalance] = await poolWrapper.execute(
      'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [fromUserId, req.tenant.id]
    );

    if (senderBalance.length === 0 || senderBalance[0].balance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance' 
      });
    }

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Deduct from sender
      await connection.execute(
        'UPDATE user_wallets SET balance = balance - ?, updatedAt = NOW() WHERE userId = ? AND tenantId = ?',
        [amount, fromUserId, req.tenant.id]
      );

      // Add to receiver (create wallet if doesn't exist)
      await connection.execute(`
        INSERT INTO user_wallets (userId, tenantId, balance, createdAt, updatedAt)
        VALUES (?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE balance = balance + ?, updatedAt = NOW()
      `, [toUserId, req.tenant.id, amount, amount]);

      // Record outgoing transaction for sender
      await connection.execute(`
        INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, referenceId, createdAt)
        VALUES (?, ?, 'transfer_out', ?, ?, ?, NOW())
      `, [fromUserId, req.tenant.id, -amount, description || `Transfer to ${toUser[0].name}`, `TRANSFER_OUT_${Date.now()}`]);

      // Record incoming transaction for receiver
      await connection.execute(`
        INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, referenceId, createdAt)
        VALUES (?, ?, 'transfer_in', ?, ?, ?, NOW())
      `, [toUserId, req.tenant.id, amount, description || `Transfer from ${fromUser[0].name}`, `TRANSFER_IN_${Date.now()}`]);

      await connection.commit();

      res.json({ 
        success: true, 
        message: 'Transfer completed successfully',
        data: {
          transferId: `TRANSFER_${Date.now()}`,
          amount,
          fromUser: fromUser[0].name,
          toUser: toUser[0].name
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error processing transfer:', error);
    res.status(500).json({ success: false, message: 'Error processing transfer' });
  }
});

// Get transfer history
app.get('/api/wallet/transfers', async (req, res) => {
  try {
    const { userId, type } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    let query = `
      SELECT 
        wt.*,
        u.name as otherUserName,
        CASE 
          WHEN wt.type = 'transfer_in' THEN 'received'
          WHEN wt.type = 'transfer_out' THEN 'sent'
        END as transferDirection
      FROM wallet_transactions wt
      LEFT JOIN users u ON (
        CASE 
          WHEN wt.type = 'transfer_in' THEN wt.referenceId LIKE CONCAT('%', u.id, '%')
          WHEN wt.type = 'transfer_out' THEN wt.referenceId LIKE CONCAT('%', u.id, '%')
        END
      )
      WHERE wt.userId = ? AND wt.tenantId = ? AND wt.type IN ('transfer_in', 'transfer_out')
    `;
    
    let params = [userId, req.tenant.id];

    if (type && (type === 'sent' || type === 'received')) {
      query += ' AND wt.type = ?';
      params.push(type === 'sent' ? 'transfer_out' : 'transfer_in');
    }

    query += ' ORDER BY wt.createdAt DESC';

    const [transfers] = await poolWrapper.execute(query, params);

    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('❌ Error fetching transfers:', error);
    res.status(500).json({ success: false, message: 'Error fetching transfers' });
  }
});

// Search users for transfer
app.get('/api/users/search', async (req, res) => {
  try {
    const { query, excludeUserId } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query must be at least 2 characters' 
      });
    }

    let searchQuery = `
      SELECT id, name, email, user_id
      FROM users 
      WHERE tenantId = ? AND (name LIKE ? OR email LIKE ? OR user_id LIKE ?)
    `;
    
    let params = [req.tenant.id, `%${query}%`, `%${query}%`, `%${query}%`];

    if (excludeUserId) {
      searchQuery += ' AND id != ?';
      params.push(excludeUserId);
    }

    searchQuery += ' ORDER BY name LIMIT 10';

    const [users] = await poolWrapper.execute(searchQuery, params);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({ success: false, message: 'Error searching users' });
  }
});

// Return Requests Endpoints

// Get user's return requests
app.get('/api/return-requests', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const [returnRequests] = await poolWrapper.execute(`
      SELECT 
        rr.*,
        o.id as orderId,
        oi.productName,
        oi.productImage,
        oi.price as originalPrice,
        oi.quantity
      FROM return_requests rr
      JOIN orders o ON rr.orderId = o.id
      JOIN order_items oi ON rr.orderItemId = oi.id
      WHERE rr.userId = ? AND rr.tenantId = ?
      ORDER BY rr.createdAt DESC
    `, [userId, req.tenant.id]);

    res.json({ success: true, data: returnRequests });
  } catch (error) {
    console.error('❌ Error fetching return requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching return requests' });
  }
});

// Create new return request
app.post('/api/return-requests', async (req, res) => {
  try {
    const { userId, orderId, orderItemId, reason, description } = req.body;
    
    if (!userId || !orderId || !orderItemId || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Get order item details for refund amount
    const [orderItem] = await poolWrapper.execute(`
      SELECT oi.*, o.userId as orderUserId
      FROM order_items oi
      JOIN orders o ON oi.orderId = o.id
      WHERE oi.id = ? AND o.userId = ? AND oi.tenantId = ?
    `, [orderItemId, userId, req.tenant.id]);

    if (orderItem.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order item not found or not owned by user' 
      });
    }

    const refundAmount = parseFloat(orderItem[0].price) * parseInt(orderItem[0].quantity);

    // Check if return request already exists for this order item
    const [existingRequest] = await poolWrapper.execute(`
      SELECT id FROM return_requests 
      WHERE orderItemId = ? AND tenantId = ? AND status NOT IN ('rejected', 'cancelled')
    `, [orderItemId, req.tenant.id]);

    if (existingRequest.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu ürün için zaten bir iade talebi bulunmaktadır' 
      });
    }

    // Create return request
    const [result] = await poolWrapper.execute(`
      INSERT INTO return_requests (tenantId, userId, orderId, orderItemId, reason, description, refundAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.tenant.id, userId, orderId, orderItemId, reason, description || null, refundAmount]);

    res.json({ 
      success: true, 
      data: { returnRequestId: result.insertId },
      message: 'İade talebi başarıyla oluşturuldu' 
    });
  } catch (error) {
    console.error('❌ Error creating return request:', error);
    res.status(500).json({ success: false, message: 'Error creating return request' });
  }
});

// Cancel return request (user can cancel pending requests)
app.put('/api/return-requests/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Check if return request exists and belongs to user
    const [returnRequest] = await poolWrapper.execute(`
      SELECT id, status FROM return_requests 
      WHERE id = ? AND userId = ? AND tenantId = ?
    `, [id, userId, req.tenant.id]);

    if (returnRequest.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Return request not found' 
      });
    }

    if (returnRequest[0].status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Sadece beklemede olan iade talepleri iptal edilebilir' 
      });
    }

    await poolWrapper.execute(`
      UPDATE return_requests 
      SET status = 'cancelled', updatedAt = NOW()
      WHERE id = ?
    `, [id]);

    res.json({ success: true, message: 'İade talebi iptal edildi' });
  } catch (error) {
    console.error('❌ Error cancelling return request:', error);
    res.status(500).json({ success: false, message: 'Error cancelling return request' });
  }
});

// İyzico Payment Endpoints
const iyzicoService = new IyzicoService();

// Note: authenticateTenant middleware is now handled globally in the API key middleware above

// Process credit card payment - NO CARD DATA STORED
app.post('/api/payments/process', async (req, res) => {
  try {
    console.log('🔄 Processing payment - CARD DATA WILL NOT BE STORED');
    console.log('⚠️ SECURITY: Card information is processed but NOT saved to database');
    
    const {
      orderId,
      paymentCard,
      buyer,
      shippingAddress,
      billingAddress
    } = req.body;

    // Validate required fields
    if (!orderId || !paymentCard || !buyer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields'
      });
    }

    // Security validation for card data
    if (!paymentCard.cardNumber || !paymentCard.expireMonth || !paymentCard.expireYear || !paymentCard.cvc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card information provided'
      });
    }

    // Get order details
    const [orderRows] = await poolWrapper.execute(
      'SELECT * FROM orders WHERE id = ? AND tenantId = ?',
      [orderId, req.tenant.id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderRows[0];

    // Get order items
    const [itemRows] = await poolWrapper.execute(
      'SELECT * FROM order_items WHERE orderId = ? AND tenantId = ?',
      [orderId, req.tenant.id]
    );

    if (itemRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items found for this order'
      });
    }

    // Prepare payment data
    const paymentData = {
      price: order.totalAmount,
      paidPrice: order.totalAmount,
      currency: 'TRY',
      basketId: orderId,
      paymentCard: {
        cardHolderName: paymentCard.cardHolderName,
        cardNumber: paymentCard.cardNumber.replace(/\s/g, ''),
        expireMonth: paymentCard.expireMonth,
        expireYear: paymentCard.expireYear,
        cvc: paymentCard.cvc
      },
      buyer: {
        id: buyer.id || order.userId,
        name: buyer.name || order.customerName?.split(' ')[0] || 'John',
        surname: buyer.surname || order.customerName?.split(' ').slice(1).join(' ') || 'Doe',
        gsmNumber: buyer.gsmNumber || order.customerPhone || '+905555555555',
        email: buyer.email || order.customerEmail || 'test@test.com',
        identityNumber: buyer.identityNumber || '11111111111',
        registrationAddress: buyer.registrationAddress || order.shippingAddress,
        ip: req.ip || '127.0.0.1',
        city: buyer.city || order.city || 'Istanbul',
        country: buyer.country || 'Turkey',
        zipCode: buyer.zipCode || '34000'
      },
      shippingAddress: {
        contactName: shippingAddress?.contactName || order.customerName || 'Ahmet Yılmaz',
        city: shippingAddress?.city || order.city || 'Istanbul',
        country: shippingAddress?.country || 'Turkey',
        address: shippingAddress?.address || order.fullAddress || order.shippingAddress,
        zipCode: shippingAddress?.zipCode || '34000'
      },
      billingAddress: {
        contactName: billingAddress?.contactName || order.customerName || 'John Doe',
        city: billingAddress?.city || order.city || 'Istanbul',
        country: billingAddress?.country || 'Turkey',
        address: billingAddress?.address || order.fullAddress || order.shippingAddress,
        zipCode: billingAddress?.zipCode || '34000'
      },
      basketItems: itemRows.map(item => ({
        id: item.id,
        name: item.productName || 'Product',
        category1: item.productCategory || 'Outdoor',
        category2: item.productBrand || 'Product',
        price: parseFloat(item.price) * parseInt(item.quantity)
      }))
    };

    console.log('🔄 Processing İyzico payment for order:', orderId);

    // Process payment with İyzico
    const paymentResult = await iyzicoService.processPayment(paymentData);

    if (paymentResult.success) {
      // Update order status and payment info
      await poolWrapper.execute(
        `UPDATE orders SET 
         status = 'paid', 
         paymentStatus = 'completed',
         paymentId = ?,
         paymentProvider = 'iyzico',
         paidAt = NOW()
         WHERE id = ? AND tenantId = ?`,
        [paymentResult.paymentId, orderId, req.tenant.id]
      );

      // Log payment transaction
      await poolWrapper.execute(
        `INSERT INTO payment_transactions 
         (tenantId, orderId, paymentId, provider, amount, currency, status, transactionData, createdAt)
         VALUES (?, ?, ?, 'iyzico', ?, 'TRY', 'success', ?, NOW())`,
        [
          req.tenant.id, 
          orderId, 
          paymentResult.paymentId, 
          order.totalAmount,
          JSON.stringify(paymentResult)
        ]
      );

      console.log('✅ Payment successful for order:', orderId);
      console.log('✅ Card data processed and discarded - NOT stored in database');

      res.json({
        success: true,
        message: 'Payment completed successfully - Card data not stored',
        data: {
          orderId: orderId,
          paymentId: paymentResult.paymentId,
          amount: paymentResult.paidPrice,
          currency: paymentResult.currency,
          cardInfo: {
            lastFourDigits: paymentResult.lastFourDigits,
            cardType: paymentResult.cardType,
            cardAssociation: paymentResult.cardAssociation
          }
        }
      });

    } else {
      console.log('❌ Payment failed for order:', orderId);
      
      // Update order status
      await poolWrapper.execute(
        `UPDATE orders SET 
         status = 'payment_failed', 
         paymentStatus = 'failed'
         WHERE id = ? AND tenantId = ?`,
        [orderId, req.tenant.id]
      );

      res.status(400).json({
        success: false,
        error: paymentResult.error,
        message: iyzicoService.translateErrorMessage(paymentResult.message)
      });
    }

  } catch (error) {
    console.error('❌ Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: error.message
    });
  }
});

// Get payment status
app.get('/api/payments/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const [paymentRows] = await poolWrapper.execute(
      'SELECT * FROM payment_transactions WHERE paymentId = ? AND tenantId = ?',
      [paymentId, req.tenant.id]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = paymentRows[0];
    
    // Query İyzico for latest status
    try {
      const iyzicoResult = await iyzicoService.retrievePayment(paymentId, payment.conversationId);
      
      res.json({
        success: true,
        data: {
          paymentId: paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt,
          iyzicoStatus: iyzicoResult.status
        }
      });
    } catch (iyzicoError) {
      // Return local data if İyzico query fails
      res.json({
        success: true,
        data: {
          paymentId: paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt
        }
      });
    }

  } catch (error) {
    console.error('❌ Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment status'
    });
  }
});

// Test cards endpoint (sandbox only)
app.get('/api/payments/test-cards', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Test cards not available in production'
    });
  }

  res.json({
    success: true,
    data: IyzicoService.getTestCards()
  });
});

// Get user's returnable orders
app.get('/api/orders/returnable', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const [orders] = await poolWrapper.execute(`
      SELECT 
        o.id as orderId,
        o.createdAt as orderDate,
        o.status as orderStatus,
        oi.id as orderItemId,
        oi.productName,
        oi.productImage,
        oi.price,
        oi.quantity,
        CASE 
          WHEN rr.id IS NOT NULL THEN rr.status
          ELSE NULL
        END as returnStatus
      FROM orders o
      JOIN order_items oi ON o.id = oi.orderId
      LEFT JOIN return_requests rr ON oi.id = rr.orderItemId AND rr.status NOT IN ('rejected', 'cancelled')
      WHERE o.userId = ? AND o.tenantId = ? AND o.status IN ('delivered')
      ORDER BY o.createdAt DESC, oi.id
    `, [userId, req.tenant.id]);

    // Group by order
    const ordersMap = {};
    orders.forEach(row => {
      if (!ordersMap[row.orderId]) {
        ordersMap[row.orderId] = {
          orderId: row.orderId,
          orderDate: row.orderDate,
          orderStatus: row.orderStatus,
          items: []
        };
      }
      
      ordersMap[row.orderId].items.push({
        orderItemId: row.orderItemId,
        productName: row.productName,
        productImage: row.productImage,
        price: row.price,
        quantity: row.quantity,
        returnStatus: row.returnStatus,
        canReturn: !row.returnStatus // Can return if no active return request
      });
    });

    const result = Object.values(ordersMap);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error fetching returnable orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching returnable orders' });
  }
});

// Admin authentication middleware
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'berat1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '38cdfD8217..';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'huglu-admin-token-2025';

function authenticateAdmin(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.substring('Bearer '.length) : null;
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }
  next();
}

// Admin login endpoint (username/password -> token)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    // ===== Brute-force koruması (kullanıcı+IP bazlı) =====
    // Hafif, sunucu restartında sıfırlanan in-memory kayıt. Üretimde kalıcı storage önerilir.
    if (!global.__ADMIN_BRUTE_FORCE) global.__ADMIN_BRUTE_FORCE = new Map();
    const getIp = (r) => {
      const xf = (r.headers['x-forwarded-for'] || '').toString();
      if (xf) return xf.split(',')[0].trim();
      return (r.ip || r.connection?.remoteAddress || r.socket?.remoteAddress || 'unknown').toString();
    };
    const clientIp = getIp(req);
    const userKey = (username || 'unknown').toLowerCase();
    const key = `${userKey}|${clientIp}`;
    const now = Date.now();
    const rec = global.__ADMIN_BRUTE_FORCE.get(key) || { count: 0, lockUntil: 0, last: 0 };
    if (rec.lockUntil && now < rec.lockUntil) {
      const msLeft = rec.lockUntil - now;
      const minutes = Math.ceil(msLeft / 60000);
      // Log blocked attempt
      try { 
        dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_BLOCKED', clientIp, { attempts: rec.count, lockUntil: new Date(rec.lockUntil).toISOString() });
        // persist security event
        await poolWrapper.execute(
          'INSERT INTO security_events (eventType, username, ip, userAgent, details, severity) VALUES (?, ?, ?, ?, ?, ?)',
          ['BRUTE_FORCE', userKey, clientIp, (req.headers['user-agent']||'').toString(), JSON.stringify({ attempts: rec.count, lockUntil: rec.lockUntil }), 'high']
        );
      } catch(_) {}
      return res.status(429).json({ success: false, message: `Çok fazla hatalı deneme. Lütfen ${minutes} dakika sonra tekrar deneyin.` });
    }

    if (!username || !password) {
      // Eksik bilgi de hatalı deneme sayılır
      rec.count = (rec.count || 0) + 1;
      rec.last = now;
      // Eşikler: 10→10dk, 20→30dk, 25→1gün
      if (rec.count >= 25) rec.lockUntil = now + 24 * 60 * 60 * 1000;
      else if (rec.count >= 20) rec.lockUntil = now + 30 * 60 * 1000;
      else if (rec.count >= 10) rec.lockUntil = now + 10 * 60 * 1000;
      global.__ADMIN_BRUTE_FORCE.set(key, rec);
      try { 
        dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_FAILED', clientIp, { reason: 'missing_fields', attempts: rec.count, lockUntil: rec.lockUntil || null });
        await poolWrapper.execute('INSERT INTO security_events (eventType, username, ip, userAgent, details, severity) VALUES (?, ?, ?, ?, ?, ?)',
          ['BRUTE_FORCE', userKey, clientIp, (req.headers['user-agent']||'').toString(), JSON.stringify({ reason: 'missing_fields', attempts: rec.count, lockUntil: rec.lockUntil || null }), 'medium']);
      } catch(_) {}
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gerekli' });
    }
    // DB tabanlı admin doğrulama (varsayılan admin: berat1/berat1)
    try {
      // Aktif tenant yoksa oluştur
      let tenantId = null;
      const [tenants] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
      if (tenants.length > 0) {
        tenantId = tenants[0].id;
      } else {
        const apiKey = 'admin_default_' + Math.random().toString(36).slice(2);
        const [ins] = await poolWrapper.execute(
          'INSERT INTO tenants (name, domain, subdomain, apiKey, settings, isActive) VALUES (?, NULL, NULL, ?, ?, true)',
          ['Huğlu Outdoor', apiKey, JSON.stringify({})]
        );
        tenantId = ins.insertId;
      }

      const ADMIN_USERNAME_FIXED = 'berat1';
      const ADMIN_EMAIL = ADMIN_USERNAME_FIXED + '@admin.local';

      // Admin kullanıcıyı seed et (yoksa oluştur)
      const [existingAdmin] = await poolWrapper.execute('SELECT id, password FROM users WHERE email = ? AND role = "admin" LIMIT 1', [ADMIN_EMAIL]);
      if (existingAdmin.length === 0) {
        const userIdStr = (Math.floor(10000000 + Math.random() * 90000000)).toString();
        const seededHash = await hashPassword('berat1');
        await poolWrapper.execute(
          'INSERT INTO users (user_id, tenantId, name, email, password, role, isActive, createdAt) VALUES (?, ?, ?, ?, ?, "admin", true, NOW())',
          [userIdStr, tenantId, 'Admin', ADMIN_EMAIL, seededHash]
        );
      }

      // Giriş kontrolü
      const [adminRows] = await poolWrapper.execute('SELECT id, password FROM users WHERE email = ? AND role = "admin" LIMIT 1', [ADMIN_EMAIL]);
      const stored = adminRows[0]?.password || '';
      const passwordOk = await verifyPassword(password, stored);
      const ok = (username === ADMIN_USERNAME_FIXED) && passwordOk;
      if (ok) {
        if (!rec.lockUntil || now >= rec.lockUntil) {
          global.__ADMIN_BRUTE_FORCE.delete(key);
        }
        try { dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_SUCCESS', clientIp, {}); } catch(_) {}
        return res.json({ success: true, token: ADMIN_TOKEN });
      }
    } catch (dbErr) {
      console.error('❌ Admin DB auth error:', dbErr);
    }
    // Hatalı şifre: sayacı artır ve gerekirse kilitle
    rec.count = (rec.count || 0) + 1;
    rec.last = now;
    if (rec.count >= 25) rec.lockUntil = now + 24 * 60 * 60 * 1000; // 1 gün
    else if (rec.count >= 20) rec.lockUntil = now + 30 * 60 * 1000; // 30 dk
    else if (rec.count >= 10) rec.lockUntil = now + 10 * 60 * 1000; // 10 dk
    global.__ADMIN_BRUTE_FORCE.set(key, rec);
    try { 
      dbSecurity && dbSecurity.logDatabaseAccess(userKey, 'ADMIN_LOGIN_FAILED', clientIp, { reason: 'invalid_credentials', attempts: rec.count, lockUntil: rec.lockUntil || null });
      await poolWrapper.execute('INSERT INTO security_events (eventType, username, ip, userAgent, details, severity) VALUES (?, ?, ?, ?, ?, ?)',
        ['BRUTE_FORCE', userKey, clientIp, (req.headers['user-agent']||'').toString(), JSON.stringify({ reason: 'invalid_credentials', attempts: rec.count, lockUntil: rec.lockUntil || null }), rec.count >= 20 ? 'high' : 'medium']);
    } catch(_) {}
    return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı bilgileri' });
  } catch (e) {
    console.error('❌ Admin login error:', e);
    res.status(500).json({ success: false, message: 'Login sırasında hata' });
  }
});

// Admin - Update return request status
app.put('/api/admin/return-requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const updateData = [status];
    const updateFields = ['status = ?'];
    
    if (adminNotes) {
      updateFields.push('adminNotes = ?');
      updateData.push(adminNotes);
    }
    
    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      updateFields.push('processedDate = NOW()');
    }
    
    updateData.push(id);

    await poolWrapper.execute(`
      UPDATE return_requests 
      SET ${updateFields.join(', ')}, updatedAt = NOW()
      WHERE id = ?
    `, updateData);

    res.json({ success: true, message: 'Return request status updated' });
  } catch (error) {
    console.error('❌ Error updating return request status:', error);
    res.status(500).json({ success: false, message: 'Error updating return request status' });
  }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Admin stats requested');
    const rangeDays = Math.max(1, Math.min(365, parseInt(req.query.range || '30')));
    
    // Kullanıcı sayısı
    const [userCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM users');
    
    // Ürün sayısı
    const [productCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM products');
    
    // Sipariş sayısı
    const [orderCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM orders');
    
    // Tenant sayısı
    const [tenantCount] = await poolWrapper.execute('SELECT COUNT(*) as count FROM tenants');
    
    // Seçilen aralıktaki siparişler ve gelir
    const [recentOrders] = await poolWrapper.execute(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(totalAmount), 0) as revenue 
      FROM orders 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND status != 'cancelled'
    `, [rangeDays]);
    
    // Bu ayın geliri
    const [monthlyRevenue] = await poolWrapper.execute(`
      SELECT COALESCE(SUM(totalAmount), 0) as revenue 
      FROM orders 
      WHERE DATE_FORMAT(createdAt, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        AND status != 'cancelled'
    `);
    
    const stats = {
      users: userCount[0].count,
      products: productCount[0].count,
      orders: orderCount[0].count,
      tenants: tenantCount[0].count,
      monthlyRevenue: monthlyRevenue[0].revenue || 0,
      monthlyOrders: recentOrders[0].count || 0
    };
    
    console.log('📊 Stats calculated:', stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting stats',
      error: error.message 
    });
  }
});

// Admin Chart Data
app.get('/api/admin/charts', authenticateAdmin, async (req, res) => {
  try {
    console.log('📈 Admin charts requested');
    const rangeDays = Math.max(1, Math.min(365, parseInt(req.query.range || '7')));
    
    // Seçilen gün aralığı satışlar
    const [dailySales] = await poolWrapper.execute(`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as orders,
        COALESCE(SUM(totalAmount), 0) as revenue
      FROM orders 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND status != 'cancelled'
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `, [rangeDays]);
    
    // Sipariş durumları
    const [orderStatuses] = await poolWrapper.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);
    
    // Son 6 aylık gelir
    const [monthlyRevenue] = await poolWrapper.execute(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COALESCE(SUM(totalAmount), 0) as revenue
      FROM orders 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND status != 'cancelled'
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `);
    
    // En çok satan ürünler (top 5) - seçili aralıkta
    const [topProducts] = await poolWrapper.execute(`
      SELECT 
        p.name,
        SUM(oi.quantity) as totalSold,
        p.price,
        SUM(oi.quantity * oi.price) as totalRevenue
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled' AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.id, p.name, p.price
      ORDER BY totalSold DESC
      LIMIT 5
    `, [rangeDays]);

    // Kategorisel satış dağılımı (seçili aralık)
    const [categorySales] = await poolWrapper.execute(`
      SELECT 
        p.category as category,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as units
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled' AND o.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.category
      ORDER BY revenue DESC
    `, [rangeDays]);
    
    const chartData = {
      dailySales: dailySales || [],
      orderStatuses: orderStatuses || [],
      monthlyRevenue: monthlyRevenue || [],
      topProducts: topProducts || [],
      categorySales: categorySales || []
    };
    
    console.log('📈 Charts calculated:', {
      dailySalesCount: chartData.dailySales.length,
      orderStatusesCount: chartData.orderStatuses.length,
      monthlyRevenueCount: chartData.monthlyRevenue.length,
      topProductsCount: chartData.topProducts.length
    });
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('❌ Error getting chart data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting chart data',
      error: error.message 
    });
  }
});

// Admin Security: list security events
app.get('/api/admin/security/login-attempts', authenticateAdmin, async (req, res) => {
  try {
    const range = Math.max(1, Math.min(365, parseInt(req.query.range || '7')));
    const q = (req.query.q || '').toString().trim();
    const ip = (req.query.ip || '').toString().trim();
    const params = [];
    let where = 'WHERE detectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    params.push(range);
    if (q) { where += ' AND (username LIKE ? OR JSON_EXTRACT(details, "$.email") LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (ip) { where += ' AND ip LIKE ?'; params.push(`%${ip}%`); }
    where += ' AND eventType = "BRUTE_FORCE"';
    const [rows] = await poolWrapper.execute(`SELECT id, eventType, username, ip, userAgent, details, severity, detectedAt, resolved, resolvedAt FROM security_events ${where} ORDER BY detectedAt DESC LIMIT 500`, params);
    const data = rows.map(r => ({
      id: r.id,
      eventType: r.eventType,
      username: r.username,
      ip: r.ip,
      userAgent: r.userAgent,
      details: (typeof r.details === 'string' ? (()=>{ try{return JSON.parse(r.details);}catch(_){return { raw:r.details };} })() : r.details) || {},
      severity: r.severity,
      timestamp: r.detectedAt,
      resolved: !!r.resolved,
      resolvedAt: r.resolvedAt
    }));
    res.json({ success: true, data });
  } catch (e) {
    console.error('❌ Error listing security events:', e);
    res.status(500).json({ success: false, message: 'Security events could not be loaded' });
  }
});

// Admin Security: server resource usage
app.get('/api/admin/security/server-stats', authenticateAdmin, async (req, res) => {
  try {
    const os = require('os');
    const load = os.loadavg ? os.loadavg() : [0,0,0];
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const cpuCount = os.cpus()?.length || 1;
    const uptime = os.uptime();
    res.json({
      success: true,
      data: {
        cpu: { cores: cpuCount, load1: load[0] || 0, load5: load[1] || 0, load15: load[2] || 0 },
        memory: { total: memTotal, used: memUsed, free: memFree, usedPercent: memTotal ? (memUsed / memTotal) * 100 : 0 },
        uptimeSeconds: uptime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('❌ Error getting server stats:', e);
    res.status(500).json({ success: false, message: 'Failed to read server stats' });
  }
});

// Admin - Top Customers (most orders and total spent)
app.get('/api/admin/top-customers', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10');
    const [rows] = await poolWrapper.execute(`
      SELECT 
        u.id as userId,
        u.name,
        u.email,
        u.phone,
        COUNT(o.id) AS orderCount,
        COALESCE(SUM(o.totalAmount), 0) AS totalSpent,
        MAX(o.createdAt) AS lastOrderAt
      FROM users u
      JOIN orders o ON o.userId = u.id
      WHERE o.status != 'cancelled'
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY orderCount DESC, totalSpent DESC
      LIMIT ?
    `, [limit]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting top customers:', error);
    res.status(500).json({ success: false, message: 'Error getting top customers' });
  }
});

// Admin - User management
app.put('/api/admin/users/:id/role', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body || {};
    if (!['user','admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Geçersiz rol' });
    }
    await poolWrapper.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({ success: true, message: 'Kullanıcı rolü güncellendi' });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Error updating user role' });
  }
});

app.put('/api/admin/users/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body || {};
    const activeVal = !!isActive;
    await poolWrapper.execute('UPDATE users SET isActive = ? WHERE id = ?', [activeVal, userId]);
    res.json({ success: true, message: 'Kullanıcı durumu güncellendi' });
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Error updating user status' });
  }
});

app.post('/api/admin/users/:id/reset-password', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    let { newPassword } = req.body || {};
    if (!newPassword) newPassword = Math.random().toString(36).slice(-10);
    const hashed = await hashPassword(newPassword);
    await poolWrapper.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    res.json({ success: true, message: 'Şifre sıfırlandı', data: { newPassword } });
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Admin - change own password (berat1 account)
app.post('/api/admin/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mevcut ve yeni şifre gerekli' });
    }
    const ADMIN_EMAIL = 'berat1@admin.local';
    const [rows] = await poolWrapper.execute('SELECT id, password FROM users WHERE email = ? AND role = "admin" LIMIT 1', [ADMIN_EMAIL]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Admin bulunamadı' });
    const ok = await verifyPassword(currentPassword, rows[0].password);
    if (!ok) return res.status(401).json({ success: false, message: 'Mevcut şifre hatalı' });
    const hashedNew = await hashPassword(newPassword);
    await poolWrapper.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNew, rows[0].id]);
    return res.json({ success: true, message: 'Şifre güncellendi' });
  } catch (error) {
    console.error('❌ change-password error:', error);
    res.status(500).json({ success: false, message: 'Şifre güncellenemedi' });
  }
});

// Admin - full backup (export all tables for active tenant)
app.get('/api/admin/backup', authenticateAdmin, async (req, res) => {
  try {
    const [tenantRows] = await poolWrapper.execute('SELECT id FROM tenants WHERE isActive = true ORDER BY id ASC LIMIT 1');
    if (tenantRows.length === 0) return res.status(404).json({ success: false, message: 'Aktif tenant yok' });
    const tenantId = tenantRows[0].id;

    // Kapsamlı tablo listesi (şemadaki tüm işlevsel tablolar)
    const tables = [
      'tenants',
      'users',
      'categories',
      'products','product_variations','product_variation_options',
      'orders','order_items','cart',
      'user_wallets','wallet_transactions','wallet_recharge_requests',
      'custom_production_requests','custom_production_items',
      'reviews','security_events','chatbot_analytics','referral_earnings',
      'recommendations',
      'customer_segments','customer_segment_assignments','campaigns','campaign_usage','customer_analytics',
      'discount_wheel_spins'
    ];
    const data = {};
    for (const t of tables) {
      try {
        let rows;
        if (t === 'tenants') {
          [rows] = await poolWrapper.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
        } else {
          // Önce tenantId filtresiyle dene
          try {
            [rows] = await poolWrapper.execute(`SELECT * FROM ${t} WHERE tenantId = ?`, [tenantId]);
          } catch (e1) {
            // tenantId kolonu yoksa tüm satırları al (bazı ilişkisel tablolar)
            try {
              [rows] = await poolWrapper.execute(`SELECT * FROM ${t}`);
            } catch (e2) {
              console.warn('Backup table skip:', t, e2.message);
              rows = [];
            }
          }
        }
        data[t] = rows;
      } catch (err) {
        console.warn('Backup table error:', t, err.message);
        data[t] = [];
      }
    }
    return res.json({ success: true, tenantId, exportedAt: new Date().toISOString(), data });
  } catch (error) {
    console.error('❌ Backup error:', error);
    res.status(500).json({ success: false, message: 'Backup alınamadı' });
  }
});

// Admin - full restore (dangerous)
app.post('/api/admin/restore', authenticateAdmin, async (req, res) => {
  const conn = await poolWrapper.getConnection();
  try {
    const payload = req.body || {};
    const data = payload.data || {};
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Geçersiz veri' });
    }

    await conn.beginTransaction();
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tableOrder = [
      // child -> parent sırası silme için
      'order_items','orders',
      'product_variation_options','product_variations','products','categories',
      'cart',
      'wallet_transactions','user_wallets','wallet_recharge_requests',
      'custom_production_items','custom_production_requests',
      'campaign_usage','campaigns','customer_segment_assignments','customer_segments',
      'customer_analytics',
      'reviews','recommendations','chatbot_analytics','referral_earnings','discount_wheel_spins',
      'security_events',
      'users',
      'tenants'
    ];

    // Truncate then insert
    for (const t of tableOrder) {
      try { await conn.execute(`DELETE FROM ${t}`); } catch(_) {}
    }
    for (const t of Object.keys(data)) {
      const rows = Array.isArray(data[t]) ? data[t] : [];
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const placeholders = '(' + cols.map(()=> '?').join(',') + ')';
      const sql = `INSERT INTO ${t} (${cols.join(',')}) VALUES ${rows.map(()=> placeholders).join(',')}`;
      const values = [];
      rows.forEach(r => cols.forEach(c => values.push(r[c])));
      try { await conn.execute(sql, values); } catch (e) { console.warn('Restore insert warn', t, e.message); }
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    res.json({ success: true, message: 'Veriler geri yüklendi' });
  } catch (error) {
    try { await conn.rollback(); } catch(_) {}
    console.error('❌ Restore error:', error);
    res.status(500).json({ success: false, message: 'Geri yükleme başarısız' });
  } finally {
    try { await conn.release(); } catch(_) {}
  }
});
// Admin - List carts summary per user
app.get('/api/admin/carts', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(`
      SELECT u.id as userId, u.name as userName, u.email as userEmail,
             COUNT(c.id) as itemLines,
             COALESCE(SUM(c.quantity),0) as totalQuantity
      FROM users u
      LEFT JOIN cart c ON c.userId = u.id
      GROUP BY u.id, u.name, u.email
      ORDER BY totalQuantity DESC, itemLines DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error listing carts:', error);
    res.status(500).json({ success: false, message: 'Error listing carts' });
  }
});

// Admin - panel config read/write (admin-panel/config.json)
app.get('/api/admin/panel-config', authenticateAdmin, async (req, res) => {
  try {
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let cfg = null;
    try {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      cfg = JSON.parse(raw);
    } catch (_) {
      cfg = {
        API_BASE_URL: 'https://api.zerodaysoftware.tr/api',
        ADMIN_TOKEN: '',
        TENANT_API_KEY: '',
        FTP_BACKUP: { enabled: false, host: '', port: 21, user: '', password: '', remoteDir: '/backups' }
      };
      try { fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf-8'); } catch(_){}
    }
    return res.json({ success: true, data: cfg });
  } catch (e) {
    console.error('❌ Read panel-config error:', e);
    res.status(500).json({ success: false, message: 'Config okunamadı' });
  }
});

app.post('/api/admin/panel-config', authenticateAdmin, async (req, res) => {
  try {
    const cfgPath = path.join(__dirname, '..', 'admin-panel', 'config.json');
    let current = {};
    try { current = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); } catch(_) {}
    const incoming = req.body || {};
    const merged = { ...current, ...incoming };
    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Config kaydedildi', data: merged });
  } catch (e) {
    console.error('❌ Write panel-config error:', e);
    res.status(500).json({ success: false, message: 'Config kaydedilemedi' });
  }
});

// Admin - Get detailed cart for a user
app.get('/api/admin/carts/:userId', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [userRows] = await poolWrapper.execute('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const [items] = await poolWrapper.execute(`
      SELECT c.id, c.quantity, c.variationString,
             p.id as productId, p.name as productName, p.price as productPrice, p.image as productImage
      FROM cart c
      LEFT JOIN products p ON p.id = c.productId
      WHERE c.userId = ?
      ORDER BY c.createdAt DESC
    `, [userId]);
    const totalQuantity = items.reduce((s, i) => s + (i.quantity || 0), 0);
    res.json({ success: true, data: { user: userRows[0], items, totalQuantity } });
  } catch (error) {
    console.error('❌ Error getting user cart:', error);
    res.status(500).json({ success: false, message: 'Error getting user cart' });
  }
});

// Admin - List customer wallets
app.get('/api/admin/wallets', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(`
      SELECT u.id as userId, u.name as userName, u.email as userEmail,
             COALESCE(w.balance,0) as balance, w.currency
      FROM users u
      LEFT JOIN user_wallets w ON w.userId = u.id
      ORDER BY balance DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error listing wallets:', error);
    res.status(500).json({ success: false, message: 'Error listing wallets' });
  }
});

// Admin - Adjust customer wallet balance
app.post('/api/admin/wallets/adjust', authenticateAdmin, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body || {};
    const adj = parseFloat(amount);
    if (!userId || isNaN(adj)) {
      return res.status(400).json({ success: false, message: 'Invalid userId or amount' });
    }
    // Ensure wallet exists
    await poolWrapper.execute(`
      INSERT INTO user_wallets (tenantId, userId, balance, currency)
      VALUES (?, ?, 0, 'TRY')
      ON DUPLICATE KEY UPDATE balance = balance
    `, [1, userId]);
    // Update balance
    await poolWrapper.execute('UPDATE user_wallets SET balance = balance + ? WHERE userId = ? AND tenantId = ?', [adj, userId, 1]);
    // Log transaction
    await poolWrapper.execute(`
      INSERT INTO wallet_transactions (tenantId, userId, type, amount, description, status)
      VALUES (?, ?, ?, ?, ?, 'completed')
    `, [1, userId, adj >= 0 ? 'credit' : 'debit', Math.abs(adj), reason || 'Admin adjustment']);
    res.json({ success: true, message: 'Balance adjusted' });
  } catch (error) {
    console.error('❌ Error adjusting wallet:', error);
    res.status(500).json({ success: false, message: 'Error adjusting wallet' });
  }
});

// Admin - Live user product views (from JSON log for now)
app.get('/api/admin/live-views', authenticateAdmin, async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'user-activities.json');
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, data: [] });
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    // Filter only product view events and map to desired fields
    const views = (json.activities || json || []).filter(a => 
      a.activityType === 'product_viewed' || a.activityType === 'product_detail_viewed' || a.activityType === 'page_view_product'
    ).map(a => ({
      userId: a.userId || a.user_id || null,
      productId: a.productId || a.product_id || null,
      productName: a.productName || a.product_name || '-',
      viewedAt: a.activityTimestamp || a.viewTimestamp || a.timestamp || null,
      dwellSeconds: a.viewDuration || a.dwellSeconds || a.duration || 0,
      addedToCart: !!a.addedToCart,
      purchased: !!a.purchased
    }));
    res.json({ success: true, data: views });
  } catch (error) {
    console.error('❌ Error reading live views:', error);
    res.status(500).json({ success: false, message: 'Error reading live views' });
  }
});
// Admin - Custom Production Requests
app.get('/api/admin/custom-production-requests', authenticateAdmin, async (req, res) => {
  try {
    // Detect optional quote columns to avoid SELECT errors on fresh DBs
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = new Set(cols.map(c => c.COLUMN_NAME));
    const baseCols = [
      'id','userId','tenantId','status','totalQuantity','totalAmount','notes','createdAt'
    ];
    const optionalCols = [
      'quoteAmount','quoteCurrency','quoteNotes','quoteStatus','quotedAt','quoteValidUntil'
    ];
    const selectCols = baseCols
      .concat(optionalCols.filter(n => names.has(n)))
      .join(', ');

    const [requests] = await poolWrapper.execute(
      `SELECT ${selectCols} FROM custom_production_requests ORDER BY createdAt DESC`
    );
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('❌ Error getting custom production requests:', error);
    res.status(500).json({ success: false, message: 'Error getting custom production requests' });
  }
});

app.get('/api/admin/custom-production-requests/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute('SELECT * FROM custom_production_requests WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });
    const [items] = await poolWrapper.execute('SELECT * FROM custom_production_items WHERE requestId = ?', [id]);
    res.json({ success: true, data: { ...rows[0], items } });
  } catch (error) {
    console.error('❌ Error getting custom production request:', error);
    res.status(500).json({ success: false, message: 'Error getting request' });
  }
});

app.put('/api/admin/custom-production-requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, estimatedDeliveryDate, actualDeliveryDate, notes } = req.body || {};
    const validStatuses = ['pending', 'review', 'design', 'production', 'shipped', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum' });
    }
    const fields = ['status = ?'];
    const params = [status];
    if (estimatedDeliveryDate) { fields.push('estimatedDeliveryDate = ?'); params.push(estimatedDeliveryDate); }
    if (actualDeliveryDate) { fields.push('actualDeliveryDate = ?'); params.push(actualDeliveryDate); }
    if (notes) { fields.push('notes = ?'); params.push(notes); }
    params.push(id);
    await poolWrapper.execute(`UPDATE custom_production_requests SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, params);
    res.json({ success: true, message: 'Durum güncellendi' });
  } catch (error) {
    console.error('❌ Error updating custom production status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

// Ensure quote columns exist (idempotent) and set quote
app.post('/api/admin/custom-production-requests/:id/quote', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quoteAmount, quoteCurrency = 'TRY', quoteNotes = '', quoteValidUntil } = req.body || {};
    if (quoteAmount === undefined || quoteAmount === null || isNaN(parseFloat(quoteAmount))) {
      return res.status(400).json({ success: false, message: 'Geçersiz teklif tutarı' });
    }
    // Ensure columns exist
    const [cols] = await poolWrapper.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_production_requests'
    `);
    const names = cols.map(c => c.COLUMN_NAME);
    const alters = [];
    if (!names.includes('quoteAmount')) alters.push("ADD COLUMN quoteAmount DECIMAL(10,2) NULL AFTER notes");
    if (!names.includes('quoteCurrency')) alters.push("ADD COLUMN quoteCurrency VARCHAR(10) DEFAULT 'TRY' AFTER quoteAmount");
    if (!names.includes('quoteNotes')) alters.push('ADD COLUMN quoteNotes TEXT AFTER quoteCurrency');
    if (!names.includes('quoteStatus')) alters.push("ADD COLUMN quoteStatus ENUM('none','sent','accepted','rejected') DEFAULT 'none' AFTER quoteNotes");
    if (!names.includes('quotedAt')) alters.push('ADD COLUMN quotedAt TIMESTAMP NULL AFTER quoteStatus');
    if (!names.includes('quoteValidUntil')) alters.push('ADD COLUMN quoteValidUntil TIMESTAMP NULL AFTER quotedAt');
    if (alters.length > 0) {
      await poolWrapper.execute(`ALTER TABLE custom_production_requests ${alters.join(', ')}`);
    }
    // Update quote
    await poolWrapper.execute(`
      UPDATE custom_production_requests 
      SET quoteAmount = ?, quoteCurrency = ?, quoteNotes = ?, quoteStatus = 'sent', quotedAt = NOW(), quoteValidUntil = ?
      WHERE id = ?
    `, [parseFloat(quoteAmount), quoteCurrency, quoteNotes, quoteValidUntil || null, id]);
    res.json({ success: true, message: 'Teklif gönderildi' });
  } catch (error) {
    console.error('❌ Error setting quote:', error);
    res.status(500).json({ success: false, message: 'Error setting quote' });
  }
});

// Admin - Tüm kullanıcıları listele
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const [rows] = await poolWrapper.execute(`
      SELECT u.id, u.name, u.email, u.phone, u.createdAt, t.name as tenantName 
      FROM users u 
      LEFT JOIN tenants t ON u.tenantId = t.id
      ORDER BY u.createdAt DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({ success: false, message: 'Error getting users' });
  }
});

// Admin - Tüm siparişleri listele
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', dateFrom = '', dateTo = '', q = '' } = req.query;
    const offset = (page - 1) * limit;

    // Build filters
    const whereClauses = [];
    const params = [];
    if (status) {
      whereClauses.push('o.status = ?');
      params.push(String(status));
    }
    if (dateFrom) {
      whereClauses.push('o.createdAt >= ?');
      params.push(new Date(dateFrom));
    }
    if (dateTo) {
      whereClauses.push('o.createdAt <= ?');
      params.push(new Date(dateTo + ' 23:59:59'));
    }
    if (q) {
      whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Get orders with product details
    const [orders] = await poolWrapper.execute(
      `
      SELECT o.id, o.totalAmount, o.status, o.createdAt, o.city, o.district, o.fullAddress, o.shippingAddress,
             u.name as userName, u.email as userEmail, 
             t.name as tenantName
      FROM orders o 
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN tenants t ON o.tenantId = t.id
      ${whereSql}
      ORDER BY o.createdAt DESC 
      LIMIT ? OFFSET ?
      `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get order items for each order
    for (let order of orders) {
      const [orderItems] = await poolWrapper.execute(`
        SELECT oi.quantity, oi.price, 
               p.name as productName, p.image as productImage
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `, [order.id]);
      
      order.items = orderItems;
      order.itemCount = orderItems.length;
    }
    
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error getting orders:', error);
    res.status(500).json({ success: false, message: 'Error getting orders' });
  }
});

// Admin - Tek sipariş detayı
app.get('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get order details
    const [orders] = await poolWrapper.execute(`
      SELECT o.id, o.totalAmount, o.status, o.createdAt, o.city, o.district, o.fullAddress, o.shippingAddress, o.paymentMethod,
             u.name as userName, u.email as userEmail, 
             t.name as tenantName
      FROM orders o 
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN tenants t ON o.tenantId = t.id
      WHERE o.id = ?
    `, [id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Get order items
    const [orderItems] = await poolWrapper.execute(`
      SELECT oi.quantity, oi.price, 
             p.name as productName, p.image as productImage
      FROM order_items oi
      LEFT JOIN products p ON oi.productId = p.id
      WHERE oi.orderId = ?
    `, [id]);
    
    order.items = orderItems;
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ Error getting order details:', error);
    res.status(500).json({ success: false, message: 'Error getting order details' });
  }
});

// Admin - Sipariş durumu güncelle
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }
    
    await poolWrapper.execute(
      'UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?',
      [status, id]
    );
    
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

// Admin - Generate shipping label (simple HTML payload)
app.post('/api/admin/orders/:id/shipping-label', authenticateAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const [rows] = await poolWrapper.execute(`
      SELECT o.*, u.name as userName, u.email as userEmail, u.phone as userPhone, t.name as tenantName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN tenants t ON o.tenantId = t.id
      WHERE o.id = ?
    `, [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const o = rows[0];
    const [items] = await poolWrapper.execute(`
      SELECT productName, quantity FROM order_items WHERE orderId = ?
    `, [orderId]);

    const createdAt = new Date().toISOString();
    // Gönderen adını normalize et: "default tenant/tenat" ya da boşsa "huğlu outdoor" kullan
    const rawTenantName = (o.tenantName || '').toString();
    const normalized = rawTenantName.trim().toLowerCase();
    const finalShipFrom = (!normalized || normalized === 'default tenant' || normalized === 'default tenat')
      ? 'huğlu outdoor'
      : rawTenantName;
    const label = {
      orderId: o.id,
      barcode: `HGL${o.id}`,
      createdAt,
      shipFrom: finalShipFrom,
      shipTo: {
        name: o.customerName || o.userName || 'Müşteri',
        address: o.fullAddress || o.shippingAddress || '-',
        city: o.city || '-',
        district: o.district || '-',
        phone: o.customerPhone || o.userPhone || '-'
      },
      items: items.map(i => ({ name: i.productName, qty: i.quantity })),
      totalItems: items.length
    };
    res.json({ success: true, data: label });
  } catch (error) {
    console.error('❌ Error generating shipping label:', error);
    res.status(500).json({ success: false, message: 'Error generating shipping label' });
  }
});

// Tenant Management endpoints
app.post('/api/tenants', async (req, res) => {
  try {
    const { name, domain, subdomain, settings } = req.body;
    
    // Generate secure API key
    const apiKey = generateSecureApiKey();
    
    const [result] = await poolWrapper.execute(
      'INSERT INTO tenants (name, domain, subdomain, apiKey, settings) VALUES (?, ?, ?, ?, ?)',
      [name, domain || null, subdomain || null, apiKey, JSON.stringify(settings || {})]
    );
    
    res.json({ 
      success: true, 
      data: { 
        tenantId: result.insertId,
        apiKey: apiKey
      },
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating tenant:', error);
    res.status(500).json({ success: false, message: 'Error creating tenant' });
  }
});

app.get('/api/tenants', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, domain, subdomain, isActive, createdAt FROM tenants ORDER BY createdAt DESC'
    );
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting tenants:', error);
    res.status(500).json({ success: false, message: 'Error getting tenants' });
  }
});

app.get('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, domain, subdomain, settings, isActive, createdAt, updatedAt FROM tenants WHERE id = ?',
      [id]
    );
    
    if (rows.length > 0) {
      const tenant = rows[0];
      if (tenant.settings) {
        tenant.settings = JSON.parse(tenant.settings);
      }
      res.json({ success: true, data: tenant });
    } else {
      res.status(404).json({ success: false, message: 'Tenant not found' });
    }
  } catch (error) {
    console.error('❌ Error getting tenant:', error);
    res.status(500).json({ success: false, message: 'Error getting tenant' });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, subdomain, settings, isActive } = req.body;
    
    await poolWrapper.execute(
      'UPDATE tenants SET name = ?, domain = ?, subdomain = ?, settings = ?, isActive = ? WHERE id = ?',
      [name, domain, subdomain, JSON.stringify(settings || {}), isActive, id]
    );
    
    res.json({ success: true, message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('❌ Error updating tenant:', error);
    res.status(500).json({ success: false, message: 'Error updating tenant' });
  }
});

app.delete('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await poolWrapper.execute('DELETE FROM tenants WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting tenant:', error);
    res.status(500).json({ success: false, message: 'Error deleting tenant' });
  }
});

// Note: Tenant authentication is now handled globally in the API key middleware above

// User endpoints (with tenant authentication)
app.post('/api/users', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      birthDate, 
      address, 
      gender,
      privacyAccepted,
      termsAccepted,
      marketingEmail,
      marketingSms,
      marketingPhone
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !phone || !birthDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, password, phone and birthDate are required' 
      });
    }
    
    // Validate privacy and terms acceptance
    if (!privacyAccepted || !termsAccepted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Privacy policy and terms must be accepted' 
      });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    // Use default tenant ID if not provided
    const tenantId = req.tenant?.id || 1;
    
    // Check if user already exists
    const [existingUser] = await poolWrapper.execute(
      'SELECT id FROM users WHERE email = ? AND tenantId = ?',
      [email, tenantId]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Basic birthDate validation (optional field)
    let validBirthDate = null;
    if (birthDate) {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
        console.log('⚠️ Invalid birthDate format, using null:', birthDate);
        validBirthDate = null;
      } else {
        validBirthDate = birth.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }

    // Generate 8-digit user ID
    const generateUserId = () => {
      const min = 10000000; // 8 digits starting with 1
      const max = 99999999; // 8 digits ending with 9
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    // Check if user_id already exists and generate a new one if needed
    let userId;
    let isUnique = false;
    while (!isUnique) {
      userId = generateUserId();
      const [existingUserId] = await poolWrapper.execute(
        'SELECT id FROM users WHERE user_id = ?',
        [userId]
      );
      if (existingUserId.length === 0) {
        isUnique = true;
      }
    }
    
    // Store PLAIN (no encryption). Only password is hashed.
    const plainPhone = phone || '';
    const plainAddress = address || '';
    const plainEmail = email;
    
    const [result] = await poolWrapper.execute(
      'INSERT INTO users (user_id, tenantId, name, email, password, phone, gender, birthDate, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, tenantId, name, plainEmail, hashedPassword, plainPhone, (gender || null), validBirthDate, plainAddress]
    );
    
    res.json({ 
      success: true, 
      data: { 
        userId: result.insertId,
        user_id: userId 
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use default tenant ID if not provided
    const tenantId = req.tenant?.id || 1;
    
    // Try with birthDate first, fallback to without it
    let [rows] = await poolWrapper.execute(
      'SELECT id, name, email, phone, birthDate, address, createdAt FROM users WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    ).catch(async (error) => {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ birthDate column missing, using fallback query');
        return await poolWrapper.execute(
          'SELECT id, name, email, phone, address, createdAt FROM users WHERE id = ? AND tenantId = ?',
      [id, tenantId]
    );
      }
      throw error;
    });
    
    if (rows.length > 0) {
      const user = rows[0];
      
      // Direct data (no encryption needed)
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        birthDate: user.birthDate || null, // Will be null if column doesn't exist
        address: user.address || '',
        createdAt: user.createdAt
      };
      
      res.json({ success: true, data: userData });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('❌ Error getting user:', error);
    
    // Check if it's a database column error
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('❌ Database column error - birth_date column missing');
      res.status(500).json({ 
        success: false, 
        message: 'Veritabanı hatası: birth_date kolonu eksik',
        type: 'DATABASE_ERROR',
        retryable: false
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Kullanıcı bilgileri alınırken hata oluştu',
        type: 'UNKNOWN_ERROR',
        retryable: false
      });
    }
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Store plain email (no encryption needed)
    
    // Use default tenant ID if not provided
    const tenantId = req.tenant?.id || 1;
    
    // Get user with hashed password
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM users WHERE email = ? AND tenantId = ?',
      [email, tenantId]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      
      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      
      if (isPasswordValid) {
        // Return user data (no decryption needed)
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          address: user.address || '',
          createdAt: user.createdAt
        };
        
        console.log('✅ User data retrieved for login');
        console.log('📧 Email:', !!userData.email);
        console.log('📱 Phone:', !!userData.phone);
        console.log('🏠 Address:', !!userData.address);
        
        res.json({ 
          success: true, 
          data: userData,
          message: 'Login successful'
        });
      } else {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('❌ Error during login:', error);
    res.status(500).json({ success: false, message: 'Error during login' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, currentPassword, newPassword } = req.body;
    
    // Get current user
    const [userRows] = await poolWrapper.execute(
      'SELECT * FROM users WHERE id = ? AND tenantId = ?',
      [id, req.tenant.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const currentUser = userRows[0];
    
    // If password change is requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is required to change password' 
        });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
      
      // Validate new password
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: 'New password must be at least 6 characters long' 
        });
      }
      
      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update user data (no encryption needed)
      const plainPhone = phone || currentUser.phone;
      const plainAddress = address || currentUser.address;
      
      await poolWrapper.execute(
        'UPDATE users SET name = ?, email = ?, phone = ?, address = ?, password = ? WHERE id = ? AND tenantId = ?',
        [name, email, plainPhone, plainAddress, hashedNewPassword, id, req.tenant.id]
      );
    } else {
      // Update user data (no encryption needed)
      const plainPhone = phone || currentUser.phone;
      const plainAddress = address || currentUser.address;
      
      await poolWrapper.execute(
        'UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ? AND tenantId = ?',
        [name, email, plainPhone, plainAddress, id, req.tenant.id]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Order endpoints (with tenant authentication)
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get orders with items
    const [orders] = await poolWrapper.execute(
      `SELECT o.id, o.totalAmount, o.status, o.createdAt, o.city, o.district, o.fullAddress, o.shippingAddress, o.paymentMethod
       FROM orders o 
       WHERE o.userId = ? AND o.tenantId = ? 
       ORDER BY o.createdAt DESC`,
      [userId, req.tenant.id]
    );
    
    // Get order items for each order
    for (let order of orders) {
      const [orderItems] = await poolWrapper.execute(`
        SELECT oi.quantity, oi.price, 
               p.name as productName, p.image as productImage
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `, [order.id]);
      
      order.items = orderItems;
    }
    
    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error getting user orders:', error);
    res.status(500).json({ success: false, message: 'Error getting orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { 
      userId, totalAmount, status, shippingAddress, paymentMethod, items, 
      city, district, fullAddress, customerName, customerEmail, customerPhone 
    } = req.body;
    
    // Validate required fields
    if (!userId || !totalAmount || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must contain at least one item' 
      });
    }
    
    // Begin transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (tenantId, userId, totalAmount, status, shippingAddress, paymentMethod, city, district, fullAddress, customerName, customerEmail, customerPhone) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.tenant.id, userId, totalAmount, status || 'pending', shippingAddress, paymentMethod, city, district, fullAddress, customerName, customerEmail, customerPhone]
      );
      
      const orderId = orderResult.insertId;
      
      // Create order items
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) {
          throw new Error('Invalid item data');
        }
        
        // Varyasyon bilgisi (variationString ve selectedVariations)
        const variationString = item.variationString || '';
        const selectedVariations = item.selectedVariations ? JSON.stringify(item.selectedVariations) : null;

        await connection.execute(
          `INSERT INTO order_items (tenantId, orderId, productId, quantity, price, productName, productDescription, productCategory, productBrand, productImage, variationString, selectedVariations) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.tenant.id, orderId, item.productId, item.quantity, item.price, 
           item.productName, item.productDescription, item.productCategory, item.productBrand, item.productImage,
           variationString, selectedVariations]
        );
        
        // Update product stock
        await connection.execute(
          `UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ? AND tenantId = ?`,
          [item.quantity, item.productId, req.tenant.id]
        );
      }
      
      // Add EXP for purchase
      const baseExp = 50; // Base EXP for purchase
      const orderExp = Math.floor(totalAmount * 0.1); // 10% of order total
      const totalExp = baseExp + orderExp;
      
      await connection.execute(
        'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, orderId) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, req.tenant.id, 'purchase', totalExp, `Alışveriş: ${totalAmount} TL`, orderId]
      );
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      console.log(`✅ Order created successfully: ${orderId} with ${items.length} items, ${totalExp} EXP added`);
      res.json({ success: true, data: { orderId, expGained: totalExp } });
      
    } catch (error) {
      // Rollback transaction
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error creating order' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await poolWrapper.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    await poolWrapper.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', id]
    );
    
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Error cancelling order' });
  }
});

// Admin - Get all products (for admin panel)
app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM products ORDER BY lastUpdated DESC'
    );
    
    // Clean HTML entities from all products
    const cleanedProducts = rows.map(cleanProductData);
    
    res.json({ success: true, data: cleanedProducts });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Error getting products' });
  }
});

// Admin - Get single product (for admin panel)
app.get('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('📦 Admin requesting product detail for ID:', productId);
    
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ürün bulunamadı' 
      });
    }
    
    // Clean HTML entities from product data
    const cleanedProduct = cleanProductData(rows[0]);
    
    console.log('📦 Product detail found:', cleanedProduct.name);
    res.json({ success: true, data: cleanedProduct });
  } catch (error) {
    console.error('Error getting product detail:', error);
    res.status(500).json({ success: false, message: 'Error getting product detail' });
  }
});

// Admin - Create product
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const {
      name,
      description = null,
      price,
      category = null,
      image = null,
      stock = 0,
      brand = null,
      taxRate = 0,
      priceIncludesTax = false
    } = req.body || {};

    if (!name || price === undefined || price === null || isNaN(parseFloat(price))) {
      return res.status(400).json({ success: false, message: 'Geçersiz veri: name ve price zorunludur' });
    }

    // Default tenant
    const tenantId = 1;

    const [result] = await poolWrapper.execute(`
      INSERT INTO products (tenantId, name, description, price, taxRate, priceIncludesTax, category, image, stock, brand, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [tenantId, name, description, parseFloat(price), parseFloat(taxRate || 0), !!priceIncludesTax, category, image, parseInt(stock || 0, 10), brand]);

    const [rows] = await poolWrapper.execute('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: rows[0], message: 'Ürün oluşturuldu' });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
});

// Admin - Update product
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const allowed = ['name','description','price','taxRate','priceIncludesTax','category','image','images','stock','brand','hasVariations'];
    const fields = [];
    const params = [];
    for (const key of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Güncellenecek alan yok' });
    }
    params.push(productId);
    await poolWrapper.execute(`UPDATE products SET ${fields.join(', ')}, lastUpdated = NOW() WHERE id = ?`, params);
    const [rows] = await poolWrapper.execute('SELECT * FROM products WHERE id = ?', [productId]);
    res.json({ success: true, data: rows[0], message: 'Ürün güncellendi' });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

// Admin - Delete product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const [result] = await poolWrapper.execute('DELETE FROM products WHERE id = ?', [productId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }
    res.json({ success: true, message: 'Ürün silindi' });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

// Admin - Get all categories (for admin panel)
app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    console.log('📂 Admin requesting categories');
    
    const [rows] = await poolWrapper.execute(`
      SELECT c.*, COUNT(p.id) as productCount 
      FROM categories c 
      LEFT JOIN products p ON p.category = c.name AND p.tenantId = c.tenantId 
      WHERE c.tenantId = ?
      GROUP BY c.id 
      ORDER BY c.name ASC
    `, [req.tenant.id]);
    
    console.log('📂 Categories found:', rows.length);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Error getting categories' });
  }
});

// Admin - Create category
app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, categoryTree, parentId } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Kategori adı zorunludur' });
    }
    
    const [result] = await poolWrapper.execute(
      `INSERT INTO categories (tenantId, name, description, categoryTree, parentId, source) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenant.id, name, description || '', categoryTree || '', parentId || null, 'MANUAL']
    );
    
    const [newCategory] = await poolWrapper.execute(
      'SELECT * FROM categories WHERE id = ?', [result.insertId]
    );
    
    res.json({ success: true, data: newCategory[0], message: 'Kategori oluşturuldu' });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
});

// Admin - Update category
app.put('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description, categoryTree, parentId, isActive } = req.body;
    
    const allowed = ['name', 'description', 'categoryTree', 'parentId', 'isActive'];
    const fields = [];
    const params = [];
    
    for (const key of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Güncellenecek alan yok' });
    }
    
    params.push(categoryId, req.tenant.id);
    
    await poolWrapper.execute(
      `UPDATE categories SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ? AND tenantId = ?`, 
      params
    );
    
    const [updatedCategory] = await poolWrapper.execute(
      'SELECT * FROM categories WHERE id = ? AND tenantId = ?', [categoryId, req.tenant.id]
    );
    
    res.json({ success: true, data: updatedCategory[0], message: 'Kategori güncellendi' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  }
});

// Admin - Delete category
app.delete('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    // Kategoriye ait ürün var mı kontrol et
    const [products] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ? AND tenantId = ?) AND tenantId = ?',
      [categoryId, req.tenant.id, req.tenant.id]
    );
    
    if (products[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kategoriye ait ürünler bulunduğu için silinemez' 
      });
    }
    
    await poolWrapper.execute(
      'DELETE FROM categories WHERE id = ? AND tenantId = ?', 
      [categoryId, req.tenant.id]
    );
    
    res.json({ success: true, message: 'Kategori silindi' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

// ==================== FLASH DEALS API ====================

// Create flash deals table if not exists
async function createFlashDealsTable() {
  try {
    await poolWrapper.execute(`
      CREATE TABLE IF NOT EXISTS flash_deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type ENUM('percentage', 'fixed') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        target_type ENUM('category', 'product') NOT NULL,
        target_id INT,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_dates (start_date, end_date),
        INDEX idx_target (target_type, target_id)
      )
    `);
    console.log('✅ Flash deals table created/verified');
  } catch (error) {
    console.error('❌ Error creating flash deals table:', error);
  }
}

// Initialize flash deals table - moved to startServer function

// Admin - Get all flash deals
app.get('/api/admin/flash-deals', authenticateAdmin, async (req, res) => {
  try {
    console.log('⚡ Admin requesting flash deals');
    
    const [rows] = await poolWrapper.execute(`
      SELECT fd.*, 
             CASE 
               WHEN fd.target_type = 'category' THEN c.name
               WHEN fd.target_type = 'product' THEN p.name
               ELSE 'Tüm Ürünler'
             END as target_name
      FROM flash_deals fd
      LEFT JOIN categories c ON fd.target_type = 'category' AND fd.target_id = c.id
      LEFT JOIN products p ON fd.target_type = 'product' AND fd.target_id = p.id
      ORDER BY fd.created_at DESC
    `);
    
    console.log('⚡ Flash deals found:', rows.length);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting flash deals' });
  }
});

// Admin - Create flash deal
app.post('/api/admin/flash-deals', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, target_type, target_id, start_date, end_date } = req.body;
    
    console.log('⚡ Creating flash deal:', { name, discount_type, discount_value, target_type, target_id });
    
    // Validate required fields
    if (!name || !discount_type || !discount_value || !target_type || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gerekli alanlar eksik' 
      });
    }
    
    // Validate discount type
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz indirim türü' 
      });
    }
    
    // Validate target type
    if (!['category', 'product'].includes(target_type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz hedef türü' 
      });
    }
    
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bitiş tarihi başlangıç tarihinden sonra olmalı' 
      });
    }
    
    // Check if target exists
    if (target_type === 'category' && target_id) {
      const [categoryRows] = await poolWrapper.execute('SELECT id FROM categories WHERE id = ?', [target_id]);
      if (categoryRows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Kategori bulunamadı' 
        });
      }
    }
    
    if (target_type === 'product' && target_id) {
      const [productRows] = await poolWrapper.execute('SELECT id FROM products WHERE id = ?', [target_id]);
      if (productRows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ürün bulunamadı' 
        });
      }
    }
    
    // Insert flash deal
    const [result] = await poolWrapper.execute(`
      INSERT INTO flash_deals (name, description, discount_type, discount_value, target_type, target_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, description, discount_type, discount_value, target_type, target_id, start_date, end_date]);
    
    console.log('⚡ Flash deal created with ID:', result.insertId);
    res.json({ 
      success: true, 
      message: 'Flash indirim başarıyla oluşturuldu',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ Error creating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error creating flash deal' });
  }
});

// Admin - Update flash deal
app.put('/api/admin/flash-deals/:id', authenticateAdmin, async (req, res) => {
  try {
    const flashDealId = req.params.id;
    const { name, description, discount_type, discount_value, target_type, target_id, start_date, end_date, is_active } = req.body;
    
    console.log('⚡ Updating flash deal:', flashDealId);
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (discount_type !== undefined) { updateFields.push('discount_type = ?'); updateValues.push(discount_type); }
    if (discount_value !== undefined) { updateFields.push('discount_value = ?'); updateValues.push(discount_value); }
    if (target_type !== undefined) { updateFields.push('target_type = ?'); updateValues.push(target_type); }
    if (target_id !== undefined) { updateFields.push('target_id = ?'); updateValues.push(target_id); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Güncellenecek alan bulunamadı' 
      });
    }
    
    updateValues.push(flashDealId);
    
    const [result] = await poolWrapper.execute(`
      UPDATE flash_deals 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Flash indirim bulunamadı' 
      });
    }
    
    console.log('⚡ Flash deal updated:', flashDealId);
    res.json({ 
      success: true, 
      message: 'Flash indirim başarıyla güncellendi' 
    });
  } catch (error) {
    console.error('❌ Error updating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error updating flash deal' });
  }
});

// Admin - Delete flash deal
app.delete('/api/admin/flash-deals/:id', authenticateAdmin, async (req, res) => {
  try {
    const flashDealId = req.params.id;
    
    console.log('⚡ Deleting flash deal:', flashDealId);
    
    const [result] = await poolWrapper.execute(
      'DELETE FROM flash_deals WHERE id = ?',
      [flashDealId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Flash indirim bulunamadı' 
      });
    }
    
    console.log('⚡ Flash deal deleted:', flashDealId);
    res.json({ 
      success: true, 
      message: 'Flash indirim başarıyla silindi' 
    });
  } catch (error) {
    console.error('❌ Error deleting flash deal:', error);
    res.status(500).json({ success: false, message: 'Error deleting flash deal' });
  }
});

// Get active flash deals (for mobile app)
app.get('/api/flash-deals', async (req, res) => {
  try {
    const now = new Date();
    
    const [rows] = await poolWrapper.execute(`
      SELECT fd.*, 
             CASE 
               WHEN fd.target_type = 'category' THEN c.name
               WHEN fd.target_type = 'product' THEN p.name
               ELSE 'Tüm Ürünler'
             END as target_name
      FROM flash_deals fd
      LEFT JOIN categories c ON fd.target_type = 'category' AND fd.target_id = c.id
      LEFT JOIN products p ON fd.target_type = 'product' AND fd.target_id = p.id
      WHERE fd.is_active = true 
        AND fd.start_date <= ? 
        AND fd.end_date >= ?
      ORDER BY fd.created_at DESC
    `, [now, now]);
    
    console.log('⚡ Active flash deals found:', rows.length);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting active flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting flash deals' });
  }
});

// Product endpoints (with tenant authentication)
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countRows] = await poolWrapper.execute(
      'SELECT COUNT(*) as total FROM products WHERE tenantId = ?',
      [req.tenant.id]
    );
    const total = countRows[0].total;
    
    // Get paginated products
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM products WHERE tenantId = ? ORDER BY lastUpdated DESC LIMIT ? OFFSET ?',
      [req.tenant.id, limit, offset]
    );
    
    // Clean HTML entities from all products
    const cleanedProducts = rows.map(cleanProductData);
    
    res.json({ 
      success: true, 
      data: {
        products: cleanedProducts,
        total: total,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Error getting products' });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const search = String(q || '').trim();
    if (!search) {
      return res.json({ success: true, data: [] });
    }

    // Çoklu kiracı desteği: varsa kimliği doğrulanmış tenant üzerinden filtrele
    // Not: Diğer uç noktalarda kullanılan tenant ara katmanı burada yoksa, tüm ürünlerde arama yapılır
    const tenantId = req.tenant?.id;

    // İsim/açıklama/marka + stok kodu (externalId) + ürün SKU + varyasyon SKU alanlarında arama
    // Varyasyon eşleşmesini getirmek için ürün tablosuna JOIN ile eşleştirip DISTINCT seçiyoruz
    const params = tenantId
      ? [
          `%${search}%`, `%${search}%`, `%${search}%`, // name/description/brand
          `%${search}%`, // externalId
          `%${search}%`, // product sku
          `%${search}%`, // option sku
          tenantId,
        ]
      : [
          `%${search}%`, `%${search}%`, `%${search}%`, // name/description/brand
          `%${search}%`, // externalId
          `%${search}%`, // product sku
          `%${search}%`, // option sku
        ];

    const whereTenant = tenantId ? ' AND p.tenantId = ?' : '';

    const [rows] = await poolWrapper.execute(
      `SELECT DISTINCT p.*
       FROM products p
       LEFT JOIN product_variations v ON v.productId = p.id
       LEFT JOIN product_variation_options o ON o.variationId = v.id
       WHERE (
         p.name LIKE ?
         OR p.description LIKE ?
         OR p.brand LIKE ?
         OR p.externalId LIKE ?
         OR p.sku LIKE ?
         OR o.sku LIKE ?
       )${whereTenant}
       ORDER BY p.lastUpdated DESC
       LIMIT 200`,
      params
    );

    const cleanedProducts = rows.map(cleanProductData);
    return res.json({ success: true, data: cleanedProducts });
  } catch (error) {
    console.error('Error searching products:', error);
    return res.status(500).json({ success: false, message: 'Error searching products' });
  }
});

app.get('/api/products/price-range', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT MIN(price) as minPrice, MAX(price) as maxPrice FROM products'
    );
    
    res.json({ 
      success: true, 
      data: {
        min: rows[0]?.minPrice || 0,
        max: rows[0]?.maxPrice || 0
      }
    });
  } catch (error) {
    console.error('Error getting price range:', error);
    res.status(500).json({ success: false, message: 'Error getting price range' });
  }
});

app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM products WHERE category = ? ORDER BY lastUpdated DESC',
      [category]
    );
    
    // Clean HTML entities from category products
    const cleanedProducts = rows.map(cleanProductData);
    
    res.json({ success: true, data: cleanedProducts });
  } catch (error) {
    console.error('Error getting products by category:', error);
    res.status(500).json({ success: false, message: 'Error getting products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    const [rows] = await poolWrapper.execute('SELECT * FROM products WHERE id = ?', [numericId]);
    
    if (rows.length > 0) {
      // Clean HTML entities from single product
      const cleanedProduct = cleanProductData(rows[0]);
      res.json({ success: true, data: cleanedProduct });
    } else {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, message: 'Error getting product' });
  }
});

// Product Variations Endpoints
app.get('/api/products/:productId/variations', async (req, res) => {
  try {
    const { productId } = req.params;
    const numericId = Number(productId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    // Varyasyonları ve seçeneklerini birlikte çek
    const [variations] = await poolWrapper.execute(`
      SELECT v.*, 
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', o.id,
                 'variationId', o.variationId,
                 'value', o.value,
                 'priceModifier', o.priceModifier,
                 'stock', o.stock,
                 'sku', o.sku,
                 'image', o.image,
                 'isActive', o.isActive
               )
             ) as options
      FROM product_variations v
      LEFT JOIN product_variation_options o ON v.id = o.variationId AND o.isActive = true
      WHERE v.productId = ? AND v.tenantId = ?
      GROUP BY v.id
      ORDER BY v.displayOrder, v.name
    `, [numericId, req.tenant.id]);

    // JSON formatını düzelt
    const formattedVariations = variations.map(variation => ({
      id: variation.id,
      productId: variation.productId,
      name: variation.name,
      displayOrder: variation.displayOrder,
      options: variation.options && variation.options.length > 0 ? variation.options : []
    }));

    res.json({ success: true, data: formattedVariations });
  } catch (error) {
    console.error('Error fetching product variations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/variations/:variationId/options', async (req, res) => {
  try {
    const { variationId } = req.params;
    const numericId = Number(variationId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid variation id' });
    }
    const [rows] = await poolWrapper.execute('SELECT * FROM product_variation_options WHERE variationId = ?', [numericId]);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching variation options:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/variation-options/:optionId', async (req, res) => {
  try {
    const { optionId } = req.params;
    const numericId = Number(optionId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid option id' });
    }
    const [rows] = await poolWrapper.execute('SELECT * FROM product_variation_options WHERE id = ?', [numericId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Variation option not found' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching variation option:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/products/filter', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, brand, search } = req.body;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(String(category));
    }
    
    if (minPrice !== undefined) {
      query += ' AND price >= ?';
      params.push(Number(minPrice));
    }
    
    if (maxPrice !== undefined) {
      query += ' AND price <= ?';
      params.push(Number(maxPrice));
    }
    
    if (brand) {
      query += ' AND brand = ?';
      params.push(String(brand));
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const s = String(search).slice(0, 100);
      params.push(`%${s}%`, `%${s}%`);
    }
    
    query += ' ORDER BY lastUpdated DESC';
    
    const [rows] = await poolWrapper.execute(query, params);
    
    // Clean HTML entities from filtered products
    const cleanedProducts = rows.map(cleanProductData);
    
    res.json({ success: true, data: cleanedProducts });
  } catch (error) {
    console.error('❌ Error filtering products:', error);
    res.status(500).json({ success: false, message: 'Error filtering products' });
  }
});

app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    await poolWrapper.execute(
      'UPDATE products SET stock = ? WHERE id = ?',
      [quantity, id]
    );
    
    res.json({ success: true, message: 'Product stock updated' });
  } catch (error) {
    console.error('❌ Error updating product stock:', error);
    res.status(500).json({ success: false, message: 'Error updating product stock' });
  }
});

// Reviews endpoints
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const [rows] = await poolWrapper.execute(
      `SELECT r.*, u.name as userName 
       FROM reviews r 
       JOIN users u ON r.userId = u.id 
       WHERE r.productId = ? 
       ORDER BY r.createdAt DESC`,
      [productId]
    );
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error getting product reviews:', error);
    res.status(500).json({ success: false, message: 'Error getting product reviews' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, userId, userName, rating, comment } = req.body;
    
    // Validate required fields
    if (!productId || !userId || !userName || !rating) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: productId, userId, userName, rating' 
      });
    }
    
    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }
    
    // Check if user already reviewed this product
    const [existingReview] = await poolWrapper.execute(
      'SELECT id FROM reviews WHERE productId = ? AND userId = ?',
      [productId, userId]
    );
    
    if (existingReview.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this product' 
      });
    }
    
    // Insert new review
    const [result] = await poolWrapper.execute(
      'INSERT INTO reviews (productId, userId, userName, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [productId, userId, userName, rating, comment || '']
    );
    
    // Update product rating and review count
    const [reviewStats] = await poolWrapper.execute(
      `SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount 
       FROM reviews 
       WHERE productId = ?`,
      [productId]
    );
    
    if (reviewStats.length > 0) {
      const { avgRating, reviewCount } = reviewStats[0];
      await poolWrapper.execute(
        'UPDATE products SET rating = ?, reviewCount = ? WHERE id = ?',
        [parseFloat(avgRating.toFixed(2)), reviewCount, productId]
      );
    }
    
    res.json({ 
      success: true, 
      data: { reviewId: result.insertId },
      message: 'Review added successfully' 
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
});

// Cache for categories
let categoriesCache = null;
let categoriesCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Category and brand endpoints
app.get('/api/categories', async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (categoriesCache && (now - categoriesCacheTime) < CACHE_DURATION) {
      console.log('📋 Categories served from cache');
      return res.json({ 
        success: true, 
        data: categoriesCache,
        cached: true
      });
    }

    // Kategorileri veritabanından çek
    const [rows] = await poolWrapper.execute(`
      SELECT c.*, COUNT(p.id) as productCount 
      FROM categories c 
      LEFT JOIN products p ON p.category = c.name AND p.tenantId = c.tenantId 
      WHERE c.isActive = true AND c.tenantId = ?
      GROUP BY c.id 
      ORDER BY c.name ASC
    `, [req.tenant.id]);
    
    // Sadece kategori isimlerini döndür (string array)
    const categoryNames = rows.map(row => row.name).filter(name => name && typeof name === 'string');
    
    // Update cache
    categoriesCache = categoryNames;
    categoriesCacheTime = now;
    console.log('📋 Categories cached for 5 minutes');
    
    res.json({ success: true, data: categoryNames });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Error getting categories' });
  }
});

// Kategori ağacını getir
app.get('/api/categories/tree', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(`
      SELECT c.*, COUNT(p.id) as productCount 
      FROM categories c 
      LEFT JOIN products p ON p.category = c.name AND p.tenantId = c.tenantId 
      WHERE c.isActive = true AND c.tenantId = ?
      GROUP BY c.id 
      ORDER BY c.categoryTree ASC
    `, [req.tenant.id]);
    
    // Kategori ağacını oluştur
    const categoryTree = this.buildCategoryTree(rows);
    
    res.json({ success: true, data: categoryTree });
  } catch (error) {
    console.error('Error getting category tree:', error);
    res.status(500).json({ success: false, message: 'Error getting category tree' });
  }
});

// Kategori ağacını oluştur
function buildCategoryTree(categories) {
  const tree = {};
  
  categories.forEach(category => {
    const parts = category.categoryTree ? category.categoryTree.split('/').filter(p => p.trim()) : [category.name];
    
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!current[part]) {
        current[part] = {
          name: part,
          children: {},
          categories: [],
          productCount: 0
        };
      }
      
      if (i === parts.length - 1) {
        // Son seviye - kategoriyi ekle
        current[part].categories.push(category);
        current[part].productCount += category.productCount || 0;
      }
      
      current = current[part].children;
    }
  });
  
  return tree;
}

app.get('/api/brands', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != ""'
    );
    const brands = rows.map(row => row.brand).sort();
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error getting brands:', error);
    res.status(500).json({ success: false, message: 'Error getting brands' });
  }
});

// XML Sync endpoints
app.post('/api/sync/trigger', async (req, res) => {
  if (!xmlSyncService) {
    return res.status(503).json({ 
      success: false, 
      message: 'XML Sync Service not available' 
    });
  }
  
  try {
    await xmlSyncService.triggerManualSync();
    res.json({ 
      success: true, 
      message: 'Manual sync triggered successfully' 
    });
  } catch (error) {
    console.error('❌ Error triggering manual sync:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error triggering manual sync' 
    });
  }
});

app.get('/api/sync/status', (req, res) => {
  if (!xmlSyncService) {
    return res.status(503).json({ 
      success: false, 
      message: 'XML Sync Service not available' 
    });
  }
  
  const status = xmlSyncService.getSyncStatus();
  res.json({ success: true, data: status });
});

// Start server
async function startServer() {
  await initializeDatabase();
  // Ensure default tenant API key exists and active
  await ensureDefaultTenantApiKey();
  
  // Initialize flash deals table
  await createFlashDealsTable();
  
  // Cart endpoints
  app.get('/api/cart/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [rows] = await poolWrapper.execute(
        `SELECT c.*, p.name, p.price, p.image, p.stock 
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.userId = ? AND c.tenantId = ?
         ORDER BY c.createdAt DESC`,
        [userId, req.tenant?.id || 1]
      );
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error getting cart:', error);
      res.status(500).json({ success: false, message: 'Error getting cart' });
    }
  });

  app.post('/api/cart', async (req, res) => {
    try {
      const { userId, productId, quantity, variationString, selectedVariations, deviceId } = req.body;
      console.log(`🛒 Server: Adding to cart - User: ${userId}, Product: ${productId}, Quantity: ${quantity}`);
      
      // Validate required fields
      if (!userId || !productId || !quantity) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: userId, productId, quantity' 
        });
      }
      
      // Tenant ID from authentication
      const tenantId = req.tenant?.id || 1;
      
      // Ensure guest user exists (userId = 1)
      if (userId === 1) {
        const [guestUser] = await poolWrapper.execute(
          'SELECT id FROM users WHERE id = 1'
        );
        
        if (guestUser.length === 0) {
          // Create guest user
          await poolWrapper.execute(
            'INSERT INTO users (id, email, password, name, phone, tenantId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [1, 'guest@huglu.com', 'guest', 'Guest User', '', tenantId, new Date().toISOString()]
          );
          console.log('✅ Guest user created');
        }
      }
      
      // Check if item already exists in cart
      let existingItemQuery = 'SELECT id, quantity FROM cart WHERE tenantId = ? AND productId = ? AND variationString = ?';
      const existingParams = [tenantId, productId, variationString || ''];
      if (userId && userId !== 1) {
        existingItemQuery += ' AND userId = ?';
        existingParams.push(userId);
      } else {
        existingItemQuery += ' AND userId = 1 AND deviceId = ?';
        existingParams.push(deviceId || '');
      }
      const [existingItem] = await poolWrapper.execute(existingItemQuery, existingParams);
      
      if (existingItem.length > 0) {
        // Update existing item
        const newQuantity = existingItem[0].quantity + quantity;
        await poolWrapper.execute(
          'UPDATE cart SET quantity = ?, selectedVariations = ? WHERE id = ?',
          [newQuantity, JSON.stringify(selectedVariations || {}), existingItem[0].id]
        );
        
        console.log(`✅ Server: Updated cart item ${existingItem[0].id} with quantity ${newQuantity}`);
        res.json({ 
          success: true, 
          message: 'Sepete eklendi',
          data: { cartItemId: existingItem[0].id, quantity: newQuantity }
        });
      } else {
        // Add new item
        const [result] = await poolWrapper.execute(
          'INSERT INTO cart (tenantId, userId, deviceId, productId, quantity, variationString, selectedVariations) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tenantId, userId, userId === 1 ? (deviceId || '') : null, productId, quantity, variationString || '', JSON.stringify(selectedVariations || {})]
        );
        
        console.log(`✅ Server: Added new cart item ${result.insertId} for user ${userId}`);
        res.json({ 
          success: true, 
          message: 'Ürün sepete eklendi',
          data: { cartItemId: result.insertId }
        });
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      res.status(500).json({ success: false, message: 'Sepete eklenirken hata oluştu' });
    }
  });

  // Health check endpoint removed - using the main one above

  // Notification endpoints
  const { NotificationService } = require('./services/notification-service');

  // Send order status notification
  app.post('/api/notifications/order-status', async (req, res) => {
    try {
      const { userId, orderId, status, orderDetails } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendOrderStatusNotification(
        tenantId, userId, orderId, status, orderDetails
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Order status notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send stock notification
  app.post('/api/notifications/stock', async (req, res) => {
    try {
      const { userId, productId, productName, stockType } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendStockNotification(
        tenantId, userId, productId, productName, stockType
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Stock notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send price notification
  app.post('/api/notifications/price', async (req, res) => {
    try {
      const { userId, productId, productName, priceChange } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendPriceNotification(
        tenantId, userId, productId, productName, priceChange
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Price notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send campaign notification
  app.post('/api/notifications/campaign', async (req, res) => {
    try {
      const { userId, campaign } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendCampaignNotification(
        tenantId, userId, campaign
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Campaign notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send wallet notification
  app.post('/api/notifications/wallet', async (req, res) => {
    try {
      const { userId, walletAction, amount, balance } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendWalletNotification(
        tenantId, userId, walletAction, amount, balance
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Wallet notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send security notification
  app.post('/api/notifications/security', async (req, res) => {
    try {
      const { userId, securityEvent, details } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendSecurityNotification(
        tenantId, userId, securityEvent, details
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Security notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send personalized notification
  app.post('/api/notifications/personalized', async (req, res) => {
    try {
      const { userId, recommendation } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendPersonalizedNotification(
        tenantId, userId, recommendation
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Personalized notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send scheduled notification
  app.post('/api/notifications/scheduled', async (req, res) => {
    try {
      const { userId, scheduleType, data } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendScheduledNotification(
        tenantId, userId, scheduleType, data
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Scheduled notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Send bulk notification
  app.post('/api/notifications/bulk', async (req, res) => {
    try {
      const { userIds, type, title, message, data } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      const result = await NotificationService.sendBulkNotification(
        tenantId, userIds, type, title, message, data
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Bulk notification error:', error);
      res.status(500).json({ success: false, message: 'Bildirim gönderilemedi' });
    }
  });

  // Check cart before logout and send notification if items exist
  app.post('/api/cart/check-before-logout', async (req, res) => {
    try {
      const { userId, deviceId } = req.body;
      const tenantId = req.tenant?.id || 1;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId is required' 
        });
      }
      
      // Get cart items for user
      let cartQuery = 'SELECT c.*, p.name as productName, p.price FROM cart c JOIN products p ON c.productId = p.id WHERE c.tenantId = ?';
      const cartParams = [tenantId];
      
      if (userId !== 1) {
        cartQuery += ' AND c.userId = ?';
        cartParams.push(userId);
      } else {
        cartQuery += ' AND c.userId = 1 AND c.deviceId = ?';
        cartParams.push(deviceId || '');
      }
      
      const [cartItems] = await poolWrapper.execute(cartQuery, cartParams);
      
      if (cartItems.length > 0) {
        // User has items in cart, send notification
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create notification data
        const notificationData = {
          type: 'cart_abandonment',
          title: 'Sepetinizde Ürünler Var!',
          message: `Sepetinizde ${totalItems} ürün var. Siparişinizi tamamlamak için geri dönün.`,
          data: {
            cartItems: cartItems.map(item => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price
            })),
            totalItems,
            totalPrice,
            userId,
            deviceId
          }
        };
        
        // Add notification to database
        await poolWrapper.execute(
          'INSERT INTO user_notifications (tenantId, userId, type, title, message, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tenantId, userId, notificationData.type, notificationData.title, notificationData.message, JSON.stringify(notificationData.data), new Date().toISOString()]
        );
        
        // Note: Only push notification will be sent from frontend
        // WhatsApp service removed as requested
        
        console.log(`📱 Cart abandonment notification sent for user ${userId} with ${totalItems} items`);
        
        res.json({ 
          success: true, 
          hasItems: true,
          itemCount: totalItems,
          totalPrice,
          message: 'Sepetinizde ürünler var, bildirim gönderildi'
        });
      } else {
        res.json({ 
          success: true, 
          hasItems: false,
          message: 'Sepetinizde ürün yok'
        });
      }
    } catch (error) {
      console.error('❌ Error checking cart before logout:', error);
      res.status(500).json({ success: false, message: 'Sepet kontrolü sırasında hata oluştu' });
    }
  });

  app.put('/api/cart/:cartItemId', async (req, res) => {
    try {
      const { cartItemId } = req.params;
      const { quantity } = req.body;
      
      if (!quantity || quantity < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Quantity must be at least 1' 
        });
      }
      
      await poolWrapper.execute(
        'UPDATE cart SET quantity = ? WHERE id = ?',
        [quantity, cartItemId]
      );
      
      res.json({ 
        success: true, 
        message: 'Cart item updated' 
      });
    } catch (error) {
      console.error('❌ Error updating cart item:', error);
      res.status(500).json({ success: false, message: 'Error updating cart item' });
    }
  });

  app.delete('/api/cart/:cartItemId', async (req, res) => {
    try {
      const { cartItemId } = req.params;
      
      await poolWrapper.execute(
        'DELETE FROM cart WHERE id = ?',
        [cartItemId]
      );
      
      res.json({ 
        success: true, 
        message: 'Item removed from cart' 
      });
    } catch (error) {
      console.error('❌ Error removing from cart:', error);
      res.status(500).json({ success: false, message: 'Error removing from cart' });
    }
  });

  app.get('/api/cart/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;
      console.log(`🛒 Server: Getting cart for user ${userId}`);
      
      // Tenant ID from authentication
      const tenantId = req.tenant?.id || 1;
      
      let getCartSql = `SELECT c.*, p.name, p.price, p.image, p.stock 
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.tenantId = ? AND c.userId = ?`;
      const getCartParams = [tenantId, userId];
      
      // Add device filter if provided
      if (deviceId) {
        getCartSql += ' AND c.deviceId = ?';
        getCartParams.push(String(deviceId));
      }
      
      getCartSql += ' ORDER BY c.createdAt DESC';

      const [rows] = await poolWrapper.execute(getCartSql, getCartParams);
      
      console.log(`✅ Server: Found ${rows.length} cart items for user ${userId}`);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error getting user cart:', error);
      res.status(500).json({ success: false, message: 'Error getting user cart' });
    }
  });

  app.get('/api/cart/user/:userId/total', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;
      
      let totalSql = `SELECT SUM(c.quantity * p.price) as total
         FROM cart c 
         JOIN products p ON c.productId = p.id 
         WHERE c.tenantId = ?`;
      const totalParams = [req.tenant?.id || 1];
      if (parseInt(userId) !== 1) {
        totalSql += ' AND c.userId = ?';
        totalParams.push(userId);
      } else {
        totalSql += ' AND c.userId = 1 AND c.deviceId = ?';
        totalParams.push(String(deviceId || ''));
      }

      const [rows] = await poolWrapper.execute(totalSql, totalParams);
      
      const total = rows[0]?.total || 0;
      res.json({ success: true, data: total });
    } catch (error) {
      console.error('❌ Error getting cart total:', error);
      res.status(500).json({ success: false, message: 'Error getting cart total' });
    }
  });

  // Detailed total with campaigns applied
  app.get('/api/cart/user/:userId/total-detailed', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;
      const tenantId = req.tenant?.id || 1;

      // Get cart items with product prices
      let itemsSql = `SELECT c.productId, c.quantity, p.price
        FROM cart c JOIN products p ON c.productId = p.id
        WHERE c.tenantId = ?`;
      const itemsParams = [tenantId];
      if (parseInt(userId) !== 1) {
        itemsSql += ' AND c.userId = ?';
        itemsParams.push(userId);
      } else {
        itemsSql += ' AND c.userId = 1 AND c.deviceId = ?';
        itemsParams.push(String(deviceId || ''));
      }

      const [cartRows] = await poolWrapper.execute(itemsSql, itemsParams);
      const subtotal = cartRows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.quantity) || 0), 0);

      // Load active campaigns
      const [campaigns] = await poolWrapper.execute(
        `SELECT * FROM campaigns WHERE tenantId = ? AND isActive = 1 AND status = 'active'
         AND (startDate IS NULL OR startDate <= NOW()) AND (endDate IS NULL OR endDate >= NOW())`,
        [tenantId]
      );

      let discountTotal = 0;
      let shipping = subtotal >= 500 ? 0 : 29.9; // default policy fallback

      // Apply product-specific discounts
      for (const camp of campaigns) {
        if (camp.type === 'discount' && camp.applicableProducts) {
          try {
            const applicable = typeof camp.applicableProducts === 'string' ? JSON.parse(camp.applicableProducts) : camp.applicableProducts;
            const set = new Set(Array.isArray(applicable) ? applicable : []);
            for (const row of cartRows) {
              if (set.has(row.productId)) {
                const price = Number(row.price) || 0;
                const qty = Number(row.quantity) || 0;
                if (camp.discountType === 'percentage') {
                  discountTotal += (price * qty) * (Number(camp.discountValue) || 0) / 100;
                } else if (camp.discountType === 'fixed') {
                  discountTotal += (Number(camp.discountValue) || 0) * qty;
                }
              }
            }
          } catch {}
        }
      }

      // Apply cart threshold discounts and free shipping
      for (const camp of campaigns) {
        if (camp.type === 'free_shipping' && subtotal >= (Number(camp.minOrderAmount) || 0)) {
          shipping = 0;
        }
        if (camp.type === 'discount' && (!camp.applicableProducts) && subtotal >= (Number(camp.minOrderAmount) || 0)) {
          if (camp.discountType === 'percentage') {
            discountTotal += subtotal * (Number(camp.discountValue) || 0) / 100;
          } else if (camp.discountType === 'fixed') {
            discountTotal += Number(camp.discountValue) || 0;
          }
        }
      }

      // Cap max discount amount if defined
      for (const camp of campaigns) {
        if (camp.maxDiscountAmount) {
          discountTotal = Math.min(discountTotal, Number(camp.maxDiscountAmount) || discountTotal);
        }
      }

      const total = Math.max(0, subtotal - discountTotal + shipping);

      res.json({ success: true, data: { subtotal, discount: Number(discountTotal.toFixed(2)), shipping: Number(shipping.toFixed(2)), total: Number(total.toFixed(2)) } });
    } catch (error) {
      console.error('❌ Error getting detailed cart total:', error);
      res.status(500).json({ success: false, message: 'Error getting detailed cart total' });
    }
  });

  // Campaign endpoints
  app.get('/api/campaigns', async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      const [rows] = await poolWrapper.execute(
        `SELECT * FROM campaigns WHERE tenantId = ? ORDER BY updatedAt DESC`,
        [tenantId]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('❌ Error listing campaigns:', error);
      res.status(500).json({ success: false, message: 'Error listing campaigns' });
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const tenantId = req.tenant?.id || 1;
      const { name, description, type, status = 'active', discountType, discountValue = 0, minOrderAmount = 0, maxDiscountAmount = null, applicableProducts = null, excludedProducts = null, startDate = null, endDate = null, isActive = true } = req.body;

      await poolWrapper.execute(
        `INSERT INTO campaigns (tenantId, name, description, type, status, discountType, discountValue, minOrderAmount, maxDiscountAmount, applicableProducts, excludedProducts, startDate, endDate, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, name || 'Campaign', description || '', type || 'discount', status, discountType || 'percentage', discountValue, minOrderAmount, maxDiscountAmount, applicableProducts ? JSON.stringify(applicableProducts) : null, excludedProducts ? JSON.stringify(excludedProducts) : null, startDate, endDate, isActive ? 1 : 0]
      );

      res.json({ success: true, message: 'Campaign created' });
    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      res.status(500).json({ success: false, message: 'Error creating campaign' });
    }
  });

  app.delete('/api/cart/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;
      
      let deleteSql = 'DELETE FROM cart WHERE tenantId = ?';
      const deleteParams = [req.tenant?.id || 1];
      if (parseInt(userId) !== 1) {
        deleteSql += ' AND userId = ?';
        deleteParams.push(userId);
      } else {
        deleteSql += ' AND userId = 1 AND deviceId = ?';
        deleteParams.push(String(deviceId || ''));
      }

      await poolWrapper.execute(deleteSql, deleteParams);
      
      res.json({ 
        success: true, 
        message: 'Cart cleared' 
      });
    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      res.status(500).json({ success: false, message: 'Error clearing cart' });
    }
  });

  // User profile endpoints
  app.put('/api/users/:userId/profile', async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, phone, address } = req.body;
      
      console.log(`👤 Updating profile for user ${userId}:`, { name, email, phone, address });
      
      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Ad ve e-posta alanları gereklidir'
        });
      }
      
      // Check if email is already taken by another user
      const [existingUser] = await poolWrapper.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      
      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu e-posta adresi zaten kullanılıyor'
        });
      }
      
      // Update user profile
      await poolWrapper.execute(
        'UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
        [name, email, phone || '', address || '', userId]
      );
      
      console.log(`✅ Profile updated successfully for user ${userId}`);
      res.json({
        success: true,
        message: 'Profil başarıyla güncellendi'
      });
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Profil güncellenirken bir hata oluştu'
      });
    }
  });

  app.put('/api/users/:userId/password', async (req, res) => {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      console.log(`🔒 Changing password for user ${userId}`);
      
      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mevcut şifre ve yeni şifre gereklidir'
        });
      }
      
      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Yeni şifre en az 6 karakter olmalıdır'
        });
      }
      
      // Get current user
      const [user] = await poolWrapper.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );
      
      if (user.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }
      
      // For guest user (id = 1), skip password verification
      if (userId != 1) {
        // Verify current password using bcrypt
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user[0].password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({
            success: false,
            message: 'Mevcut şifre yanlış'
          });
        }
      }
      
      // Hash new password with bcrypt
      const hashedNewPassword = await hashPassword(newPassword);
      await poolWrapper.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, userId]
      );
      
      console.log(`✅ Password changed successfully for user ${userId}`);
      res.json({
        success: true,
        message: 'Şifre başarıyla değiştirildi'
      });
    } catch (error) {
      console.error('❌ Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Şifre değiştirilirken bir hata oluştu'
      });
    }
  });

// Wallet endpoints (simplified authentication for guest users)
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`💰 Getting wallet for user: ${userId}`);
    
    // Default tenant ID for guest users
    const tenantId = 1;
    
    // Get user wallet balance
    const [walletRows] = await poolWrapper.execute(
      'SELECT balance, currency FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [userId, tenantId]
    );
    
    let balance = 0;
    let currency = 'TRY';
    
    if (walletRows.length > 0) {
      balance = walletRows[0].balance;
      currency = walletRows[0].currency;
    } else {
      // Create wallet if doesn't exist
      await poolWrapper.execute(
        'INSERT INTO user_wallets (userId, tenantId, balance, currency) VALUES (?, ?, ?, ?)',
        [userId, tenantId, 0, 'TRY']
      );
    }
    
    // Get recent transactions
    const [transactions] = await poolWrapper.execute(
      `SELECT id, type, amount, description, status, createdAt 
       FROM wallet_transactions 
       WHERE userId = ? AND tenantId = ? 
       ORDER BY createdAt DESC 
       LIMIT 20`,
      [userId, tenantId]
    );
    
    console.log(`✅ Found wallet with balance: ${balance} ${currency}, ${transactions.length} transactions`);
    res.json({ 
      success: true, 
      data: { 
        balance, 
        currency, 
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          status: t.status,
          date: t.createdAt
        }))
      } 
    });
  } catch (error) {
    console.error('❌ Error getting wallet:', error);
    res.status(500).json({ success: false, message: 'Error getting wallet' });
  }
});

app.post('/api/wallet/:userId/add-money', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, paymentMethod, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    
    console.log(`💰 Adding money to wallet: User ${userId}, Amount: ${amount}`);
    
    // Default tenant ID for guest users
    const tenantId = 1;
    
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update wallet balance
      const [updateResult] = await connection.execute(
        `INSERT INTO user_wallets (userId, tenantId, balance, currency) 
         VALUES (?, ?, ?, 'TRY') 
         ON DUPLICATE KEY UPDATE balance = balance + ?`,
        [userId, tenantId, amount, amount]
      );
      
      // Add transaction record
      await connection.execute(
        `INSERT INTO wallet_transactions (userId, tenantId, type, amount, description, status, paymentMethod) 
         VALUES (?, ?, 'credit', ?, ?, 'completed', ?)`,
        [userId, tenantId, amount, description || 'Para yükleme', paymentMethod || 'credit_card']
      );
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ Money added successfully: ${amount} TRY`);
      res.json({ success: true, message: 'Para başarıyla yüklendi' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error adding money:', error);
    res.status(500).json({ success: false, message: 'Para yükleme hatası' });
  }
});


app.get('/api/wallet/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`💰 Getting transactions for user: ${userId}`);
    
    // Default tenant ID for guest users
    const tenantId = 1;
    
    const [transactions] = await poolWrapper.execute(
      `SELECT id, type, amount, description, status, paymentMethod, createdAt 
       FROM wallet_transactions 
       WHERE userId = ? AND tenantId = ? 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
      [userId, tenantId, parseInt(limit), parseInt(offset)]
    );
    
    console.log(`✅ Found ${transactions.length} transactions`);
    res.json({ 
      success: true, 
      data: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        paymentMethod: t.paymentMethod,
        date: t.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Error getting transactions:', error);
    res.status(500).json({ success: false, message: 'Error getting transactions' });
  }
});

// Custom Production Requests API endpoints

// Get all custom production requests for a user
app.get('/api/custom-production-requests/:userKey', async (req, res) => {
  try {
    const { userKey } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    
    console.log(`🎨 Getting custom production requests for userKey: ${userKey}`);
    
    // Default tenant ID
    const tenantId = 1;
    // Resolve userKey to numeric PK
    let numericUserId;
    try {
      numericUserId = await resolveUserKeyToPk(userKey, tenantId);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid or unknown user' });
    }
    
    let query = `
      SELECT cpr.*, 
             GROUP_CONCAT(
               CONCAT(
                 JSON_OBJECT(
                   'id', cpi.id,
                   'productId', cpi.productId,
                   'quantity', cpi.quantity,
                   'customizations', cpi.customizations,
                   'productName', p.name,
                   'productImage', p.image,
                   'productPrice', p.price
                 )
               ) SEPARATOR '|||' 
             ) as items
      FROM custom_production_requests cpr
      LEFT JOIN custom_production_items cpi ON cpr.id = cpi.requestId
      LEFT JOIN products p ON cpi.productId = p.id AND p.tenantId = cpr.tenantId
      WHERE cpr.userId = ? AND cpr.tenantId = ?
    `;
    
    const params = [numericUserId, tenantId];
    
    if (status) {
      const s = String(status).toLowerCase();
      const allowed = ['pending','review','design','production','shipped','completed','cancelled'];
      if (!allowed.includes(s)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      query += ' AND cpr.status = ?';
      params.push(s);
    }
    
    query += `
      GROUP BY cpr.id
      ORDER BY cpr.createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [requests] = await poolWrapper.execute(query, params);
    
    // Parse items JSON
    const formattedRequests = requests.map(request => {
      const items = request.items ? 
        request.items.split('|||').map(item => JSON.parse(item)) : [];
      
      return {
        id: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        totalQuantity: request.totalQuantity,
        totalAmount: request.totalAmount,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        notes: request.notes,
        estimatedDeliveryDate: request.estimatedDeliveryDate,
        actualDeliveryDate: request.actualDeliveryDate,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        // Quote fields (if present)
        quoteAmount: request.quoteAmount ?? null,
        quoteCurrency: request.quoteCurrency ?? null,
        quoteStatus: request.quoteStatus ?? null,
        quoteNotes: request.quoteNotes ?? null,
        quotedAt: request.quotedAt ?? null,
        quoteValidUntil: request.quoteValidUntil ?? null,
        items: items
      };
    });
    
    console.log(`✅ Found ${formattedRequests.length} custom production requests`);
    res.json({ success: true, data: formattedRequests });
    
  } catch (error) {
    console.error('❌ Error getting custom production requests:', error);
    res.status(500).json({ success: false, message: 'Error getting custom production requests' });
  }
});

// Create a message for a custom production request (user side)
app.post('/api/custom-production-requests/:requestId/messages', async (req, res) => {
  try {
    const tenantId = 1;
    const requestId = parseInt(req.params.requestId, 10);
    const { userKey, message } = req.body || {};
    if (!requestId || !message || !userKey) {
      return res.status(400).json({ success: false, message: 'requestId, userKey and message are required' });
    }
    const userId = await resolveUserKeyToPk(userKey, tenantId);
    await poolWrapper.execute(
      `INSERT INTO custom_production_messages (tenantId, requestId, userId, sender, message) VALUES (?, ?, ?, 'user', ?)`,
      [tenantId, requestId, userId, String(message).slice(0, 5000)]
    );
    res.json({ success: true, message: 'Mesaj kaydedildi' });
  } catch (error) {
    console.error('❌ Error creating custom production message:', error);
    res.status(500).json({ success: false, message: 'Mesaj kaydedilemedi' });
  }
});

// List messages for a request (admin or user)
app.get('/api/custom-production-requests/:requestId/messages', async (req, res) => {
  try {
    const tenantId = 1;
    const requestId = parseInt(req.params.requestId, 10);
    const [rows] = await poolWrapper.execute(
      `SELECT id, sender, message, createdAt FROM custom_production_messages
       WHERE requestId = ? AND tenantId = ? ORDER BY createdAt ASC`,
      [requestId, tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error listing custom production messages:', error);
    res.status(500).json({ success: false, message: 'Mesajlar alınamadı' });
  }
});
// Get single custom production request
app.get('/api/custom-production-requests/:userKey/:requestId', async (req, res) => {
  try {
    const { userKey, requestId } = req.params;
    const numericRequestId = Number(requestId);
    if (!Number.isInteger(numericRequestId) || numericRequestId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    
    console.log(`🎨 Getting custom production request: ${requestId} for userKey: ${userKey}`);
    
    // Default tenant ID
    const tenantId = 1;
    let numericUserId;
    try {
      numericUserId = await resolveUserKeyToPk(userKey, tenantId);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid or unknown user' });
    }
    
    // Get request details
    const [requests] = await poolWrapper.execute(
      `SELECT * FROM custom_production_requests 
       WHERE id = ? AND userId = ? AND tenantId = ?`,
      [numericRequestId, numericUserId, tenantId]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    const request = requests[0];
    
    // Get request items with product details
    const [items] = await poolWrapper.execute(`
      SELECT cpi.*, p.name as productName, p.image as productImage, p.price as productPrice
      FROM custom_production_items cpi
      LEFT JOIN products p ON cpi.productId = p.id
      WHERE cpi.requestId = ? AND cpi.tenantId = ?
      ORDER BY cpi.createdAt
    `, [numericRequestId, tenantId]);
    
    const formattedRequest = {
      ...request,
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        productPrice: item.productPrice,
        quantity: item.quantity,
        customizations: JSON.parse(item.customizations)
      }))
    };
    
    console.log(`✅ Found custom production request with ${items.length} items`);
    res.json({ success: true, data: formattedRequest });
    
  } catch (error) {
    console.error('❌ Error getting custom production request:', error);
    res.status(500).json({ success: false, message: 'Error getting custom production request' });
  }
});

// Create custom production request
app.post('/api/custom-production-requests', async (req, res) => {
  try {
    const { 
      userId, 
      items, 
      customerName, 
      customerEmail, 
      customerPhone, 
      notes 
    } = req.body;
    
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and items are required' 
      });
    }
    
    if (!customerName || !customerEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name and email are required' 
      });
    }
    
    console.log(`🎨 Creating custom production request for user: ${userId}`);
    
    // Default tenant ID
    const tenantId = 1;
    
    // Generate request number
    const requestNumber = `CP${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Calculate total quantity and amount
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = items.reduce((sum, item) => {
      const price = item.productPrice || 0;
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create custom production request
      const [requestResult] = await connection.execute(
        `INSERT INTO custom_production_requests 
         (tenantId, userId, requestNumber, status, totalQuantity, totalAmount, 
          customerName, customerEmail, customerPhone, notes) 
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
        [tenantId, userId, requestNumber, totalQuantity, totalAmount, 
         customerName, customerEmail, customerPhone || null, notes || null]
      );
      
      const requestId = requestResult.insertId;
      
      // Create custom production items
      for (const item of items) {
        await connection.execute(
          `INSERT INTO custom_production_items 
           (tenantId, requestId, productId, quantity, customizations) 
           VALUES (?, ?, ?, ?, ?)`,
          [tenantId, requestId, item.productId, item.quantity, JSON.stringify(item.customizations)]
        );
      }
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ Custom production request created: ${requestNumber}`);
      res.json({ 
        success: true, 
        message: 'Custom production request created successfully',
        data: {
          id: requestId,
          requestNumber: requestNumber,
          status: 'pending',
          totalQuantity: totalQuantity,
          totalAmount: totalAmount
        }
      });
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error creating custom production request:', error);
    res.status(500).json({ success: false, message: 'Error creating custom production request' });
  }
});

// Update custom production request status (admin only)
app.put('/api/custom-production-requests/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, estimatedDeliveryDate, actualDeliveryDate, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }
    
    const validStatuses = ['pending', 'review', 'design', 'production', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }
    
    console.log(`🎨 Updating custom production request status: ${requestId} to ${status}`);
    
    // Default tenant ID
    const tenantId = 1;
    
    const updateFields = ['status = ?'];
    const params = [status, requestId, tenantId];
    
    if (estimatedDeliveryDate) {
      updateFields.push('estimatedDeliveryDate = ?');
      params.splice(-2, 0, estimatedDeliveryDate);
    }
    
    if (actualDeliveryDate) {
      updateFields.push('actualDeliveryDate = ?');
      params.splice(-2, 0, actualDeliveryDate);
    }
    
    if (notes) {
      updateFields.push('notes = ?');
      params.splice(-2, 0, notes);
    }
    
    const [result] = await poolWrapper.execute(
      `UPDATE custom_production_requests 
       SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND tenantId = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    console.log(`✅ Custom production request status updated: ${requestId}`);
    res.json({ success: true, message: 'Status updated successfully' });
    
  } catch (error) {
    console.error('❌ Error updating custom production request status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

// Manual XML sync endpoint
app.post('/api/sync/products', async (req, res) => {
  try {
    console.log('🔄 Manual XML sync triggered...');
    
    if (!xmlSyncService) {
      return res.status(500).json({ 
        success: false, 
        message: 'XML sync service not initialized' 
      });
    }
    
    // Trigger manual sync
    const started = Date.now();
    let message = 'OK';
    let success = true;
    try {
      await xmlSyncService.syncProducts();
    } catch (innerErr) {
      success = false;
      message = innerErr && innerErr.message ? innerErr.message : 'Unknown error';
      throw innerErr;
    } finally {
      try {
        const durationMs = Date.now() - started;
        global.__syncLogs = global.__syncLogs || [];
        global.__syncLogs.unshift({ startedAt: new Date(started).toISOString(), durationMs, success, message });
        if (global.__syncLogs.length > 50) global.__syncLogs.length = 50;
      } catch (logErr) { /* ignore */ }
    }
    
    res.json({ 
      success: true, 
      message: 'Product sync completed successfully with updated price logic',
      timestamp: new Date().toISOString(),
      note: 'IndirimliFiyat = 0 ise SatisFiyati kullanıldı'
    });
    
  } catch (error) {
    console.error('❌ Error in manual sync:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during product sync: ' + error.message 
    });
  }
});

// Sync logs (admin)
app.get('/api/admin/sync/logs', authenticateAdmin, async (req, res) => {
  try {
    const logs = Array.isArray(global.__syncLogs) ? global.__syncLogs : [];
    res.json({ success: true, data: logs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Cannot load logs' });
  }
});

// ==================== CAMPAIGN MANAGEMENT API ====================

// Admin - Get campaigns with pagination and filters (for admin panel)
app.get('/api/campaigns', authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);
    const q = (req.query.q || '').toString().trim();
    const status = (req.query.status || '').toString().trim();

    const whereClauses = [];
    const whereParams = [];
    if (q) {
      whereClauses.push('(c.name LIKE ? OR c.description LIKE ?)');
      whereParams.push(`%${q}%`, `%${q}%`);
    }
    if (status) {
      whereClauses.push('c.status = ?');
      whereParams.push(status);
    }
    const whereSQL = whereClauses.length ? ('WHERE ' + whereClauses.join(' AND ')) : '';

    const offset = (page - 1) * pageSize;

    // Count total
    const [countRows] = await poolWrapper.execute(
      `SELECT COUNT(*) as total FROM campaigns c ${whereSQL}`,
      whereParams
    );
    const total = countRows[0]?.total || 0;

    // Page data
    const [campaigns] = await poolWrapper.execute(
      `SELECT c.*, cs.name as segmentName
       FROM campaigns c
       LEFT JOIN customer_segments cs ON c.targetSegmentId = cs.id
       ${whereSQL}
       ORDER BY c.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, pageSize, offset]
    );

    res.json({
      success: true,
      data: campaigns,
      meta: { page, pageSize, total }
    });
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching campaigns' });
  }
});

// Admin - Get all segments (for admin panel)
app.get('/api/campaigns/segments', authenticateAdmin, async (req, res) => {
  try {
    const [segments] = await poolWrapper.execute(`
      SELECT cs.*, COUNT(csa.userId) as customerCount
      FROM customer_segments cs 
      LEFT JOIN customer_segment_assignments csa ON cs.id = csa.segmentId
      GROUP BY cs.id
      ORDER BY cs.createdAt DESC
    `);
    
    // Parse JSON criteria
    const parsedSegments = segments.map(segment => ({
      ...segment,
      criteria: JSON.parse(segment.criteria)
    }));
    
    res.json({
      success: true,
      data: parsedSegments
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer segments:', error);
    res.status(500).json({ success: false, message: 'Error fetching customer segments' });
  }
});

// Admin - Create campaign
app.post('/api/campaigns', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, type, targetSegmentId, discountType, discountValue, minOrderAmount, startDate, endDate, usageLimit } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }
    
    console.log('🎯 Creating campaign:', { name, type });
    
    const [result] = await poolWrapper.execute(
      'INSERT INTO campaigns (tenantId, name, description, type, targetSegmentId, discountType, discountValue, minOrderAmount, startDate, endDate, usageLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, name, description || '', type, targetSegmentId || null, discountType || 'percentage', discountValue || 0, minOrderAmount || 0, startDate || null, endDate || null, usageLimit || null]
    );
    
    res.json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaignId: result.insertId }
    });
    
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({ success: false, message: 'Error creating campaign' });
  }
});

// Admin - Create segment
app.post('/api/campaigns/segments', authenticateAdmin, async (req, res) => {
  try {
    const { name, description, criteria } = req.body;
    
    if (!name || !criteria) {
      return res.status(400).json({
        success: false,
        message: 'Name and criteria are required'
      });
    }
    
    console.log('🎯 Creating customer segment:', { name, criteria });
    
    const [result] = await poolWrapper.execute(
      'INSERT INTO customer_segments (tenantId, name, description, criteria) VALUES (?, ?, ?, ?)',
      [1, name, description || '', JSON.stringify(criteria)]
    );
    
    res.json({
      success: true,
      message: 'Customer segment created successfully',
      data: { segmentId: result.insertId }
    });
    
  } catch (error) {
    console.error('❌ Error creating customer segment:', error);
    res.status(500).json({ success: false, message: 'Error creating customer segment' });
  }
});

// Admin - Auto create segments
app.post('/api/campaigns/segments/auto-create', authenticateAdmin, async (req, res) => {
  try {
    console.log('🤖 Creating automatic segments...');
    
    // Create RFM-based segments
    const rfmSegments = [
      {
        name: 'Champions',
        description: 'En değerli müşteriler - sık sık alışveriş yapan, yüksek harcama yapan müşteriler',
        criteria: { rfmScore: '555', minOrders: 10, minSpent: 2000 }
      },
      {
        name: 'Loyal Customers',
        description: 'Sadık müşteriler - düzenli alışveriş yapan müşteriler',
        criteria: { rfmScore: '444', minOrders: 5, minSpent: 1000 }
      },
      {
        name: 'Potential Loyalists',
        description: 'Potansiyel sadık müşteriler - düzenli alışveriş yapmaya başlayan müşteriler',
        criteria: { rfmScore: '333', minOrders: 3, minSpent: 500 }
      },
      {
        name: 'New Customers',
        description: 'Yeni müşteriler - henüz alışveriş geçmişi az olan müşteriler',
        criteria: { rfmScore: '222', maxOrders: 2, maxSpent: 500 }
      },
      {
        name: 'At Risk',
        description: 'Risk altındaki müşteriler - uzun süredir alışveriş yapmayan müşteriler',
        criteria: { lastOrderDays: 90, minOrders: 1 }
      }
    ];

    let segmentsCreated = 0;
    for (const segmentData of rfmSegments) {
      try {
        await poolWrapper.execute(
          'INSERT INTO customer_segments (tenantId, name, description, criteria) VALUES (?, ?, ?, ?)',
          [1, segmentData.name, segmentData.description, JSON.stringify(segmentData.criteria)]
        );
        segmentsCreated++;
      } catch (error) {
        console.log(`⚠️ Segment ${segmentData.name} already exists or error:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `${segmentsCreated} otomatik segment oluşturuldu`,
      data: { segmentsCreated }
    });
    
  } catch (error) {
    console.error('❌ Error creating automatic segments:', error);
    res.status(500).json({ success: false, message: 'Error creating automatic segments' });
  }
});

// Customer Segments API (for tenants)
app.post('/api/campaigns/segments', async (req, res) => {
  try {
    const { name, description, criteria } = req.body;
    
    if (!name || !criteria) {
      return res.status(400).json({
        success: false,
        message: 'Name and criteria are required'
      });
    }
    
    console.log('🎯 Creating customer segment:', { name, criteria });
    
    const [result] = await poolWrapper.execute(
      'INSERT INTO customer_segments (tenantId, name, description, criteria) VALUES (?, ?, ?, ?)',
      [req.tenant.id, name, description || '', JSON.stringify(criteria)]
    );
    
    res.json({
      success: true,
      message: 'Customer segment created successfully',
      data: { segmentId: result.insertId }
    });
    
  } catch (error) {
    console.error('❌ Error creating customer segment:', error);
    res.status(500).json({ success: false, message: 'Error creating customer segment' });
  }
});

app.get('/api/campaigns/segments', async (req, res) => {
  try {
    const [segments] = await poolWrapper.execute(
      'SELECT * FROM customer_segments WHERE tenantId = ? ORDER BY createdAt DESC',
      [req.tenant.id]
    );
    
    // Parse JSON criteria
    const parsedSegments = segments.map(segment => ({
      ...segment,
      criteria: JSON.parse(segment.criteria)
    }));
    
    res.json({
      success: true,
      data: parsedSegments
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer segments:', error);
    res.status(500).json({ success: false, message: 'Error fetching customer segments' });
  }
});

// Campaigns API
app.post('/api/campaigns', async (req, res) => {
  try {
    const {
      name, description, type, targetSegmentId, discountType, discountValue,
      minOrderAmount, maxDiscountAmount, applicableProducts, excludedProducts,
      startDate, endDate, usageLimit
    } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }
    
    console.log('🎪 Creating campaign:', { name, type });
    
    const [result] = await poolWrapper.execute(
      `INSERT INTO campaigns (tenantId, name, description, type, targetSegmentId, discountType, 
       discountValue, minOrderAmount, maxDiscountAmount, applicableProducts, excludedProducts, 
       startDate, endDate, usageLimit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenant.id, name, description || '', type, targetSegmentId || null,
        discountType || 'percentage', discountValue || 0, minOrderAmount || 0,
        maxDiscountAmount || null, JSON.stringify(applicableProducts || []),
        JSON.stringify(excludedProducts || []), startDate || null, endDate || null,
        usageLimit || null
      ]
    );
    
    res.json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaignId: result.insertId }
    });
    
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({ success: false, message: 'Error creating campaign' });
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const [campaigns] = await poolWrapper.execute(
      `SELECT c.*, cs.name as segmentName 
       FROM campaigns c 
       LEFT JOIN customer_segments cs ON c.targetSegmentId = cs.id 
       WHERE c.tenantId = ? 
       ORDER BY c.createdAt DESC`,
      [req.tenant.id]
    );
    
    // Parse JSON fields
    const parsedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      applicableProducts: JSON.parse(campaign.applicableProducts || '[]'),
      excludedProducts: JSON.parse(campaign.excludedProducts || '[]')
    }));
    
    res.json({
      success: true,
      data: parsedCampaigns
    });
    
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching campaigns' });
  }
});

// Customer Analytics API
app.get('/api/campaigns/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const internalUserId = await resolveInternalUserId(userId, req.tenant.id);
    if (!internalUserId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get or create customer analytics
    let [analytics] = await poolWrapper.execute(
      'SELECT * FROM customer_analytics WHERE userId = ? AND tenantId = ?',
      [internalUserId, req.tenant.id]
    );
    
    if (analytics.length === 0) {
      // Create new analytics record
      await poolWrapper.execute(
        `INSERT INTO customer_analytics (tenantId, userId, lastActivityDate) VALUES (?, ?, NOW())`,
        [req.tenant.id, internalUserId]
      );
      
      [analytics] = await poolWrapper.execute(
        'SELECT * FROM customer_analytics WHERE userId = ? AND tenantId = ?',
        [internalUserId, req.tenant.id]
      );
    }
    
    const customerAnalytics = analytics[0];
    
    // Parse JSON fields
    customerAnalytics.favoriteCategories = JSON.parse(customerAnalytics.favoriteCategories || '[]');
    customerAnalytics.favoriteBrands = JSON.parse(customerAnalytics.favoriteBrands || '[]');
    
    res.json({
      success: true,
      data: customerAnalytics
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching customer analytics' });
  }
});

// Recommendation system removed: /api/campaigns/recommendations is deprecated

// Campaign Usage Tracking
app.post('/api/campaigns/usage', async (req, res) => {
  try {
    const { campaignId, userId, orderId, discountAmount } = req.body;
    
    if (!campaignId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID and User ID are required'
      });
    }
    
    console.log('📊 Tracking campaign usage:', { campaignId, userId, orderId });
    
    await poolWrapper.execute(
      'INSERT INTO campaign_usage (tenantId, campaignId, userId, orderId, discountAmount) VALUES (?, ?, ?, ?, ?)',
      [req.tenant.id, campaignId, userId, orderId || null, discountAmount || 0]
    );
    
    // Update campaign usage count
    await poolWrapper.execute(
      'UPDATE campaigns SET usedCount = usedCount + 1 WHERE id = ? AND tenantId = ?',
      [campaignId, req.tenant.id]
    );
    
    res.json({
      success: true,
      message: 'Campaign usage tracked successfully'
    });
    
  } catch (error) {
    console.error('❌ Error tracking campaign usage:', error);
    res.status(500).json({ success: false, message: 'Error tracking campaign usage' });
  }
});

// Get available campaigns for user
app.get('/api/campaigns/available/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [campaigns] = await poolWrapper.execute(
      `SELECT c.*, cs.name as segmentName
       FROM campaigns c
       LEFT JOIN customer_segments cs ON c.targetSegmentId = cs.id
       WHERE c.tenantId = ? 
       AND c.status = 'active' 
       AND c.isActive = true
       AND (c.startDate IS NULL OR c.startDate <= NOW())
       AND (c.endDate IS NULL OR c.endDate >= NOW())
       AND (c.usageLimit IS NULL OR c.usedCount < c.usageLimit)
       ORDER BY c.createdAt DESC`,
      [req.tenant.id]
    );
    
    // Filter campaigns based on user segments
    const userSegments = await poolWrapper.execute(
      'SELECT segmentId FROM customer_segment_assignments WHERE userId = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    const userSegmentIds = userSegments.map(row => row.segmentId);
    
    const availableCampaigns = campaigns.filter(campaign => {
      // If no target segment, campaign is available to all
      if (!campaign.targetSegmentId) return true;
      
      // Check if user is in the target segment
      return userSegmentIds.includes(campaign.targetSegmentId);
    });
    
    // Parse JSON fields
    const parsedCampaigns = availableCampaigns.map(campaign => ({
      ...campaign,
      applicableProducts: JSON.parse(campaign.applicableProducts || '[]'),
      excludedProducts: JSON.parse(campaign.excludedProducts || '[]')
    }));
    
    res.json({
      success: true,
      data: parsedCampaigns
    });
    
  } catch (error) {
    console.error('❌ Error fetching available campaigns:', error);
    res.status(500).json({ success: false, message: 'Error fetching available campaigns' });
  }
});

// ==================== DISCOUNT WHEEL API ====================

// Spin discount wheel
app.post('/api/discount-wheel/spin', async (req, res) => {
  try {
    const { deviceId, ipAddress, userAgent } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }
    
    console.log('🎰 Spinning discount wheel for device:', deviceId);
    
    // Check if device already spun
    const [existingSpin] = await poolWrapper.execute(
      'SELECT * FROM discount_wheel_spins WHERE deviceId = ? AND tenantId = ?',
      [deviceId, req.tenant.id]
    );
    
    if (existingSpin.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu cihazdan zaten çark çevrilmiş',
        data: {
          alreadySpun: true,
          existingCode: existingSpin[0].discountCode,
          spinResult: existingSpin[0].spinResult,
          expiresAt: existingSpin[0].expiresAt
        }
      });
    }
    
    // Generate random discount (1%, 3%, 5%, 7%, 10%, 20%)
    // %10 ve %20'nin çıkma ihtimali 8 kat daha az
    const discountOptions = ['1', '3', '5', '7', '10', '20'];
    const probabilities = [25, 25, 25, 25, 3.125, 3.125]; // %10 ve %20: 8 kat daha az (25/8 = 3.125)
    
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    let selectedDiscount = '1';
    
    for (let i = 0; i < discountOptions.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        selectedDiscount = discountOptions[i];
        break;
      }
    }
    
    // Generate unique discount code
    const discountCode = `WHEEL${selectedDiscount}${Date.now().toString().slice(-6)}`;
    
    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Save spin result
    const [result] = await poolWrapper.execute(
      `INSERT INTO discount_wheel_spins 
       (tenantId, deviceId, ipAddress, userAgent, spinResult, discountCode, expiresAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant.id, deviceId, ipAddress || '', userAgent || '', selectedDiscount, discountCode, expiresAt]
    );
    
    // If user is logged in, also save to user discount codes
    if (req.body.userId) {
      await poolWrapper.execute(
        `INSERT INTO user_discount_codes 
         (tenantId, userId, discountCode, discountType, discountValue, expiresAt) 
         VALUES (?, ?, ?, 'percentage', ?, ?)`,
        [req.tenant.id, req.body.userId, discountCode, selectedDiscount, expiresAt]
      );
    }
    
    console.log(`✅ Discount wheel spun: ${selectedDiscount}% discount, code: ${discountCode}`);
    
    res.json({
      success: true,
      message: 'Çark başarıyla çevrildi!',
      data: {
        spinResult: selectedDiscount,
        discountCode,
        expiresAt: expiresAt.toISOString(),
        discountType: 'percentage',
        discountValue: selectedDiscount
      }
    });
    
  } catch (error) {
    console.error('❌ Error spinning discount wheel:', error);
    res.status(500).json({ success: false, message: 'Çark çevrilirken hata oluştu' });
  }
});

// Get user discount codes
app.get('/api/discount-codes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [codes] = await poolWrapper.execute(
      `SELECT * FROM user_discount_codes 
       WHERE userId = ? AND tenantId = ? 
       ORDER BY createdAt DESC`,
      [userId, req.tenant.id]
    );
    
    res.json({
      success: true,
      data: codes
    });
    
  } catch (error) {
    console.error('❌ Error fetching discount codes:', error);
    res.status(500).json({ success: false, message: 'İndirim kodları alınırken hata oluştu' });
  }
});

// Validate discount code
app.post('/api/discount-codes/validate', async (req, res) => {
  try {
    const { discountCode, userId, orderAmount } = req.body;
    
    if (!discountCode || !userId || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Discount code, user ID, and order amount are required'
      });
    }
    
    // Find the discount code
    const [codes] = await poolWrapper.execute(
      `SELECT * FROM user_discount_codes 
       WHERE discountCode = ? AND userId = ? AND tenantId = ? 
       AND isUsed = false AND expiresAt > NOW()`,
      [discountCode, userId, req.tenant.id]
    );
    
    if (codes.length === 0) {
      return res.json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş indirim kodu'
      });
    }
    
    const code = codes[0];
    
    // Check minimum order amount
    if (orderAmount < code.minOrderAmount) {
      return res.json({
        success: false,
        message: `Minimum sipariş tutarı ${code.minOrderAmount} TL olmalı`
      });
    }
    
    // Calculate discount amount
    let discountAmount = 0;
    if (code.discountType === 'percentage') {
      discountAmount = (orderAmount * code.discountValue) / 100;
    } else {
      discountAmount = code.discountValue;
    }
    
    // Apply maximum discount limit
    if (code.maxDiscountAmount && discountAmount > code.maxDiscountAmount) {
      discountAmount = code.maxDiscountAmount;
    }
    
    // Can't discount more than order amount
    discountAmount = Math.min(discountAmount, orderAmount);
    
    res.json({
      success: true,
      data: {
        discountAmount,
        discountType: code.discountType,
        discountValue: code.discountValue,
        finalAmount: orderAmount - discountAmount
      }
    });
    
  } catch (error) {
    console.error('❌ Error validating discount code:', error);
    res.status(500).json({ success: false, message: 'İndirim kodu doğrulanırken hata oluştu' });
  }
});

// Use discount code
app.post('/api/discount-codes/use', async (req, res) => {
  try {
    const { discountCode, userId, orderId } = req.body;
    
    if (!discountCode || !userId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Discount code, user ID, and order ID are required'
      });
    }
    
    // Mark code as used
    const [result] = await poolWrapper.execute(
      `UPDATE user_discount_codes 
       SET isUsed = true, usedAt = NOW(), orderId = ? 
       WHERE discountCode = ? AND userId = ? AND tenantId = ? AND isUsed = false`,
      [orderId, discountCode, userId, req.tenant.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'İndirim kodu bulunamadı veya zaten kullanılmış'
      });
    }
    
    res.json({
      success: true,
      message: 'İndirim kodu başarıyla kullanıldı'
    });
    
  } catch (error) {
    console.error('❌ Error using discount code:', error);
    res.status(500).json({ success: false, message: 'İndirim kodu kullanılırken hata oluştu' });
  }
});

// Check if device can spin
app.get('/api/discount-wheel/check/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const [existingSpin] = await poolWrapper.execute(
      'SELECT * FROM discount_wheel_spins WHERE deviceId = ? AND tenantId = ?',
      [deviceId, req.tenant.id]
    );
    
    if (existingSpin.length > 0) {
      const spin = existingSpin[0];
      return res.json({
        success: true,
        data: {
          canSpin: false,
          alreadySpun: true,
          existingCode: spin.discountCode,
          spinResult: spin.spinResult,
          expiresAt: spin.expiresAt,
          isUsed: spin.isUsed
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        canSpin: true,
        alreadySpun: false
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking discount wheel:', error);
    res.status(500).json({ success: false, message: 'Çark durumu kontrol edilirken hata oluştu' });
  }
});

// ==================== CHATBOT API ENDPOINTS ====================

// Chatbot mesaj işleme endpoint'i
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message, actionType = 'text', userId } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj boş olamaz'
      });
    }

    console.log('🤖 Chatbot mesaj alındı:', { message, actionType, userId });

    // Intent tespiti
    const intent = detectChatbotIntent(message.toLowerCase());
    console.log('🎯 Tespit edilen intent:', intent);

    // Yanıt oluştur
    const response = await generateChatbotResponse(intent, message, actionType, req.tenant.id);
    
    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Chatbot mesaj işleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj işlenirken hata oluştu',
      error: error.message
    });
  }
});

// Chatbot analitik endpoint'i
app.post('/api/chatbot/analytics', async (req, res) => {
  try {
    const { userId, message, intent, satisfaction } = req.body;
    
    // Analitik verilerini kaydet
    await poolWrapper.execute(
      `INSERT INTO chatbot_analytics (userId, tenantId, message, intent, satisfaction, timestamp) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId || null, req.tenant.id, message?.substring(0, 100), intent, satisfaction]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Chatbot analitik hatası:', error);
    res.status(500).json({ success: false, message: 'Analitik kaydedilemedi' });
  }
});

// Chatbot FAQ endpoint'i
app.get('/api/chatbot/faq', async (req, res) => {
  try {
    const faqData = {
      'sipariş nasıl takip': 'Siparişinizi takip etmek için "Hesabım > Siparişlerim" bölümüne gidin veya sipariş numaranızla takip yapın.',
      'kargo ücreti': '150 TL ve üzeri alışverişlerde kargo ücretsizdir. Altındaki siparişler için 19,90 TL kargo ücreti alınır.',
      'iade nasıl': 'Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz. "İade Taleplerim" bölümünden işlem yapın.',
      'ödeme yöntemleri': 'Kredi kartı, banka kartı, havale/EFT seçenekleri mevcuttur. Kapıda ödeme bulunmamaktadır.',
      'teslimat süresi': 'Stokta bulunan ürünler 1-3 iş günü içinde kargoya verilir. Teslimat süresi 1-5 iş günüdür.',
      'taksit': 'Kredi kartınızla 2, 3, 6, 9 ve 12 aya varan taksit seçenekleri kullanabilirsiniz.',
      'şifre unuttum': 'Giriş ekranında "Şifremi Unuttum" linkine tıklayın ve e-posta adresinizi girin.',
      'stok': 'Ürün sayfasında stok durumu gösterilir. Stokta olmayan ürünler için "Stok gelince haber ver" seçeneğini kullanın.'
    };

    res.json({
      success: true,
      data: faqData
    });
  } catch (error) {
    console.error('❌ FAQ yükleme hatası:', error);
    res.status(500).json({ success: false, message: 'FAQ yüklenemedi' });
  }
});

// Chatbot intent tespit fonksiyonu
function detectChatbotIntent(message) {
  const intents = {
    greeting: ['merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar'],
    order_tracking: ['sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim'],
    product_search: ['ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama'],
    campaigns: ['kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif'],
    recommendations: ['öneri', 'bana ne önerirsin', 'ne alsam', 'beni tanı', 'kişisel öneri', 'kişiselleştir'],
    support: ['yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek'],
    payment: ['ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit'],
    return: ['iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış'],
    shipping: ['kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres'],
    account: ['hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik'],
    goodbye: ['görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış']
  };

  // Sipariş numarası tespiti
  if (/\b\d{5,}\b/.test(message)) {
    return 'order_number';
  }

  // Intent tespiti
  for (const [intent, keywords] of Object.entries(intents)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        return intent;
      }
    }
  }

  // Ürün arama tespiti
  if (message.length > 3) {
    return 'product_search_query';
  }

  return 'unknown';
}

// Chatbot yanıt oluşturma fonksiyonu
async function generateChatbotResponse(intent, message, actionType, tenantId) {
  const timestamp = new Date();
  const messageId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Özel eylem tipleri
  if (actionType !== 'text') {
    return await handleSpecialChatbotAction(actionType, message, messageId, timestamp, tenantId);
  }

  // Intent'e göre yanıt oluştur
  switch (intent) {
    case 'order_number':
      return await handleOrderTracking(message, tenantId);
    
    case 'product_search_query':
      return await handleProductSearch(message, tenantId);
    
    case 'campaigns':
      return await handleCampaigns(tenantId);
    
    case 'recommendations':
      return await handleRecommendations(tenantId);
    
    case 'unknown':
      return {
        id: messageId,
        text: '🤔 Tam olarak anlayamadım. Size nasıl yardımcı olabileceğimi belirtir misiniz?',
        isBot: true,
        timestamp,
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
          { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
          { id: '4', text: '❓ S.S.S.', action: 'faq' }
        ]
      };
    
    default:
      return getQuickResponse(intent, messageId, timestamp);
  }
}

// Hızlı yanıt fonksiyonu
function getQuickResponse(intent, messageId, timestamp) {
  const quickResponses = {
    greeting: {
      text: '👋 Merhaba! Size nasıl yardımcı olabilirim?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
        { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '🎧 Canlı Destek', action: 'live_support' }
      ]
    },
    order_tracking: {
      text: '📦 Sipariş takibi için sipariş numaranızı paylaşabilir misiniz? Veya "Siparişlerim" sayfasından tüm siparişlerinizi görüntüleyebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📋 Siparişlerim', action: 'view_orders' },
        { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
        { id: '3', text: '📞 Destek Çağır', action: 'live_support' }
      ]
    },
    product_search: {
      text: '🔍 Hangi ürünü arıyorsunuz? Ürün adını yazabilir veya kategorilere göz atabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
        { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
        { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
        { id: '4', text: '👕 Giyim', action: 'search_category_giyim' }
      ]
    },
    support: {
      text: '🎧 Size nasıl yardımcı olabilirim? Sorununuzu açıklayabilir veya canlı desteğe bağlanabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📞 Canlı Destek', action: 'live_support' },
        { id: '2', text: '📧 E-posta Gönder', action: 'email_support' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '📱 WhatsApp', action: 'whatsapp_support' }
      ]
    }
  };

  const response = quickResponses[intent] || quickResponses.greeting;
  return {
    id: messageId,
    text: response.text,
    isBot: true,
    timestamp,
    type: response.type || 'text',
    quickReplies: response.quickReplies
  };
}

// Sipariş takibi fonksiyonu
async function handleOrderTracking(message, tenantId) {
  const orderNumber = message.match(/\b\d{5,}\b/)?.[0];
  
  if (orderNumber) {
    try {
      const [rows] = await poolWrapper.execute(
        'SELECT * FROM orders WHERE id = ? AND tenantId = ?',
        [orderNumber, tenantId]
      );
      
      if (rows.length > 0) {
        const order = rows[0];
        const statusText = getOrderStatusText(order.status);
        const trackingInfo = order.trackingNumber ? `\n📋 Takip No: ${order.trackingNumber}` : '';
        
        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: `📦 Sipariş #${orderNumber}\n\n🚚 Durum: ${statusText}${trackingInfo}\n💰 Tutar: ₺${(Number(order.totalAmount) || 0).toFixed(2)}\n📅 Tarih: ${new Date(order.createdAt).toLocaleDateString('tr-TR')}`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🔍 Detay Gör', action: 'order_detail', data: { orderId: orderNumber } },
            { id: '2', text: '📞 Kargo Şirketi', action: 'cargo_contact' },
            { id: '3', text: '📋 Tüm Siparişler', action: 'view_orders' }
          ]
        };
      } else {
        return {
          id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: `❌ ${orderNumber} numaralı sipariş bulunamadı. Sipariş numaranızı kontrol edin veya giriş yaparak siparişlerinizi görüntüleyin.`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '📋 Siparişlerime Git', action: 'navigate_orders' },
            { id: '2', text: '🔢 Başka Numara', action: 'enter_order_number' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' }
          ]
        };
      }
    } catch (error) {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: '❌ Sipariş sorgulanırken bir hata oluştu. Lütfen tekrar deneyin veya canlı destek ile iletişime geçin.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🔄 Tekrar Dene', action: 'order_tracking' },
          { id: '2', text: '📋 Siparişlerim', action: 'view_orders' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' }
        ]
      };
    }
  }

  return getQuickResponse('order_tracking', `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, new Date());
}

// Ürün arama fonksiyonu
async function handleProductSearch(query, tenantId) {
  try {
    const [rows] = await poolWrapper.execute(
      `SELECT * FROM products 
       WHERE (name LIKE ? OR description LIKE ?) 
       AND tenantId = ? 
       AND isActive = 1 
       ORDER BY name 
       LIMIT 5`,
      [`%${query}%`, `%${query}%`, tenantId]
    );

    if (rows.length > 0) {
      const productList = rows.map(p => 
        `• ${p.name}\n  💰 ₺${Number(p.price || 0).toFixed(2)}\n  📦 Stok: ${p.stock > 0 ? 'Var' : 'Yok'}`
      ).join('\n\n');
      
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: `🔍 "${query}" için ${rows.length} ürün buldum:\n\n${productList}`,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '👀 Tümünü Gör', action: 'view_products', data: { query } },
          { id: '2', text: '🔍 Yeni Arama', action: 'product_search' },
          { id: '3', text: '🛒 Kategoriler', action: 'view_categories' }
        ]
      };
    } else {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: `😔 "${query}" için ürün bulunamadı. Farklı anahtar kelimeler deneyebilirsiniz.`,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🔍 Yeni Arama', action: 'product_search' },
          { id: '2', text: '🛒 Kategoriler', action: 'view_categories' },
          { id: '3', text: '🎧 Yardım İste', action: 'live_support' }
        ]
      };
    }
  } catch (error) {
    return {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: '❌ Ürün aramasında bir hata oluştu. Lütfen tekrar deneyin.',
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🔄 Tekrar Dene', action: 'product_search' },
        { id: '2', text: '🎧 Canlı Destek', action: 'live_support' }
      ]
    };
  }
}

// Kampanya fonksiyonu
async function handleCampaigns(tenantId) {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM campaigns WHERE tenantId = ? AND isActive = 1 ORDER BY createdAt DESC LIMIT 3',
      [tenantId]
    );

    if (rows.length === 0) {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: 'Şu an aktif kampanya bulunamadı. Daha sonra tekrar kontrol edebilirsiniz.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
          { id: '2', text: '🛒 Ürünlere Göz At', action: 'view_products' }
        ]
      };
    }

    const campaignList = rows.map(c => {
      const discount = c.discountType === 'percentage' ? `%${c.discountValue}` : `${c.discountValue} TL`;
      return `• ${c.name} (${discount})${c.minOrderAmount ? ` – Min. ₺${Number(c.minOrderAmount).toFixed(0)}` : ''}`;
    }).join('\n');

    return {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: `🎁 Aktif kampanyalar:\n\n${campaignList}`,
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '✅ Uygun muyum?', action: 'check_campaign_eligibility' },
        { id: '2', text: '🛒 Ürünler', action: 'view_products' },
        { id: '3', text: '🏠 Ana Menü', action: 'greeting' }
      ]
    };
  } catch (error) {
    return {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: 'Kampanyalar yüklenirken bir sorun oluştu. Daha sonra tekrar deneyin.',
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
      ]
    };
  }
}

// Öneri fonksiyonu
async function handleRecommendations(tenantId) {
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM products WHERE tenantId = ? AND isActive = 1 ORDER BY RAND() LIMIT 3',
      [tenantId]
    );

    if (rows.length === 0) {
      return {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: 'Şu an öneri oluşturamadım. Popüler ürünlere göz atabilirsiniz.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🛒 Popüler Ürünler', action: 'view_products' },
          { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
        ]
      };
    }

    const productList = rows.map(p => `• ${p.name} – ₺${Number(p.price || 0).toFixed(2)}`).join('\n');
    
    return {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: `⭐ Size önerdiklerim:\n\n${productList}`,
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '👀 Tümünü Gör', action: 'view_products' },
        { id: '2', text: '🎁 Kampanyalarım', action: 'check_campaign_eligibility' },
        { id: '3', text: '🔍 Yeni Arama', action: 'product_search' }
      ]
    };
  } catch (error) {
    return {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: 'Öneriler yüklenirken bir problem oluştu. Daha sonra tekrar deneyin.',
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🛒 Popüler Ürünler', action: 'view_products' },
        { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
      ]
    };
  }
}

// Özel eylem fonksiyonu
async function handleSpecialChatbotAction(action, message, messageId, timestamp, tenantId) {
  const responses = {
    live_support: {
      text: '🎧 Canlı desteğe bağlanıyorsunuz... Ortalama bekleme süresi: 2-3 dakika\n\n📞 Telefon: 0530 312 58 13\n📱 WhatsApp: +90 530 312 58 13\n📧 E-posta: info@hugluoutdoor.com',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📞 Telefon Et', action: 'call_support' },
        { id: '2', text: '📱 WhatsApp', action: 'whatsapp_support' },
        { id: '3', text: '📧 E-posta', action: 'email_support' }
      ]
    },
    faq: {
      text: '❓ S.S.S. sayfamızda en sık sorulan soruların cevaplarını bulabilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📖 S.S.S. Gör', action: 'view_faq' },
        { id: '2', text: '🔍 Soru Ara', action: 'search_faq' },
        { id: '3', text: '🎧 Canlı Destek', action: 'live_support' }
      ]
    },
    view_orders: {
      text: '📋 Siparişlerinizi görüntülemek için "Hesabım > Siparişlerim" sayfasına yönlendiriyorum.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📱 Siparişlerime Git', action: 'navigate_orders' },
        { id: '2', text: '🔢 Numara ile Ara', action: 'enter_order_number' }
      ]
    },
    enter_order_number: {
      text: '🔢 Sipariş numaranızı yazın (örn: 12345). Ben sizin için takip edeceğim!',
      type: 'text'
    }
  };

  const response = responses[action] || {
    text: '🤖 Bu özellik henüz geliştiriliyor. Canlı destek ile iletişime geçebilirsiniz.',
    type: 'quick_reply',
    quickReplies: [
      { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
      { id: '2', text: '🏠 Ana Menü', action: 'greeting' }
    ]
  };

  return {
    id: messageId,
    text: response.text,
    isBot: true,
    timestamp,
    type: response.type || 'text',
    quickReplies: response.quickReplies
  };
}

// Sipariş durumu metni
function getOrderStatusText(status) {
  const statusMap = {
    'pending': 'Beklemede',
    'confirmed': 'Onaylandı',
    'preparing': 'Hazırlanıyor',
    'shipped': 'Kargoda',
    'delivered': 'Teslim Edildi',
    'cancelled': 'İptal Edildi',
    'returned': 'İade Edildi'
  };
  return statusMap[status] || status;
}

// ==================== WALLET RECHARGE API ENDPOINTS ====================

// Cüzdan bakiyesi sorgulama
app.get('/api/wallet/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Resolve to internal numeric users.id to satisfy FK
    const internalUserId = await resolveInternalUserId(userId, req.tenant.id);
    if (!internalUserId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const [rows] = await poolWrapper.execute(
      'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
      [internalUserId, req.tenant.id]
    );
    
    if (rows.length === 0) {
      // Cüzdan yoksa oluştur
      await poolWrapper.execute(
        'INSERT INTO user_wallets (userId, tenantId, balance) VALUES (?, ?, 0)',
        [internalUserId, req.tenant.id]
      );
      return res.json({ success: true, data: { balance: 0 } });
    }
    
    res.json({ success: true, data: { balance: rows[0].balance } });
  } catch (error) {
    console.error('❌ Wallet balance error:', error);
    res.status(500).json({ success: false, message: 'Bakiye sorgulanırken hata oluştu' });
  }
});

// Cüzdan para yükleme isteği oluştur
app.post('/api/wallet/recharge-request', async (req, res) => {
  try {
    const { userId, amount, paymentMethod, bankInfo } = req.body;
    
    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Eksik parametreler'
      });
    }

    if (amount < 10 || amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Tutar 10-10000 TL arasında olmalıdır'
      });
    }

    const requestId = `RCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Recharge request kaydet
    await poolWrapper.execute(
      `INSERT INTO wallet_recharge_requests 
       (id, userId, tenantId, amount, paymentMethod, bankInfo, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [requestId, userId, req.tenant.id, amount, paymentMethod, JSON.stringify(bankInfo || {})]
    );

    if (paymentMethod === 'card') {
      // Kredi kartı için Iyzico entegrasyonu
      try {
        const iyzicoResponse = await processCardPayment(requestId, amount, userId);
        
        if (iyzicoResponse.success) {
          // Başarılı ödeme - bakiyeyi güncelle
          await updateWalletBalance(userId, req.tenant.id, amount, 'card_recharge', requestId);
          
          // Request durumunu güncelle
          await poolWrapper.execute(
            'UPDATE wallet_recharge_requests SET status = ?, completedAt = NOW() WHERE id = ?',
            ['completed', requestId]
          );
          
          return res.json({
            success: true,
            data: {
              requestId,
              status: 'completed',
              newBalance: await getWalletBalance(userId, req.tenant.id),
              message: 'Para yükleme başarılı!'
            }
          });
        } else {
          // Ödeme başarısız
          await poolWrapper.execute(
            'UPDATE wallet_recharge_requests SET status = ?, errorMessage = ? WHERE id = ?',
            ['failed', iyzicoResponse.message, requestId]
          );
          
          return res.json({
            success: false,
            message: iyzicoResponse.message
          });
        }
      } catch (error) {
        console.error('❌ Card payment error:', error);
        await poolWrapper.execute(
          'UPDATE wallet_recharge_requests SET status = ?, errorMessage = ? WHERE id = ?',
          ['failed', 'Kart ödemesinde hata oluştu', requestId]
        );
        
        return res.status(500).json({
          success: false,
          message: 'Kart ödemesinde hata oluştu'
        });
      }
    } else if (paymentMethod === 'bank_transfer') {
      // EFT/Havale için WhatsApp bildirimi gönder
      try {
        await sendWhatsAppNotification(req.tenant.id, userId, requestId, amount, bankInfo);
        
        return res.json({
          success: true,
          data: {
            requestId,
            status: 'pending_approval',
            message: 'EFT/Havale bilgileri WhatsApp ile gönderildi. Onay bekleniyor.',
            bankInfo: getBankInfo(req.tenant.id)
          }
        });
      } catch (error) {
        console.error('❌ WhatsApp notification error:', error);
        return res.status(500).json({
          success: false,
          message: 'Bildirim gönderilirken hata oluştu'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ödeme yöntemi'
      });
    }
  } catch (error) {
    console.error('❌ Recharge request error:', error);
    res.status(500).json({ success: false, message: 'Para yükleme isteği oluşturulamadı' });
  }
});

// Manuel para yükleme onayı (admin paneli için)
app.post('/api/wallet/approve-recharge', async (req, res) => {
  try {
    const { requestId, adminUserId } = req.body;
    
    if (!requestId || !adminUserId) {
      return res.status(400).json({
        success: false,
        message: 'Eksik parametreler'
      });
    }

    // Request'i bul
    const [rows] = await poolWrapper.execute(
      'SELECT * FROM wallet_recharge_requests WHERE id = ? AND tenantId = ? AND status = ?',
      [requestId, req.tenant.id, 'pending_approval']
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Onay bekleyen istek bulunamadı'
      });
    }

    const request = rows[0];
    
    // Bakiyeyi güncelle
    await updateWalletBalance(request.userId, req.tenant.id, request.amount, 'bank_transfer', requestId);
    
    // Request durumunu güncelle
    await poolWrapper.execute(
      'UPDATE wallet_recharge_requests SET status = ?, approvedBy = ?, completedAt = NOW() WHERE id = ?',
      ['completed', adminUserId, requestId]
    );
    
    res.json({
      success: true,
      data: {
        requestId,
        status: 'completed',
        message: 'Para yükleme onaylandı!'
      }
    });
  } catch (error) {
    console.error('❌ Approve recharge error:', error);
    res.status(500).json({ success: false, message: 'Onay işleminde hata oluştu' });
  }
});

// Bekleyen para yükleme isteklerini listele (admin paneli için)
app.get('/api/wallet/pending-requests', async (req, res) => {
  try {
    const [rows] = await poolWrapper.execute(
      `SELECT r.*, u.name, u.email, u.phone 
       FROM wallet_recharge_requests r
       JOIN users u ON r.userId = u.id
       WHERE r.tenantId = ? AND r.status = 'pending_approval'
       ORDER BY r.createdAt DESC`,
      [req.tenant.id]
    );
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Pending requests error:', error);
    res.status(500).json({ success: false, message: 'Bekleyen istekler alınamadı' });
  }
});

// Cüzdan işlem geçmişi
app.get('/api/wallet/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const [rows] = await poolWrapper.execute(
      `SELECT * FROM wallet_transactions 
       WHERE userId = ? AND tenantId = ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [userId, req.tenant.id, parseInt(limit), offset]
    );
    
    const [countRows] = await poolWrapper.execute(
      'SELECT COUNT(*) as total FROM wallet_transactions WHERE userId = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    res.json({
      success: true,
      data: {
        transactions: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countRows[0].total,
          pages: Math.ceil(countRows[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Wallet transactions error:', error);
    res.status(500).json({ success: false, message: 'İşlem geçmişi alınamadı' });
  }
});

// Yardımcı fonksiyonlar
async function processCardPayment(requestId, amount, userId) {
  console.log('🔄 Processing card payment - NO CARD DATA STORED');
  console.log('⚠️ SECURITY: Card information is processed but NOT stored in database');
  
  try {
    // Iyzico entegrasyonu burada yapılacak
    // Kart bilgileri sadece ödeme işlemi için kullanılır, kayıt edilmez
    
    // Simüle edilmiş ödeme işlemi
    const paymentResult = {
      success: true,
      message: 'Ödeme başarılı',
      transactionId: `TXN-${Date.now()}`,
      amount: amount,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Payment processed successfully - card data discarded');
    return paymentResult;
    
  } catch (error) {
    console.error('❌ Card payment processing error:', error);
    return {
      success: false,
      message: 'Ödeme işlemi başarısız',
      error: error.message
    };
  }
}

async function updateWalletBalance(userId, tenantId, amount, type, referenceId) {
  // Mevcut bakiyeyi al
  const [walletRows] = await poolWrapper.execute(
    'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
    [userId, tenantId]
  );
  
  const currentBalance = walletRows.length > 0 ? walletRows[0].balance : 0;
  const newBalance = currentBalance + amount;
  
  // Bakiyeyi güncelle veya oluştur
  await poolWrapper.execute(
    `INSERT INTO user_wallets (userId, tenantId, balance) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE balance = ?`,
    [userId, tenantId, newBalance, newBalance]
  );
  
  // İşlem kaydı oluştur
  await poolWrapper.execute(
    `INSERT INTO wallet_transactions 
     (userId, tenantId, type, amount, balance, referenceId, description, createdAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [userId, tenantId, type, amount, newBalance, referenceId, `Cüzdan ${type} - ${amount} TL`]
  );
}

async function getWalletBalance(userId, tenantId) {
  const [rows] = await poolWrapper.execute(
    'SELECT balance FROM user_wallets WHERE userId = ? AND tenantId = ?',
    [userId, tenantId]
  );
  return rows.length > 0 ? rows[0].balance : 0;
}

async function sendWhatsAppNotification(tenantId, userId, requestId, amount, bankInfo) {
  try {
    const result = await WhatsAppService.sendRechargeNotification(
      tenantId, 
      userId, 
      requestId, 
      amount, 
      bankInfo
    );
    
    if (result.success) {
      console.log('✅ WhatsApp notification sent successfully');
    } else {
      console.error('❌ WhatsApp notification failed:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ WhatsApp notification error:', error);
    return false;
  }
}

function getBankInfo(tenantId) {
  // Tenant'a özel banka bilgileri
  return {
    bankName: 'Huglu Outdoor Bankası',
    accountName: 'Huglu Outdoor Ltd. Şti.',
    accountNumber: '1234-5678-9012-3456',
    iban: 'TR12 0006 4000 0011 2345 6789 01',
    branchCode: '1234',
    swiftCode: 'HUGLTR2A'
  };
}

// ==================== REFERRAL ENDPOINTS ====================

// Get user referral info
app.get('/api/referral/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's referral code and stats
    const [userRows] = await poolWrapper.execute(
      'SELECT referral_code, referral_count, user_id FROM users WHERE id = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userRows[0];
    
    // Get referral earnings
    const [earningsRows] = await poolWrapper.execute(
      'SELECT SUM(amount) as total_earnings FROM referral_earnings WHERE referrer_id = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    const totalEarnings = earningsRows[0].total_earnings || 0;
    
    res.json({
      success: true,
      data: {
        referralCode: user.referral_code,
        referralCount: user.referral_count || 0,
        totalEarnings: totalEarnings,
        referralLink: `${process.env.FRONTEND_URL || 'https://hugluoutdoor.com'}/referral/${user.referral_code}`
      }
    });
  } catch (error) {
    console.error('Error getting referral info:', error);
    res.status(500).json({ success: false, message: 'Error getting referral info' });
  }
});

// Use referral code
app.post('/api/referral/use', async (req, res) => {
  try {
    const { referralCode, userId } = req.body;
    
    // Check if referral code exists and is not self-referral
    const [referrerRows] = await poolWrapper.execute(
      'SELECT id, referral_code FROM users WHERE referral_code = ? AND tenantId = ?',
      [referralCode, req.tenant.id]
    );
    
    if (referrerRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid referral code' });
    }
    
    const referrerId = referrerRows[0].id;
    
    if (referrerId === userId) {
      return res.status(400).json({ success: false, message: 'Cannot refer yourself' });
    }
    
    // Check if user already used a referral code
    const [existingRows] = await poolWrapper.execute(
      'SELECT id FROM users WHERE id = ? AND referred_by IS NOT NULL AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    if (existingRows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already used a referral code' });
    }
    
    // Update user with referral
    await poolWrapper.execute(
      'UPDATE users SET referred_by = ? WHERE id = ? AND tenantId = ?',
      [referrerId, userId, req.tenant.id]
    );
    
    // Update referrer's count
    await poolWrapper.execute(
      'UPDATE users SET referral_count = COALESCE(referral_count, 0) + 1 WHERE id = ? AND tenantId = ?',
      [referrerId, req.tenant.id]
    );
    
    // Add referral earnings
    const referralBonus = 50; // 50 TL bonus
    await poolWrapper.execute(
      'INSERT INTO referral_earnings (referrer_id, referred_id, amount, tenantId) VALUES (?, ?, ?, ?)',
      [referrerId, userId, referralBonus, req.tenant.id]
    );
    
    res.json({ success: true, message: 'Referral code applied successfully', bonus: referralBonus });
  } catch (error) {
    console.error('Error using referral code:', error);
    res.status(500).json({ success: false, message: 'Error using referral code' });
  }
});

// Generate referral code and link
app.post('/api/referral/:userId/generate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const [userRows] = await poolWrapper.execute(
      'SELECT id, referral_code FROM users WHERE id = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userRows[0];
    
    // If user already has a referral code, return it
    if (user.referral_code) {
      const referralLink = `${process.env.FRONTEND_URL || 'https://hugluoutdoor.com'}/referral/${user.referral_code}`;
      return res.json({
        success: true,
        data: {
          code: user.referral_code,
          url: referralLink
        }
      });
    }
    
    // Generate new referral code
    const referralCode = `REF${userId}${Date.now().toString().slice(-6)}`;
    
    // Update user with referral code
    await poolWrapper.execute(
      'UPDATE users SET referral_code = ? WHERE id = ? AND tenantId = ?',
      [referralCode, userId, req.tenant.id]
    );
    
    const referralLink = `${process.env.FRONTEND_URL || 'https://hugluoutdoor.com'}/referral/${referralCode}`;
    
    res.json({
      success: true,
      data: {
        code: referralCode,
        url: referralLink
      }
    });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({ success: false, message: 'Error generating referral code' });
  }
});

// ==================== WHATSAPP WEBHOOK ENDPOINTS ====================

// WhatsApp webhook doğrulama
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = WhatsAppService.verifyWebhook(mode, token, challenge);
  
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});

// WhatsApp webhook mesaj alma
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const result = await WhatsAppService.processWebhookMessage(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USER LEVEL SYSTEM API ====================

// Get user level information
app.get('/api/user-level/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's total EXP
    const [expRows] = await poolWrapper.execute(
      'SELECT SUM(amount) as total_exp FROM user_exp_transactions WHERE userId = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    const totalExp = expRows[0].total_exp || 0;
    
    // Calculate level based on EXP
    const levels = [
      { id: 'bronze', name: 'bronze', displayName: 'Bronz', minExp: 0, maxExp: 1500, color: '#CD7F32', icon: 'medal', multiplier: 1.0 },
      { id: 'iron', name: 'iron', displayName: 'Demir', minExp: 1500, maxExp: 4500, color: '#C0C0C0', icon: 'shield', multiplier: 1.2 },
      { id: 'gold', name: 'gold', displayName: 'Altın', minExp: 4500, maxExp: 10500, color: '#FFD700', icon: 'star', multiplier: 1.5 },
      { id: 'platinum', name: 'platinum', displayName: 'Platin', minExp: 10500, maxExp: 22500, color: '#E5E4E2', icon: 'diamond', multiplier: 2.0 },
      { id: 'diamond', name: 'diamond', displayName: 'Elmas', minExp: 22500, maxExp: Infinity, color: '#B9F2FF', icon: 'diamond', multiplier: 3.0 }
    ];
    
    // Find current level
    let currentLevel = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalExp >= levels[i].minExp) {
        currentLevel = levels[i];
        break;
      }
    }
    
    // Find next level
    const nextLevel = levels.find(level => level.minExp > totalExp) || null;
    const expToNextLevel = nextLevel ? nextLevel.minExp - totalExp : 0;
    const progressPercentage = nextLevel ? 
      Math.min(100, ((totalExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100) : 100;
    
    res.json({
      success: true,
      levelProgress: {
        currentLevel,
        nextLevel,
        currentExp: totalExp,
        expToNextLevel,
        progressPercentage,
        totalExp
      }
    });
  } catch (error) {
    console.error('Error getting user level:', error);
    res.status(500).json({ success: false, message: 'Error getting user level' });
  }
});

// Add EXP to user
app.post('/api/user-level/:userId/add-exp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { source, amount, description, orderId, productId } = req.body;
    
    // Insert EXP transaction
    await poolWrapper.execute(
      'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, orderId, productId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, req.tenant.id, source, amount, description || '', orderId || null, productId || null]
    );
    
    res.json({
      success: true,
      message: 'EXP added successfully',
      expGained: amount
    });
  } catch (error) {
    console.error('Error adding EXP:', error);
    res.status(500).json({ success: false, message: 'Error adding EXP' });
  }
});

// Add social share EXP
app.post('/api/user-level/:userId/social-share-exp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { platform, productId, expGain } = req.body;
    
    const expAmount = 25; // Sosyal paylaşım için sabit 25 EXP
    
    // Insert EXP transaction
    await poolWrapper.execute(
      'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, productId) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, req.tenant.id, 'social_share', expAmount, `Sosyal paylaşım: ${platform}`, productId || null]
    );
    
    res.json({
      success: true,
      message: 'Sosyal paylaşım EXP\'si başarıyla eklendi',
      expGained: expAmount
    });
  } catch (error) {
    console.error('Error adding social share EXP:', error);
    res.status(500).json({ success: false, message: 'Sosyal paylaşım EXP\'si eklenemedi' });
  }
});

// Get user EXP history
app.get('/api/user-level/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const [transactions] = await poolWrapper.execute(
      'SELECT * FROM user_exp_transactions WHERE userId = ? AND tenantId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [userId, req.tenant.id, parseInt(limit), offset]
    );
    
    const [totalRows] = await poolWrapper.execute(
      'SELECT COUNT(*) as total FROM user_exp_transactions WHERE userId = ? AND tenantId = ?',
      [userId, req.tenant.id]
    );
    
    res.json({
      success: true,
      transactions,
      total: totalRows[0].total,
      hasMore: offset + transactions.length < totalRows[0].total
    });
  } catch (error) {
    console.error('Error getting EXP history:', error);
    res.status(500).json({ success: false, message: 'Error getting EXP history' });
  }
});

// ==================== SOCIAL CAMPAIGNS API ====================

// Get user social tasks
app.get('/api/social-tasks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return empty array - will be implemented with real data
    res.json({
      success: true,
      tasks: []
    });
  } catch (error) {
    console.error('Error getting social tasks:', error);
    res.status(500).json({ success: false, message: 'Error getting social tasks' });
  }
});

// Share to social media
app.post('/api/social-tasks/:userId/share', async (req, res) => {
  try {
    const { userId } = req.params;
    const { platform, productId, shareText } = req.body;
    
    // Add EXP for social sharing
    await poolWrapper.execute(
      'INSERT INTO user_exp_transactions (userId, tenantId, source, amount, description, productId) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, req.tenant.id, 'social_share', 25, `Sosyal paylaşım: ${platform}`, productId || null]
    );
    
    res.json({
      success: true,
      message: 'Social share recorded successfully'
    });
  } catch (error) {
    console.error('Error recording social share:', error);
    res.status(500).json({ success: false, message: 'Error recording social share' });
  }
});

// Get group discounts
app.get('/api/group-discounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return empty array - will be implemented with real data
    res.json({
      success: true,
      groups: []
    });
  } catch (error) {
    console.error('Error getting group discounts:', error);
    res.status(500).json({ success: false, message: 'Error getting group discounts' });
  }
});

// Get shopping competitions
app.get('/api/competitions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return empty array - will be implemented with real data
    res.json({
      success: true,
      competitions: []
    });
  } catch (error) {
    console.error('Error getting competitions:', error);
    res.status(500).json({ success: false, message: 'Error getting competitions' });
  }
});

// Get shared carts
app.get('/api/cart-sharing/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return empty array - will be implemented with real data
    res.json({
      success: true,
      sharedCarts: []
    });
  } catch (error) {
    console.error('Error getting shared carts:', error);
    res.status(500).json({ success: false, message: 'Error getting shared carts' });
  }
});

// Get buy together offers
app.get('/api/buy-together/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return empty array - will be implemented with real data
    res.json({
      success: true,
      offers: []
    });
  } catch (error) {
    console.error('Error getting buy together offers:', error);
    res.status(500).json({ success: false, message: 'Error getting buy together offers' });
  }
});

// ==================== DATABASE TABLES CREATION ====================


  const localIP = getLocalIPAddress();
  
  // Admin app'i mount et (admin-server)
  try {
    const adminApp = require('./admin-server');
    // Admin server kendi içinde '/api' prefix'iyle tanımlı.
    // Bu nedenle root'a mount ediyoruz ki yollar '/api/...' olarak kalsın.
    app.use('/', adminApp);
    console.log('✅ Admin API mounted at root (routes keep /api prefix)');
  } catch (e) {
    console.warn('⚠️ Admin API mount failed:', e.message);
  }

  // Enhanced error handling middleware
  app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası',
        type: 'DATABASE_CONNECTION_ERROR',
        retryable: true
      });
    }
    
    // Database query errors
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı sorgu hatası',
        type: 'DATABASE_QUERY_ERROR',
        retryable: false
      });
    }
    
    // JSON parse errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz JSON formatı',
        type: 'JSON_PARSE_ERROR',
        retryable: false
      });
    }
    
    // Default error
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası',
      type: 'UNKNOWN_ERROR',
      retryable: false
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Local API: http://localhost:${PORT}/api`);
    console.log(`🌐 Network API: http://${localIP}:${PORT}/api`);
    console.log(`📊 SQL Query logging is ENABLED`);
    console.log(`🔍 All database operations will be logged with timing`);
    console.log(`🔧 Manual sync: POST /api/sync/products`);
    console.log(`💰 Price Logic: IndirimliFiyat = 0 ise SatisFiyati kullanılır`);
    console.log(`📱 API will work on same network even if IP changes`);
    
    // Start XML Sync Service
    if (xmlSyncService) {
      xmlSyncService.startScheduledSync();
      console.log(`📡 XML Sync Service started (every 4 hours)\n`);
    }
  });
}

startServer().catch(console.error);

// Global error handler: prevent leaking DB errors
app.use((err, req, res, next) => {
  try {
    const isDbError = err && typeof err.message === 'string' && /sql|database|mysql|syntax/i.test(err.message);
    if (isDbError) {
      console.error('❌ DB error masked:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } catch (_) {}
  console.error('❌ Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});
