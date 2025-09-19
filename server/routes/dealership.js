const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '../data');
const FILE_PATH = path.join(DATA_DIR, 'dealership-applications.json');

function ensureStore() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  try { if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify({ applications: [] }, null, 2)); } catch {}
}

function readAll() {
  ensureStore();
  try {
    const txt = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(txt).applications || [];
  } catch {
    return [];
  }
}

function writeAll(apps) {
  ensureStore();
  fs.writeFileSync(FILE_PATH, JSON.stringify({ applications: apps }, null, 2));
}

// Public: create application
router.post('/applications', express.json(), (req, res) => {
  try {
    const { companyName, fullName, phone, email, city, message, source, estimatedMonthlyRevenue } = req.body || {};
    if (!companyName || !fullName || !phone || !email || !city) {
      return res.status(400).json({ success: false, message: 'Zorunlu alanlar eksik' });
    }
    const item = {
      id: Date.now(),
      companyName,
      fullName,
      phone,
      email,
      city,
      message: message || null,
      source: source || 'mobile-app',
      estimatedMonthlyRevenue: typeof estimatedMonthlyRevenue === 'number' ? estimatedMonthlyRevenue : null,
      status: 'new',
      note: null,
      createdAt: new Date().toISOString()
    };
    const all = readAll();
    all.push(item);
    writeAll(all);
    res.json({ success: true, data: { id: item.id } });
  } catch (e) {
    console.error('dealership create error:', e);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Admin: list applications
router.get('/applications', (req, res) => {
  try {
    const min = parseFloat(req.query.minRevenue);
    const max = parseFloat(req.query.maxRevenue);
    const status = (req.query.status || '').toString().trim();
    let items = readAll();
    if (!isNaN(min)) items = items.filter(i => typeof i.estimatedMonthlyRevenue === 'number' ? i.estimatedMonthlyRevenue >= min : true);
    if (!isNaN(max)) items = items.filter(i => typeof i.estimatedMonthlyRevenue === 'number' ? i.estimatedMonthlyRevenue <= max : true);
    if (status) items = items.filter(i => (i.status || 'new') === status);
    // Sort by date desc
    items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: items });
  } catch (e) {
    console.error('dealership list error:', e);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Admin: update single application status/note
router.put('/applications/:id/status', express.json(), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, note } = req.body || {};
    if (!id || !status) return res.status(400).json({ success: false, message: 'Geçersiz istek' });
    const items = readAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    items[idx].status = status;
    if (typeof note === 'string') items[idx].note = note;
    items[idx].updatedAt = new Date().toISOString();
    writeAll(items);
    res.json({ success: true });
  } catch (e) {
    console.error('dealership update status error:', e);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Admin: batch update status
router.post('/applications/batch-status', express.json(), (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || !status) return res.status(400).json({ success: false, message: 'Geçersiz istek' });
    const items = readAll();
    const idSet = new Set(ids.map(x => parseInt(x)));
    let updated = 0;
    for (const it of items) {
      if (idSet.has(it.id)) {
        it.status = status;
        it.updatedAt = new Date().toISOString();
        updated++;
      }
    }
    writeAll(items);
    res.json({ success: true, data: { updated } });
  } catch (e) {
    console.error('dealership batch status error:', e);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// User: get user's applications by email
router.get('/applications/user/:email', (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: 'E-posta adresi gerekli' });
    }
    
    const items = readAll();
    const userApplications = items.filter(app => 
      app.email && app.email.toLowerCase() === email.toLowerCase()
    );
    
    // Sort by date desc
    userApplications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, data: userApplications });
  } catch (e) {
    console.error('dealership user applications error:', e);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// User: get single application by ID and email
router.get('/applications/:id/user/:email', (req, res) => {
  try {
    const { id, email } = req.params;
    const applicationId = parseInt(id);
    
    if (!applicationId || !email) {
      return res.status(400).json({ success: false, message: 'Geçersiz istek' });
    }
    
    const items = readAll();
    const application = items.find(app => 
      app.id === applicationId && 
      app.email && 
      app.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!application) {
      return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });
    }
    
    res.json({ success: true, data: application });
  } catch (e) {
    console.error('dealership single application error:', e);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;


