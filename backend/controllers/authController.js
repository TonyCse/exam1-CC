// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const User = require('../models/User');
require('dotenv').config();

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

exports.login = async (req, res) => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Données invalides',
      details: error.details.map(d => d.message),
    });
  }

  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('Erreur lors de la connexion', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.register = async (req, res) => {
  const { error } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Données invalides',
      details: error.details.map(d => d.message),
    });
  }

  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const user = new User({ username, email, password });
    await user.save();

    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (err) {
    console.error('Erreur lors de l\'inscription', err);
    res.status(500).json({ message: 'Une erreur est survenue.' });
  }
};
