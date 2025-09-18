# 🚀 Huglu API Server

Production-ready Node.js API server for Huglu mobile application with advanced security, monitoring, and deployment features.

## 🌟 Features

- **Production-Ready**: Express.js server with security middleware
- **Multi-Tenant Support**: Tenant-based data isolation
- **Security**: Helmet.js, rate limiting, CORS, data encryption
- **Performance**: Compression, caching, connection pooling
- **Monitoring**: Health checks, logging, PM2 clustering
- **Deployment**: Docker, PM2, systemd support
- **Database**: MySQL with connection pooling and migration support
- **XML Sync**: Automated product synchronization from XML sources

## 🖥️ Server Information

- **IP Address**: 213.142.159.135
- **OS**: Debian GNU/Linux 11 (bullseye) x86_64
- **CPU**: Intel Xeon E5-2699C v4 (2 cores) @ 2.197GHz
- **Memory**: 2975MiB total
- **Port**: 3000

## 📋 System Requirements

### Minimum
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Node.js**: v18.x or higher
- **RAM**: 2GB
- **CPU**: 2 cores
- **Storage**: 20GB SSD

### Recommended
- **RAM**: 4GB
- **CPU**: 4 cores
- **Storage**: 50GB SSD
- **Network**: 1Gbps

## 🚀 Quick Start

### 1. Server Setup
```bash
# Connect to server
ssh root@213.142.159.135

# Run quick setup script
wget https://raw.githubusercontent.com/berat-eth/serv/main/quick-setup.sh
chmod +x quick-setup.sh
./quick-setup.sh
```

### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/berat-eth/serv.git
cd serv

# Install dependencies
npm install --production

# Configure environment
cp env.example .env
nano .env

# Start with PM2
pm2 start ecosystem.config.js --env production
```

### 3. Docker Deployment (Alternative)
```bash
# Clone repository
git clone https://github.com/berat-eth/serv.git
cd serv

# Build and run with Docker Compose
docker-compose up -d
```

## ⚙️ Configuration

### Environment Variables (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration (Remote MySQL)
DB_HOST=92.113.22.70
DB_USER=u987029066_Admin
DB_PASSWORD=38cdfD8217..
DB_NAME=u987029066_mobil
DB_PORT=3306

# Security
ADMIN_KEY=huglu-admin-2024-secure-key-CHANGE-THIS
ENCRYPTION_KEY=your-32-byte-encryption-key-here
JWT_SECRET=your-jwt-secret-key-here

# API Configuration
API_RATE_LIMIT=100
CORS_ORIGINS=*

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/server.log

# XML Sync
XML_SYNC_ENABLED=true
XML_SYNC_INTERVAL=14400000
```

## 🌐 API Endpoints

### Health Check
```bash
GET http://213.142.159.135:3000/api/health
```

### Products
```bash
GET http://213.142.159.135:3000/api/products
GET http://213.142.159.135:3000/api/products/:id
GET http://213.142.159.135:3000/api/categories
GET http://213.142.159.135:3000/api/brands
POST http://213.142.159.135:3000/api/products/filter
```

### Cart
```bash
GET http://213.142.159.135:3000/api/cart/user/:userId
POST http://213.142.159.135:3000/api/cart
PUT http://213.142.159.135:3000/api/cart/:cartItemId
DELETE http://213.142.159.135:3000/api/cart/:cartItemId
```

### Orders
```bash
GET http://213.142.159.135:3000/api/orders/user/:userId
POST http://213.142.159.135:3000/api/orders
PUT http://213.142.159.135:3000/api/orders/:id/status
```

### Users (with tenant authentication)
```bash
POST http://213.142.159.135:3000/api/users
POST http://213.142.159.135:3000/api/users/login
GET http://213.142.159.135:3000/api/users/:id
PUT http://213.142.159.135:3000/api/users/:id
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Data Encryption**: AES-256-CBC encryption for sensitive data
- **Password Hashing**: bcrypt with salt rounds
- **API Key Authentication**: Tenant-based API keys
- **Admin Authentication**: Secure admin endpoints

## 📊 Monitoring & Management

### PM2 Commands
```bash
pm2 status                # Check service status
pm2 logs huglu-api       # View logs
pm2 restart huglu-api    # Restart service
pm2 monit                # Real-time monitoring
pm2 stop huglu-api       # Stop service
```

### Health Monitoring
```bash
# API Health Check
curl http://213.142.159.135:3000/api/health

