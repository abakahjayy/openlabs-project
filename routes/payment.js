const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    initializeCheckout,
    finalizeOrder,
    paystackWebhook,
} = require('../controllers/payment.js');

// Buyer taps "Buy" — starts a hosted Paystack checkout, returns the URL to redirect to.
router.post('/initialize', authMiddleware, initializeCheckout);

// Frontend calls this after Paystack redirects back to /payment/callback?reference=...
router.get('/finalize/:reference', finalizeOrder);

// Paystack calls this directly — no auth (Paystack can't send your JWT),
// protected instead by signature verification inside the controller.
router.post('/webhook', paystackWebhook);

module.exports = router;