# AllHeaders - Guide Analytics

## 📊 Fonctionnalité Analytics Avancée

AllHeaders v2.2.0 inclut maintenant un **système d'analytics complet** pour tracker automatiquement tous les accès aux domaines avec règles personnalisées.

---

## 🎯 Fonctionnalités

### 1. **Logging Automatique**
- ✅ **Enregistrement automatique** de chaque accès à une règle de domaine
- ✅ **Données complètes** : timestamp, hostname, path, user-agent, IP, code retourné
- ✅ **Types de règles** : Status codes et redirections
- ✅ **Stockage JSON** persistant avec rotation automatique

### 2. **Interface Analytics Complète**
- 📊 **Dashboard interactif** à `/control-panel/stats`
- 📈 **Statistiques en temps réel** : Total hits, domaines uniques, top domains
- 🤖 **Analyse des User-Agents** : Identification bots/navigateurs
- 📝 **Activité récente** : 50 derniers accès avec détails
- 🔄 **Auto-refresh** : Mise à jour automatique toutes les 30 secondes

### 3. **Gestion des Données**
- 📥 **Export CSV/JSON** : Téléchargement complet des logs
- 🗑️ **Nettoyage** : Suppression des logs avec confirmation
- 🔄 **Rotation automatique** : Archivage à partir de 10 000 entrées
- 💾 **Performance optimisée** : Conservation des 1000 dernières entrées

---

## 🚀 Accès Analytics

### URL d'accès
```
https://allheaders.com/control-panel/stats
```

### Navigation
1. **Depuis le Control Panel** : Bouton `📈 Analytics` en haut à droite
2. **Accès direct** : URL `/control-panel/stats` (authentification requise)
3. **Navigation** : Liens `🏠 Dashboard` et `📈 Analytics` dans la barre de navigation

---

## 📋 Structure des Logs

### Format JSON
```json
{
  "logs": [
    {
      "timestamp": "2025-08-15T10:23:19.986Z",
      "hostname": "preprod.parier-suisse.ch", 
      "path": "/admin/login",
      "userAgent": "curl/8.12.1",
      "ip": "::ffff:127.0.0.1",
      "statusCode": "410",
      "ruleType": "status",
      "target": null
    }
  ]
}
```

### Champs Enregistrés
- **timestamp** : Date/heure ISO 8601 de l'accès
- **hostname** : Nom de domaine ayant déclenché la règle
- **path** : Chemin demandé sur le domaine
- **userAgent** : User-Agent du client (navigateur/bot)
- **ip** : Adresse IP du client
- **statusCode** : Code HTTP retourné (règle appliquée)
- **ruleType** : Type de règle (`status` ou `redirect`)
- **target** : URL de destination (pour redirections uniquement)

---

## 📊 Interface Analytics Détaillée

### 1. **Vue d'ensemble**
```
📊 Overview:
- Total hits: 127
- Unique domains: 3  
- Top domain: preprod.parier-suisse.ch (89 hits)
- Unique agents: 15
```

### 2. **Statistiques par Domaine**
```
🔍 By Domain:
┌─────────────────────────┬─────────┬───────────┬─────────────────┐
│ Domain                  │ Hits    │ Rule Type │ Last Access     │
├─────────────────────────┼─────────┼───────────┼─────────────────┤
│ preprod.parier-suisse.ch│ 89      │ status    │ 2 hours ago     │
│ test-redirect.example..│  38      │ redirect  │ 1 day ago       │
└─────────────────────────┴─────────┴───────────┴─────────────────┘
```

### 3. **Analyse User-Agents**
```
🤖 Top User Agents:
┌─────────────────────────────────────────┬─────────┐
│ User Agent                              │ Hits    │
├─────────────────────────────────────────┼─────────┤
│ GoogleBot/2.1 (+http://www.google.com..│ 45      │
│ Mozilla/5.0 (Windows NT 10.0; Win64..  │ 23      │
│ curl/8.12.1                             │ 12      │
└─────────────────────────────────────────┴─────────┘
```

