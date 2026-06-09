require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'stock-management' }));

app.post('/update-stock', (req, res) => {
    const { productId, quantity } = req.body;
    console.log(`Mise à jour du stock: Produit ${productId}, Quantité ${quantity}`);
    res.json({ message: `Stock mis à jour pour le produit de ID : ${productId}` });
});

app.listen(PORT, () => console.log(`Service de gestion des stocks sur le port ${PORT}`));
