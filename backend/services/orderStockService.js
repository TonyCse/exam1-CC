const Order = require('../models/Order');
const Product = require('../models/Product');

const VALIDATED_STATUS = 'En cours de traitement';

async function validateOrderAndDecrementStock(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    return { order: null };
  }

  if (order.status === VALIDATED_STATUS) {
    return { order, stockUpdated: false };
  }

  const quantitiesByProductId = new Map();

  order.items.forEach((item) => {
    const productId = item.productId.toString();
    const currentQuantity = quantitiesByProductId.get(productId) || 0;
    quantitiesByProductId.set(productId, currentQuantity + item.quantity);
  });

  const productIds = Array.from(quantitiesByProductId.keys());
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  for (const [productId, quantity] of quantitiesByProductId.entries()) {
    const product = productMap.get(productId);

    if (!product) {
      return {
        order,
        stockUpdated: false,
        error: `Produit ${productId} introuvable.`,
      };
    }

    if (product.stock < quantity) {
      return {
        order,
        stockUpdated: false,
        error: `Stock insuffisant pour le produit ${product.name}.`,
      };
    }
  }

  await Product.bulkWrite(
    Array.from(quantitiesByProductId.entries()).map(([productId, quantity]) => ({
      updateOne: {
        filter: { _id: productId },
        update: { $inc: { stock: -quantity } },
      },
    }))
  );

  order.status = VALIDATED_STATUS;
  await order.save();

  return { order, stockUpdated: true };
}

module.exports = {
  validateOrderAndDecrementStock,
};
