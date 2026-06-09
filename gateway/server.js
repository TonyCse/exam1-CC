require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');
const logger = require('./config/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'gateway' }));

app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

const PORT = process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  logger.info(`Gateway opérationnel sur le port ${PORT}`);
});
