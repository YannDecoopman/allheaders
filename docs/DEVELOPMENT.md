# Development Guide - AllHeaders

This guide provides everything you need to contribute to AllHeaders, set up a development environment, and understand the codebase architecture.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style & Standards](#code-style--standards)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Contributing](#contributing)

## 🔧 Prerequisites

### Required Software
- **Node.js** (v14+ recommended, v22+ for latest features)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **curl** (for API testing)

### Optional but Recommended
- **PM2** (for production-like testing)
- **Nginx** (for reverse proxy testing)
- **Visual Studio Code** (recommended IDE)

### System Requirements
- **OS**: Linux (Ubuntu/Debian preferred), macOS, Windows (with WSL2)
- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 100MB for source code + dependencies

## 🚀 Local Development Setup

### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/allheaders/allheaders.git
cd allheaders

# Install dependencies
npm install

# Verify installation
node --version  # Should be v14+
npm --version   # Should be v6+
```

### 2. Start Development Server
```bash
# Option 1: Direct Node.js
npm run dev
# or
node server.js

# Option 2: Using start script
./start.sh development

# Option 3: Custom port
PORT=8080 node server.js
```

### 3. Verify Setup
```bash
# Test local server
curl http://localhost:3000/health
curl http://localhost:3000/200
curl http://localhost:3000/

# Expected outputs:
# Health: {"status":"ok","uptime":...}
# 200: {"code":200,"message":"OK",...}
# Homepage: HTML page with status codes
```

### 4. Development Tools
```bash
# Install PM2 for production testing
npm install -g pm2

# Test with PM2 locally
pm2 start ecosystem.config.js
pm2 logs allheaders
pm2 stop allheaders
```

## 🏗️ Project Architecture

### File Structure
```
allheaders/
├── server.js              # 🔥 Main HTTP server (Express-free)
├── package.json           # 📦 Dependencies and npm scripts
├── ecosystem.config.js    # ⚙️  PM2 production configuration
├── nginx-simple.conf      # 🌐 Nginx reverse proxy config
├── start.sh              # 🚀 Development/production starter
├── deploy.sh            # 📈 Automated deployment script
├── test.sh             # 🧪 Basic test suite
├── test-enhanced.sh   # 🧪 Enhanced test suite
├── README.md         # 📖 Main documentation
├── CHANGELOG.md     # 📝 Version history
├── DEVELOPMENT.md  # 👨‍💻 This file
└── DEPLOYMENT.md  # 🚢 Deployment guide
```

### Core Components

#### `server.js` - Main Application
```javascript
// Key sections:
HTTP_CODES          // Status code definitions
getStatusCategory() // Color categorization logic
generateHomePage()  // HTML template generation
server creation     // HTTP server with routing
```

**Architecture Highlights:**
- **No frameworks**: Pure Node.js HTTP server
- **Single file**: All logic in one maintainable file
- **Template generation**: HTML built programmatically
- **RESTful design**: Clean endpoint patterns

#### Request Flow
```
1. Client Request → Nginx (production) → Node.js Server
2. Route matching: /, /health, /{code}
3. Method handling: GET, POST, PUT, DELETE, etc.
4. Response generation: JSON or HTML
5. Headers applied: CORS, caching, custom
6. Response sent back to client
```

### HTTP Methods Support
```javascript
// Supported methods with behaviors:
GET    → Direct browser access, cached responses
POST   → Form data processing, no cache
PUT    → Update operations, no cache  
DELETE → Deletion simulation, no cache
PATCH  → Partial updates, no cache
HEAD   → Headers only, cached like GET
OPTIONS → CORS preflight, immediate response
```

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-awesome-feature

# Make changes to server.js or other files
vim server.js

# Test changes locally
npm run dev
curl -X POST localhost:3000/201 -H "X-Test: true"

# Run test suite
./test.sh
./test-enhanced.sh

# Commit and push
git add .
git commit -m "Add awesome new feature"
git push origin feature/new-awesome-feature
```

### 2. Code Changes Process
1. **Modify** `server.js` for backend changes
2. **Update** tests in `test-enhanced.sh` if needed
3. **Test** manually with curl commands
4. **Run** automated test suite
5. **Document** changes in CHANGELOG.md

### 3. Version Management
```bash
# Update version numbers
vim package.json     # "version": "2.1.0"
vim server.js        # version: '2.1.0'

# Update CHANGELOG.md with new features
vim CHANGELOG.md

# Tag release
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

## 🧪 Testing

### Manual Testing Commands
```bash
# Basic functionality
curl http://localhost:3000/200
curl http://localhost:3000/404
curl http://localhost:3000/health

# HTTP methods
curl -X POST http://localhost:3000/201
curl -X PUT http://localhost:3000/204
curl -X DELETE http://localhost:3000/410
curl -I http://localhost:3000/200    # HEAD

# Custom headers
curl -X POST http://localhost:3000/201 \
     -H "X-Custom-Header: TestValue"

# CORS preflight
curl -X OPTIONS http://localhost:3000/200 \
     -H "Origin: https://example.com"
```

### Automated Testing
```bash
# Run basic test suite
./test.sh

# Run enhanced test suite
./test-enhanced.sh

# Test against custom URL
./test-enhanced.sh http://localhost:8080
```

### Test Coverage Areas
- ✅ Status code responses (200, 404, 500, etc.)
- ✅ HTTP method support (GET, POST, PUT, DELETE, etc.)
- ✅ Custom header handling
- ✅ CORS functionality
- ✅ Cache header behavior
- ✅ Error handling
- ✅ Health endpoint
- ✅ Web interface

### Performance Testing
```bash
# Load testing with curl
for i in {1..100}; do
  curl -s http://localhost:3000/200 >/dev/null &
done
wait

# Response time testing
time curl -s http://localhost:3000/418

# Memory usage monitoring
ps aux | grep node
```

## 📝 Code Style & Standards

### JavaScript Standards
- **ES6+** features preferred
- **Template literals** for HTML generation
- **Arrow functions** for callbacks
- **Const/let** instead of var
- **Semicolons** required
- **2 spaces** for indentation

### Example Code Style
```javascript
// ✅ Good
const getStatusCategory = (code) => {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 400 && code < 500) return 'client-error';
  return 'server-error';
};

