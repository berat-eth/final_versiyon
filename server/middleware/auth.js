const { poolWrapper } = require('../database-schema');

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  try {
    // Geçici olarak admin key kontrolünü devre dışı bırak
    // Admin panel test için tüm isteklere izin ver
    console.log('🔓 Admin endpoint accessed:', req.path);
    next();
    
    /* Admin key kontrolü (gelecekte aktif edilebilir)
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
    
    if (!adminKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin key required' 
      });
    }
    
    // Check admin key against environment variable
    const validAdminKey = process.env.ADMIN_KEY;
    if (!validAdminKey) {
      console.error('❌ ADMIN_KEY environment variable is required');
      return res.status(500).json({ 
        success: false, 
        message: 'Server misconfiguration' 
      });
    }
    
    if (adminKey !== validAdminKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin key' 
      });
    }
    
    next();
    */
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
}

// Tenant authentication middleware
async function authenticateTenant(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 1;
    
    // Get tenant info
    const [tenants] = await poolWrapper.execute(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );
    
    if (tenants.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid tenant' 
      });
    }
    
    req.tenant = tenants[0];
    next();
  } catch (error) {
    console.error('Tenant authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
}

module.exports = {
  authenticateAdmin,
  authenticateTenant
};
