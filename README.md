# AllHeaders - HTTP Status Code Generator

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/allheaders/allheaders)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Live Site](https://img.shields.io/badge/live-allheaders.com-brightgreen.svg)](https://allheaders.com)

A comprehensive HTTP status code generator for testing and development. Get any HTTP status code instantly with support for all HTTP methods, custom headers, and an intuitive web interface.

🌐 **Live Site**: [allheaders.com](https://allheaders.com)

## ✨ Features

### 🎯 Core Functionality
- **18 HTTP Status Codes**: 200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 405, 410, 418, 429, 500, 502, 503, 504
- **All HTTP Methods**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Custom Headers**: Send and receive custom headers for advanced testing
- **JSON API**: RESTful endpoints with rich metadata

### 🎨 Modern Interface
- **Interactive Web UI**: Click-to-access status codes with visual feedback
- **Smart Copy-to-Clipboard**: Automatically generates curl commands
- **Method Selector**: Choose HTTP methods with intuitive buttons
- **Responsive Design**: Works perfectly on desktop and mobile
- **SEO Optimized**: Meta tags, Open Graph, and Twitter Cards

### 🚀 Developer Experience
- **Enhanced JSON Responses**: Include method, headers, user-agent, timestamps
- **Debug Headers**: X-Powered-By, X-HTTP-Method, X-Response-Time
- **CORS Support**: Full cross-origin request support with preflight
- **Cache Optimization**: Smart caching for GET/HEAD, no-cache for mutations

### 📧 Analytics & Email Reports
- **Weekly Analytics**: Automated email reports with usage statistics
- **Resend Integration**: Reliable email delivery via Resend API
- **Admin Dashboard**: Web interface for configuration and monitoring
- **CSV Export**: Weekly data exports attached to email reports

## 📚 Quick Start

### Using the Web Interface
Visit [allheaders.com](https://allheaders.com) and:
1. Select your preferred HTTP method
2. Click any status code
3. Use the copy button to get curl commands

### Direct API Access
```bash
# Simple GET request
curl https://allheaders.com/404

# POST with custom header
curl -X POST https://allheaders.com/201 -H "X-Custom-Header: MyValue"

# HEAD request (headers only)
curl -I https://allheaders.com/200
```

### Response Format
```json
{
  "code": 404,
  "message": "Not Found",
  "method": "GET",
  "timestamp": "2025-08-15T09:21:49.104Z",
  "headers": {
    "received": 7,
    "userAgent": "curl/8.12.1",
    "customHeader": null
  }
}
```

## 🏗️ Installation & Deployment

### Quick Deployment (Ubuntu/Debian)
```bash
# Clone repository
git clone https://github.com/allheaders/allheaders.git
cd allheaders

# Automated deployment
sudo ./scripts/deploy.sh

# Configure SSL (after DNS setup)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Manual Installation
```bash
# Install dependencies
sudo apt update
sudo apt install -y nginx nodejs npm certbot python3-certbot-nginx

# Install Node.js dependencies
npm install

# Install PM2 globally
sudo npm install -g pm2

# Configure Nginx
sudo cp nginx-simple.conf /etc/nginx/sites-available/allheaders
sudo ln -s /etc/nginx/sites-available/allheaders /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Development Mode
```bash
# Start development server
npm run dev
# or
./scripts/start.sh development
```

## 🧪 Testing

### Run Test Suite
```bash
# Basic tests
./tests/test.sh

# Enhanced tests (all features)
./tests/test-enhanced.sh

# Test specific URL
./tests/test-enhanced.sh https://your-domain.com
```

### Manual Testing Examples
```bash
# Test all HTTP methods
curl https://allheaders.com/200
curl -X POST https://allheaders.com/201
curl -X PUT https://allheaders.com/204
curl -X DELETE https://allheaders.com/410

# Test custom headers
curl -X POST https://allheaders.com/201 \
     -H "X-Custom-Header: TestValue" \
     -H "Authorization: Bearer token123"

# Test caching
curl -I https://allheaders.com/200 | grep Cache-Control
```

## 📖 API Reference

### Endpoints

#### `GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS /{code}`
Returns the specified HTTP status code with metadata.

**Parameters:**
- `code` (path): HTTP status code (200-599)

**Headers:**
- `X-Custom-Header` (optional): Any custom header value

**Response:**
```json
{
  "code": 200,
  "message": "OK",
  "method": "GET",
  "timestamp": "2025-08-15T12:00:00.000Z",
  "headers": {
    "received": 5,
    "userAgent": "Mozilla/5.0...",
    "customHeader": "value"
  }
}
```

#### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-08-15T12:00:00.000Z",
  "version": "2.0.0"
}
```

### Response Headers
- `X-Powered-By`: AllHeaders.com
- `X-HTTP-Method`: The HTTP method used
- `X-Response-Time`: Response timestamp
- `Cache-Control`: Method-specific caching rules

## 🛠️ Configuration

### Environment Variables
```bash
NODE_ENV=production              # Environment mode
PORT=3000                       # Server port (default: 3000)
ADMIN_PASSWORD=your-secure-pass # Admin panel password (default: changeMe123!)
```

### PM2 Configuration
See `config/ecosystem.config.js` for production settings:
- Clustering mode with max instances
- Memory limit: 1GB
- Auto-restart on crashes
- Log rotation

### Nginx Configuration
See `config/nginx-simple.conf` for reverse proxy settings:
- HTTP to HTTPS redirect
- Security headers
- Gzip compression
- Rate limiting

### 📧 Email Configuration (Resend API)
Configure weekly analytics reports via the admin panel:

1. **Access Admin Panel**: `https://yourdomain.com/control-panel`
2. **Login**: Use your admin password (default: `changeMe123!`)
3. **Navigate**: Go to Email Configuration section
4. **Setup Resend**:
   - Get API key from [resend.com/api-keys](https://resend.com/api-keys)
   - Enter your API key (starts with `re_`)
   - Set sender email (must be verified in Resend)
   - Add recipient email for reports
   - Enable weekly reports

**Features**:
- Weekly reports sent Mondays at 8:00 AM (Europe/Paris)
- Includes usage statistics and analytics
- CSV data export attached to emails
- Secure API key storage and masking

## 📊 Monitoring

### PM2 Commands
```bash
pm2 status              # Check status
pm2 logs allheaders     # View logs
pm2 restart allheaders  # Restart app
pm2 monit              # Real-time monitoring
```

### Log Files
- Application: `/var/log/allheaders/`
- Nginx: `/var/log/nginx/allheaders.*.log`
- SSL: `/var/log/letsencrypt/letsencrypt.log`

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`  
5. **Open** a Pull Request

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development setup.

## 📋 Project Structure

```
allheaders/
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── ecosystem.config.js    # PM2 configuration
├── nginx-simple.conf      # Nginx configuration
├── start.sh              # Development/production starter
├── deploy.sh            # Automated deployment
├── test.sh             # Basic test suite
├── test-enhanced.sh   # Enhanced test suite
├── README.md         # This file
├── CHANGELOG.md     # Version history
├── DEVELOPMENT.md  # Development guide
└── DEPLOYMENT.md  # Deployment guide
```

## 🐛 Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
sudo fuser -k 3000/tcp
# or change PORT in environment
```

**Nginx configuration errors:**
```bash
sudo nginx -t                    # Test configuration
sudo systemctl status nginx     # Check status
sudo systemctl reload nginx     # Reload config
```

**PM2 app not starting:**
```bash
pm2 logs allheaders             # Check logs
pm2 restart allheaders          # Force restart
pm2 delete allheaders && pm2 start ecosystem.config.js
```

**SSL certificate issues:**
```bash
sudo certbot renew --dry-run    # Test renewal
sudo certbot certificates       # List certificates
sudo systemctl status certbot.timer  # Check auto-renewal
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Yann Decoopman**
- LinkedIn: [@yanndecoopman](https://www.linkedin.com/in/yanndecoopman/?originalSubdomain=fr)
- Website: [allheaders.com](https://allheaders.com)

## 🙏 Acknowledgments

- Built with vanilla Node.js for minimal dependencies
- Styled with modern CSS for optimal performance
- Deployed on standard LEMP stack for reliability
- SSL certificates provided by [Let's Encrypt](https://letsencrypt.org/)

---

⭐ **Star this repository if it helped you!**