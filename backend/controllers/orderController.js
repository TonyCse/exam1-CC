// backend/controllers/orderController.js
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');
const logger = require('../config/logger');
const { validateOrderAndDecrementStock } = require('../services/orderStockService');

/**
 * @description Crée une nouvelle commande pour l'utilisateur authentifié.
 * Les prix sont recalculés côté serveur depuis la base de données
 * pour éviter toute manipulation côté client.
 * Envoie une notification email après création (échec silencieux).
 * @param {Request} req - Requête Express. req.user.userId requis.
 *   Body : { items: Array<{ productId, quantity }>, shippingAddress, paymentMethod, shippingMethod }.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON { message, order } avec statut 201.
 * @throws {400} Si items est vide ou absent.
 * @throws {500} Si un produit est introuvable ou en cas d'erreur MongoDB.
 */
exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const userId = req.user.userId;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.',
    });
  }

  try {
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

    // Fire-and-forget : on ne bloque pas la réponse en attendant le service notifications
    axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
      to: 'syaob@yahoo.fr',
      subject: 'Nouvelle Commande Créée',
      text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
        .map(item => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
        .join('\n')}`,
    }).catch((notifError) => {
      logger.error("Erreur lors de l'envoi de la notification", { message: notifError.message });
    });

    res.status(201).json({ message: 'Commande créée avec succès', order: savedOrder });
  } catch (error) {
    logger.error('Erreur lors de la création de la commande', { message: error.message });
    res.status(500).json({ message: 'Une erreur est survenue lors de la création de la commande.' });
  }
};

/**
 * @description Supprime définitivement une commande par son identifiant MongoDB.
 * Accessible uniquement aux administrateurs.
 * @param {Request} req - Requête Express. Paramètre :id dans l'URL.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON { message } avec statut 200.
 * @throws {404} Si aucune commande ne correspond à l'identifiant fourni.
 * @throws {500} En cas d'erreur MongoDB.
 */
exports.deleteOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const order = await Order.findByIdAndDelete(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }
    res.status(200).json({ message: 'Commande supprimée' });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la commande', { message: error.message });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @description Récupère toutes les commandes de la base de données.
 * Accessible uniquement aux administrateurs.
 * @param {Request} req - Requête Express.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON tableau de commandes avec statut 200.
 * @throws {500} En cas d'erreur MongoDB.
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    logger.error('Erreur lors de la récupération des commandes', { message: error.message });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @description Valide une commande en passant son statut à "En cours de traitement".
 * Accessible uniquement aux administrateurs.
 * @param {Request} req - Requête Express. Paramètre :id dans l'URL.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON { message, order } avec statut 200.
 * @throws {404} Si aucune commande ne correspond à l'identifiant fourni.
 * @throws {500} En cas d'erreur MongoDB.
 */
exports.validateOrder = async (req, res) => {
  const orderId = req.params.id;
  try {
    const { order, error } = await validateOrderAndDecrementStock(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }

    if (error) {
      return res.status(400).json({ message: error });
    }
    res.status(200).json({ message: `Commande ${orderId} validée avec succès.`, order });
  } catch (error) {
    logger.error('Erreur lors de la validation de la commande', { message: error.message });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @description Met à jour le statut d'une commande existante.
 * Les valeurs acceptées sont définies par l'enum du modèle Order.
 * Accessible uniquement aux administrateurs.
 * @param {Request} req - Requête Express. Paramètre :orderId dans l'URL, { status } dans le body.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON { message, order } avec statut 200.
 * @throws {400} Si le champ status est absent du body.
 * @throws {404} Si aucune commande ne correspond à l'identifiant fourni.
 * @throws {500} En cas d'erreur MongoDB.
 */
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({ message: 'Le statut est requis.' });
    }

    let order;

    if (status === 'En cours de traitement') {
      const result = await validateOrderAndDecrementStock(orderId);
      order = result.order;

      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
    } else {
      order = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
      );
    }

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.status(200).json({ message: 'Statut mis à jour avec succès', order });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la commande', { message: error.message });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
