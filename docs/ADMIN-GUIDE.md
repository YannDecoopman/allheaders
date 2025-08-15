# AllHeaders - Guide d'Administration

## 🎯 Fonctionnalité Admin Avancée

AllHeaders v2.1.0 inclut maintenant un **panneau d'administration complet** permettant de gérer des règles de hostname personnalisées avec authentification sécurisée.

---

## 🔐 Accès Administration

### URL d'accès
```
https://allheaders.com/control-panel
```

### Authentification
- **Mot de passe** : `[Configure via ADMIN_PASSWORD env variable]`
- **Session** : Valide 24h
- **Sécurité** : Cookies HttpOnly, protection CSRF

---

## 🛠️ Fonctionnalités Disponibles

### 1. **Gestion des Règles de Hostname**
Configure des comportements spécifiques pour chaque nom de domaine pointant vers votre serveur AllHeaders.

#### Types de règles supportées :

**📊 Règles de Status Code**
```json
{
  "preprod.parier-suisse.ch": {
    "type": "status", 
    "code": "410"
  }
}
```
- Retourne directement le code HTTP spécifié
- Utile pour simuler des sites hors service, en maintenance, etc.

**🔄 Règles de Redirection**
```json
{
  "old-site.com": {
    "type": "redirect",
    "code": "301", 
    "target": "https://new-site.com"
  }
}
```
- Redirige vers l'URL cible avec le code HTTP choisi
- Support des codes 301, 302 pour redirections permanentes/temporaires

### 2. **Interface Web Intuitive**
- ✅ Ajout de règles via formulaire interactif
- ✅ Visualisation des règles existantes dans un tableau
- ✅ Suppression en un clic avec confirmation
- ✅ Feedback en temps réel des opérations

### 3. **API REST Complète**
Gestion programmatique des règles via API sécurisée.

---

## 📋 Guide d'Utilisation

### Étape 1 : Connexion
1. Accédez à `https://allheaders.com/control-panel`
2. Saisissez le mot de passe configuré (variable ADMIN_PASSWORD)
3. Cliquez sur **Login**

### Étape 2 : Ajouter une Règle
1. Dans la section **"Add New Rule"**
2. **Hostname** : Saisissez le nom de domaine (ex: `preprod.parier-suisse.ch`)
3. **Type** : Choisissez `Status Code` ou `Redirect`
4. **HTTP Code** : Sélectionnez le code souhaité (200, 301, 404, 410, 500, 503...)
5. **Target URL** : Si redirection, saisissez l'URL de destination
6. Cliquez **Add Rule**

### Étape 3 : Gestion des Règles
- **Visualiser** : Toutes les règles apparaissent dans le tableau
- **Modifier** : Supprimez et recréez la règle (édition en place dans future version)
- **Supprimer** : Cliquez **Delete** puis confirmez

### Étape 4 : Test des Règles
Les règles s'appliquent immédiatement. Testez avec :
```bash
# Test règle de status
curl -H "Host: preprod.parier-suisse.ch" https://allheaders.com/

# Test règle de redirect
curl -H "Host: old-site.com" https://allheaders.com/
```

---

## 🔧 API REST Documentation

### Authentification API
Toutes les routes API nécessitent une session valide (cookie admin-session).

### Endpoints Disponibles

#### **POST** `/control-panel/api/rules`
Ajouter une nouvelle règle.

**Body JSON :**
```json
{
  "hostname": "example.com",
  "type": "status",
  "code": "410"
}
```

**Réponse succès :** `200 OK`

#### **DELETE** `/control-panel/api/rules/{hostname}`
Supprimer une règle existante.

**Exemple :**
```bash
DELETE /control-panel/api/rules/example.com
```

**Réponse succès :** `200 OK`

---

## 📄 Structure des Données

### Fichier de Stockage : `domain-rules.json`
```json
{
  "preprod.parier-suisse.ch": {
    "type": "status", 
    "code": "410"
  },
  "old-site.com": {
    "type": "redirect",
    "code": "301", 
    "target": "https://new-site.com"
  },
  "maintenance.example.com": {
    "type": "status",
    "code": "503"
  }
}
```

### Champs Requis
- **hostname** : Nom de domaine exact (sans port)
- **type** : `"status"` ou `"redirect"`
- **code** : Code HTTP (string)
- **target** : URL de destination (requis si type="redirect")

