const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    listOrders,
    getOrder,
    createOrder,
    updateOrderStatus,
} = require('../controllers/order.js');

// All order routes require an authenticated user — "for current user" in the spec.
router.get('/', authMiddleware, listOrders);
router.get('/:id', authMiddleware, getOrder);
router.post('/', authMiddleware, createOrder);
router.patch('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;