// ❌ Avoid
function getStatusCategory(code) {
    if(code>=200&&code<300){
        return "success"
    }
}
```

### HTML/CSS Standards
- **Semantic HTML** with proper tags
- **CSS-in-JS** approach for styles
- **Responsive design** with mobile-first
- **Accessibility** considerations (ARIA labels)
- **Modern CSS** (flexbox, grid, transitions)

### Commit Message Format
```
feat: add support for custom delay parameter
fix: resolve CORS preflight issue for DELETE requests  
docs: update API documentation with examples
style: improve mobile responsive design
test: add comprehensive HTTP method testing
```

## 🔌 API Development

### Adding New Status Codes
```javascript
// 1. Add to HTTP_CODES object
const HTTP_CODES = {
  // existing codes...
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  // new code here
  451: 'Unavailable For Legal Reasons'
};

// 2. Test the new code
curl http://localhost:3000/451

// 3. Add to test suite
echo "Testing 451..." >> test-enhanced.sh
```

### Adding New Headers
```javascript
// In the request handler:
if (req.headers['x-custom-delay']) {
  const delay = parseInt(req.headers['x-custom-delay']);
  setTimeout(() => {
    // send response after delay
  }, delay);
}

// Add custom response header
headers['X-Custom-Delay'] = req.headers['x-custom-delay'];
```

### Extending JSON Responses
```javascript
const responseBody = {
  code: code,
  message: HTTP_CODES[code],
  method: req.method,
  timestamp: new Date().toISOString(),
  // Add new fields here:
  requestId: generateRequestId(),
  serverInfo: getServerInfo(),
  headers: {
    received: Object.keys(req.headers).length,
    userAgent: req.headers['user-agent'],
    customHeader: req.headers['x-custom-header']
  }
};
```

## 🎨 Frontend Development

### HTML Template Structure
```javascript
// The generateHomePage() function creates:
function generateHomePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>...</head>
    <body>
      <div class="container">
        <div class="header">...</div>
        <div class="instructions">...</div>
        <div class="codes-grid">...</div>
        <div class="method-selector">...</div>
        <div class="footer">...</div>
      </div>
      <script>...</script>
    </body>
    </html>
  `;
}
```

