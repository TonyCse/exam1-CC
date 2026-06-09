# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

---

## [1.1.0] — 2026-06-09

### Sécurité

- **`helmet` appliqué** sur les quatre services Node.js (`backend`, `gateway`, `notifications`, `stock-management`) : en-têtes HTTP de sécurité activés (CSP, X-Frame-Options, HSTS, etc.).
- **`cors` configuré avec origine explicite** sur les quatre services : `app.use(cors({ origin: process.env.CORS_ORIGIN }))` — le wildcard `app.use(cors())` du backend initial a été supprimé.
- **`dotenv.config()` déplacé en première ligne exécutable** dans `backend/server.js`, `gateway/server.js` et `microservices/notifications/index.js` — les variables d'environnement sont désormais disponibles avant tout autre import.
- **Validation des entrées (Joi)** : schéma de validation ajouté sur `register` (username 3–30 chars, email valide, password min 8 chars) et `login` (username et password requis). Réponse `400` avec `{ error, details: [...] }` si la validation échoue, `abortEarly: false` pour retourner toutes les erreurs en une seule passe.
- **Middleware `authenticateToken` réécrit** : abandon du callback `jwt.verify` au profit de la version synchrone dans un `try/catch`. Lecture du token en priorité depuis le cookie `HttpOnly`, puis depuis le header `Authorization: Bearer`.
- **Middleware `isAdmin` sécurisé** : vérification de l'existence de `req.user` avant l'accès à `req.user.role` pour éviter un crash si le middleware est appelé hors contexte authentifié.
- **Routes admin protégées** : `adminRoutes` monté sur `/api/admin` avec double protection `authenticateToken + isAdmin` dans `server.js`. `isAdmin` manquait sur `DELETE /orders/:id` — corrigé.
- **Suppression des logs sensibles** : retrait des `console.log` exposant le mot de passe en clair dans `authController` et l'URI MongoDB complète dans `db.js`.
- **Variables d'environnement** : toutes les URLs `localhost` hardcodées dans le frontend remplacées par `process.env.REACT_APP_API_URL` et `process.env.REACT_APP_GATEWAY_URL`. `http://localhost:3001` dans `adminController` remplacé par `process.env.NOTIFICATION_SERVICE_URL`.
- **`.gitignore` renforcé** : protection des fichiers `.env`, `logs/`, `docs/` et `.claude/` à la racine et dans chaque service. Fichiers `.gitignore` locaux créés pour `backend/`, `gateway/`, `microservices/notifications/`, `microservices/stock-management/`. Entrée `.env` ajoutée dans `frontend/.gitignore` (manquait).
- **Dépendances de sécurité installées** dans les quatre services : `helmet`, `cors`, `express-rate-limit`, `joi`, `winston`, `morgan`, `cookie-parser`, `dotenv`.
- **Recalcul du total côté serveur** dans `createOrder` : les prix ne sont plus lus depuis le body client mais récupérés depuis MongoDB via `Product.find({ _id: { $in: [...] } })`, éliminant toute possibilité de manipulation du montant de la commande.

---

### Corrections de bugs

