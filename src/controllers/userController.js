const User = require('../models/User');
const { uploadFileToIPFS, uploadMetadataToIPFS, generateNFTMetadata } = require('../services/ipfsService');
const { mintLoyaltyNFT } = require('../services/blockchainService');
const logger = require('../utils/logger');

/**
 * Add a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addUser = async (req, res) => {
  try {
    const { userAddress, name, motorbikeType, dateOfBirth, email } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ userAddress });
    if (existingUser) {
      return res.status(400).json({
        error: 'User Exists',
        message: 'User with this address already exists'
      });
    }
    
    // Handle photo upload to IPFS if provided
    let photoUrl = 'https://via.placeholder.com/150';
    let photoIpfsUrl = null;
    
    if (req.file) {
      try {
        // Upload photo to IPFS
        const photoCid = await uploadFileToIPFS(req.file.buffer);
        photoIpfsUrl = `ipfs://${photoCid}`;
        photoUrl = `${process.env.IPFS_GATEWAY}${photoCid}`;
        
        logger.info(`Photo uploaded to IPFS for user ${userAddress}`, {
          category: 'api',
          function: 'addUser',
          cid: photoCid
        });
      } catch (error) {
        logger.error(`IPFS upload error: ${error.message}`, {
          category: 'api',
          function: 'addUser'
        });
        
        // Continue with placeholder photo
        photoUrl = 'https://via.placeholder.com/150';
        photoIpfsUrl = null;
      }
    }
    
    // Generate NFT metadata
    const metadata = generateNFTMetadata(photoIpfsUrl || photoUrl);
    
    // Upload metadata to IPFS
    const metadataCid = await uploadMetadataToIPFS(metadata);
    const metadataURI = `ipfs://${metadataCid}`;
    
    // Create new user
    const user = new User({
      userAddress,
      name,
      motorbikeType,
      dateOfBirth,
      email,
      photoUrl,
      metadataURI
    });
    
    // Save user to database
    await user.save();
    
    // Mint NFT on blockchain (this will be handled asynchronously to not block the response)
    mintLoyaltyNFT(userAddress, metadataURI)
      .then(result => {
        logger.info(`NFT minted successfully for ${userAddress}`, {
          category: 'blockchain',
          function: 'addUser',
          txHash: result.txHash
        });
      })
      .catch(error => {
        logger.error(`Failed to mint NFT for ${userAddress}: ${error.message}`, {
          category: 'blockchain',
          function: 'addUser'
        });
        // Consider implementing a retry mechanism or queue for failed mints
      });
    
    // Return success response
    return res.status(201).json({
      success: true,
      metadataURI,
      user: {
        userAddress,
        name,
        motorbikeType,
        dateOfBirth,
        email,
        photoUrl
      }
    });
    
  } catch (error) {
    logger.error(`Error adding user: ${error.message}`, {
      category: 'api',
      function: 'addUser',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add user'
    });
  }
};

/**
 * Get user data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUser = async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    // Find user in database
    const user = await User.findOne({ userAddress });
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User with this address does not exist'
      });
    }
    
    // Return user data
    return res.status(200).json({
      userAddress: user.userAddress,
      name: user.name,
      motorbikeType: user.motorbikeType,
      dateOfBirth: user.dateOfBirth,
      email: user.email,
      photoUrl: user.photoUrl
    });
    
  } catch (error) {
    logger.error(`Error getting user: ${error.message}`, {
      category: 'api',
      function: 'getUser',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user data'
    });
  }
};

/**
 * Update user data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUser = async (req, res) => {
  try {
    const { userAddress, name, motorbikeType, dateOfBirth, email } = req.body;
    
    // Find user in database
    const user = await User.findOne({ userAddress });
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User with this address does not exist'
      });
    }
    
    // Update user fields if provided
    if (name) user.name = name;
    if (motorbikeType) user.motorbikeType = motorbikeType;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (email) user.email = email;
    
    // Handle photo upload to IPFS if provided
    let metadataUpdated = false;
    let metadataURI = user.metadataURI;
    
    if (req.file) {
      try {
        // Upload photo to IPFS
        const photoCid = await uploadFileToIPFS(req.file.buffer);
        const photoIpfsUrl = `ipfs://${photoCid}`;
        const photoUrl = `${process.env.IPFS_GATEWAY}${photoCid}`;
        
        logger.info(`Photo updated and uploaded to IPFS for user ${userAddress}`, {
          category: 'api',
          function: 'updateUser',
          cid: photoCid
        });
        
        // Update user photo URL
        user.photoUrl = photoUrl;
        
        // Check if user has metadata URI
        if (user.metadataURI) {
          // Attempt to parse existing metadata URI to extract CID
          // This assumes metadataURI is in format ipfs://<cid>
          const existingMetadata = await fetch(`${process.env.IPFS_GATEWAY}${user.metadataURI.replace('ipfs://', '')}`)
            .then(res => res.json())
            .catch(() => null);
          
          if (existingMetadata) {
            // Update metadata with new photo
            existingMetadata.image = photoIpfsUrl;
            
            // Upload updated metadata to IPFS
            const metadataCid = await uploadMetadataToIPFS(existingMetadata);
            metadataURI = `ipfs://${metadataCid}`;
            user.metadataURI = metadataURI;
            metadataUpdated = true;
          } else {
            // If failed to fetch existing metadata, create new one
            const metadata = generateNFTMetadata(photoIpfsUrl);
            const metadataCid = await uploadMetadataToIPFS(metadata);
            metadataURI = `ipfs://${metadataCid}`;
            user.metadataURI = metadataURI;
            metadataUpdated = true;
          }
        } else {
          // If no existing metadata, create new
          const metadata = generateNFTMetadata(photoIpfsUrl);
          const metadataCid = await uploadMetadataToIPFS(metadata);
          metadataURI = `ipfs://${metadataCid}`;
          user.metadataURI = metadataURI;
          metadataUpdated = true;
        }
      } catch (error) {
        logger.error(`IPFS upload error during user update: ${error.message}`, {
          category: 'api',
          function: 'updateUser'
        });
        
        // Continue without updating photo/metadata
      }
    }
    
    // Save updated user to database
    await user.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      metadataURI: metadataUpdated ? metadataURI : user.metadataURI,
      user: {
        userAddress: user.userAddress,
        name: user.name,
        motorbikeType: user.motorbikeType,
        dateOfBirth: user.dateOfBirth,
        email: user.email,
        photoUrl: user.photoUrl
      }
    });
    
  } catch (error) {
    logger.error(`Error updating user: ${error.message}`, {
      category: 'api',
      function: 'updateUser',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user data'
    });
  }
};

/**
 * Delete user data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = async (req, res) => {
  try {
    const { userAddress } = req.body;
    
    // Find and delete user
    const result = await User.deleteOne({ userAddress });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User with this address does not exist'
      });
    }
    
    // Also delete user transactions
    const Transaction = require('../models/Transaction');
    await Transaction.deleteMany({ userAddress });
    
    logger.info(`User data deleted for ${userAddress}`, {
      category: 'api',
      function: 'deleteUser'
    });
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'User data deleted successfully'
    });
    
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`, {
      category: 'api',
      function: 'deleteUser',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user data'
    });
  }
};

module.exports = {
  addUser,
  getUser,
  updateUser,
  deleteUser
};