### Adding New UI Features
```javascript
// 1. Add CSS styles
.new-feature {
  background: #3498db;
  padding: 10px;
  border-radius: 4px;
}

// 2. Add HTML structure
<div class="new-feature">
  <h3>New Feature</h3>
  <button onclick="handleNewFeature()">Click Me</button>
</div>

// 3. Add JavaScript functionality  
function handleNewFeature() {
  // Feature logic here
}
```

### Responsive Design Guidelines
- **Mobile first**: Design for mobile, enhance for desktop
- **Breakpoints**: 768px for tablet, 1024px for desktop
- **Touch targets**: Minimum 44px for buttons
- **Text size**: Minimum 16px for readability

## 🤝 Contributing

### Getting Started
1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** a pull request

### Pull Request Guidelines
- **Clear description** of changes
- **Test coverage** for new features
- **Documentation** updates if needed
- **Changelog** entry for notable changes
- **No breaking changes** without major version bump

### Code Review Process
1. **Automated tests** must pass
2. **Manual testing** by reviewer
3. **Code style** compliance check
4. **Performance** impact assessment
5. **Security** review for sensitive changes

### Issue Reporting
```markdown
## Bug Report Template
**Description**: Brief description of the issue
**Steps to Reproduce**: 1. Do this, 2. Then this...
**Expected**: What should happen
**Actual**: What actually happens
**Environment**: OS, Node version, etc.
**Logs**: Any error messages or logs
```

## 🔍 Debugging

### Common Issues & Solutions

**Server won't start:**
```bash
# Check port availability
sudo netstat -tulpn | grep :3000
sudo fuser -k 3000/tcp

# Check Node.js version
node --version

# Check for syntax errors
node -c server.js
```

**CORS errors:**
```bash
# Test CORS headers
curl -I -H "Origin: https://example.com" http://localhost:3000/200

# Should return:
# Access-Control-Allow-Origin: *
```

**Performance issues:**
```bash
# Monitor memory usage
ps aux | grep node

# Profile with Node.js built-in tools
node --inspect server.js

# Load testing
ab -n 1000 -c 10 http://localhost:3000/200
```

### Logging and Monitoring
```javascript
// Add debug logging
console.log(`${new Date().toISOString()} - ${req.method} ${path}`);

// Performance monitoring
const start = process.hrtime();
// ... request processing ...
const [seconds, nanoseconds] = process.hrtime(start);
const duration = seconds * 1000 + nanoseconds / 1000000;
console.log(`Request took ${duration.toFixed(2)}ms`);
```

## 📚 Additional Resources

- **Node.js Documentation**: https://nodejs.org/docs/
- **HTTP Status Codes**: https://httpstatuses.com/
- **MDN Web Docs**: https://developer.mozilla.org/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/

---

## 💡 Development Tips

1. **Use nodemon** for auto-restart during development:
   ```bash
   npm install -g nodemon
   nodemon server.js
   ```

2. **Test with different browsers** for CORS compatibility

3. **Monitor logs** in real-time:
   ```bash
   tail -f /var/log/allheaders/out.log
   ```

4. **Use browser dev tools** to test the web interface

5. **Test with various user-agents** to verify compatibility

Happy coding! 🚀