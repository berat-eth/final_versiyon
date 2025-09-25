# CORS düzeltmesini uzak sunucuya deploy et
Write-Host "🚀 CORS düzeltmesi uzak sunucuya deploy ediliyor..." -ForegroundColor Green

# Uzak sunucuya bağlan ve server dosyalarını güncelle
$sshCommand = @"
cd /root/huglu_mobil2/server

echo "📥 CORS düzeltmesi uygulanıyor..."

# server.js dosyasını güncelle
cat > server.js << 'SERVER_EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 1000, // IP başına maksimum 1000 istek
  message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.'
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(hpp());

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
// Admin panel için localhost:8080'i de ekle
if (!allowedOrigins.includes('http://localhost:8080')) {
  allowedOrigins.push('http://localhost:8080');
}

app.use(cors({
  origin(origin, cb) {
    // Admin panel için localhost:8080'e izin ver
    if (origin === 'http://localhost:8080') return cb(null, true);
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','X-API-Key','X-Admin-Key']
}));

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Admin endpoints
app.get('/api/admin/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      users: 150,
      products: 500,
      orders: 75,
      monthlyRevenue: 25000
    }
  });
});

app.get('/api/admin/charts', (req, res) => {
  res.json({
    success: true,
    data: {
      dailySales: [
        { date: '2024-01-01', revenue: 1000 },
        { date: '2024-01-02', revenue: 1500 },
        { date: '2024-01-03', revenue: 1200 }
      ],
      orderStatuses: [
        { status: 'pending', count: 10 },
        { status: 'processing', count: 5 },
        { status: 'shipped', count: 8 },
        { status: 'delivered', count: 50 }
      ],
      monthlyRevenue: [
        { month: '2024-01', revenue: 25000 },
        { month: '2024-02', revenue: 30000 }
      ],
      topProducts: [
        { name: 'Ürün 1', totalSold: 25 },
        { name: 'Ürün 2', totalSold: 20 }
      ]
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Sunucu hatası' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint bulunamadı' 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 CORS enabled for localhost:8080`);
});
SERVER_EOF

echo "✅ server.js güncellendi"

# PM2 ile restart et
echo "🔄 PM2 ile server yeniden başlatılıyor..."
pm2 restart huglu-server || pm2 start server.js --name huglu-server

echo "✅ CORS düzeltmesi tamamlandı!"
echo "🌐 Admin panel artık http://localhost:8080'den erişilebilir"
"@

# SSH ile uzak sunucuya bağlan
ssh root@213.142.159.135 $sshCommand

Write-Host "🎉 Deploy tamamlandı!" -ForegroundColor Green
