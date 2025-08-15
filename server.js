const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const cron = require('node-cron');

// Load environment variables from .env file
require('dotenv').config();

// Admin configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeMe123!';
const RULES_FILE = path.join(__dirname, 'config', 'domain-rules.json');
const ACCESS_LOGS_FILE = path.join(__dirname, 'config', 'access-logs.json');
const EMAIL_CONFIG_FILE = path.join(__dirname, 'config', 'email-config.json');
const SESSION_SECRET = 'allheaders-admin-secret-key';
const MAX_LOG_ENTRIES = 10000;

// Load domain rules
function loadDomainRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      const data = fs.readFileSync(RULES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading domain rules:', error);
  }
  return {};
}

// Save domain rules
function saveDomainRules(rules) {
  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving domain rules:', error);
    return false;
  }
}

// Load access logs
function loadAccessLogs() {
  try {
    if (fs.existsSync(ACCESS_LOGS_FILE)) {
      const data = fs.readFileSync(ACCESS_LOGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading access logs:', error);
  }
  return { logs: [] };
}

// Save access logs with rotation
function saveAccessLogs(logs) {
  try {
    // Rotate logs if too many entries
    if (logs.logs.length > MAX_LOG_ENTRIES) {
      const oldLogs = logs.logs.slice(0, logs.logs.length - MAX_LOG_ENTRIES + 1000);
      const timestamp = new Date().toISOString().split('T')[0];
      const archiveFile = path.join(__dirname, `access-logs-archive-${timestamp}.json`);
      fs.writeFileSync(archiveFile, JSON.stringify({ logs: oldLogs }, null, 2));
      logs.logs = logs.logs.slice(-1000); // Keep only last 1000 entries
    }
    
    fs.writeFileSync(ACCESS_LOGS_FILE, JSON.stringify(logs, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving access logs:', error);
    return false;
  }
}

// Log domain rule access
function logDomainAccess(hostname, path, userAgent, ip, statusCode, ruleType, target = null) {
  try {
    const logs = loadAccessLogs();
    const logEntry = {
      timestamp: new Date().toISOString(),
      hostname: hostname,
      path: path,
      userAgent: userAgent || 'Unknown',
      ip: ip,
      statusCode: statusCode,
      ruleType: ruleType,
      target: target
    };
    
    logs.logs.push(logEntry);
    saveAccessLogs(logs);
  } catch (error) {
    console.error('Error logging domain access:', error);
  }
}

// Email configuration functions
function loadEmailConfig() {
  try {
    if (fs.existsSync(EMAIL_CONFIG_FILE)) {
      const data = fs.readFileSync(EMAIL_CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading email config:', error);
  }
  return {
    enabled: false,
    resend: {
      apiKey: ''
    },
    recipient: '',
    sender: 'AllHeaders Analytics <noreply@allheaders.com>',
    senderEmail: 'noreply@allheaders.com'
  };
}

function saveEmailConfig(config) {
  try {
    fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving email config:', error);
    return false;
  }
}

// Weekly analytics report generator
function generateWeeklyReport() {
  const logs = loadAccessLogs();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Filter logs from last week
  const weeklyLogs = logs.logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= weekAgo && logDate <= now;
  });
  
  if (weeklyLogs.length === 0) {
    return null; // No data for this week
  }
  
  // Generate statistics
  const stats = {
    totalHits: weeklyLogs.length,
    uniqueDomains: new Set(weeklyLogs.map(log => log.hostname)).size,
    domains: {},
    userAgents: {},
    topPaths: {},
    statusCodes: {}
  };
  
  // Analyze data
  weeklyLogs.forEach(log => {
    // Domain stats
    if (!stats.domains[log.hostname]) {
      stats.domains[log.hostname] = { count: 0, ruleType: log.ruleType };
    }
    stats.domains[log.hostname].count++;
    
    // User agent stats
    const agent = log.userAgent.length > 50 ? log.userAgent.substring(0, 50) + '...' : log.userAgent;
    stats.userAgents[agent] = (stats.userAgents[agent] || 0) + 1;
    
    // Path stats
    stats.topPaths[log.path] = (stats.topPaths[log.path] || 0) + 1;
    
    // Status code stats
    stats.statusCodes[log.statusCode] = (stats.statusCodes[log.statusCode] || 0) + 1;
  });
  
  // Sort and get top items
  stats.topDomains = Object.entries(stats.domains)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 5);
  
  stats.topUserAgents = Object.entries(stats.userAgents)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  stats.topPaths = Object.entries(stats.topPaths)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  stats.topStatusCodes = Object.entries(stats.statusCodes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  return {
    period: {
      from: weekAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    },
    stats: stats
  };
}

// Generate HTML email template
function generateEmailTemplate(report) {
  const { period, stats } = report;
  
  const domainRows = stats.topDomains.map(([domain, data]) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${domain}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">${data.count}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">
        <span style="background: ${data.ruleType === 'status' ? '#e74c3c' : '#f39c12'}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px;">${data.ruleType}</span>
      </td>
    </tr>
  `).join('');
  
  const agentRows = stats.topUserAgents.map(([agent, count]) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${agent}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">${count}</td>
    </tr>
  `).join('');
  
  const pathRows = stats.topPaths.map(([path, count]) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${path}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">${count}</td>
    </tr>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AllHeaders - Weekly Analytics Report</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
    <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(45deg, #2c3e50, #3498db); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">📊 AllHeaders Analytics</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Weekly Report - ${period.from} to ${period.to}</p>
        </div>
        
        <!-- Overview Stats -->
        <div style="padding: 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">📈 Weekly Overview</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3498db;">
                    <div style="font-size: 32px; font-weight: bold; color: #3498db; margin-bottom: 5px;">${stats.totalHits}</div>
                    <div style="color: #7f8c8d; font-size: 14px;">Total Hits</div>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #27ae60;">
                    <div style="font-size: 32px; font-weight: bold; color: #27ae60; margin-bottom: 5px;">${stats.uniqueDomains}</div>
                    <div style="color: #7f8c8d; font-size: 14px;">Unique Domains</div>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #f39c12;">
                    <div style="font-size: 32px; font-weight: bold; color: #f39c12; margin-bottom: 5px;">${stats.topDomains.length > 0 ? stats.topDomains[0][1].count : 0}</div>
                    <div style="color: #7f8c8d; font-size: 14px;">Top Domain Hits</div>
                </div>
            </div>
            
            <!-- Top Domains -->
            <h3 style="color: #2c3e50; margin-bottom: 15px;">🔍 Top Domains</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #34495e; color: white;">
                        <th style="padding: 15px; text-align: left;">Domain</th>
                        <th style="padding: 15px; text-align: center;">Hits</th>
                        <th style="padding: 15px; text-align: center;">Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${domainRows || '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #7f8c8d;">No domain data this week</td></tr>'}
                </tbody>
            </table>
            
            <!-- Top User Agents -->
            <h3 style="color: #2c3e50; margin-bottom: 15px;">🤖 Top User Agents</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #34495e; color: white;">
                        <th style="padding: 15px; text-align: left;">User Agent</th>
                        <th style="padding: 15px; text-align: center;">Hits</th>
                    </tr>
                </thead>
                <tbody>
                    ${agentRows || '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #7f8c8d;">No user agent data this week</td></tr>'}
                </tbody>
            </table>
            
            <!-- Top Paths -->
            <h3 style="color: #2c3e50; margin-bottom: 15px;">📁 Top Requested Paths</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #34495e; color: white;">
                        <th style="padding: 15px; text-align: left;">Path</th>
                        <th style="padding: 15px; text-align: center;">Hits</th>
                    </tr>
                </thead>
                <tbody>
                    ${pathRows || '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #7f8c8d;">No path data this week</td></tr>'}
                </tbody>
            </table>
            
            <!-- Quick Actions -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px;">🔧 Quick Actions</h3>
                <p style="margin-bottom: 15px; color: #7f8c8d;">Access your complete analytics dashboard for detailed insights</p>
                <a href="https://allheaders.com/control-panel/stats" style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">View Full Analytics</a>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #34495e; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">AllHeaders Analytics - Automated Weekly Report</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.6;">Generated on ${new Date().toISOString().split('T')[0]} - <a href="https://allheaders.com" style="color: #3498db;">allheaders.com</a></p>
        </div>
    </div>
</body>
</html>`;
}

// Send weekly report email via Resend API
async function sendWeeklyReport() {
  const config = loadEmailConfig();
  
  if (!config.enabled || !config.recipient || !config.resend?.apiKey) {
    console.log('Email reporting not configured or disabled');
    return false;
  }
  
  const report = generateWeeklyReport();
  if (!report) {
    console.log('No analytics data for weekly report');
    return false;
  }
  
  try {
    const emailData = {
      from: config.senderEmail || 'noreply@allheaders.com',
      to: [config.recipient],
      subject: `📊 AllHeaders Weekly Analytics - ${report.period.from} to ${report.period.to}`,
      html: generateEmailTemplate(report)
    };

    // Add CSV attachment if requested
    const logs = loadAccessLogs();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyLogs = logs.logs.filter(log => new Date(log.timestamp) >= weekAgo);
    
    if (weeklyLogs.length > 0) {
      const csvHeader = 'Timestamp,Hostname,Path,UserAgent,IP,StatusCode,RuleType,Target\n';
      const csvData = weeklyLogs.map(log => 
        `"${log.timestamp}","${log.hostname}","${log.path}","${log.userAgent}","${log.ip}","${log.statusCode}","${log.ruleType}","${log.target || ''}"`
      ).join('\n');
      
      // Convert CSV to base64 for Resend attachment
      const csvContent = Buffer.from(csvHeader + csvData).toString('base64');
      emailData.attachments = [{
        filename: `allheaders-weekly-${report.period.from}-to-${report.period.to}.csv`,
        content: csvContent,
        type: 'text/csv'
      }];
    }

    const success = await sendEmailViaResend(config.resend.apiKey, emailData);
    if (success) {
      console.log(`✅ Weekly analytics report sent to ${config.recipient} via Resend`);
      return true;
    } else {
      console.log('❌ Failed to send weekly report via Resend');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed to send weekly report:', error);
    return false;
  }
}

// Send email via Resend API
async function sendEmailViaResend(apiKey, emailData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(emailData);
    
    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Email sent successfully via Resend');
          resolve(true);
        } else {
          console.error('❌ Resend API error:', res.statusCode, data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ HTTPS request error:', error);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Simple session management
const sessions = new Map();

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession() {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    authenticated: true,
    createdAt: Date.now()
  };
  sessions.set(sessionId, session);
  return sessionId;
}

function validateSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  // Session expires after 24 hours
  const maxAge = 24 * 60 * 60 * 1000;
  if (Date.now() - session.createdAt > maxAge) {
    sessions.delete(sessionId);
    return false;
  }
  
  return session.authenticated;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body);
      } catch (error) {
        reject(error);
      }
    });
  });
}

const HTTP_CODES = {
  200: 'OK',
  201: 'Created', 
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  410: 'Gone',
  418: "I'm a teapot",
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout'
};

function getStatusCategory(code) {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500) return 'server-error';
  return 'info';
}

function generateHomePage() {
  const codeCards = Object.entries(HTTP_CODES)
    .map(([code, message]) => {
      const category = getStatusCategory(parseInt(code));
      return `
        <div class="code-card ${category}">
          <a href="/${code}">
            <div class="code-number">${code}</div>
            <div class="code-message">${message}</div>
          </a>
          <button class="copy-btn" onclick="copyToClipboard('${code}', this)">📋 Copy</button>
        </div>`;
    }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AllHeaders - HTTP Status Code Generator</title>
    <meta name="description" content="Free HTTP status code generator for testing and development. Get any HTTP status code (200, 404, 500, etc.) instantly for your API tests.">
    <meta name="keywords" content="HTTP, status codes, API testing, web development, HTTP responses, 404, 500, 200">
    <meta name="author" content="Yann Decoopman">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://allheaders.com/">
    <meta property="og:title" content="AllHeaders - HTTP Status Code Generator">
    <meta property="og:description" content="Free HTTP status code generator for testing and development. Get any HTTP status code instantly for your API tests.">
    <meta property="og:image" content="https://allheaders.com/og-image.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://allheaders.com/">
    <meta property="twitter:title" content="AllHeaders - HTTP Status Code Generator">
    <meta property="twitter:description" content="Free HTTP status code generator for testing and development. Get any HTTP status code instantly.">
    <meta property="twitter:image" content="https://allheaders.com/og-image.png">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzM0OThkYiIvPgo8dGV4dCB4PSIxNiIgeT0iMjIiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SDwvdGV4dD4KPC9zdmc+">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(45deg, #2c3e50, #3498db);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .instructions {
            padding: 30px 40px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        
        .instructions h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        
        .instructions code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .codes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
        }
        
        .code-card {
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .code-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .code-card a {
            display: block;
            padding: 25px;
            text-decoration: none;
            color: white;
            text-align: center;
        }
        
        .code-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .code-message {
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .success { background: linear-gradient(45deg, #27ae60, #2ecc71); }
        .redirect { background: linear-gradient(45deg, #f39c12, #e67e22); }
        .client-error { background: linear-gradient(45deg, #e74c3c, #c0392b); }
        .server-error { background: linear-gradient(45deg, #8e44ad, #9b59b6); }
        
        .footer {
            background: #2c3e50;
            color: white;
            padding: 20px 40px;
            text-align: center;
            font-size: 0.9em;
        }
        
        .footer a {
            color: #3498db;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        
        .footer a:hover {
            color: #5dade2;
            text-decoration: underline;
        }
        
        .footer p {
            margin-bottom: 8px;
        }
        
        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 4px;
            color: white;
            padding: 5px 8px;
            font-size: 0.8em;
            cursor: pointer;
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .code-card {
            position: relative;
        }
        
        .code-card:hover .copy-btn {
            opacity: 1;
        }
        
        .copy-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .copy-success {
            background: rgba(39, 174, 96, 0.8) !important;
        }
        
        .method-selector {
            background: #f8f9fa;
            padding: 30px 40px;
            border-top: 1px solid #e9ecef;
            text-align: center;
        }
        
        .method-selector h3 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        .method-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .method-btn {
            padding: 8px 16px;
            border: 2px solid #3498db;
            background: white;
            color: #3498db;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .method-btn:hover, .method-btn.active {
            background: #3498db;
            color: white;
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2em; }
            .codes-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
            .container { margin: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AllHeaders</h1>
            <p>HTTP Status Code Generator for Testing</p>
        </div>
        
        <div class="instructions">
            <h2>🚀 How to Use</h2>
            <p>Click on a code below or access directly <code>allheaders.com/[code]</code></p>
            <p>Example: <code>allheaders.com/404</code> will return HTTP status 404</p>
        </div>
        
        <div class="codes-grid">
            ${codeCards}
        </div>
        
        <div class="method-selector">
            <h3>HTTP Method</h3>
            <div class="method-buttons">
                <button class="method-btn active" onclick="selectMethod(this, 'GET')">GET</button>
                <button class="method-btn" onclick="selectMethod(this, 'POST')">POST</button>
                <button class="method-btn" onclick="selectMethod(this, 'PUT')">PUT</button>
                <button class="method-btn" onclick="selectMethod(this, 'DELETE')">DELETE</button>
                <button class="method-btn" onclick="selectMethod(this, 'PATCH')">PATCH</button>
                <button class="method-btn" onclick="selectMethod(this, 'HEAD')">HEAD</button>
                <button class="method-btn" onclick="selectMethod(this, 'OPTIONS')">OPTIONS</button>
            </div>
        </div>
        
        <div class="footer">
            <p>AllHeaders.com - Testing Tool for Developers</p>
            <p>Created by <a href="https://www.linkedin.com/in/yanndecoopman/?originalSubdomain=fr" target="_blank" rel="noopener noreferrer">Yann Decoopman</a></p>
        </div>
    </div>
    
    <script>
        let currentMethod = 'GET';
        
        function selectMethod(button, method) {
            // Remove active class from all buttons
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Update current method
            currentMethod = method;
        }
        
        async function copyToClipboard(code, button) {
            const url = \`https://allheaders.com/\${code}\`;
            const curlCommand = \`curl -X \${currentMethod} \${url}\`;
            
            try {
                await navigator.clipboard.writeText(curlCommand);
                const originalText = button.innerHTML;
                button.innerHTML = '✅ Copied!';
                button.classList.add('copy-success');
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('copy-success');
                }, 2000);
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = curlCommand;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                button.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    button.innerHTML = '📋 Copy';
                }, 2000);
            }
        }
        
        // Add click handlers to code cards for method-specific navigation
        document.querySelectorAll('.code-card a').forEach(link => {
            link.addEventListener('click', (e) => {
                if (currentMethod !== 'GET') {
                    e.preventDefault();
                    const code = link.getAttribute('href').substring(1);
                    const url = \`https://allheaders.com/\${code}\`;
                    
                    // For non-GET requests, show curl command instead
                    const curlCommand = \`curl -X \${currentMethod} \${url}\`;
                    navigator.clipboard.writeText(curlCommand);
                    
                    // Show notification
                    const notification = document.createElement('div');
                    notification.style.cssText = \`
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #27ae60;
                        color: white;
                        padding: 15px 20px;
                        border-radius: 8px;
                        z-index: 1000;
                        font-weight: 500;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    \`;
                    notification.textContent = \`\${currentMethod} command copied to clipboard!\`;
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 3000);
                }
            });
        });
    </script>
</body>
</html>`;
}

// Generate admin login page
function generateAdminLogin(error = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AllHeaders - Admin Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 30px;
            font-size: 2em;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #34495e;
            font-weight: 500;
        }
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ecf0f1;
            border-radius: 5px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #3498db;
        }
        .btn-login {
            width: 100%;
            background: #3498db;
            color: white;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        .btn-login:hover {
            background: #2980b9;
        }
        .error {
            color: #e74c3c;
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            background: #fadbd8;
            border-radius: 5px;
        }
        .back-link {
            text-align: center;
            margin-top: 20px;
        }
        .back-link a {
            color: #3498db;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>🔐 Admin Access</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form method="POST" action="/control-panel/login">
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn-login">Login</button>
        </form>
        <div class="back-link">
            <a href="/">← Back to AllHeaders</a>
        </div>
    </div>
</body>
</html>`;
}

// Analytics functions
function getAnalyticsStats() {
  const logs = loadAccessLogs();
  const stats = {
    totalHits: logs.logs.length,
    uniqueDomains: new Set(logs.logs.map(log => log.hostname)).size,
    domains: {},
    userAgents: {},
    recentLogs: logs.logs.slice(-50).reverse()
  };

  // Analyze by domain
  logs.logs.forEach(log => {
    if (!stats.domains[log.hostname]) {
      stats.domains[log.hostname] = {
        count: 0,
        lastAccess: log.timestamp,
        ruleType: log.ruleType
      };
    }
    stats.domains[log.hostname].count++;
    if (log.timestamp > stats.domains[log.hostname].lastAccess) {
      stats.domains[log.hostname].lastAccess = log.timestamp;
    }
  });

  // Analyze user agents
  logs.logs.forEach(log => {
    const agent = log.userAgent || 'Unknown';
    const shortAgent = agent.length > 50 ? agent.substring(0, 50) + '...' : agent;
    if (!stats.userAgents[shortAgent]) {
      stats.userAgents[shortAgent] = 0;
    }
    stats.userAgents[shortAgent]++;
  });

  return stats;
}

function formatRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Generate email configuration page
function generateEmailConfigPage() {
  const config = loadEmailConfig();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AllHeaders - Email Configuration</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(45deg, #2c3e50, #3498db);
            color: white;
            padding: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .nav h1 { font-size: 1.8em; }
        .nav-links { display: flex; gap: 20px; }
        .nav-links a { color: white; text-decoration: none; padding: 8px 16px; border-radius: 5px; transition: background 0.3s; }
        .nav-links a:hover, .nav-links a.active { background: rgba(255,255,255,0.2); }
        .container { max-width: 800px; margin: 0 auto; padding: 30px 20px; }
        .form-section {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            overflow: hidden;
        }
        .section-header {
            background: #34495e;
            color: white;
            padding: 15px 20px;
            font-size: 1.2em;
            font-weight: 600;
        }
        .section-content { padding: 20px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; color: #2c3e50; font-weight: 500; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 2px solid #ecf0f1; border-radius: 5px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #3498db; }
        .checkbox-group { display: flex; align-items: center; gap: 10px; }
        .checkbox-group input { width: auto; }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: background 0.3s;
            margin-right: 10px;
        }
        .btn-primary { background: #3498db; color: white; }
        .btn-primary:hover { background: #2980b9; }
        .btn-success { background: #27ae60; color: white; }
        .btn-success:hover { background: #229954; }
        .btn-warning { background: #f39c12; color: white; }
        .btn-warning:hover { background: #e67e22; }
        .status-message {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            display: none;
        }
        .status-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info-box {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            color: #004085;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) {
            .nav { flex-direction: column; gap: 15px; }
            .grid-2 { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="nav">
            <h1>📧 Email Configuration</h1>
            <div class="nav-links">
                <a href="/control-panel">🏠 Dashboard</a>
                <a href="/control-panel/stats">📈 Analytics</a>
                <a href="/control-panel/email" class="active">📧 Email</a>
                <a href="/control-panel/logout">🚪 Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div id="status-message" class="status-message"></div>
        
        <div class="info-box">
            <strong>📅 Weekly Reports:</strong> Configure email delivery for automated weekly analytics reports sent every Monday at 8:00 AM (Europe/Paris timezone).
        </div>

        <form id="email-config-form">
            <div class="form-section">
                <div class="section-header">⚙️ General Settings</div>
                <div class="section-content">
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="enabled" name="enabled" ${config.enabled ? 'checked' : ''}>
                            <label for="enabled">Enable weekly email reports</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="recipient">Recipient Email:</label>
                        <input type="email" id="recipient" name="recipient" value="${config.recipient}" placeholder="you@example.com" required>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="section-header">🚀 Resend API Configuration</div>
                <div class="section-content">
                    <div class="info-box">
                        <strong>🔑 Resend API:</strong> Get your API key from <a href="https://resend.com/api-keys" target="_blank">resend.com/api-keys</a>. Resend provides reliable email delivery with better deliverability than traditional SMTP.
                    </div>
                    
                    <div class="form-group">
                        <label for="resend-api-key">Resend API Key:</label>
                        <input type="password" id="resend-api-key" name="resend-api-key" value="${config.resend?.apiKey ? '***' : ''}" placeholder="re_..." required>
                        <small style="color: #666; font-size: 12px;">Your API key starts with "re_" and is kept secure on the server</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="sender-email">Sender Email Address:</label>
                        <input type="email" id="sender-email" name="sender-email" value="${config.senderEmail || 'noreply@allheaders.com'}" placeholder="noreply@yourdomain.com" required>
                        <small style="color: #666; font-size: 12px;">Must be a verified domain in your Resend account</small>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="section-header">💾 Actions</div>
                <div class="section-content">
                    <button type="submit" class="btn btn-primary">💾 Save Configuration</button>
                    <button type="button" class="btn btn-warning" onclick="testEmail()">🧪 Send Test Report</button>
                    <button type="button" class="btn btn-success" onclick="previewReport()">👀 Preview Report</button>
                </div>
            </div>
        </form>
    </div>

    <script>
        // Load current configuration
        async function loadConfig() {
            try {
                const response = await fetch('/control-panel/api/email');
                if (response.ok) {
                    const config = await response.json();
                    console.log('Config loaded:', config);
                }
            } catch (error) {
                showStatus('Error loading configuration: ' + error.message, 'error');
            }
        }

        // Save email configuration
        document.getElementById('email-config-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                enabled: formData.has('enabled'),
                recipient: formData.get('recipient'),
                senderEmail: formData.get('sender-email'),
                resend: {
                    apiKey: formData.get('resend-api-key')
                }
            };
            
            try {
                const response = await fetch('/control-panel/api/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showStatus('Email configuration saved successfully!', 'success');
                } else {
                    const error = await response.text();
                    showStatus('Error: ' + error, 'error');
                }
            } catch (error) {
                showStatus('Error: ' + error.message, 'error');
            }
        });

        // Test email sending
        async function testEmail() {
            try {
                showStatus('Sending test email...', 'success');
                const response = await fetch('/control-panel/api/email/test', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    showStatus('Test email sent successfully! Check your inbox.', 'success');
                } else {
                    const error = await response.text();
                    showStatus('Failed to send test email: ' + error, 'error');
                }
            } catch (error) {
                showStatus('Error: ' + error.message, 'error');
            }
        }

        // Preview report (opens analytics page in new tab)
        function previewReport() {
            window.open('/control-panel/stats', '_blank');
        }

        // Show status message
        function showStatus(message, type) {
            const statusDiv = document.getElementById('status-message');
            statusDiv.textContent = message;
            statusDiv.className = 'status-message status-' + type;
            statusDiv.style.display = 'block';
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }


        // Load configuration on page load
        window.addEventListener('load', loadConfig);
    </script>
</body>
</html>`;
}

// Generate analytics page
function generateAnalyticsPage() {
  const stats = getAnalyticsStats();
  const topDomains = Object.entries(stats.domains)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10);
  const topUserAgents = Object.entries(stats.userAgents)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  const domainRows = topDomains.map(([hostname, data]) => `
    <tr>
      <td>${hostname}</td>
      <td>${data.count}</td>
      <td><span class="rule-type ${data.ruleType}">${data.ruleType}</span></td>
      <td>${formatRelativeTime(data.lastAccess)}</td>
    </tr>
  `).join('');

  const agentRows = topUserAgents.map(([agent, count]) => `
    <tr>
      <td title="${agent}">${agent}</td>
      <td>${count}</td>
    </tr>
  `).join('');

  const recentRows = stats.recentLogs.slice(0, 20).map(log => `
    <tr>
      <td>${formatRelativeTime(log.timestamp)}</td>
      <td>${log.hostname}</td>
      <td>${log.path}</td>
      <td>${log.statusCode}</td>
      <td><span class="rule-type ${log.ruleType}">${log.ruleType}</span></td>
      <td title="${log.userAgent}">${log.userAgent.substring(0, 30)}...</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AllHeaders - Analytics</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(45deg, #2c3e50, #3498db);
            color: white;
            padding: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .nav h1 { font-size: 1.8em; }
        .nav-links { display: flex; gap: 20px; }
        .nav-links a { color: white; text-decoration: none; padding: 8px 16px; border-radius: 5px; transition: background 0.3s; }
        .nav-links a:hover, .nav-links a.active { background: rgba(255,255,255,0.2); }
        .container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }
        .stats-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #3498db; margin-bottom: 5px; }
        .stat-label { color: #7f8c8d; font-size: 0.9em; }
        .section {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            overflow: hidden;
        }
        .section-header {
            background: #34495e;
            color: white;
            padding: 15px 20px;
            font-size: 1.2em;
            font-weight: 600;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
        th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
        tr:hover { background: #f8f9fa; }
        .rule-type {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
            color: white;
        }
        .rule-type.status { background: #e74c3c; }
        .rule-type.redirect { background: #f39c12; }
        .actions {
            padding: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: background 0.3s;
        }
        .btn-primary { background: #3498db; color: white; }
        .btn-primary:hover { background: #2980b9; }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-danger:hover { background: #c0392b; }
        .btn-success { background: #27ae60; color: white; }
        .btn-success:hover { background: #229954; }
        @media (max-width: 768px) {
            .nav { flex-direction: column; gap: 15px; }
            .stats-overview { grid-template-columns: 1fr; }
            table { font-size: 0.9em; }
            .actions { justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="nav">
            <h1>📊 AllHeaders Analytics</h1>
            <div class="nav-links">
                <a href="/control-panel">🏠 Dashboard</a>
                <a href="/control-panel/stats" class="active">📈 Analytics</a>
                <a href="/control-panel/logout">🚪 Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-number">${stats.totalHits}</div>
                <div class="stat-label">Total Hits</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.uniqueDomains}</div>
                <div class="stat-label">Unique Domains</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${topDomains.length > 0 ? topDomains[0][1].count : 0}</div>
                <div class="stat-label">Top Domain Hits</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(stats.userAgents).length}</div>
                <div class="stat-label">Unique Agents</div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">🔍 By Domain</div>
            <table>
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Hits</th>
                        <th>Rule Type</th>
                        <th>Last Access</th>
                    </tr>
                </thead>
                <tbody>
                    ${domainRows || '<tr><td colspan="4" style="text-align: center; color: #7f8c8d;">No data available</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-header">🤖 Top User Agents</div>
            <table>
                <thead>
                    <tr>
                        <th>User Agent</th>
                        <th>Hits</th>
                    </tr>
                </thead>
                <tbody>
                    ${agentRows || '<tr><td colspan="2" style="text-align: center; color: #7f8c8d;">No data available</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-header">📝 Recent Activity</div>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Domain</th>
                        <th>Path</th>
                        <th>Code</th>
                        <th>Type</th>
                        <th>User Agent</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentRows || '<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">No data available</td></tr>'}
                </tbody>
            </table>
            
            <div class="actions">
                <button class="btn btn-success" onclick="exportLogs('json')">📥 Export JSON</button>
                <button class="btn btn-success" onclick="exportLogs('csv')">📥 Export CSV</button>
                <button class="btn btn-danger" onclick="clearLogs()">🗑️ Clear Logs</button>
            </div>
        </div>
    </div>

    <script>
        async function exportLogs(format) {
            try {
                const response = await fetch(\`/control-panel/api/logs/export?format=\${format}\`);
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`allheaders-logs-\${new Date().toISOString().split('T')[0]}.\${format}\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } else {
                    alert('Export failed');
                }
            } catch (error) {
                alert('Export error: ' + error.message);
            }
        }

        async function clearLogs() {
            if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
                return;
            }
            
            try {
                const response = await fetch('/control-panel/api/logs/clear', {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('Logs cleared successfully!');
                    location.reload();
                } else {
                    alert('Failed to clear logs');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
}

// Generate admin control panel
function generateControlPanel(rules) {
  const rulesList = Object.entries(rules).map(([hostname, rule]) => {
    const isRedirect = rule.type === 'redirect';
    return `
      <tr>
        <td>${hostname}</td>
        <td><span class="rule-type ${rule.type}">${rule.type}</span></td>
        <td>${rule.code}</td>
        <td>${isRedirect ? rule.target : '-'}</td>
        <td>
          <button class="btn-edit" onclick="editRule('${hostname}')">Edit</button>
          <button class="btn-delete" onclick="deleteRule('${hostname}')">Delete</button>
        </td>
      </tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AllHeaders - Control Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f6fa;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(45deg, #2c3e50, #3498db);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .content { padding: 40px; }
        .section { margin-bottom: 40px; }
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #34495e;
            font-weight: 500;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ecf0f1;
            border-radius: 5px;
            font-size: 14px;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #3498db;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-primary:hover { background: #2980b9; }
        .btn-success {
            background: #27ae60;
            color: white;
        }
        .btn-success:hover { background: #229954; }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .btn-danger:hover { background: #c0392b; }
        .btn-edit {
            background: #f39c12;
            color: white;
            font-size: 12px;
            padding: 5px 10px;
        }
        .btn-edit:hover { background: #e67e22; }
        .btn-delete {
            background: #e74c3c;
            color: white;
            font-size: 12px;
            padding: 5px 10px;
            margin-left: 5px;
        }
        .btn-delete:hover { background: #c0392b; }
        .rules-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .rules-table th, .rules-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        .rules-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .rule-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .rule-type.status {
            background: #3498db;
            color: white;
        }
        .rule-type.redirect {
            background: #f39c12;
            color: white;
        }
        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
        }
        .target-field {
            display: none;
        }
        .target-field.show {
            display: block;
        }
        .status { 
            padding: 10px; 
            border-radius: 5px; 
            margin-bottom: 20px;
            text-align: center;
        }
        .status.success {
            background: #d5f4e6;
            color: #27ae60;
            border: 1px solid #27ae60;
        }
        .status.error {
            background: #fadbd8;
            color: #e74c3c;
            border: 1px solid #e74c3c;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1>🛠️ Control Panel</h1>
                    <p>Domain Rules Management for AllHeaders</p>
                </div>
                <div class="nav-actions">
                    <a href="/control-panel/stats" class="btn btn-secondary" style="margin-right: 10px;">📈 Analytics</a>
                    <a href="/control-panel/email" class="btn btn-secondary" style="margin-right: 10px;">📧 Email</a>
                    <a href="/control-panel/logout" class="btn btn-danger">🚪 Logout</a>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div id="status-message"></div>
            
            <div class="section">
                <h2>Add New Rule</h2>
                <form id="add-rule-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="hostname">Hostname:</label>
                            <input type="text" id="hostname" name="hostname" placeholder="example.com" required>
                        </div>
                        <div class="form-group">
                            <label for="type">Type:</label>
                            <select id="type" name="type" onchange="toggleTargetField()" required>
                                <option value="status">Status Code</option>
                                <option value="redirect">Redirect</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="code">HTTP Code:</label>
                            <select id="code" name="code" required>
                                <option value="200">200 - OK</option>
                                <option value="301">301 - Moved Permanently</option>
                                <option value="302">302 - Found</option>
                                <option value="404">404 - Not Found</option>
                                <option value="410">410 - Gone</option>
                                <option value="500">500 - Internal Server Error</option>
                                <option value="503">503 - Service Unavailable</option>
                            </select>
                        </div>
                        <div class="form-group target-field" id="target-field">
                            <label for="target">Target URL:</label>
                            <input type="url" id="target" name="target" placeholder="https://new-site.com">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-success">Add Rule</button>
                </form>
            </div>
            
            <div class="section">
                <h2>Current Rules (${Object.keys(rules).length})</h2>
                ${Object.keys(rules).length > 0 ? `
                <table class="rules-table">
                    <thead>
                        <tr>
                            <th>Hostname</th>
                            <th>Type</th>
                            <th>Code</th>
                            <th>Target</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rulesList}
                    </tbody>
                </table>
                ` : '<p>No rules configured yet.</p>'}
            </div>
            
            <div class="actions">
                <a href="/" class="btn btn-primary">← Back to AllHeaders</a>
                <a href="/control-panel/logout" class="btn btn-danger">Logout</a>
            </div>
        </div>
    </div>
    
    <script>
        function toggleTargetField() {
            const type = document.getElementById('type').value;
            const targetField = document.getElementById('target-field');
            const targetInput = document.getElementById('target');
            
            if (type === 'redirect') {
                targetField.classList.add('show');
                targetInput.required = true;
            } else {
                targetField.classList.remove('show');
                targetInput.required = false;
                targetInput.value = '';
            }
        }
        
        function showStatus(message, isError = false) {
            const statusDiv = document.getElementById('status-message');
            statusDiv.innerHTML = \`<div class="status \${isError ? 'error' : 'success'}">\${message}</div>\`;
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 5000);
        }
        
        document.getElementById('add-rule-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                hostname: formData.get('hostname'),
                type: formData.get('type'),
                code: formData.get('code'),
                target: formData.get('target')
            };
            
            try {
                const response = await fetch('/control-panel/api/rules', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showStatus('Rule added successfully!');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    const error = await response.text();
                    showStatus('Error: ' + error, true);
                }
            } catch (error) {
                showStatus('Error: ' + error.message, true);
            }
        });
        
        async function deleteRule(hostname) {
            if (!confirm(\`Are you sure you want to delete the rule for "\${hostname}"?\`)) {
                return;
            }
            
            try {
                const response = await fetch(\`/control-panel/api/rules/\${encodeURIComponent(hostname)}\`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    showStatus('Rule deleted successfully!');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    const error = await response.text();
                    showStatus('Error: ' + error, true);
                }
            } catch (error) {
                showStatus('Error: ' + error.message, true);
            }
        }
        
        function editRule(hostname) {
            // For now, just fill the form with existing data
            // In a more advanced version, you could populate the form with existing values
            showStatus('To edit a rule, delete it and create a new one.', true);
        }
    </script>
</body>
</html>`;
}

// Initialize weekly report cron job
cron.schedule('0 8 * * 1', () => {
  console.log('Running weekly analytics report...');
  sendWeeklyReport();
}, {
  timezone: "Europe/Paris"
});

console.log('📧 Weekly analytics email scheduled for Mondays at 8:00 AM (Europe/Paris)');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const hostname = req.headers.host ? req.headers.host.replace(/:\d+$/, '') : '';

  console.log(`${new Date().toISOString()} - ${req.method} ${path} - Host: ${hostname} - ${req.headers['user-agent']}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Custom-Header, Cookie');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Load domain rules
  const domainRules = loadDomainRules();
  
  // Check if this hostname has a rule (except for admin routes)
  if (!path.startsWith('/control-panel') && domainRules[hostname]) {
    const rule = domainRules[hostname];
    
    if (rule.type === 'redirect') {
      // Log the redirect access
      logDomainAccess(hostname, path, req.headers['user-agent'], 
                     req.connection.remoteAddress || req.socket.remoteAddress, 
                     rule.code, 'redirect', rule.target);
      
      // Handle redirect rule
      res.writeHead(parseInt(rule.code), { 
        'Location': rule.target,
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: parseInt(rule.code),
        message: HTTP_CODES[rule.code] || 'Redirect',
        target: rule.target,
        hostname: hostname,
        timestamp: new Date().toISOString()
      }, null, 2));
      return;
    } else if (rule.type === 'status') {
      // Log the status code access
      logDomainAccess(hostname, path, req.headers['user-agent'], 
                     req.connection.remoteAddress || req.socket.remoteAddress, 
                     rule.code, 'status');
      
      // Handle status code rule
      const code = parseInt(rule.code);
      res.writeHead(code, { 
        'Content-Type': 'application/json',
        'X-Powered-By': 'AllHeaders.com',
        'X-Hostname-Rule': 'true'
      });
      res.end(JSON.stringify({
        code: code,
        message: HTTP_CODES[code] || 'Unknown Status',
        hostname: hostname,
        ruleType: 'hostname-override',
        timestamp: new Date().toISOString()
      }, null, 2));
      return;
    }
  }

  // Parse cookies for session management
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }

  // Admin routes
  if (path.startsWith('/control-panel')) {
    // Login page
    if (path === '/control-panel' || path === '/control-panel/') {
      const sessionId = cookies['admin-session'];
      if (sessionId && validateSession(sessionId)) {
        // Show control panel
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateControlPanel(domainRules));
      } else {
        // Show login
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateAdminLogin());
      }
      return;
    }
    
    // Analytics stats page
    if (path === '/control-panel/stats' || path === '/control-panel/stats/') {
      const sessionId = cookies['admin-session'];
      if (sessionId && validateSession(sessionId)) {
        // Show analytics stats
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateAnalyticsPage());
      } else {
        // Redirect to login
        res.writeHead(302, { 'Location': '/control-panel' });
        res.end();
      }
      return;
    }
    
    // Email configuration page
    if (path === '/control-panel/email' || path === '/control-panel/email/') {
      const sessionId = cookies['admin-session'];
      if (sessionId && validateSession(sessionId)) {
        // Show email config page
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateEmailConfigPage());
      } else {
        // Redirect to login
        res.writeHead(302, { 'Location': '/control-panel' });
        res.end();
      }
      return;
    }

    // Login handler
    if (path === '/control-panel/login' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const params = new URLSearchParams(body);
        const password = params.get('password');
        
        if (password === ADMIN_PASSWORD) {
          const sessionId = createSession();
          res.writeHead(302, {
            'Location': '/control-panel',
            'Set-Cookie': `admin-session=${sessionId}; HttpOnly; Path=/; Max-Age=86400`
          });
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(generateAdminLogin('Invalid password'));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }

    // Logout handler
    if (path === '/control-panel/logout') {
      const sessionId = cookies['admin-session'];
      if (sessionId) {
        sessions.delete(sessionId);
      }
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': 'admin-session=; HttpOnly; Path=/; Max-Age=0'
      });
      res.end();
      return;
    }

    // API routes (require authentication)
    if (path.startsWith('/control-panel/api/')) {
      const sessionId = cookies['admin-session'];
      if (!sessionId || !validateSession(sessionId)) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
        return;
      }

      // Add rule
      if (path === '/control-panel/api/rules' && req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const data = JSON.parse(body);
          
          if (!data.hostname || !data.type || !data.code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing required fields');
            return;
          }

          if (data.type === 'redirect' && !data.target) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Target URL required for redirect rules');
            return;
          }

          const rules = loadDomainRules();
          const rule = {
            type: data.type,
            code: data.code
          };

          if (data.type === 'redirect') {
            rule.target = data.target;
          }

          rules[data.hostname] = rule;
          
          if (saveDomainRules(rules)) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Rule added successfully');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to save rule');
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid JSON data');
        }
        return;
      }

      // Delete rule
      if (path.startsWith('/control-panel/api/rules/') && req.method === 'DELETE') {
        const hostname = decodeURIComponent(path.split('/').pop());
        const rules = loadDomainRules();
        
        if (rules[hostname]) {
          delete rules[hostname];
          if (saveDomainRules(rules)) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Rule deleted successfully');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to delete rule');
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Rule not found');
        }
        return;
      }
      
      // Export logs
      if (path === '/control-panel/api/logs/export' && req.method === 'GET') {
        const urlParams = new URLSearchParams(parsedUrl.query);
        const format = urlParams.get('format') || 'json';
        const logs = loadAccessLogs();
        
        if (format === 'csv') {
          const csvHeader = 'Timestamp,Hostname,Path,UserAgent,IP,StatusCode,RuleType,Target\n';
          const csvData = logs.logs.map(log => 
            `"${log.timestamp}","${log.hostname}","${log.path}","${log.userAgent}","${log.ip}","${log.statusCode}","${log.ruleType}","${log.target || ''}"`
          ).join('\n');
          
          res.writeHead(200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=allheaders-logs-${new Date().toISOString().split('T')[0]}.csv`
          });
          res.end(csvHeader + csvData);
        } else {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename=allheaders-logs-${new Date().toISOString().split('T')[0]}.json`
          });
          res.end(JSON.stringify(logs, null, 2));
        }
        return;
      }
      
      // Clear logs
      if (path === '/control-panel/api/logs/clear' && req.method === 'DELETE') {
        const emptyLogs = { logs: [] };
        if (saveAccessLogs(emptyLogs)) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Logs cleared successfully');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Failed to clear logs');
        }
        return;
      }
      
      // Get email configuration
      if (path === '/control-panel/api/email' && req.method === 'GET') {
        const config = loadEmailConfig();
        // Don't send API key in response for security
        const safeConfig = {
          ...config,
          resend: {
            apiKey: config.resend?.apiKey ? '***' : ''
          }
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(safeConfig, null, 2));
        return;
      }
      
      // Save email configuration
      if (path === '/control-panel/api/email' && req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const data = JSON.parse(body);
          
          const config = loadEmailConfig();
          
          // Update configuration
          config.enabled = data.enabled || false;
          config.recipient = data.recipient || '';
          config.senderEmail = data.senderEmail || 'noreply@allheaders.com';
          
          // Only update API key if provided and not masked
          if (data.resend?.apiKey && data.resend.apiKey !== '***') {
            config.resend = config.resend || {};
            config.resend.apiKey = data.resend.apiKey;
          }
          
          if (saveEmailConfig(config)) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Email configuration saved successfully');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to save email configuration');
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid JSON data');
        }
        return;
      }
      
      // Test email configuration
      if (path === '/control-panel/api/email/test' && req.method === 'POST') {
        const success = await sendWeeklyReport();
        if (success) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Test email sent successfully');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Failed to send test email');
        }
        return;
      }
    }

    // Unauthorized access to admin routes
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Unauthorized');
    return;
  }
  
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHomePage());
    return;
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '2.1.0'
    }));
    return;
  }

  const codeMatch = path.match(/^\/(\d{3})$/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1]);
    
    if (HTTP_CODES[code]) {
      // Add custom headers for better caching and debugging
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': (req.method === 'GET' || req.method === 'HEAD') ? 'public, max-age=3600' : 'no-cache',
        'X-Powered-By': 'AllHeaders.com',
        'X-HTTP-Method': req.method,
        'X-Response-Time': new Date().toISOString()
      };
      
      // Add any custom headers from request
      if (req.headers['x-custom-header']) {
        headers['X-Custom-Response'] = 'Custom header received: ' + req.headers['x-custom-header'];
      }
      
      res.writeHead(code, headers);
      
      const responseBody = {
        code: code,
        message: HTTP_CODES[code],
        method: req.method,
        timestamp: new Date().toISOString(),
        headers: {
          received: Object.keys(req.headers).length,
          userAgent: req.headers['user-agent'] || 'Unknown',
          customHeader: req.headers['x-custom-header'] || null
        }
      };
      
      // For HEAD requests, don't send body
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(JSON.stringify(responseBody, null, 2));
      }
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    code: 404,
    message: 'Not Found',
    error: 'Unsupported HTTP code or invalid path',
    timestamp: new Date().toISOString()
  }, null, 2));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur AllHeaders démarré sur le port ${PORT}`);
  console.log(`📍 Accès local: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});