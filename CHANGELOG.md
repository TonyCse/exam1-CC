# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

---

## [1.1.0] — 2026-06-09

### Sécurité

- **Validation des entrées (Joi)** : ajout d'un schéma de validation sur `register` (username 3–30 chars, email valide, password min 8 chars) et `login` (username et password requis). Retourne `400` avec le détail des erreurs si la validation échoue.
- **Middleware `authenticateToken` réécrit** : abandon du callback `jwt.verify` au profit de la version synchrone dans un `try/catch`. Lecture du token en priorité depuis le cookie `HttpOnly`, puis depuis le header `Authorization: Bearer`.
- **Middleware `isAdmin` sécurisé** : ajout d'une vérification de l'existence de `req.user` avant l'accès à `req.user.role` pour éviter un crash non géré.
- **Routes admin protégées** : montage de `adminRoutes` sur `/api/admin` avec double protection `authenticateToken + isAdmin` au niveau du routeur principal (`server.js`). Le middleware `isAdmin` était absent sur `DELETE /orders/:id` — corrigé.
- **Suppression des logs sensibles** : retrait des `console.log` exposant les mots de passe en clair (`authController`) et l'URI MongoDB complète (`db.js`).
- **Variables d'environnement** : remplacement de toutes les URLs `localhost` hardcodées dans le frontend par `process.env.REACT_APP_API_URL` et `process.env.REACT_APP_GATEWAY_URL`. Remplacement de `http://localhost:3001` dans `adminController` par `process.env.NOTIFICATION_SERVICE_URL`.
- **`.gitignore` renforcé** : protection des fichiers `.env`, `logs/`, `docs/` et `.claude/` à la racine et dans chaque sous-dossier de service. Fichiers `.gitignore` locaux créés pour `backend/`, `gateway/`, `microservices/notifications/` et `microservices/stock-management/`. Ajout de `.env` dans `frontend/.gitignore` (manquant).
- **Dépendances de sécurité installées** dans tous les services : `helmet`, `cors`, `express-rate-limit`, `joi`, `winston`, `morgan`, `cookie-parser`, `dotenv`.
- **Recalcul du prix côté serveur** dans `createOrder` : les prix ne sont plus lus depuis le body de la requête client mais récupérés depuis MongoDB via `Product.find({ _id: $in })`, éliminant toute possibilité de manipulation du montant total.

---

### Corrections de bugs

