#!/bin/bash

# Huglu API Server Deployment Script
# This script deploys the Huglu API server to a remote server

set -e

echo "🚀 Starting Huglu API Server Deployment..."

# Configuration
SERVER_USER=${SERVER_USER:-root}
SERVER_HOST=${SERVER_HOST:-your-server-ip}
SERVER_PORT=${SERVER_PORT:-22}
DEPLOY_PATH=${DEPLOY_PATH:-/opt/huglu-api}
SERVICE_NAME=${SERVICE_NAME:-huglu-api}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync is not installed. Please install rsync."
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        log_error "ssh is not installed. Please install ssh."
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Make sure to create one on the server."
    fi
    
    log_success "Prerequisites check completed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    # Install production dependencies
    npm ci --only=production
    
    log_success "Application built successfully"
}

# Deploy to server
deploy_to_server() {
    log_info "Deploying to server $SERVER_HOST..."
    
    # Create deployment directory
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $DEPLOY_PATH"
    
    # Sync files (excluding node_modules, we'll install on server)
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude '.env' \
        -e "ssh -p $SERVER_PORT" \
        ./ $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/
    
    log_success "Files synced to server"
}

# Install dependencies on server
install_dependencies() {
    log_info "Installing dependencies on server..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "cd $DEPLOY_PATH && npm ci --only=production"
    
    log_success "Dependencies installed on server"
}

# Setup systemd service
setup_systemd_service() {
    log_info "Setting up systemd service..."
    
    # Create systemd service file
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "cat > /etc/systemd/system/$SERVICE_NAME.service << 'EOF'
[Unit]
Description=Huglu API Server
After=network.target

[Service]
Type=simple
User=huglu
WorkingDirectory=$DEPLOY_PATH
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server-production.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF"

    # Create huglu user if doesn't exist
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "id -u huglu &>/dev/null || useradd -r -s /bin/false huglu"
    
    # Set permissions
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "chown -R huglu:huglu $DEPLOY_PATH"
    
    # Reload systemd and enable service
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl daemon-reload && systemctl enable $SERVICE_NAME"
    
    log_success "Systemd service configured"
}

# Start/restart service
restart_service() {
    log_info "Restarting service..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl restart $SERVICE_NAME"
    sleep 5
    
    # Check service status
    if ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl is-active --quiet $SERVICE_NAME"; then
        log_success "Service started successfully"
    else
        log_error "Service failed to start"
        ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl status $SERVICE_NAME"
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    sleep 10
    
    # Try to connect to the API
    if ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "curl -f http://localhost:3000/api/health > /dev/null 2>&1"; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
}

# Setup PM2 (alternative to systemd)
setup_pm2() {
    log_info "Setting up PM2..."
    
    # Install PM2 globally
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "npm install -g pm2"
    
    # Start application with PM2
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "cd $DEPLOY_PATH && pm2 start ecosystem.config.js --env production"
    
    # Save PM2 configuration
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "pm2 save"
    
    # Setup PM2 startup script
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "pm2 startup systemd -u huglu --hp /home/huglu"
    
    log_success "PM2 configured"
}

# Main deployment function
main() {
    echo "🚀 Huglu API Server Deployment"
    echo "================================"
    echo "Server: $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
    echo "Deploy Path: $DEPLOY_PATH"
    echo "Service: $SERVICE_NAME"
    echo ""
    
    check_prerequisites
    build_application
    deploy_to_server
    install_dependencies
    
    # Choose deployment method
    read -p "Use PM2 for process management? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_pm2
    else
        setup_systemd_service
        restart_service
    fi
    
    health_check
    
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📊 Service Status:"
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl status $SERVICE_NAME --no-pager" || true
    echo ""
    echo "🌐 API Endpoint: http://$SERVER_HOST:3000/api"
    echo "🔍 Health Check: http://$SERVER_HOST:3000/api/health"
    echo ""
    echo "📝 Useful commands:"
    echo "  View logs: ssh $SERVER_USER@$SERVER_HOST 'journalctl -u $SERVICE_NAME -f'"
    echo "  Restart service: ssh $SERVER_USER@$SERVER_HOST 'systemctl restart $SERVICE_NAME'"
    echo "  Check status: ssh $SERVER_USER@$SERVER_HOST 'systemctl status $SERVICE_NAME'"
}

# Run main function
main "$@"
