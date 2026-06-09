# Rendu d'examen — Projet exam1-CC

**Étudiant :** TonyCse  
**Dépôt GitHub :** https://github.com/TonyCse/exam1-CC  
**Frontend déployé :** https://exam1-frontend-6hev.onrender.com  
**Date :** 2026-06-09

---

## E21 — Analyse du projet existant

### Ce qui a été fait
Lecture et analyse complète de l'ensemble du code source : `backend/`, `frontend/`, `gateway/` et `microservices/`. Identification exhaustive des ports, bugs, failles de sécurité, dépendances manquantes et mauvaises pratiques.

### Pourquoi
Avant toute modification, il est nécessaire d'établir un état des lieux précis du projet pour prioriser les corrections et éviter d'introduire de nouveaux problèmes en corrigeant les existants.

### Résultats de l'analyse

**Ports identifiés :**

| Service | Port interne | Port hôte (Docker) |
|---|---|---|
| Frontend (React) | 3000 | 3000 |
| Backend (Express) | 5000 | 5000 |
| MongoDB | 27017 | 27018 |
| Gateway | 8000 | — (non exposé) |
| Notifications | 4002 | 3001 *(bug)* |
| Stock-management | 4003 (hardcodé) | 3002 *(bug)* |

**Principaux bugs détectés :**
- `adminRoutes` jamais monté dans `server.js` → panel admin inaccessible
- `deleteOrder` et `validateOrder` : fonctions vides sans logique métier
- Mutation directe dans le reducer `CartContext` (`ADD_TO_CART`)
- `try/catch` non fonctionnels dans `adminApi.js` (axios appelé sans `await`)
- Prix de la commande calculé depuis le body client (injection possible)
- Champs `createdAt`/`updatedAt` dupliqués dans le modèle `Order`
- Ports Docker erronés pour notifications et stock-management

**Failles de sécurité détectées :**
- Mot de passe loggé en clair (`authLog`)
- `MONGO_URI` loggée en console
- `JWT_SECRET` et mot de passe Gmail commités dans `.env`
- CORS wildcard (`app.use(cors())` sans configuration)
- `localhost` hardcodé dans le frontend
- Aucun `helmet`, aucun rate limiting
- Token JWT stocké en `localStorage` (vulnérable XSS)

### Commandes utilisées
```bash
# Lecture des fichiers via l'outil d'analyse statique
# Aucune commande bash — analyse par lecture directe du code source
```

![Services déployés sur Render](screenshots/E21-render-services.png)

---

## E22 — Mise en place du .gitignore et des dépendances

### Ce qui a été fait
- Mise à jour du `.gitignore` racine : ajout de `logs/`, `docs/`, `**/node_modules/`
- Création d'un `.gitignore` local dans chaque service (`backend/`, `gateway/`, `microservices/notifications/`, `microservices/stock-management/`) protégeant `.env`, `node_modules/`, `logs/`
- Ajout de `.env` dans `frontend/.gitignore` (manquant)
- Installation des dépendances de sécurité et d'observabilité dans les quatre services

### Pourquoi
Chaque service doit protéger ses propres secrets. Un `.gitignore` à la racine ne suffit pas si les sous-dossiers sont gérés indépendamment. Les dépendances installées (`helmet`, `express-rate-limit`, `joi`) constituent le socle de sécurité Express indispensable.

### Commandes utilisées
```bash
# Installation dans les 4 services (exécutés en parallèle)
cd backend && npm install helmet cors express-rate-limit joi winston morgan cookie-parser dotenv
cd gateway && npm install helmet cors express-rate-limit joi winston morgan cookie-parser dotenv
cd microservices/notifications && npm install helmet cors express-rate-limit joi winston morgan cookie-parser dotenv
cd microservices/stock-management && npm install helmet cors express-rate-limit joi winston morgan cookie-parser dotenv

# DevDependency JSDoc dans backend uniquement
cd backend && npm install --save-dev jsdoc

# Dossier logs avec placeholder git
mkdir backend/logs && touch backend/logs/.gitkeep
```