- **`adminRoutes` non monté** : les routes `/api/admin/*` étaient définies mais jamais enregistrées dans `server.js`. Corrigé par import et montage explicite.
- **`deleteOrder` non implémenté** : la fonction ne faisait que logger l'ID sans réponse HTTP ni suppression. Implémentée avec `Order.findByIdAndDelete(req.params.id)`, réponse `200` ou `404`.
- **`validateOrder` non implémentée** : renvoyait un faux succès sans toucher la base. Implémentée avec `Order.findByIdAndUpdate` vers le statut `En cours de traitement` (valeur valide dans l'enum).
- **`getProducts` sans `try/catch`** : une erreur MongoDB crashait silencieusement. Ajout d'un `try/catch` avec réponse `500`.
- **`getOrders` sans `try/catch`** : même correction.
- **Modèle `Order` — champs dupliqués** : `createdAt` et `updatedAt` étaient définis manuellement dans le schéma ET via `timestamps: true`. Suppression des définitions manuelles redondantes.
- **`authMiddleware` — `try/catch` inutile** : `jwt.verify` avec callback ne lève pas d'exception synchrone, rendant le bloc `catch` inatteignable. Réécriture en version synchrone.
- **`adminController` — URL hardcodée** : `http://localhost:3001/notify` remplacé par `${process.env.NOTIFICATION_SERVICE_URL}/notify` dans les trois appels axios.
- **`docker-compose.yml` — ports incorrects** : `notifications` était mappé `3001:3001` alors que le service écoute sur `4002`. `stock-management` était mappé `3002:3002` au lieu de `4003:4003`. Corrigé.
- **`CartContext` — mutation directe dans le reducer** : `updatedCart[index].quantity +=` modifiait l'objet en place, violant l'immutabilité React. Remplacé par un `state.cart.map()` avec spread `{ ...item, quantity: item.quantity + n }`.
- **`adminApi.js` — `try/catch` non fonctionnel** : les fonctions retournaient directement une Promise sans `await`. Le `catch` ne capturait aucune erreur asynchrone. Toutes les fonctions réécrites en `async/await` avec `try/catch` opérationnel.
- **`Admin.js` — `fetchData` sans gestion d'erreur** : ajout d'un `try/catch` dans le `useEffect` pour éviter un composant silencieusement vide en cas d'erreur réseau.
- **`stock-management` — port hardcodé** : `const PORT = 4003` remplacé par `process.env.PORT || 4003`. Ajout de `require('dotenv').config()` en première ligne.

---

### Infrastructure

- **Dockerfiles créés** pour les cinq services :
  - `backend/Dockerfile` : `node:18-alpine`, `npm ci --only=production`, port `5000`, `CMD node server.js`.
  - `gateway/Dockerfile` : `node:18-alpine`, port `8000`, `CMD node server.js`.
  - `microservices/notifications/Dockerfile` : `node:18-alpine`, port `4002`, `CMD node index.js`.
  - `microservices/stock-management/Dockerfile` : `node:18-alpine`, port `4003`, `CMD node index.js`.
  - `frontend/Dockerfile` : build multi-stage — stage `node:18-alpine` pour `npm run build`, stage `nginx:alpine` pour servir les assets.
- **`frontend/nginx.conf`** : configuration `try_files $uri $uri/ /index.html` pour le routage SPA React Router. Cache `immutable` d'un an sur les assets statiques.
- **`docker-compose.yml` mis à jour** : ajout du service `gateway` (manquant), ports corrigés pour `notifications` et `stock-management`, mapping frontend `3000:80` aligné sur nginx.
- **Pipeline CI/CD GitHub Actions** (`.github/workflows/deploy.yml`) : déclenchement sur push `main`, job `test` (install + `npm test --if-present`), job `deploy` conditionné au succès de `test`, déploiement automatique sur Render via quatre secrets (`RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_GATEWAY`, `RENDER_DEPLOY_HOOK_NOTIF`, `RENDER_DEPLOY_HOOK_STOCK`).
- **Script `backend/createAdmin.js`** : création programmatique d'un utilisateur administrateur (`admin` / `Admin1234!`) avec vérification d'idempotence (pas de doublon si déjà existant).
- **`backend/seeder.js` exécuté** : insertion des cinq produits initiaux en base (Ordinateur Portable, Smartphone, Casque Audio, Tablette, Clavier Mécanique).
- **URI MongoDB** : conversion de `mongodb+srv://` vers une URI directe avec les trois nœuds du replica set Atlas (`ac-wiabpaq-shard-00-0{0,1,2}`) pour contourner les restrictions de résolution DNS SRV sur certains réseaux.

---

### Documentation

- **Commentaires JSDoc** ajoutés sur l'ensemble des fonctions exposées dans :
  - `backend/controllers/authController.js` — `login`, `register`
  - `backend/controllers/orderController.js` — `createOrder`, `deleteOrder`, `getOrders`, `validateOrder`, `updateOrderStatus`
  - `backend/controllers/productController.js` — `getProducts`, `updateProductStock`
  - `backend/middlewares/authMiddleware.js` — `authenticateToken`, `isAdmin`
- Chaque fonction est documentée avec `@description`, `@param`, `@returns` et `@throws` (codes HTTP inclus).
- **`backend/jsdoc.config.json`** : configuration JSDoc pointant vers `controllers/`, `routes/`, `middlewares/`, `models/`, génération dans `backend/docs/` (répertoire gitignore).
- Documentation HTML générée localement via `npx jsdoc -c jsdoc.config.json`.
