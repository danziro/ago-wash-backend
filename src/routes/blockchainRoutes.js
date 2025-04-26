const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { checkApiKey, checkAdmin } = require('../middlewares/auth');
const { 
  validate, 
  userPointsSchema, 
  freeWashStatusSchema, 
  updateNFTFrameSchema, 
  signRedeemSchema, 
  activityLogSchema,
  addAdminSchema,
  removeAdminSchema
} = require('../middlewares/validation');
const { standardLimiter, signRedeemLimiter } = require('../middlewares/rateLimit');

// Apply API key check to all routes
router.use(checkApiKey);

// Get user points
router.get(
  '/user-points',
  standardLimiter,
  validate(userPointsSchema),
  blockchainController.getUserPoints
);

// Get free wash status
router.get(
  '/free-wash-status',
  standardLimiter,
  validate(freeWashStatusSchema),
  blockchainController.getFreeWashStatus
);

// Update NFT frame (admin only)
router.post(
  '/update-nft-frame',
  standardLimiter,
  checkAdmin,
  validate(updateNFTFrameSchema),
  blockchainController.updateNFTFrame
);

// Sign redeem package (with stricter rate limit)
router.post(
  '/sign-redeem',
  signRedeemLimiter,
  validate(signRedeemSchema),
  blockchainController.signRedeem
);

// Get activity log
router.get(
  '/activity-log',
  standardLimiter,
  validate(activityLogSchema),
  blockchainController.getActivityLog
);

// Get active free washes (admin only)
router.get(
  '/active-free-washes',
  standardLimiter,
  checkAdmin,
  blockchainController.getActiveFreeWashUsers
);

// Add admin (admin only)
router.post(
  '/add-admin',
  standardLimiter,
  checkAdmin,
  validate(addAdminSchema),
  blockchainController.addAdmin
);

// Remove admin (admin only)
router.post(
  '/remove-admin',
  standardLimiter,
  checkAdmin,
  validate(removeAdminSchema),
  blockchainController.removeAdmin
);

module.exports = router;
