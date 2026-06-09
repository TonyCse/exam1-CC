// backend/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      console.log('Admin existe déjà');
      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin1234!', 10);

    const admin = new User({
      username: 'admin',
      email: 'admin@exam.com',
      password: hashedPassword,
      role: 'admin',
    });

    // On bypasse le pre-save hook pour éviter un double hash
    await User.collection.insertOne(admin.toObject());

    console.log('Admin créé avec succès');
  } catch (error) {
    console.error('Erreur :', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
