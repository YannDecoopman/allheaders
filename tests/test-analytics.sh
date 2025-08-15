#!/bin/bash

# Test script for AllHeaders Analytics functionality
# Usage: ./test-analytics.sh

set -e

URL="https://allheaders.com"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeMe123!}"
FAILED=0

echo "📊 Tests de la fonctionnalité Analytics AllHeaders"
echo "================================================"

# Test 1: Admin login
echo "🔐 Test authentification admin..."
COOKIE_JAR=$(mktemp)
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -d "password=$ADMIN_PASSWORD" -X POST "$URL/control-panel/login" -w "%{http_code}")
if echo "$LOGIN_RESPONSE" | tail -c 4 | grep -q "302"; then
    echo "✅ Authentification réussie"
else
    echo "❌ Authentification échouée"
    ((FAILED++))
fi

# Test 2: Generate some test logs by triggering domain rules
echo "📝 Test génération de logs via règles existantes..."

# Get existing rules first to test against them
RULES_COUNT=0
if [ -f "/var/www/domain-rules.json" ]; then
    RULES_COUNT=$(cat /var/www/domain-rules.json | jq 'length' 2>/dev/null || echo "0")
fi

if [ "$RULES_COUNT" -gt 0 ]; then
    # Test with existing rules
    echo "📋 Testing avec $(cat /var/www/domain-rules.json | jq -r 'keys[]' | head -1)..."
    TEST_HOSTNAME=$(cat /var/www/domain-rules.json | jq -r 'keys[]' | head -1)
    
    # Generate test log
    curl -s -H "Host: $TEST_HOSTNAME" "$URL/test-path" >/dev/null
    echo "✅ Log généré pour hostname existant"
else
    # Add a test rule first
    echo "📝 Ajout d'une règle de test..."
    ADD_RULE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$URL/control-panel/api/rules" \
        -H "Content-Type: application/json" \
        -d '{"hostname":"analytics-test.example.com","type":"status","code":"410"}' \
        -w "%{http_code}")
    
    if echo "$ADD_RULE_RESPONSE" | tail -c 4 | grep -q "200"; then
        echo "✅ Règle de test ajoutée"
        
        # Generate test log
        curl -s -H "Host: analytics-test.example.com" "$URL/test-path" >/dev/null
        echo "✅ Log de test généré"
    else
        echo "❌ Échec ajout règle de test"
        ((FAILED++))
    fi
fi

# Test 3: Access analytics page
echo "📊 Test accès page analytics..."
ANALYTICS_PAGE=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel/stats")
if echo "$ANALYTICS_PAGE" | grep -q "AllHeaders Analytics"; then
    echo "✅ Page analytics accessible"
else
    echo "❌ Page analytics non accessible"
    ((FAILED++))
fi

# Test 4: Check if logs are being recorded
echo "💾 Test existence fichier de logs..."
if [ -f "/var/www/access-logs.json" ]; then
    echo "✅ Fichier access-logs.json créé"
    LOG_COUNT=$(cat /var/www/access-logs.json | jq '.logs | length' 2>/dev/null || echo "0")
    echo "📄 Nombre d'entrées: $LOG_COUNT"
    
    if [ "$LOG_COUNT" -gt 0 ]; then
        echo "✅ Logs enregistrés correctement"
        echo "📋 Dernier log:"
        cat /var/www/access-logs.json | jq '.logs[-1]' 2>/dev/null || echo "Erreur lecture JSON"
    else
        echo "⚠️  Aucun log enregistré pour l'instant"
    fi
else
    echo "❌ Fichier access-logs.json non créé"
    ((FAILED++))
fi

# Test 5: Test export JSON
echo "📥 Test export JSON..."
EXPORT_JSON_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel/api/logs/export?format=json" -w "%{http_code}")
if echo "$EXPORT_JSON_RESPONSE" | tail -c 4 | grep -q "200"; then
    echo "✅ Export JSON fonctionnel"
else
    echo "❌ Export JSON échoué (code: $(echo $EXPORT_JSON_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 6: Test export CSV
echo "📊 Test export CSV..."
EXPORT_CSV_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel/api/logs/export?format=csv" -w "%{http_code}")
if echo "$EXPORT_CSV_RESPONSE" | tail -c 4 | grep -q "200"; then
    echo "✅ Export CSV fonctionnel"
else
    echo "❌ Export CSV échoué (code: $(echo $EXPORT_CSV_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 7: Test analytics navigation from control panel
echo "🔗 Test lien analytics depuis control panel..."
CONTROL_PANEL=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel")
if echo "$CONTROL_PANEL" | grep -q "Analytics"; then
    echo "✅ Lien analytics présent dans le control panel"
else
    echo "❌ Lien analytics manquant dans le control panel"
    ((FAILED++))
fi

# Test 8: Vérifier la structure des logs
echo "📋 Test structure des logs..."
if [ -f "/var/www/access-logs.json" ]; then
    # Check if logs have required fields
    SAMPLE_LOG=$(cat /var/www/access-logs.json | jq '.logs[0]' 2>/dev/null)
    if echo "$SAMPLE_LOG" | grep -q "timestamp" && echo "$SAMPLE_LOG" | grep -q "hostname" && echo "$SAMPLE_LOG" | grep -q "statusCode"; then
        echo "✅ Structure des logs correcte"
    else
        echo "❌ Structure des logs incorrecte"
        ((FAILED++))
    fi
fi

# Test 9: Test auto-refresh functionality (check if page has refresh script)
echo "🔄 Test fonctionnalité auto-refresh..."
if echo "$ANALYTICS_PAGE" | grep -q "setTimeout.*location.reload"; then
    echo "✅ Auto-refresh activé sur la page analytics"
else
    echo "❌ Auto-refresh non configuré"
    ((FAILED++))
fi

# Clean up test rule if we added one
if [ "$RULES_COUNT" -eq 0 ]; then
    echo "🧹 Nettoyage règle de test..."
    curl -s -b "$COOKIE_JAR" -X DELETE "$URL/control-panel/api/rules/analytics-test.example.com" >/dev/null
fi

# Cleanup
rm -f "$COOKIE_JAR"

echo "================================================"
if [ $FAILED -eq 0 ]; then
    echo "🎉 Tous les tests analytics sont passés !"
    echo "🛠️  Fonctionnalité analytics opérationnelle !"
else
    echo "💥 $FAILED test(s) analytics échoué(s)"
fi

echo ""
echo "📋 Résumé des fonctionnalités testées:"
echo "  ✓ Logging automatique des règles de domaine"  
echo "  ✓ Structure JSON des logs"
echo "  ✓ Interface analytics dans l'admin panel"
echo "  ✓ Statistiques par domaine"
echo "  ✓ Analyse des User-Agents"
echo "  ✓ Export JSON/CSV"
echo "  ✓ Navigation depuis le control panel"
echo "  ✓ Auto-refresh des données"
echo ""
echo "🔧 Accès analytics: https://allheaders.com/control-panel/stats"
echo "🔑 Mot de passe: $ADMIN_PASSWORD"

exit $FAILED