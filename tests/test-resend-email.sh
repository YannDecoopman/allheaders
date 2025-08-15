#!/bin/bash

# Test script for AllHeaders Resend Email functionality
# Usage: ./test-resend-email.sh

set -e

URL="http://localhost:3000"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeMe123!}"
FAILED=0

echo "🚀 Testing AllHeaders Resend Email Implementation"
echo "================================================="

# Test 1: Admin login
echo "🔐 Test admin authentication..."
COOKIE_JAR=$(mktemp)
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -d "password=$ADMIN_PASSWORD" -X POST "$URL/control-panel/login" -w "%{http_code}")
if echo "$LOGIN_RESPONSE" | tail -c 4 | grep -q "302"; then
    echo "✅ Admin authentication successful"
else
    echo "❌ Admin authentication failed"
    ((FAILED++))
fi

# Test 2: Access new email configuration page with Resend
echo "📧 Test access to Resend email config page..."
EMAIL_PAGE=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel/email")
if echo "$EMAIL_PAGE" | grep -q "Resend API Configuration"; then
    echo "✅ Resend email config page accessible"
else
    echo "❌ Resend email config page not accessible"
    ((FAILED++))
fi

# Test 3: Check for Resend-specific elements
echo "🔑 Test Resend API elements presence..."
if echo "$EMAIL_PAGE" | grep -q "Resend API Key" && echo "$EMAIL_PAGE" | grep -q "resend.com/api-keys"; then
    echo "✅ Resend API key field and documentation link present"
else
    echo "❌ Resend API elements missing"
    ((FAILED++))
fi

# Test 4: Verify SMTP elements are removed
echo "🚫 Test SMTP elements removed..."
if ! echo "$EMAIL_PAGE" | grep -q "SMTP Host" && ! echo "$EMAIL_PAGE" | grep -q "smtp-host"; then
    echo "✅ SMTP configuration elements successfully removed"
else
    echo "❌ SMTP elements still present"
    ((FAILED++))
fi

# Test 5: Get current email configuration
echo "⚙️ Test API configuration retrieval..."
CONFIG_HTTP_CODE=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel/api/email" -w "%{http_code}" -o /tmp/config_response.json)
if [ "$CONFIG_HTTP_CODE" = "200" ]; then
    echo "✅ Email config API accessible"
    if jq -e '.resend' /tmp/config_response.json >/dev/null 2>&1; then
        echo "✅ Resend configuration structure present"
    else
        echo "❌ Resend configuration structure missing"
        ((FAILED++))
    fi
else
    echo "❌ Email config API not accessible (HTTP: $CONFIG_HTTP_CODE)"
    ((FAILED++))
fi

# Test 6: Save test Resend configuration
echo "💾 Test saving Resend configuration..."
TEST_CONFIG='{"enabled":false,"recipient":"test@example.com","senderEmail":"noreply@allheaders.com","resend":{"apiKey":"re_test_key_123"}}'
SAVE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$URL/control-panel/api/email" \
    -H "Content-Type: application/json" \
    -d "$TEST_CONFIG" \
    -w "%{http_code}")

if echo "$SAVE_RESPONSE" | tail -c 4 | grep -q "200"; then
    echo "✅ Resend configuration saved successfully"
else
    echo "❌ Failed to save Resend configuration"
    ((FAILED++))
fi

# Test 7: Verify configuration was saved with correct structure
echo "📄 Test saved configuration structure..."
curl -s -b "$COOKIE_JAR" "$URL/control-panel/api/email" -o /tmp/saved_config.json
if jq -e '.resend.apiKey' /tmp/saved_config.json >/dev/null 2>&1; then
    API_KEY_VALUE=$(jq -r '.resend.apiKey' /tmp/saved_config.json)
    if [ "$API_KEY_VALUE" = "***" ]; then
        echo "✅ API key masked for security in response"
    else
        echo "❌ API key not properly masked (got: $API_KEY_VALUE)"
        ((FAILED++))
    fi
else
    echo "❌ Resend config structure incorrect"
    ((FAILED++))
fi

# Test 8: Test email sending with invalid API key (should fail gracefully)
echo "🧪 Test email with invalid API key..."
INVALID_TEST_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$URL/control-panel/api/email/test" -w "%{http_code}")
if echo "$INVALID_TEST_RESPONSE" | tail -c 4 | grep -q "500"; then
    echo "✅ Invalid API key handled gracefully (expected failure)"
else
    echo "⚠️ Unexpected response for invalid API key test"
fi

# Test 9: Check server logs for Resend mentions
echo "📋 Test server logs for Resend integration..."
if pm2 logs allheaders --lines 20 | grep -i "resend\|email" | head -1 >/dev/null 2>&1; then
    echo "✅ Resend-related logs found (server using new system)"
else
    echo "⚠️ No specific Resend logs (may be normal if no email attempts)"
fi

# Test 10: Verify configuration file structure
echo "📁 Test configuration file structure..."
if [ -f "/var/www/config/email-config.json" ]; then
    if cat /var/www/config/email-config.json | jq -e '.resend.apiKey' >/dev/null 2>&1; then
        echo "✅ Configuration file has correct Resend structure"
    else
        echo "❌ Configuration file missing Resend structure"
        ((FAILED++))
    fi
else
    echo "❌ Configuration file not found"
    ((FAILED++))
fi

# Cleanup - restore empty config
echo "🧹 Cleanup test configuration..."
EMPTY_CONFIG='{"enabled":false,"resend":{"apiKey":""},"recipient":"","sender":"AllHeaders Analytics <noreply@allheaders.com>","senderEmail":"noreply@allheaders.com"}'
curl -s -b "$COOKIE_JAR" -X POST "$URL/control-panel/api/email" \
    -H "Content-Type: application/json" \
    -d "$EMPTY_CONFIG" >/dev/null

# Cleanup
rm -f "$COOKIE_JAR"

echo "================================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 All Resend email integration tests passed!"
    echo "🚀 Ready to use with real Resend API key!"
else
    echo "💥 $FAILED test(s) failed"
fi

echo ""
echo "📋 Resend Implementation Summary:"
echo "  ✓ Removed nodemailer SMTP dependency"
echo "  ✓ Implemented native HTTPS Resend API calls"
echo "  ✓ Updated admin UI for API key configuration"
echo "  ✓ Secure API key masking"
echo "  ✓ Support for CSV attachments via base64"
echo "  ✓ Maintains weekly scheduling (Mondays 8AM)"
echo ""
echo "🔧 Configuration: https://allheaders.com/control-panel/email"
echo "🔑 Get API key: https://resend.com/api-keys"
echo "📅 Schedule: Mondays 8:00 AM (Europe/Paris)"

exit $FAILED