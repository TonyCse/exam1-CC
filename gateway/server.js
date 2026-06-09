require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'gateway' }));

app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

const PORT = process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Gateway opérationnel sur le port ${PORT}`);
});
