// backend/controllers/adminController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { validateOrderAndDecrementStock } = require('../services/orderStockService');

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (status === 'En cours de traitement') {
      const { order, error } = await validateOrderAndDecrementStock(id);

      if (!order) {
        return res.status(404).json({ message: 'Commande introuvable.' });
      }

      if (error) {
        return res.status(400).json({ message: error });
      }
    } else {
      await Order.findByIdAndUpdate(id, { status });
    }
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
      message: `Le statut de la commande ${id} a été mis à jour en "${status}".`,
    });
    res.json({ message: `Statut de la commande ${id} mis à jour` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur de mise à jour du statut de la commande' });
  }
};

exports.validateOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const { order, error } = await validateOrderAndDecrementStock(id);

    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }

    if (error) {
      return res.status(400).json({ message: error });
    }
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
      message: `La commande ${id} a été validée.`,
    });
    res.json({ message: `Commande ${id} validée` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la validation de la commande' });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

exports.updateProductStock = async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    await Product.findByIdAndUpdate(id, { stock });
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
      message: `Le stock du produit ${id} a été mis à jour à ${stock}.`,
    });
    res.json({ message: `Stock du produit ${id} mis à jour` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du stock du produit' });
  }
};