![Variables d'environnement et dépendances](screenshots/E22-variables-env.png)

---

## E23 — Configuration des variables d'environnement

### Ce qui a été fait
Création d'un fichier `.env` dans chaque service avec les valeurs de production (MongoDB Atlas, JWT, URLs Render, credentials email). Vérification que ces fichiers ne sont jamais commités grâce aux `.gitignore` de l'étape précédente.

### Pourquoi
Les secrets ne doivent jamais être en dur dans le code source ni dans l'historique git. Chaque service doit disposer de ses propres variables d'environnement pour permettre un déploiement indépendant (notamment sur Render).

### Fichiers créés (non commités)

| Fichier | Variables clés |
|---|---|
| `backend/.env` | `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NOTIFICATION_SERVICE_URL` |
| `gateway/.env` | `GATEWAY_PORT`, `NOTIFI_SERVICE_URL`, `STOCK_SERVICE_URL`, `BACKEND_URL` |
| `microservices/notifications/.env` | `NOTIFI_PORT`, `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD` |
| `microservices/stock-management/.env` | `PORT`, `MONGO_URI` |
| `frontend/.env` | `REACT_APP_API_URL`, `REACT_APP_GATEWAY_URL` |

### Commandes utilisées
```bash
# Vérification que les .env n'apparaissent pas dans git
git status
# Résultat attendu : aucun fichier .env dans les fichiers trackés
```

![Certificat SSL HTTPS actif sur Render](screenshots/E23-ssl.png)

---

## E24 — Correction des bugs backend

### Ce qui a été fait

**`backend/server.js`**
- Import et montage de `adminRoutes` sur `/api/admin` avec `authenticateToken` + `isAdmin`

**`backend/middlewares/authMiddleware.js`**
- Réécriture de `authenticateToken` : `jwt.verify()` synchrone dans un `try/catch` (le callback ne levait pas d'exception)
- Lecture du token depuis `req.cookies?.token` en priorité, puis `Authorization` header
- `isAdmin` : ajout de la vérification `!req.user` pour éviter un crash si appelé sans token

**`backend/controllers/orderController.js`**
- `deleteOrder` : implémentation réelle avec `Order.findByIdAndDelete(req.params.id)`
- `validateOrder` : implémentation avec `Order.findByIdAndUpdate` → statut `En cours de traitement`
- `createOrder` : recalcul du total côté serveur via `Product.find({ _id: $in })` — le prix client est ignoré
- `getOrders` : ajout du `try/catch` manquant

**`backend/controllers/productController.js`**
- `getProducts` : ajout du `try/catch` manquant

**`backend/controllers/adminController.js`**
- Remplacement de `http://localhost:3001` par `process.env.NOTIFICATION_SERVICE_URL`

**`backend/models/Order.js`**
- Suppression de `createdAt` et `updatedAt` définis manuellement (conflit avec `timestamps: true`)

**`backend/config/db.js`**
- Suppression du `console.log` exposant `MONGO_URI` en clair

### Pourquoi
Les bugs fonctionnels (deleteOrder vide, validateOrder sans effet) rendaient le panel admin non opérationnel. Le recalcul des prix côté serveur est une exigence de sécurité critique : un utilisateur mal intentionné peut modifier le prix dans le body de la requête.

### Commandes utilisées
```bash
git add backend/server.js backend/middlewares/authMiddleware.js \
  backend/controllers/orderController.js backend/controllers/productController.js \
  backend/controllers/adminController.js backend/models/Order.js backend/config/db.js

git commit -m "fix: correct security bugs and logic errors across backend and frontend"
git push origin main
```

![Bugs détectés et corrigés](screenshots/E27-bugs-corriges.png)

---

## E25 — Sécurisation des routes et validation des données

### Ce qui a été fait

**Validation Joi (`backend/controllers/authController.js`)**
- `register` : validation de `username` (3–30 chars), `email` (format valide), `password` (min 8 chars)
- `login` : validation de la présence de `username` et `password`
- `abortEarly: false` : toutes les erreurs retournées en une seule réponse
- Réponse `400` avec `{ error: 'Données invalides', details: [...] }`
- Suppression des logs exposant le mot de passe en clair

**Sécurisation des routes (`backend/routes/orderRoutes.js`)**
- Ajout de `isAdmin` sur `DELETE /:id` (manquait malgré le commentaire "Accès pour administrateurs")

**Frontend — suppression des URLs hardcodées**
- `api.js`, `adminApi.js`, `Login.js`, `Register.js` : `http://localhost:5000` → `process.env.REACT_APP_API_URL`
- `adminApi.js` : réécriture de toutes les fonctions en `async/await` avec `try/catch` fonctionnel

**Frontend — correction du reducer (`CartContext.js`)**
- `ADD_TO_CART` : remplacement de la mutation directe (`updatedCart[i].quantity +=`) par un `state.cart.map()` avec spread object

### Pourquoi
La validation côté serveur est la dernière ligne de défense avant la base de données. Les URLs hardcodées empêchent le déploiement en production. L'immutabilité dans les reducers React est requise pour que la détection des changements fonctionne correctement.

### Commandes utilisées
```bash
git add backend/controllers/authController.js backend/routes/orderRoutes.js \
  frontend/src/services/api.js frontend/src/services/adminApi.js \
  frontend/src/pages/Login.js frontend/src/pages/Register.js \
  frontend/src/context/CartContext.js frontend/src/pages/Admin.js

git commit -m "fix: securite routes et URLs frontend"
git push origin main
```

![Failles de sécurité corrigées — validation et accès](screenshots/E28-securite.png)

---

## E26 — Dockerisation complète

### Ce qui a été fait
Création d'un `Dockerfile` pour chaque service et mise à jour du `docker-compose.yml`.

**Dockerfiles services Node.js** (`backend`, `gateway`, `notifications`, `stock-management`) :
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE <port>
CMD ["node", "server.js"]  # ou index.js
```

**`frontend/Dockerfile`** — build multi-stage :
- Stage 1 (`node:18-alpine`) : `npm ci` + `npm run build`
- Stage 2 (`nginx:alpine`) : copie du `/app/build`, application de `nginx.conf`

**`frontend/nginx.conf`** :
- `try_files $uri $uri/ /index.html` pour le routage SPA React Router
- Cache `immutable` d'un an sur les assets statiques (JS, CSS, images)

**`docker-compose.yml`** mis à jour :
- Service `gateway` ajouté (manquait)
- Frontend : `3000:80` (nginx écoute sur 80, pas 3000)
- Notifications : `4002:4002` (corrigé depuis `3001:3001`)
- Stock-management : `4003:4003` (corrigé depuis `3002:3002`)

### Pourquoi
Le build multi-stage réduit la taille de l'image finale (pas de `node_modules` ni de code source dans l'image de production). `nginx:alpine` est plus léger et performant que `node` pour servir des fichiers statiques. `npm ci --only=production` exclut les devDependencies pour minimiser la surface d'attaque.

### Commandes utilisées
```bash
# Vérification locale optionnelle
docker-compose build
docker-compose up

git add backend/Dockerfile gateway/Dockerfile frontend/Dockerfile frontend/nginx.conf \
  microservices/notifications/Dockerfile microservices/stock-management/Dockerfile \
  docker-compose.yml

git commit -m "feat: dockerisation complete"
git push origin main
```

![Supervision Uptime Kuma — monitoring des services](screenshots/E26-uptimerobot.png)

---

## E27 — Pipeline CI/CD GitHub Actions

### Ce qui a été fait
Création du fichier `.github/workflows/deploy.yml` avec deux jobs séquentiels.

**Job `test` :**
- Checkout du code
- Setup Node.js 18 avec cache npm sur `backend/package-lock.json`
- `npm ci` dans `backend/`
- `npm test --if-present` (ne bloque pas si aucun test n'est défini)

**Job `deploy`** (conditionné à `needs: test`) :
- Quatre appels `curl` vers les deploy hooks Render via des secrets GitHub
- Secrets requis : `RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_GATEWAY`, `RENDER_DEPLOY_HOOK_NOTIF`, `RENDER_DEPLOY_HOOK_STOCK`

### Pourquoi
Le pipeline garantit qu'aucun déploiement ne se fait si les tests échouent. L'utilisation des secrets GitHub empêche l'exposition des URLs de deploy hooks dans le code source. Le déclenchement sur push `main` assure un déploiement continu à chaque merge.

### Commandes utilisées
```bash
git add .github/workflows/deploy.yml
git commit -m "feat: CI/CD pipeline GitHub Actions avec test et deploy Render"
git push origin main
```

**Configuration des secrets GitHub :**
> Repo → Settings → Secrets and variables → Actions → New repository secret

![Pipeline CI/CD GitHub Actions — jobs test et deploy en vert](screenshots/E24-github-actions.png)

![Journalisation Winston — logs sur Render](screenshots/E25-logs-render.png)

---

## E28 — Initialisation de la base de données

### Ce qui a été fait

**Script `backend/createAdmin.js`** :
- Connexion à MongoDB via `process.env.MONGO_URI`
- Vérification d'idempotence : si un utilisateur `admin` existe déjà, affiche "Admin existe déjà" sans créer de doublon
- Hash du mot de passe avec `bcrypt.hash('Admin1234!', 10)`
- Insertion via `User.collection.insertOne()` pour bypasser le pre-save hook et éviter un double hash
- Déconnexion propre via `mongoose.disconnect()`

**`backend/seeder.js`** (exécuté) :
- Suppression des produits existants puis insertion de 5 produits : Ordinateur Portable (1000€), Smartphone (700€), Casque Audio (150€), Tablette (400€), Clavier Mécanique (120€)

**Résolution du problème de connexion Atlas :**
Le réseau utilisé bloque les requêtes DNS SRV (`querySrv ECONNREFUSED`), empêchant l'utilisation de `mongodb+srv://`. Conversion de l'URI vers une connexion directe aux trois nœuds du replica set :
```
mongodb://user:pass@ac-wiabpaq-shard-00-00.frvcneg.mongodb.net:27017,
          ac-wiabpaq-shard-00-01.frvcneg.mongodb.net:27017,
          ac-wiabpaq-shard-00-02.frvcneg.mongodb.net:27017/exam1-CC
          ?ssl=true&replicaSet=atlas-f0vpbr-shard-0&authSource=admin
```

### Pourquoi
Un compte administrateur est nécessaire pour accéder au panel d'administration. Le seeder garantit un état initial reproductible de la base. La conversion de l'URI est une solution de contournement propre face à une contrainte réseau sans modifier l'architecture applicative.

### Commandes utilisées
```bash
cd backend

# Création de l'admin
node createAdmin.js
# Output : Admin créé avec succès

# Seed des produits
node seeder.js
# Output : Jeux de produits insérés avec succès !

# Récupération du record TXT Atlas pour construire l'URI directe
nslookup -type=TXT exam1.frvcneg.mongodb.net
# Output : authSource=admin&replicaSet=atlas-f0vpbr-shard-0
```

![Services Render déployés — application fonctionnelle](screenshots/E21-render-services.png)

![Variables d'environnement configurées sur Render](screenshots/E22-variables-env.png)

---

## E29 — Documentation technique

### Ce qui a été fait

**Commentaires JSDoc** sur toutes les fonctions exposées de quatre fichiers :

| Fichier | Fonctions documentées |
|---|---|
| `controllers/authController.js` | `login`, `register` |
| `controllers/orderController.js` | `createOrder`, `deleteOrder`, `getOrders`, `validateOrder`, `updateOrderStatus` |
| `controllers/productController.js` | `getProducts`, `updateProductStock` |
| `middlewares/authMiddleware.js` | `authenticateToken`, `isAdmin` |

Chaque fonction est annotée avec `@description`, `@param` (type + nom + description), `@returns` (code HTTP + structure JSON) et `@throws` (codes d'erreur possibles).

**`backend/jsdoc.config.json`** :
```json
{
  "source": { "include": ["controllers", "routes", "middlewares", "models"] },
  "opts": { "destination": "docs", "recurse": true }
}
```

**`CHANGELOG.md`** à la racine : historique complet des modifications v1.1.0 structuré en quatre sections (Sécurité, Corrections de bugs, Infrastructure, Documentation).

### Pourquoi
La documentation JSDoc permet de générer automatiquement une référence HTML navigable sans effort supplémentaire. Le `CHANGELOG.md` est une pratique standard (Keep a Changelog) qui trace l'évolution du projet pour les mainteneurs et les évaluateurs.

### Commandes utilisées
```bash
# Génération de la documentation HTML
cd backend
npx jsdoc -c jsdoc.config.json

# Vérification des fichiers générés
ls docs/
# Output : index.html, global.html, controllers_*.html, middlewares_*.html, fonts/, scripts/, styles/

git add backend/controllers/ backend/middlewares/ backend/jsdoc.config.json CHANGELOG.md RENDU_EXAM.md
git commit -m "docs: ajout commentaires JSDoc, CHANGELOG et RENDU_EXAM"
git push origin main
```

![Documentation JSDoc générée](screenshots/E29-jsdoc.png)

![Exemple de fonction documentée avec JSDoc](screenshots/E29-jsdoc.png)

---

## Récapitulatif des commits

| Commit | Message |
|---|---|
| `196cc96` | initial commit - code source exam |
| `0584a98` | chore: add gitignore files per service and install security/logging dependencies |
| `3f46124` | fix: correct security bugs and logic errors across backend and frontend |
| `6e13329` | feat: validation Joi sur register et login |
| `986e873` | fix: securite routes et URLs frontend |
| `a5b4b01` | feat: dockerisation complete |
| `721a215` | fix: port stock-management en variable env |
| `e24102c` | feat: CI/CD pipeline GitHub Actions avec test et deploy Render |
| `ff8fd28` | docs: ajout commentaires JSDoc sur controllers et middlewares |
| `76d9a2c` | docs: ajout CHANGELOG.md v1.1.0 |
| `1af8af3` | fix: dotenv premier, helmet, cors et route /health sur tous les services |
| `d863e38` | docs: ajout RENDU_EXAM.md avec etapes E21 a E29 |
| `83255e7` | feat: journalisation Winston/Morgan et supervision Prometheus/Uptime Kuma |
| `f0e9671` | fix: initialiser shippingMethod et paymentMethod dans CartContext |
| `fa0c85e` | fix: ajout prefixe /api manquant dans toutes les URLs frontend |
| `6945803` | fix: selects livraison et paiement vides par defaut avec placeholder |
| `0b42ab4` | fix: notification fire-and-forget pour eviter le blocage au passage de commande |
| `234ac61` | docs: ajout fixes selects placeholder et notification fire-and-forget dans CHANGELOG |
| `5a43b8f` | Update screenshot E22 |
| `e8ece0d` | fix: decrementation stock a la validation de commande |
| `de439f7` | docs: integration des screenshots dans RENDU_EXAM.md et mise a jour table commits |
