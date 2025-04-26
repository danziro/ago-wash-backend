const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { checkApiKey, checkAdmin } = require('../middlewares/auth');
const { validate, recordTransactionSchema, transactionsByDateSchema } = require('../middlewares/validation');
const { standardLimiter } = require('../middlewares/rateLimit');

// Apply API key check and rate limiting to all routes
router.use(checkApiKey);
router.use(standardLimiter);

// Record transaction
router.post(
  '/record-transaction',
  validate(recordTransactionSchema),
  transactionController.recordTransaction
);

// Get transactions by date (admin only)
router.get(
  '/transactions-by-date',
  checkAdmin,
  validate(transactionsByDateSchema),
  transactionController.getTransactionsByDate
);

// Get analytics (admin only)
router.get(
  '/analytics',
  checkAdmin,
  transactionController.getAnalytics
);

// Get monitoring data (admin only)
router.get(
  '/monitoring',
  checkAdmin,
  transactionController.getMonitoring
);

module.exports = router;
