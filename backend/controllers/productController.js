// controllers/productController.js
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * @description Récupère la liste complète des produits depuis la base de données.
 * @param {Request} req - Requête Express.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON tableau de produits avec statut 200.
 * @throws {500} En cas d'erreur de connexion ou de requête MongoDB.
 */
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    logger.error('Erreur lors de la récupération des produits', { message: error.message });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @description Met à jour la quantité en stock d'un produit identifié par son ID.
 * Accessible uniquement aux administrateurs (protégé par authenticateToken + isAdmin).
 * @param {Request} req - Requête Express. Paramètre :productId dans l'URL, { stock } dans le body.
 * @param {Response} res - Réponse Express.
 * @returns {Promise<void>} JSON { message, product } avec statut 200.
 * @throws {400} Si le stock est négatif.
 * @throws {404} Si le produit est introuvable.
 * @throws {500} En cas d'erreur serveur inattendue.
 */
exports.updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;
    const { productId } = req.params;

    if (stock < 0) {
      return res.status(400).json({ message: 'Le stock ne peut pas être négatif.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    product.stock = stock;
    await product.save();

    res.json({ message: 'Stock mis à jour avec succès.', product });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du stock', { message: error.message });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
