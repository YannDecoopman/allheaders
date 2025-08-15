#!/bin/bash

# Test script for AllHeaders Admin functionality
# Usage: ./test-admin.sh

set -e

URL="https://allheaders.com"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeMe123!}"
FAILED=0

echo "🔧 Tests de la fonctionnalité Admin AllHeaders"
echo "=============================================="

# Test 1: Admin login page accessible
echo "📄 Test page de login admin..."
LOGIN_PAGE=$(curl -s "$URL/control-panel")
if echo "$LOGIN_PAGE" | grep -q "Admin Access"; then
    echo "✅ Page de login accessible"
else
    echo "❌ Page de login non accessible"
    ((FAILED++))
fi

# Test 2: Login with correct password
echo "🔐 Test authentification admin..."
COOKIE_JAR=$(mktemp)
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -d "password=$ADMIN_PASSWORD" -X POST "$URL/control-panel/login" -w "%{http_code}")
if echo "$LOGIN_RESPONSE" | tail -c 4 | grep -q "302"; then
    echo "✅ Authentification réussie (redirect)"
else
    echo "❌ Authentification échouée (code: $(echo $LOGIN_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 3: Access control panel with valid session
echo "🛠️  Test accès panneau de contrôle..."
CONTROL_PANEL=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel")
if echo "$CONTROL_PANEL" | grep -q "Control Panel"; then
    echo "✅ Panneau de contrôle accessible avec session valide"
else
    echo "❌ Panneau de contrôle non accessible"
    ((FAILED++))
fi

# Test 4: Add a status rule via API
echo "📝 Test ajout règle status via API..."
ADD_RULE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$URL/control-panel/api/rules" \
    -H "Content-Type: application/json" \
    -d '{"hostname":"test-status.example.com","type":"status","code":"410"}' \
    -w "%{http_code}")

if echo "$ADD_RULE_RESPONSE" | tail -c 4 | grep -q "200"; then
    echo "✅ Règle de status ajoutée avec succès"
else
    echo "❌ Échec ajout règle status (code: $(echo $ADD_RULE_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 5: Add a redirect rule via API
echo "🔄 Test ajout règle redirect via API..."
ADD_REDIRECT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$URL/control-panel/api/rules" \
    -H "Content-Type: application/json" \
    -d '{"hostname":"test-redirect.example.com","type":"redirect","code":"301","target":"https://new-site.com"}' \
    -w "%{http_code}")

if echo "$ADD_REDIRECT_RESPONSE" | tail -c 4 | grep -q "200"; then
    echo "✅ Règle de redirection ajoutée avec succès"
else
    echo "❌ Échec ajout règle redirect (code: $(echo $ADD_REDIRECT_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 6: Check if domain-rules.json was created
echo "💾 Test création fichier de règles..."
if [ -f "/var/www/domain-rules.json" ]; then
    echo "✅ Fichier domain-rules.json créé"
    echo "📄 Contenu du fichier:"
    cat /var/www/domain-rules.json
else
    echo "❌ Fichier domain-rules.json non créé"
    ((FAILED++))
fi

# Test 7: Test hostname rule enforcement (status)
echo "🎯 Test application règle hostname (status)..."
STATUS_TEST=$(curl -s -H "Host: test-status.example.com" "$URL/any-path" -w "%{http_code}")
if echo "$STATUS_TEST" | tail -c 4 | grep -q "410"; then
    echo "✅ Règle de status appliquée correctement (410)"
else
    echo "❌ Règle de status non appliquée (code: $(echo $STATUS_TEST | tail -c 4))"
    ((FAILED++))
fi

# Test 8: Test hostname rule enforcement (redirect)
echo "🔀 Test application règle hostname (redirect)..."
REDIRECT_TEST=$(curl -s -H "Host: test-redirect.example.com" "$URL/any-path" -w "%{http_code}")
if echo "$REDIRECT_TEST" | tail -c 4 | grep -q "301"; then
    echo "✅ Règle de redirection appliquée correctement (301)"
else
    echo "❌ Règle de redirection non appliquée (code: $(echo $REDIRECT_TEST | tail -c 4))"
    ((FAILED++))
fi

# Test 9: Delete a rule via API
echo "🗑️  Test suppression règle via API..."
DELETE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X DELETE "$URL/control-panel/api/rules/test-status.example.com" -w "%{http_code}")
if echo "$DELETE_RESPONSE" | tail -c 4 | grep -q "200"; then
    echo "✅ Règle supprimée avec succès"
else
    echo "❌ Échec suppression règle (code: $(echo $DELETE_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 10: Logout functionality
echo "🚪 Test déconnexion..."
LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel/logout" -w "%{http_code}")
if echo "$LOGOUT_RESPONSE" | tail -c 4 | grep -q "302"; then
    echo "✅ Déconnexion réussie"
else
    echo "❌ Échec déconnexion (code: $(echo $LOGOUT_RESPONSE | tail -c 4))"
    ((FAILED++))
fi

# Test 11: Access control panel after logout (should fail)
echo "🔒 Test accès après déconnexion..."
PROTECTED_ACCESS=$(curl -s -b "$COOKIE_JAR" "$URL/control-panel")
if echo "$PROTECTED_ACCESS" | grep -q "Admin Access"; then
    echo "✅ Accès protégé après déconnexion (retour au login)"
else
    echo "❌ Accès non protégé après déconnexion"
    ((FAILED++))
fi

# Cleanup
rm -f "$COOKIE_JAR"

echo "=============================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 Tous les tests admin sont passés !"
    echo "🛠️  Fonctionnalité d'administration opérationnelle !"
else
    echo "💥 $FAILED test(s) admin échoué(s)"
fi

echo ""
echo "📋 Résumé des fonctionnalités testées:"
echo "  ✓ Authentification par mot de passe"
echo "  ✓ Gestion de session sécurisée"
echo "  ✓ Interface de contrôle web"
echo "  ✓ API REST pour gestion des règles"
echo "  ✓ Règles de status par hostname"
echo "  ✓ Règles de redirection par hostname"
echo "  ✓ Stockage persistant des règles (JSON)"
echo "  ✓ Protection des routes admin"
echo ""
echo "🔧 Accès admin: https://allheaders.com/control-panel"
echo "🔑 Mot de passe: $ADMIN_PASSWORD"

exit $FAILED