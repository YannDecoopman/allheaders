# Configuration SSL - AllHeaders

✅ **HTTPS configuré avec succès !**

## 🔒 Certificats SSL

- **Émetteur** : Let's Encrypt
- **Domaines** : allheaders.com + www.allheaders.com
- **Expiration** : 2025-11-13 (90 jours)
- **Certificat** : `/etc/letsencrypt/live/allheaders.com/fullchain.pem`
- **Clé privée** : `/etc/letsencrypt/live/allheaders.com/privkey.pem`

## 🔄 Renouvellement automatique

- **Service** : `certbot.timer`
- **Statut** : ✅ Actif (vérifie 2x par jour)
- **Prochaine vérification** : Chaque jour à 15:46 UTC

### Commandes utiles :
```bash
# Vérifier le statut du renouvellement
sudo systemctl status certbot.timer

# Test de renouvellement (simulation)
sudo certbot renew --dry-run

# Renouvellement manuel si nécessaire
sudo certbot renew

# Voir les certificats installés
sudo certbot certificates
```

## 🌐 Configuration Nginx

### Redirections automatiques :
- ✅ `http://allheaders.com` → `https://allheaders.com`
- ✅ `http://www.allheaders.com` → `https://www.allheaders.com`
- ✅ HTTPS fonctionne sur les deux domaines

### Accès disponibles :
- 🌐 **Interface** : https://allheaders.com
- 📊 **API** : https://allheaders.com/[code]
- 💚 **Santé** : https://allheaders.com/health

## 🛡️ Sécurité

### Headers de sécurité configurés :
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### Protocoles SSL :
- TLS 1.2 et TLS 1.3
- Chiffrements sécurisés via Let's Encrypt
- Configuration automatique par Certbot

## ✅ Tests réussis

```bash
# HTTPS direct
curl https://allheaders.com/404  ✅

# Avec www
curl https://www.allheaders.com/418  ✅

# Redirection HTTP → HTTPS
curl -L http://allheaders.com/200  ✅

# Interface web
curl https://allheaders.com/  ✅
```

**AllHeaders est maintenant 100% sécurisé avec HTTPS !** 🔒