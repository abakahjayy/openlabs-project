const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // adjust path to your existing auth middleware
const {
    getFarmerDashboard,
    getBuyerDashboard,
    getDriverDashboard,
    getMarketOverview,
} = require('../controllers/dashboard.js');

router.get('/market-overview', getMarketOverview); // public — no auth required
router.get('/farmer', authMiddleware, getFarmerDashboard);
router.get('/buyer', authMiddleware, getBuyerDashboard);
router.get('/driver', authMiddleware, getDriverDashboard);

module.exports = router;
