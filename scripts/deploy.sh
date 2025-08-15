#!/bin/bash

# Script de déploiement complet pour AllHeaders
# Usage: sudo ./deploy.sh

set -e

DOMAIN="allheaders.com"
PROJECT_DIR="/var/www"
NGINX_CONFIG="/etc/nginx/sites-available/allheaders"
NGINX_ENABLED="/etc/nginx/sites-enabled/allheaders"

echo "🚀 Déploiement d'AllHeaders pour $DOMAIN..."

# Vérifier les permissions root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Ce script doit être exécuté en tant que root (sudo)"
   exit 1
fi

echo "📦 Mise à jour du système..."
apt update && apt upgrade -y

echo "📦 Installation des dépendances système..."
apt install -y nginx nodejs npm certbot python3-certbot-nginx

# Installer PM2 globalement
npm install -g pm2

echo "🔧 Configuration de Nginx..."
# Copier la configuration Nginx
cp $PROJECT_DIR/config/nginx.conf $NGINX_CONFIG

# Créer le lien symbolique pour activer le site
ln -sf $NGINX_CONFIG $NGINX_ENABLED

# Supprimer la configuration par défaut si elle existe
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration Nginx
nginx -t

echo "🔄 Redémarrage de Nginx..."
systemctl restart nginx
systemctl enable nginx

echo "🔒 Configuration du certificat SSL..."
echo "⚠️  Assurez-vous que le domaine $DOMAIN pointe vers cette machine !"
echo "📝 Pour configurer SSL automatiquement, exécutez :"
echo "    certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "🔧 Installation des dépendances Node.js..."
cd $PROJECT_DIR
npm install

echo "🏭 Démarrage de l'application avec PM2..."
pm2 delete allheaders 2>/dev/null || true
pm2 start config/ecosystem.config.js
pm2 save
pm2 startup

echo "🔥 Configuration du firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

echo "✅ Déploiement terminé !"
echo ""
echo "🌐 Votre site est accessible à :"
echo "   - http://$DOMAIN (redirige vers HTTPS)"
echo "   - https://$DOMAIN (après configuration SSL)"
echo ""
echo "📊 Commandes utiles :"
echo "   - pm2 status         : Status de l'application"
echo "   - pm2 logs allheaders : Logs de l'application"
echo "   - pm2 restart allheaders : Redémarrer l'application"
echo "   - nginx -t           : Tester la config Nginx"
echo "   - systemctl status nginx : Status de Nginx"
echo ""
echo "🔒 Pour configurer SSL :"
echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN"