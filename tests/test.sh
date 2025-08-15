#!/bin/bash

# Script de test pour AllHeaders
# Usage: ./test.sh [url]

set -e

URL=${1:-"http://localhost:3000"}
FAILED=0

echo "🧪 Tests pour AllHeaders sur $URL"
echo "=================================="

# Test de base - page d'accueil
echo "📄 Test page d'accueil..."
if curl -s -o /dev/null -w "%{http_code}" "$URL/" | grep -q "200"; then
    echo "✅ Page d'accueil OK"
else
    echo "❌ Page d'accueil échoué"
    ((FAILED++))
fi

# Test endpoint santé
echo "💚 Test endpoint santé..."
HEALTH=$(curl -s "$URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ Endpoint santé OK"
else
    echo "❌ Endpoint santé échoué"
    ((FAILED++))
fi

# Tests des codes HTTP
CODES=(200 201 204 301 302 304 400 401 403 404 405 410 418 429 500 502 503 504)

echo "🔢 Test des codes HTTP..."
for code in "${CODES[@]}"; do
    RESPONSE=$(curl -s -w "%{http_code}" "$URL/$code")
    HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)
    
    if [ "$HTTP_CODE" = "$code" ]; then
        echo "✅ Code $code OK"
    else
        echo "❌ Code $code échoué (reçu: $HTTP_CODE)"
        ((FAILED++))
    fi
done

# Test code invalide
echo "🚫 Test code invalide..."
INVALID_CODE=$(curl -s -w "%{http_code}" "$URL/999")
if echo "$INVALID_CODE" | tail -c 4 | grep -q "404"; then
    echo "✅ Code invalide correctement rejeté"
else
    echo "❌ Code invalide mal géré"
    ((FAILED++))
fi

# Test chemin invalide
echo "🚫 Test chemin invalide..."
INVALID_PATH=$(curl -s -w "%{http_code}" "$URL/invalid/path")
if echo "$INVALID_PATH" | tail -c 4 | grep -q "404"; then
    echo "✅ Chemin invalide correctement rejeté"
else
    echo "❌ Chemin invalide mal géré"
    ((FAILED++))
fi

echo "=================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 Tous les tests sont passés !"
    exit 0
else
    echo "💥 $FAILED test(s) échoué(s)"
    exit 1
fi