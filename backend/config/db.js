// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('./logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connecté');
  } catch (err) {
    logger.error('Échec de connexion MongoDB', { message: err.message });
    process.exit(1);
  }
};

module.exports = connectDB;
