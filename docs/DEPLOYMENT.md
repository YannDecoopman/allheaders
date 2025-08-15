# Deployment Guide - AllHeaders

Complete guide for deploying AllHeaders in production environments with high availability, security, and performance.

## 📋 Table of Contents
- [Quick Deploy](#quick-deploy)
- [System Requirements](#system-requirements)
- [Manual Deployment](#manual-deployment)
- [SSL/TLS Setup](#ssltls-setup)
- [Production Configuration](#production-configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Scaling & Load Balancing](#scaling--load-balancing)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Deploy

For Ubuntu/Debian systems with root access:

```bash
# 1. Clone repository
git clone https://github.com/allheaders/allheaders.git
cd allheaders

# 2. Run automated deployment
sudo ./deploy.sh

# 3. Configure SSL (after DNS setup)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 4. Verify deployment
curl https://yourdomain.com/health
```

**That's it!** Your AllHeaders instance should be running on HTTPS.

## 💻 System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ (or equivalent)
- **RAM**: 512MB (1GB recommended)
- **Storage**: 2GB available space
- **CPU**: 1 core (2+ cores recommended)
- **Network**: Public IP with ports 80, 443 accessible

### Software Dependencies
- **Node.js**: v14+ (v18+ recommended)
- **npm**: v6+ (comes with Node.js)
- **Nginx**: Latest stable version
- **PM2**: Latest version (installed globally)
- **Certbot**: For SSL certificates

### Domain Requirements
- Domain name pointing to server IP (A record)
- Optional: www subdomain (CNAME or A record)
- DNS propagation completed (can take up to 48h)

## 🔧 Manual Deployment

### Step 1: System Setup
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20+
npm --version   # Should be v9+

# Install additional packages
sudo apt install -y nginx certbot python3-certbot-nginx git curl
```

### Step 2: Application Setup
```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository (or upload files)
sudo git clone https://github.com/allheaders/allheaders.git .

# Set permissions
sudo chown -R $USER:$USER /var/www
sudo chmod +x *.sh

# Install dependencies
npm install

# Install PM2 globally
sudo npm install -g pm2
```

### Step 3: Nginx Configuration
```bash
# Copy Nginx configuration
sudo cp nginx-simple.conf /etc/nginx/sites-available/allheaders

# Enable site
sudo ln -sf /etc/nginx/sites-available/allheaders /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 4: Application Startup
```bash
# Create log directory
sudo mkdir -p /var/log/allheaders
sudo chown $USER:$USER /var/log/allheaders

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 startup
pm2 startup
# Follow the command output to enable startup script
```

### Step 5: Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw --force enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Check status
sudo ufw status
```

## 🔒 SSL/TLS Setup

### Automatic SSL with Certbot
```bash
# Install Certbot (if not already installed)
sudo apt install certbot python3-certbot-nginx

# Generate certificate and configure Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Manual SSL Configuration
If using custom certificates:

```nginx
# Add to Nginx configuration
listen 443 ssl http2;
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
```

### SSL Best Practices
```bash
# Generate strong DH parameters
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Add to Nginx config
ssl_dhparam /etc/nginx/dhparam.pem;

# Enable HSTS (add to server block)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## ⚙️ Production Configuration

### PM2 Production Settings
```javascript
// ecosystem.config.js optimizations
module.exports = {
  apps: [{
    name: 'allheaders',
    script: './server.js',
    instances: 'max',          // Use all CPU cores
    exec_mode: 'cluster',      // Cluster mode for scaling
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',  // Restart if using too much memory
    node_args: '--max_old_space_size=1024',
    restart_delay: 4000,       // Delay between restarts
    max_restarts: 10,          // Limit restart attempts
    min_uptime: '10s',         // Minimum uptime before considering stable
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/allheaders/error.log',
    out_file: '/var/log/allheaders/out.log',
    log_file: '/var/log/allheaders/combined.log',
    
    // Monitoring
    watch: false,              // Don't watch files in production
    ignore_watch: ['node_modules', 'logs']
  }]
};
```

### Nginx Production Optimizations
```nginx
# /etc/nginx/sites-available/allheaders
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Performance
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Rate Limiting (configure in http block)
    limit_req zone=api burst=50 nodelay;
    
    # Logging
    access_log /var/log/nginx/allheaders.access.log;
    error_log /var/log/nginx/allheaders.error.log warn;
    
    # Proxy Configuration
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Static assets (if any)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Rate Limiting Configuration
Add to Nginx `http` block in `/etc/nginx/nginx.conf`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=health:1m rate=5r/s;

# In server block:
location /health {
    limit_req zone=health burst=10 nodelay;
    proxy_pass http://127.0.0.1:3000;
}

location / {
    limit_req zone=api burst=50 nodelay;
    proxy_pass http://127.0.0.1:3000;
}
```

## 📊 Monitoring & Maintenance

### System Monitoring
```bash
# PM2 monitoring
pm2 monit                    # Real-time monitoring
pm2 status                   # Quick status check
pm2 logs allheaders --lines 100   # Recent logs

# System resources
htop                         # CPU and memory usage
df -h                        # Disk usage
free -m                      # Memory usage
iostat -x 1                  # Disk I/O

# Network monitoring
netstat -tulpn | grep :80    # Check port bindings
ss -tulpn | grep nginx       # Socket statistics
```

### Log Management
```bash
# Application logs
tail -f /var/log/allheaders/combined.log
tail -f /var/log/allheaders/error.log

# Nginx logs
tail -f /var/log/nginx/allheaders.access.log
tail -f /var/log/nginx/allheaders.error.log

# System logs
journalctl -u nginx -f
journalctl --since "1 hour ago"

# Log rotation (add to /etc/logrotate.d/allheaders)
/var/log/allheaders/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        pm2 reload allheaders
    endscript
}
```

### Health Checks
```bash
#!/bin/bash
# health-check.sh

URL="https://yourdomain.com"

# Check HTTP status
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)
if [ $HTTP_STATUS -ne 200 ]; then
    echo "ALERT: Health check failed with status $HTTP_STATUS"
    # Send alert (email, Slack, etc.)
fi

# Check response time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" $URL/health)
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
    echo "ALERT: Slow response time: ${RESPONSE_TIME}s"
fi

# Check PM2 status
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')
if [ "$PM2_STATUS" != "online" ]; then
    echo "ALERT: PM2 status is $PM2_STATUS"
    pm2 restart allheaders
fi
```

### Automated Maintenance
```bash
# Add to cron: crontab -e
# Daily log rotation and cleanup
0 2 * * * /usr/sbin/logrotate /etc/logrotate.conf

# Weekly SSL certificate check
0 3 * * 0 /usr/bin/certbot renew --quiet

# Daily health check
*/5 * * * * /var/www/health-check.sh

# Weekly system updates (optional)
0 4 * * 0 apt update && apt upgrade -y && systemctl reload nginx
```

## 🚀 Scaling & Load Balancing

### Horizontal Scaling with Load Balancer
```nginx
# /etc/nginx/nginx.conf
upstream allheaders_backend {
    least_conn;  # Load balancing method
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    # Add more instances as needed
}

server {
    location / {
        proxy_pass http://allheaders_backend;
    }
}
```

### Multiple Server Instances
```bash
# Start multiple PM2 instances on different ports
PORT=3000 pm2 start ecosystem.config.js --name allheaders-1
PORT=3001 pm2 start ecosystem.config.js --name allheaders-2
PORT=3002 pm2 start ecosystem.config.js --name allheaders-3
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

USER node
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  allheaders:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - allheaders
    restart: unless-stopped
```

## 💾 Backup & Recovery

### Application Backup
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/allheaders"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/allheaders_$DATE.tar.gz \
    /var/www \
    /etc/nginx/sites-available/allheaders \
    /var/log/allheaders

# Backup certificates
cp -r /etc/letsencrypt $BACKUP_DIR/letsencrypt_$DATE

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/allheaders_$DATE.tar.gz"
```

### Recovery Process
```bash
# 1. Stop services
pm2 stop allheaders
sudo systemctl stop nginx

# 2. Restore files
cd /
tar -xzf /backups/allheaders/allheaders_YYYYMMDD_HHMMSS.tar.gz

# 3. Restore certificates (if needed)
sudo cp -r /backups/allheaders/letsencrypt_YYYYMMDD_HHMMSS/* /etc/letsencrypt/

# 4. Restart services
sudo systemctl start nginx
pm2 start allheaders

# 5. Verify
curl https://yourdomain.com/health
```

## 🔧 Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check PM2 logs
pm2 logs allheaders

# Check if port is in use
sudo netstat -tulpn | grep :3000
sudo fuser -k 3000/tcp

# Restart PM2
pm2 delete allheaders
pm2 start ecosystem.config.js
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

#### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart allheaders

# If persistent, reduce PM2 instances
pm2 scale allheaders 2  # Reduce to 2 instances
```

#### Performance Issues
```bash
# Check system load
uptime
top

# Check disk I/O
iostat -x 1

# Optimize Nginx cache
# Add to Nginx config:
proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
proxy_cache my_cache;
```

### Performance Tuning

#### Node.js Optimization
```javascript
// Add to server.js
process.env.UV_THREADPOOL_SIZE = 16;  // Increase thread pool

// Memory optimization
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

function gracefulShutdown() {
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
}
```

#### System Optimization
```bash
# Increase file descriptor limits
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# TCP optimization
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

### Emergency Procedures

#### Quick Restart
```bash
# Emergency restart
sudo systemctl restart nginx
pm2 restart allheaders

# If still failing
pm2 delete allheaders
pm2 start ecosystem.config.js
```

#### Rollback Deployment
```bash
# Keep previous version
cp -r /var/www /var/www.backup.$(date +%s)

# Quick rollback
cd /var/www
git reset --hard HEAD~1  # Go back one commit
pm2 restart allheaders
```

#### Emergency Maintenance Mode
```nginx
# Add to Nginx config for maintenance
location / {
    return 503 "Service temporarily unavailable for maintenance";
}
```

---

## 📞 Support

For deployment issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review logs: `pm2 logs allheaders`
3. Open an issue on GitHub with:
   - OS version and specs
   - Node.js version
   - Full error logs
   - Steps to reproduce

**Production deployment complete!** 🎉