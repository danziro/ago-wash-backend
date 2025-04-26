const User = require('../models/User');
const {
  getUserPoints,
  getFreeWashStatus,
  getNFTMetadata,
  updateNFTMetadata,
  signRedeemPackage,
  getActivityLog,
  getActiveFreeWashUsers,
  addAdmin,
  removeAdmin
} = require('../services/blockchainService');
const { 
  uploadMetadataToIPFS, 
  generateNFTMetadata, 
  getFrameUrlByTier, 
  determineTierByPoints 
} = require('../services/ipfsService');
const logger = require('../utils/logger');

/**
 * Get user points
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPointsHandler = async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    // Get points from blockchain
    const points = await getUserPoints(userAddress);
    
    // Return points
    return res.status(200).json({
      points
    });
    
  } catch (error) {
    logger.error(`Error getting user points: ${error.message}`, {
      category: 'blockchain',
      function: 'getUserPoints',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to get user points'
    });
  }
};

/**
 * Get free wash status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getFreeWashStatusHandler = async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    // Get free wash status from blockchain
    const status = await getFreeWashStatus(userAddress);
    
    // Return status
    return res.status(200).json({
      active: status.available && !status.used,
      expiryTime: status.expiryTime,
      used: status.used
    });
    
  } catch (error) {
    logger.error(`Error getting free wash status: ${error.message}`, {
      category: 'blockchain',
      function: 'getFreeWashStatus',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to get free wash status'
    });
  }
};

/**
 * Update NFT frame
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateNFTFrame = async (req, res) => {
  try {
    const { userAddress } = req.body;
    
    // Find user in database
    const user = await User.findOne({ userAddress });
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User with this address does not exist'
      });
    }
    
    // Get user points and determine tier
    const points = await getUserPoints(userAddress);
    const newTier = determineTierByPoints(points);
    
    // Get current NFT metadata
    const currentMetadata = await getNFTMetadata(userAddress);
    
    if (!currentMetadata.exists) {
      return res.status(404).json({
        error: 'NFT Not Found',
        message: 'User does not have an NFT yet'
      });
    }
    
    // Get appropriate frame for tier
    const frameUrl = getFrameUrlByTier(newTier);
    
    // Create new metadata with the updated tier and frame
    // Try to parse the current metadata URI to get the image
    let image = user.photoUrl;
    
    try {
      // Check if metadata URI is from IPFS
      if (currentMetadata.metadataURI.startsWith('ipfs://')) {
        // Extract CID from URI
        const cid = currentMetadata.metadataURI.replace('ipfs://', '');
        
        // Fetch current metadata
        const response = await fetch(`${process.env.IPFS_GATEWAY}${cid}`);
        const metadata = await response.json();
        
        // Use current image if available
        if (metadata && metadata.image) {
          image = metadata.image;
        }
      }
    } catch (error) {
      logger.error(`Error fetching current metadata: ${error.message}`, {
        category: 'blockchain',
        function: 'updateNFTFrame'
      });
      // Continue with user's photo URL
    }
    
    // Generate new metadata
    const newMetadata = generateNFTMetadata(image, newTier, frameUrl);
    
    // Upload new metadata to IPFS
    const metadataCid = await uploadMetadataToIPFS(newMetadata);
    const metadataURI = `ipfs://${metadataCid}`;
    
    // Update NFT metadata on blockchain
    const result = await updateNFTMetadata(userAddress, metadataURI, newTier, points);
    
    // Update user's metadata URI in database
    user.metadataURI = metadataURI;
    await user.save();
    
    // Emit WebSocket event if available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('nft:updated', {
        userAddress,
        tier: newTier,
        metadataURI
      });
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      metadataURI,
      tier: newTier,
      txHash: result.txHash
    });
    
  } catch (error) {
    logger.error(`Error updating NFT frame: ${error.message}`, {
      category: 'blockchain',
      function: 'updateNFTFrame',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to update NFT frame'
    });
  }
};

/**
 * Sign package redemption
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const signRedeem = async (req, res) => {
  try {
    const { userAddress, packageType, nonce } = req.body;
    
    // Generate signature
    const signature = await signRedeemPackage(userAddress, packageType, nonce);
    
    // Return signature
    return res.status(200).json({
      signature
    });
    
  } catch (error) {
    logger.error(`Error signing package redemption: ${error.message}`, {
      category: 'blockchain',
      function: 'signRedeem',
      stack: error.stack
    });
    
    return res.status(400).json({
      error: 'Signature Error',
      message: error.message
    });
  }
};

/**
 * Get activity log
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getActivityLogHandler = async (req, res) => {
  try {
    const { userAddress } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    // Get activity log from blockchain
    const logs = await getActivityLog(userAddress, page, pageSize);
    
    // Return logs
    return res.status(200).json({
      logs,
      page,
      pageSize
    });
    
  } catch (error) {
    logger.error(`Error getting activity log: ${error.message}`, {
      category: 'blockchain',
      function: 'getActivityLog',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to get activity log'
    });
  }
};

/**
 * Get active free wash users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getActiveFreeWashUsersHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    // Get active free wash users from blockchain
    const activeFreeWashes = await getActiveFreeWashUsers(page, pageSize);
    
    // Enhance with user names from database
    const enhancedFreeWashes = await Promise.all(
      activeFreeWashes.map(async (wash) => {
        const user = await User.findOne({ userAddress: wash.userAddress });
        return {
          ...wash,
          name: user ? user.name : 'Unknown',
          email: user ? user.email : null
        };
      })
    );
    
    // Return active free washes
    return res.status(200).json({
      activeFreeWashes: enhancedFreeWashes,
      page,
      pageSize
    });
    
  } catch (error) {
    logger.error(`Error getting active free wash users: ${error.message}`, {
      category: 'blockchain',
      function: 'getActiveFreeWashUsers',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to get active free wash users'
    });
  }
};

/**
 * Add admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addAdminHandler = async (req, res) => {
  try {
    const { adminAddress } = req.body;
    
    // Add admin on blockchain
    const result = await addAdmin(adminAddress);
    
    // Log admin action
    logger.info(`Admin ${req.adminAddress} added ${adminAddress} as admin`, {
      category: 'admin',
      action: 'addAdmin',
      adminAddress: req.adminAddress,
      newAdmin: adminAddress
    });
    
    // Return success response
    return res.status(200).json({
      success: true,
      txHash: result.txHash
    });
    
  } catch (error) {
    logger.error(`Error adding admin: ${error.message}`, {
      category: 'blockchain',
      function: 'addAdmin',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to add admin'
    });
  }
};

/**
 * Remove admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeAdminHandler = async (req, res) => {
  try {
    const { adminAddress } = req.body;
    
    // Remove admin on blockchain
    const result = await removeAdmin(adminAddress);
    
    // Log admin action
    logger.info(`Admin ${req.adminAddress} removed ${adminAddress} as admin`, {
      category: 'admin',
      action: 'removeAdmin',
      adminAddress: req.adminAddress,
      removedAdmin: adminAddress
    });
    
    // Return success response
    return res.status(200).json({
      success: true,
      txHash: result.txHash
    });
    
  } catch (error) {
    logger.error(`Error removing admin: ${error.message}`, {
      category: 'blockchain',
      function: 'removeAdmin',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Blockchain Error',
      message: 'Failed to remove admin'
    });
  }
};

module.exports = {
  getUserPoints: getUserPointsHandler,
  getFreeWashStatus: getFreeWashStatusHandler,
  updateNFTFrame,
  signRedeem,
  getActivityLog: getActivityLogHandler,
  getActiveFreeWashUsers: getActiveFreeWashUsersHandler,
  addAdmin: addAdminHandler,
  removeAdmin: removeAdminHandler
};
