require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/app.log' }),
  ],
});

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'stock-management' }));

app.post('/update-stock', (req, res) => {
  const { productId, quantity } = req.body;
  logger.info('Mise à jour du stock', { productId, quantity });
  res.json({ message: `Stock mis à jour pour le produit de ID : ${productId}` });
});

app.listen(PORT, () => logger.info(`Service de gestion des stocks sur le port ${PORT}`));
