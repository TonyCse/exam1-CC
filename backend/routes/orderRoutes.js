// backend/routes/orderRoutes.js
const express = require('express');
const { createOrder, deleteOrder, getOrders, validateOrder, updateOrderStatus } = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, isAdmin, getOrders);
router.post('/', authenticateToken, createOrder);
router.delete('/:id', authenticateToken, isAdmin, deleteOrder);
router.put('/:id/validate', authenticateToken, isAdmin, validateOrder);
router.put('/:orderId/status', authenticateToken, isAdmin, updateOrderStatus);

module.exports = router;