# System Status
pm2 status
systemctl status huglu-api
```

### Log Management
```bash
# Application logs
tail -f logs/access.log
tail -f logs/error.log

# PM2 logs
pm2 logs huglu-api --lines 100

# System logs
journalctl -u huglu-api -f
```

## 🐳 Docker Support

### Build Image
```bash
docker build -t huglu-api .
```

### Run Container
```bash
docker run -d \
  --name huglu-api-server \
  -p 3000:3000 \
  --env-file .env \
  huglu-api
```

### Docker Compose
```bash
docker-compose up -d        # Start services
docker-compose down         # Stop services
docker-compose logs -f      # View logs
```

## 🔄 Deployment Scripts

### Automated Deployment
```bash
# Set server details
export SERVER_HOST=213.142.159.135
export SERVER_USER=root
export DEPLOY_PATH=/opt/huglu-api

# Run deployment
./deploy.sh
```

### Manual Deployment
```bash
# Copy files to server
scp -r ./* root@213.142.159.135:/opt/huglu-api/

# SSH to server and install
ssh root@213.142.159.135
cd /opt/huglu-api
npm install --production
pm2 start ecosystem.config.js --env production
```

## 🗃️ Database

### Connection
- **Host**: 92.113.22.70
- **Database**: u987029066_mobil
- **Port**: 3306
- **SSL**: Disabled
- **Charset**: utf8mb4

### Features
- Connection pooling (20 connections)
- Query logging and performance monitoring
- Automatic reconnection
- Migration support
- Multi-tenant data isolation

## 📁 Project Structure

```
serv/
├── server.js                 # Development server
├── server-production.js      # Production server
├── package.json             # Dependencies and scripts
├── ecosystem.config.js      # PM2 configuration
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
├── deploy.sh               # Deployment script
├── quick-setup.sh          # Server setup script
├── env.example             # Environment template
├── nginx/
│   └── nginx.conf          # Nginx reverse proxy config
├── services/
│   └── xml-sync-service.js # XML synchronization service
├── scripts/
│   └── update-product-prices.js
├── config/
│   └── xml-sources.json    # XML source configuration
└── logs/                   # Application logs
```

## 🚨 Troubleshooting

### Common Issues

#### Port 3000 in use
```bash
lsof -i :3000
kill -9 <PID>
```

#### Database connection error
```bash
mysql -h 92.113.22.70 -u u987029066_Admin -p u987029066_mobil
```

#### Memory issues
```bash
pm2 restart huglu-api --max-memory-restart 1G
```

#### SSL certificate issues
```bash
certbot certificates
certbot renew --dry-run
```

### Performance Monitoring
```bash
# System resources
htop
free -h
df -h

# Network connections
ss -tulpn | grep 3000

# Application performance
pm2 monit
```

## 📞 Support

### Log Locations
- **Application**: `/opt/huglu-api/logs/`
- **PM2**: `~/.pm2/logs/`
- **Nginx**: `/var/log/nginx/`
- **System**: `journalctl -u huglu-api`

### Useful Commands
```bash
# Service management
systemctl restart huglu-api
pm2 restart huglu-api

# Log monitoring
pm2 logs huglu-api --lines 50
tail -f /opt/huglu-api/logs/access.log

# Performance monitoring
pm2 monit
htop

# Disk usage
df -h
du -sh /opt/huglu-api
```

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Get products
curl http://localhost:3000/api/products

# Load testing
ab -n 1000 -c 10 http://localhost:3000/api/health
```

## 📄 License

This project is proprietary software for Huglu mobile application.

## 🤝 Contributing

This is a private repository. Contact the development team for contribution guidelines.

---

**🌐 Live API**: http://213.142.159.135:3000/api  
**📊 Health Check**: http://213.142.159.135:3000/api/health  
**🚀 Status**: Production Ready