- **`adminRoutes` non monté** : les routes `/api/admin/*` étaient définies mais jamais enregistrées dans `server.js`. Corrigé par import et montage explicite avec les middlewares d'authentification.
- **`deleteOrder` non implémenté** : la fonction ne faisait que logger l'ID sans réponse HTTP ni suppression en base. Implémentée avec `Order.findByIdAndDelete(req.params.id)` — réponse `200` ou `404`.
- **`validateOrder` non implémentée** : renvoyait un faux succès `200` sans modifier la base de données. Implémentée avec `Order.findByIdAndUpdate` vers le statut `En cours de traitement` (valeur valide dans l'enum du modèle), retourne la commande mise à jour.
- **`getProducts` et `getOrders` sans `try/catch`** : une erreur MongoDB faisait crasher le process sans réponse HTTP. Ajout d'un `try/catch` avec réponse `500` sur les deux fonctions.
- **Modèle `Order` — champs dupliqués** : `createdAt` et `updatedAt` étaient définis manuellement dans le schéma Mongoose ET via l'option `timestamps: true`. Suppression des définitions manuelles redondantes.
- **`authMiddleware` — `try/catch` inatteignable** : `jwt.verify` avec callback ne lève pas d'exception synchrone. Le bloc `catch` externe était mort. Réécriture en version synchrone dans un `try/catch` effectif.
- **`adminController` — URL hardcodée** : `http://localhost:3001/notify` remplacé par `${process.env.NOTIFICATION_SERVICE_URL}/notify` dans les trois appels axios (`updateOrderStatus`, `validateOrder`, `updateProductStock`).
- **`docker-compose.yml` — ports incorrects** : `notifications` mappé `3001:3001` alors que le service écoute sur `4002`. `stock-management` mappé `3002:3002` au lieu de `4003:4003`. Corrigés respectivement en `4002:4002` et `4003:4003`.
- **`CartContext` — mutation directe dans le reducer** : `updatedCart[index].quantity +=` modifiait l'objet en place, violant l'immutabilité de React. Remplacé par `state.cart.map()` avec spread `{ ...item, quantity: item.quantity + n }`.
- **`adminApi.js` — `try/catch` non fonctionnel** : les fonctions retournaient une Promise sans `await`. Le `catch` ne capturait aucune erreur asynchrone. Toutes les fonctions réécrites en `async/await` avec `try/catch` opérationnel.
- **`Admin.js` — `fetchData` sans gestion d'erreur** : ajout d'un `try/catch` dans le `useEffect` pour éviter un composant silencieusement vide en cas d'erreur réseau.
- **`stock-management` — port hardcodé** : `const PORT = 4003` remplacé par `process.env.PORT || 4003`. `require('dotenv').config()` ajouté en première ligne.
- **`notifications` — `body-parser` obsolète** : suppression du package déprécié, remplacé par `express.json()` natif (disponible depuis Express 4.16).

---

### Infrastructure

- **Route `GET /health`** ajoutée sur les quatre services Node.js : `backend`, `gateway`, `notifications`, `stock-management`. Retourne `{ status: 'ok', service: '<nom>' }` avec code `200`. Permet la vérification de disponibilité par les orchestrateurs (Render, Docker, etc.).
- **Dockerfiles créés** pour les cinq services :
  - `backend/Dockerfile` : `node:18-alpine`, `npm ci --only=production`, port `5000`, `CMD ["node", "server.js"]`.
  - `gateway/Dockerfile` : `node:18-alpine`, port `8000`, `CMD ["node", "server.js"]`.
  - `microservices/notifications/Dockerfile` : `node:18-alpine`, port `4002`, `CMD ["node", "index.js"]`.
  - `microservices/stock-management/Dockerfile` : `node:18-alpine`, port `4003`, `CMD ["node", "index.js"]`.
  - `frontend/Dockerfile` : build multi-stage — stage `node:18-alpine` pour `npm run build`, stage `nginx:alpine` pour servir les assets compilés.
- **`frontend/nginx.conf`** : directive `try_files $uri $uri/ /index.html` pour le routage SPA React Router. Cache `Cache-Control: public, immutable` d'un an sur les assets statiques (JS, CSS, fonts, images).
- **`docker-compose.yml` mis à jour** : ajout du service `gateway` (manquait entièrement), mapping frontend corrigé en `3000:80` (nginx écoute sur 80), ports `notifications` et `stock-management` corrigés.
- **Pipeline CI/CD GitHub Actions** (`.github/workflows/deploy.yml`) : déclenchement sur push `main`, job `test` (Node 18, `npm ci` + `npm test --if-present`), job `deploy` conditionné par `needs: test`, déploiement automatique sur Render via quatre secrets (`RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_GATEWAY`, `RENDER_DEPLOY_HOOK_NOTIF`, `RENDER_DEPLOY_HOOK_STOCK`).
- **Script `backend/createAdmin.js`** : création programmatique d'un utilisateur administrateur (`admin` / `Admin1234!`) avec vérification d'idempotence — aucun doublon créé si l'utilisateur existe déjà. Exécuté avec succès contre MongoDB Atlas.
- **`backend/seeder.js` exécuté** : insertion des cinq produits initiaux en base de données (Ordinateur Portable 1000€, Smartphone 700€, Casque Audio 150€, Tablette 400€, Clavier Mécanique 120€).
- **URI MongoDB Atlas** : conversion de `mongodb+srv://` vers une URI de connexion directe aux trois nœuds du replica set (`atlas-f0vpbr-shard-0`) pour contourner les restrictions de résolution DNS SRV sur certains réseaux mobiles. Nœuds : `ac-wiabpaq-shard-00-{00,01,02}.frvcneg.mongodb.net:27017`.

---

### Documentation

- **Commentaires JSDoc** ajoutés sur l'ensemble des fonctions exposées :
  - `backend/controllers/authController.js` — `login`, `register`
  - `backend/controllers/orderController.js` — `createOrder`, `deleteOrder`, `getOrders`, `validateOrder`, `updateOrderStatus`
  - `backend/controllers/productController.js` — `getProducts`, `updateProductStock`
  - `backend/middlewares/authMiddleware.js` — `authenticateToken`, `isAdmin`
- Chaque fonction documentée avec `@description`, `@param` (type + nom + description), `@returns` (statut HTTP + structure JSON) et `@throws` (codes d'erreur possibles).
- **`backend/jsdoc.config.json`** : configuration de génération pointant vers `controllers/`, `routes/`, `middlewares/`, `models/`, sortie dans `backend/docs/` (répertoire exclu du dépôt git).
- Documentation HTML générée localement via `npx jsdoc -c jsdoc.config.json` — fichiers produits : `index.html`, `global.html`, pages par fichier source.
- **`RENDU_EXAM.md`** : document de rendu couvrant les étapes E21 à E29 avec justifications techniques, commandes utilisées et emplacements de captures d'écran.
