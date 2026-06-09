// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');

exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const userId = req.user.userId;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.',
    });
  }

  try {
    // Recalcul du prix côté serveur — on ne fait pas confiance au prix envoyé par le client
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = {};
    products.forEach(p => { productMap[p._id.toString()] = p.price; });

    const orderDetails = items.map(({ productId, quantity }) => {
      const price = productMap[productId.toString()];
      if (price === undefined) throw new Error(`Produit ${productId} introuvable`);
      return { productId, quantity, price };
    });

    const total = orderDetails.reduce((acc, { price, quantity }) => acc + price * quantity, 0);

    const newOrder = new Order({
      userId,
      items: orderDetails,
      total,
      shippingAddress,
      paymentMethod,
      shippingMethod,
    });

    const savedOrder = await newOrder.save();

    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
        to: 'syaob@yahoo.fr',
        subject: 'Nouvelle Commande Créée',
        text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
          .map(item => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
          .join('\n')}`,
      });
    } catch (notifError) {
      console.error('Erreur lors de l\'envoi de la notification', notifError);
    }

    res.status(201).json({ message: 'Commande créée avec succès', order: savedOrder });
  } catch (error) {
    console.error('Erreur lors de la création de la commande', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la création de la commande.' });
  }
};

exports.deleteOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findByIdAndDelete(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }
    res.status(200).json({ message: 'Commande supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.validateOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: 'En cours de traitement' },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }
    res.status(200).json({ message: `Commande ${orderId} validée avec succès.`, order });
  } catch (error) {
    console.error('Erreur lors de la validation de la commande', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({ message: 'Le statut est requis.' });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.status(200).json({ message: 'Statut mis à jour avec succès', order });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commande :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
