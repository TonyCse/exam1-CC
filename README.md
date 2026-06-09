# exam1-CC

Application e-commerce fullstack — Express / React / MongoDB Atlas.

## Installation des dépendances

À exécuter une fois après un `git clone` ou après suppression des `node_modules` :

```bash
cd backend
npm install

cd ../gateway
npm install

cd ../microservices/notifications
npm install

cd ../stock-management
npm install

cd ../../frontend
npm install
```

## Lancement en local

```bash
# Backend (port 5000)
cd backend
npm start

# Gateway (port 8000)
cd gateway
npm start

# Notifications (port 4002)
cd microservices/notifications
npm start

# Stock-management (port 4003)
cd microservices/stock-management
npm start

# Frontend (port 3000)
cd frontend
npm start
```

## Lancement avec Docker

```bash
docker compose up --build
```

> Uptime Kuma disponible sur http://localhost:3001 après `docker compose up`

## Variables d'environnement

Créer un fichier `.env` dans chaque service (non commité) :

| Service | Fichier | Variables clés |
|---|---|---|
| Backend | `backend/.env` | `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `NOTIFICATION_SERVICE_URL` |
| Gateway | `gateway/.env` | `GATEWAY_PORT`, `CORS_ORIGIN` |
| Notifications | `microservices/notifications/.env` | `NOTIFI_PORT`, `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD` |
| Stock | `microservices/stock-management/.env` | `PORT`, `CORS_ORIGIN` |
| Frontend | `frontend/.env` | `REACT_APP_API_URL`, `REACT_APP_GATEWAY_URL` |

## Initialisation de la base de données

```bash
cd backend
node createAdmin.js   # Crée l'utilisateur admin (admin / Admin1234!)
node seeder.js        # Insère les produits initiaux
```

## Application déployée

https://exam1-frontend-6hev.onrender.com
