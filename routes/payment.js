const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    chargeMobileMoney,
    submitOtp,
    verifyPayment,
    paystackWebhook,
} = require('../controllers/payment.js');

// Buyer-initiated — requires login.
router.post('/charge', authMiddleware, chargeMobileMoney);
router.post('/submit-otp', authMiddleware, submitOtp);
router.get('/verify/:reference', authMiddleware, verifyPayment);

// Paystack calls this directly — no auth (Paystack can't send your JWT),
// protected instead by signature verification inside the controller.
router.post('/webhook', paystackWebhook);

module.exports = router;