---

## 🚀 Cas d'Usage Avancés

### 1. **Gestion d'Environnements**
```json
{
  "preprod.parier-suisse.ch": {"type": "status", "code": "410"},
  "test.parier-suisse.ch": {"type": "status", "code": "503"},
  "dev.parier-suisse.ch": {"type": "status", "code": "200"}
}
```

### 2. **Migration de Domaines**
```json
{
  "old-domain.com": {
    "type": "redirect", 
    "code": "301", 
    "target": "https://new-domain.com"
  },
  "www.old-domain.com": {
    "type": "redirect", 
    "code": "301", 
    "target": "https://www.new-domain.com"
  }
}
```

### 3. **Pages de Maintenance**
```json
{
  "maintenance.site.com": {"type": "status", "code": "503"},
  "downtime.site.com": {"type": "status", "code": "503"}
}
```

---

## 🔒 Sécurité

### Mesures Implémentées
- **Authentification** : Mot de passe requis
- **Session sécurisée** : Cookies HttpOnly avec expiration
- **Routes protégées** : API accessible uniquement avec session valide
- **Validation** : Contrôle des données d'entrée
- **Logs** : Traçabilité des accès admin

### Bonnes Pratiques
1. **Changez le mot de passe** dans le code si nécessaire
2. **Surveillez les logs** pour détecter les accès non autorisés
3. **Sauvegardez** le fichier `domain-rules.json` régulièrement
4. **Limitez l'accès** au panneau admin (IP whitelisting possible)

---

## 🧪 Tests et Validation

### Script de Test Intégré
```bash
# Lancer les tests complets de la fonctionnalité admin
./test-admin.sh
```

### Tests Manuels
```bash
# 1. Test authentification
curl -d "password=$ADMIN_PASSWORD" -X POST https://allheaders.com/control-panel/login

# 2. Test ajout règle
curl -b cookies.txt -X POST https://allheaders.com/control-panel/api/rules \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test.com","type":"status","code":"410"}'

# 3. Test application règle
curl -H "Host: test.com" https://allheaders.com/
```

---

## 🐛 Dépannage

### Problèmes Courants

**❌ "Unauthorized" sur l'API**
- Vérifiez que vous êtes connecté au panneau admin
- Contrôlez la validité de votre session (< 24h)

**❌ Règles non appliquées**
- Vérifiez l'exactitude du hostname (sans port, sans protocole)
- Contrôlez le contenu du fichier `domain-rules.json`
- Redémarrez le serveur : `pm2 restart allheaders`

**❌ Page admin inaccessible**
- Vérifiez que le serveur est démarré : `pm2 status`
- Contrôlez les logs : `pm2 logs allheaders`

### Logs Utiles
```bash
# Logs du serveur
pm2 logs allheaders

# Vérifier les règles chargées
cat /var/www/domain-rules.json

# Test des headers HTTP
curl -I -H "Host: votre-hostname.com" https://allheaders.com/
```

---

## 📊 Monitoring

### Métriques Disponibles
- **Règles actives** : Visibles dans le panneau admin
- **Sessions admin** : Compteur interne (24h d'expiration)
- **Logs d'accès** : Via PM2 et logs Nginx

### Health Check
```bash
# Vérifier le status du serveur
curl https://allheaders.com/health

# Vérifier l'accessibilité admin
curl https://allheaders.com/control-panel
```

---

## 🔄 Mise à Jour

### Version Actuelle : **2.1.0**
- ✅ Interface d'administration complète
- ✅ Gestion de règles hostname
- ✅ API REST sécurisée
- ✅ Stockage persistant JSON

### Roadmap Future
- 🔄 Édition in-place des règles
- 📊 Dashboard avec statistiques d'usage
- 🔐 Authentification multi-utilisateurs
- 📧 Notifications par email des changements

---

## 📞 Support

Pour des questions ou problèmes avec l'administration :

1. **Vérifiez** les logs : `pm2 logs allheaders`
2. **Testez** avec le script : `./test-admin.sh`
3. **Consultez** ce guide pour la documentation complète

**Fonctionnalité d'administration AllHeaders opérationnelle !** 🎉

---

*Guide d'Administration AllHeaders v2.1.0 - Créé par [Yann Decoopman](https://www.linkedin.com/in/yanndecoopman/)*