### 4. **Activité Récente**
Tableau des 20 derniers accès avec :
- **Time** : Temps relatif (ex: "2h ago")
- **Domain** : Hostname concerné
- **Path** : Chemin demandé
- **Code** : Status HTTP retourné
- **Type** : Type de règle appliquée
- **User Agent** : Client (tronqué à 30 caractères)

---

## 🛠️ Fonctionnalités Avancées

### 1. **Export des Données**
```javascript
// Export JSON
GET /control-panel/api/logs/export?format=json
Content-Type: application/json
Content-Disposition: attachment; filename=allheaders-logs-2025-08-15.json

// Export CSV  
GET /control-panel/api/logs/export?format=csv
Content-Type: text/csv
Content-Disposition: attachment; filename=allheaders-logs-2025-08-15.csv
```

**Format CSV :**
```
Timestamp,Hostname,Path,UserAgent,IP,StatusCode,RuleType,Target
"2025-08-15T10:23:19.986Z","preprod.parier-suisse.ch","/admin","curl/8.12.1","::ffff:127.0.0.1","410","status",""
```

### 2. **Nettoyage des Logs**
```javascript
// Supprimer tous les logs
DELETE /control-panel/api/logs/clear
// Réponse: 200 OK "Logs cleared successfully"
```

### 3. **Rotation Automatique**
- **Seuil** : 10 000 entrées maximum
- **Archive** : Création automatique d'un fichier `access-logs-archive-YYYY-MM-DD.json`
- **Conservation** : Garde les 1000 dernières entrées
- **Performance** : Évite la surcharge du fichier principal

---

## 🔧 API Analytics

### Endpoints Disponibles

#### **GET** `/control-panel/api/logs/export`
Export des logs au format JSON ou CSV.

**Paramètres :**
- `format` : `json` ou `csv` (défaut: json)

**Exemple :**
```bash
curl -b cookies.txt "https://allheaders.com/control-panel/api/logs/export?format=csv"
```

#### **DELETE** `/control-panel/api/logs/clear`
Supprime tous les logs (réinitialise le fichier).

**Exemple :**
```bash
curl -b cookies.txt -X DELETE "https://allheaders.com/control-panel/api/logs/clear"
```

---

## 📈 Cas d'Usage

### 1. **Monitoring de Site en Maintenance**
```json
{
  "hostname": "maintenance.site.com",
  "ruleType": "status", 
  "statusCode": "503"
}
```
→ Tracker les tentatives d'accès pendant la maintenance

### 2. **Analyse des Redirections SEO**
```json
{
  "hostname": "old-domain.com",
  "ruleType": "redirect",
  "statusCode": "301",
  "target": "https://new-domain.com"  
}
```
→ Mesurer l'efficacité des redirections de migration

### 3. **Détection de Bots**
- **GoogleBot** : Indexation SEO
- **BingBot** : Moteur de recherche Bing
- **Crawlers** personnalisés : Monitoring/scraping
- **Scripts malveillants** : Tentatives d'intrusion

### 4. **Analyse Géographique** (via IP)
- Identification des régions d'accès
- Détection de trafic inhabituel
- Optimisation CDN

---

## 🚨 Monitoring et Alertes

### Métriques Clés à Surveiller
- **Volume anormal** : Pic soudain de requêtes
- **User-Agents suspects** : Patterns de bots malveillants  
- **IPs répétitives** : Tentatives de force brute
- **Codes d'erreur** : Augmentation des 4xx/5xx

### Automatisation Possible
```bash
# Script de monitoring quotidien
#!/bin/bash
LOGS=$(curl -s -b session.txt https://allheaders.com/control-panel/api/logs/export)
HITS_TODAY=$(echo $LOGS | jq '.logs[] | select(.timestamp | startswith("'$(date +%Y-%m-%d)'")) | length')

if [ $HITS_TODAY -gt 1000 ]; then
    echo "🚨 Alerte: $HITS_TODAY hits aujourd'hui!"
    # Envoyer notification...
fi
```

---

## 🧪 Tests et Validation

### Script de Test Complet
```bash
# Lancer les tests analytics
./test-analytics.sh
```

