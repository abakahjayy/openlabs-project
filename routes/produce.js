const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    listProduce,
    listFreshRescue,
    listPreHarvest,
    getProduce,
    createProduce,
    updateProduce,
    deleteProduce,
} = require('../controllers/produce.js');

// Public browsing — matches the /api/produce?status=available calls in your logs.
router.get('/', listProduce);
router.get('/fresh-rescue', listFreshRescue);
router.get('/pre-harvest', listPreHarvest);
router.get('/:id', getProduce);

// Mutating routes require an authenticated farmer.
router.post('/', authMiddleware, createProduce);
router.patch('/:id', authMiddleware, updateProduce);
router.delete('/:id', authMiddleware, deleteProduce);

module.exports = router;