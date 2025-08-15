#!/bin/bash

# Script de test complet pour les nouvelles fonctionnalités AllHeaders
# Usage: ./test-enhanced.sh [url]

set -e

URL=${1:-"https://allheaders.com"}
FAILED=0

echo "🧪 Tests améliorés pour AllHeaders sur $URL"
echo "=============================================="

# Test SEO & métadonnées
echo "📄 Test métadonnées SEO..."
META_DESC=$(curl -s "$URL/" | grep -o 'meta name="description"[^>]*' || echo "")
if [[ $META_DESC == *"HTTP status code generator"* ]]; then
    echo "✅ Meta description OK"
else
    echo "❌ Meta description manquante"
    ((FAILED++))
fi

# Test favicon
echo "🎨 Test favicon..."
FAVICON=$(curl -s "$URL/" | grep -o 'link rel="icon"[^>]*' || echo "")
if [[ $FAVICON == *"data:image/svg+xml"* ]]; then
    echo "✅ Favicon SVG présent"
else
    echo "❌ Favicon manquant"
    ((FAILED++))
fi

# Test des méthodes HTTP
echo "🔧 Test méthodes HTTP..."
METHODS=(GET POST PUT DELETE PATCH HEAD)

for method in "${METHODS[@]}"; do
    if [ "$method" = "HEAD" ]; then
        RESPONSE=$(curl -s -I -X "$method" "$URL/200" | head -1)
    else
        RESPONSE=$(curl -s -X "$method" "$URL/200")
    fi
    
    if [[ $RESPONSE == *"200"* ]] || [[ $RESPONSE =~ "method.*$method" ]]; then
        echo "✅ Méthode $method OK"
    else
        echo "❌ Méthode $method échoué"
        ((FAILED++))
    fi
done

# Test headers personnalisés
echo "🏷️  Test headers personnalisés..."
CUSTOM_RESPONSE=$(curl -s -X POST "$URL/201" -H "X-Custom-Header: TestValue")
if echo "$CUSTOM_RESPONSE" | grep -q '"customHeader": "TestValue"'; then
    echo "✅ Headers personnalisés OK"
else
    echo "❌ Headers personnalisés échoué"
    ((FAILED++))
fi

# Test headers de réponse
echo "📊 Test headers de réponse..."
RESPONSE_HEADERS=$(curl -s -I "$URL/418")
if echo "$RESPONSE_HEADERS" | grep -q "X-Powered-By: AllHeaders.com"; then
    echo "✅ Headers de réponse OK"
else
    echo "❌ Headers de réponse manquants"
    ((FAILED++))
fi

# Test cache headers
echo "💾 Test headers de cache..."
GET_CACHE=$(curl -s -I "$URL/200" | grep "Cache-Control")
POST_CACHE=$(curl -s -I -X POST "$URL/200" | grep "Cache-Control")

if [[ $GET_CACHE == *"public"* ]] && [[ $POST_CACHE == *"no-cache"* ]]; then
    echo "✅ Headers de cache différenciés OK"
else
    echo "❌ Headers de cache mal configurés"
    ((FAILED++))
fi

# Test OPTIONS (CORS preflight)
echo "🌐 Test OPTIONS/CORS..."
OPTIONS_RESPONSE=$(curl -s -I -X OPTIONS "$URL/200")
if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Methods.*POST.*PUT.*DELETE"; then
    echo "✅ Support OPTIONS/CORS OK"
else
    echo "❌ Support OPTIONS/CORS échoué"
    ((FAILED++))
fi

# Test interface utilisateur
echo "🎨 Test interface utilisateur..."
UI_ELEMENTS=$(curl -s "$URL/" | grep -c -E "(method-btn|copy-btn|How to Use)")
if [ $UI_ELEMENTS -ge 8 ]; then
    echo "✅ Interface utilisateur complète"
else
    echo "❌ Éléments d'interface manquants ($UI_ELEMENTS/8+)"
    ((FAILED++))
fi

echo "=============================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 Tous les tests d'amélioration sont passés !"
    echo "🚀 AllHeaders est prêt pour la production !"
    exit 0
else
    echo "💥 $FAILED test(s) d'amélioration échoué(s)"
    exit 1
fi