### Tests Couverts
- ✅ Authentification admin
- ✅ Génération automatique de logs  
- ✅ Interface analytics accessible
- ✅ Structure JSON correcte
- ✅ Export CSV/JSON fonctionnel
- ✅ Navigation depuis control panel
- ✅ Auto-refresh activé
- ✅ Rotation des logs

### Tests Manuels
```bash
# 1. Déclencher une règle de status
curl -H "Host: preprod.parier-suisse.ch" https://allheaders.com/test

# 2. Déclencher une règle de redirect  
curl -H "Host: old-site.com" https://allheaders.com/redirect

# 3. Vérifier les logs
cat /var/www/access-logs.json | jq '.logs[-2:]'

# 4. Tester l'export
curl -b cookies.txt "https://allheaders.com/control-panel/api/logs/export?format=csv"
```

---

## 🔒 Sécurité Analytics

### Protection des Données
- **Accès authentifié** : Seuls les admins peuvent voir les analytics
- **Pas de données sensibles** : Pas de stockage de cookies/tokens
- **IP anonymisation** possible : Masquage des derniers octets
- **Rotation automatique** : Limitation du stockage historique

### Recommandations
1. **Surveillez les logs régulièrement** pour détecter les anomalies
2. **Exportez périodiquement** pour backup externe
3. **Nettoyez les logs anciens** pour optimiser les performances
4. **Surveillez la croissance** du fichier access-logs.json

---

## ⚡ Performances

### Optimisations Implémentées
- **Écriture asynchrone** : Logging non-bloquant
- **Rotation intelligente** : Archivage automatique
- **Taille limitée** : Maximum 1000 entrées actives
- **Index en mémoire** : Calculs statistiques optimisés

### Métriques Typiques
- **Impact CPU** : < 1% per log entry
- **Impact Mémoire** : ~100KB pour 1000 logs
- **Latence ajoutée** : < 1ms per request
- **Stockage** : ~150 bytes per log entry

---

## 🆕 Changelog v2.2.0

### Nouvelles Fonctionnalités
- ✨ **Système analytics complet** avec dashboard interactif
- 📊 **Logging automatique** de tous les accès aux règles de domaine
- 📈 **Interface analytics** accessible à `/control-panel/stats`
- 📥 **Export CSV/JSON** des données de logs
- 🔄 **Rotation automatique** des logs (archivage à 10K entrées)
- 🤖 **Analyse des User-Agents** avec top 10 des clients
- 📝 **Activité récente** : 50 derniers accès en temps réel
- 🔄 **Auto-refresh** : Mise à jour automatique toutes les 30s

### Améliorations
- 🔗 **Navigation améliorée** : Liens Analytics dans le control panel
- ⚡ **Performances optimisées** : Logging asynchrone et rotation intelligente
- 🛡️ **Sécurité renforcée** : Accès authentifié aux analytics
- 📋 **Documentation complète** : Guide analytics détaillé

---

## 📞 Support Analytics

### Fichiers de Logs
```bash
# Logs applicatifs
pm2 logs allheaders

# Logs analytics (données JSON)
cat /var/www/access-logs.json | jq

# Archives de logs (si rotation)
ls -la /var/www/access-logs-archive-*.json
```

### Dépannage Courant

**❌ "Analytics non accessible"**
- Vérifiez l'authentification admin
- Contrôlez que le serveur est démarré

**❌ "Pas de logs générés"**
- Vérifiez qu'il y a des règles de domaine actives
- Testez en déclenchant manuellement une règle
- Contrôlez les permissions du fichier access-logs.json

**❌ "Export échoue"**
- Vérifiez la session admin active
- Contrôlez l'espace disque disponible

---

## 🎉 Conclusion

La fonctionnalité **Analytics AllHeaders v2.2.0** est maintenant **opérationnelle** !

**🔧 Accès :** https://allheaders.com/control-panel/stats  
**🔑 Mot de passe :** `Configure via ADMIN_PASSWORD env variable`

Profitez d'une visibilité complète sur l'usage de vos règles de domaine avec des analytics en temps réel, des exports de données et une interface moderne.

---

*Guide Analytics AllHeaders v2.2.0 - Créé par [Yann Decoopman](https://www.linkedin.com/in/yanndecoopman/)*