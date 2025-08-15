# Changelog

All notable changes to AllHeaders will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-08-15

### 🚀 Major Release - Production Ready

This release transforms AllHeaders from a simple HTTP status code generator into a comprehensive testing tool for developers.

### ✨ Added
- **Interactive HTTP Method Selector**: Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Smart Copy-to-Clipboard**: Automatically generates curl commands with selected HTTP method
- **Custom Headers Support**: Send and receive custom headers (X-Custom-Header)
- **Enhanced JSON Responses**: Include method, headers info, user-agent, and timestamps
- **SEO Optimization**: Meta descriptions, Open Graph, Twitter Cards for social sharing
- **Favicon**: Custom SVG favicon with "H" branding
- **Performance Headers**: Optimized caching (public cache for GET/HEAD, no-cache for others)
- **CORS Support**: Full CORS implementation with preflight OPTIONS handling
- **Debugging Headers**: X-Powered-By, X-HTTP-Method, X-Response-Time for development
- **Multi-language**: Interface translated from French to English
- **Attribution**: Creator credit with LinkedIn profile link

### 🎨 UI/UX Improvements
- **Modern Interface**: Responsive design with interactive elements
- **Visual Feedback**: Copy button animations and success states
- **Better Organization**: Logical flow from instructions → codes → method selector
- **Mobile Friendly**: Responsive grid and touch-friendly buttons
- **Accessibility**: Proper ARIA labels and semantic HTML

### 🔧 Technical Enhancements
- **HTTP Method Support**: All standard HTTP methods properly handled
- **Cache Optimization**: Method-specific cache headers for better performance
- **Security Headers**: XSS protection, content-type, and frame options
- **Error Handling**: Improved error messages in English
- **Monitoring**: Enhanced health endpoint with uptime and version info

### 🛡️ Security & Infrastructure
- **HTTPS**: Complete SSL/TLS setup with Let's Encrypt
- **Auto-renewal**: Automated certificate renewal with systemd timers
- **Production Setup**: PM2 clustering, Nginx reverse proxy
- **Rate Limiting**: Basic protection against abuse
- **Security Headers**: Comprehensive security header implementation

### 📝 Documentation
- **Comprehensive README**: Installation, usage, and API documentation
- **Test Suite**: Enhanced testing with curl examples and validation
- **Deployment Scripts**: Automated setup and configuration scripts

### 🔄 Migration Notes
- **Breaking Changes**: None - all v1.0.0 endpoints remain compatible
- **New Features**: Entirely backward compatible with additional functionality
- **Performance**: Improved response times and caching

---

## [1.0.0] - 2025-08-15

### 🎉 Initial Release

Basic HTTP status code generator with fundamental features.

### Added
- **HTTP Status Codes**: Support for 18 common status codes (200-504)
- **JSON API**: RESTful endpoints returning status codes
- **Web Interface**: Simple homepage with status code grid
- **Health Endpoint**: Basic service monitoring
- **Node.js Server**: Express-free HTTP server implementation
- **Basic Styling**: Clean, modern CSS design
- **PM2 Support**: Production process management
- **Nginx Integration**: Reverse proxy configuration
- **SSL Support**: HTTPS with Let's Encrypt integration

### Technical Details
- **Supported Codes**: 200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 405, 410, 418, 429, 500, 502, 503, 504
- **Response Format**: JSON with code, message, and timestamp
- **Deployment**: Ubuntu/Debian with systemd integration

---

## Development Roadmap

### Future Versions
- [ ] **v2.1.0**: Custom delay simulation, request/response logging dashboard
- [ ] **v2.2.0**: WebSocket support, real-time monitoring
- [ ] **v3.0.0**: API rate limiting, usage analytics, developer accounts

### Known Issues
- None currently reported

### Contributing
See DEVELOPMENT.md for contribution guidelines and local development setup.

---

**Links:**
- [Live Site](https://allheaders.com)
- [Repository](https://github.com/allheaders/allheaders)
- [Issues](https://github.com/allheaders/allheaders/issues)
- [Creator](https://www.linkedin.com/in/yanndecoopman/)