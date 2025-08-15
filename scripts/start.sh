#!/bin/bash

# Script de démarrage pour AllHeaders
# Usage: ./start.sh [production|development]

set -e

MODE=${1:-production}
PROJECT_DIR="/var/www"
LOG_DIR="/var/log/allheaders"

echo "🚀 Démarrage d'AllHeaders en mode $MODE..."

# Créer le répertoire de logs s'il n'existe pas
sudo mkdir -p $LOG_DIR
sudo chown $USER:$USER $LOG_DIR

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

case $MODE in
    "production")
        echo "🏭 Démarrage en mode production avec PM2..."
        
        # Installer PM2 globalement si pas déjà fait
        if ! command -v pm2 &> /dev/null; then
            echo "📦 Installation de PM2..."
            sudo npm install -g pm2
        fi
        
        # Arrêter les instances existantes
        pm2 delete allheaders 2>/dev/null || true
        
        # Démarrer avec PM2
        pm2 start ecosystem.config.js
        pm2 save
        
        # Configurer PM2 pour démarrer au boot
        sudo pm2 startup
        
        echo "✅ Application démarrée avec PM2"
        echo "📊 Status: pm2 status"
        echo "📜 Logs: pm2 logs allheaders"
        ;;
        
    "development")
        echo "🔧 Démarrage en mode développement..."
        NODE_ENV=development PORT=3000 node server.js
        ;;
        
    *)
        echo "❌ Mode non reconnu: $MODE"
        echo "Usage: $0 [production|development]"
        exit 1
        ;;
esac