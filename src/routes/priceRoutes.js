const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');
const { checkApiKey, checkAdmin } = require('../middlewares/auth');
const { standardLimiter } = require('../middlewares/rateLimit');

// Apply API key check and rate limiting to all routes
router.use(checkApiKey);
router.use(standardLimiter);

// Get prices (publicly accessible with API key)
router.get(
  '/prices',
  priceController.getPrices
);

// Update price (admin only)
router.post(
  '/update-price',
  checkAdmin,
  priceController.updatePrice
);

module.exports = router;
