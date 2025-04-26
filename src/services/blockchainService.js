const { getContract, getContractWithSigner, generateEIP712Signature } = require('../config/blockchain');
const { CacheKeys, generateKey, cacheData, getCachedData, invalidateCache } = require('./cacheService');
const logger = require('../utils/logger');

/**
 * Get user points from smart contract
 * @param {string} userAddress - User's blockchain address
 * @returns {Promise<number>} - User points
 */
const getUserPoints = async (userAddress) => {
  try {
    // Check cache first
    const cacheKey = generateKey(CacheKeys.USER_POINTS, userAddress);
    const cachedPoints = await getCachedData(cacheKey);
    
    if (cachedPoints !== null) {
      return cachedPoints;
    }
    
    // If not in cache, fetch from blockchain
    const contract = await getContract();
    const points = await contract.getUserPoints(userAddress);
    
    // Convert to number from BigNumber
    const pointsValue = Number(points.toString());
    
    // Cache the result
    await cacheData(cacheKey, pointsValue);
    
    return pointsValue;
  } catch (error) {
    logger.error(`Error getting user points for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'getUserPoints'
    });
    throw error;
  }
};

/**
 * Get NFT metadata from smart contract
 * @param {string} userAddress - User's blockchain address
 * @returns {Promise<Object>} - NFT metadata
 */
const getNFTMetadata = async (userAddress) => {
  try {
    // Check cache first
    const cacheKey = generateKey(CacheKeys.NFT_METADATA, userAddress);
    const cachedMetadata = await getCachedData(cacheKey);
    
    if (cachedMetadata !== null) {
      return cachedMetadata;
    }
    
    // If not in cache, fetch from blockchain
    const contract = await getContract();
    const metadata = await contract.getNFTMetadata(userAddress);
    
    // Transform to a more usable format
    const transformedMetadata = {
      tokenId: Number(metadata.tokenId.toString()),
      metadataURI: metadata.metadataURI,
      points: Number(metadata.points.toString()),
      tier: metadata.tier,
      expiryTime: Number(metadata.expiryTime.toString()),
      exists: metadata.exists
    };
    
    // Cache the result
    await cacheData(cacheKey, transformedMetadata);
    
    return transformedMetadata;
  } catch (error) {
    logger.error(`Error getting NFT metadata for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'getNFTMetadata'
    });
    throw error;
  }
};

/**
 * Record transaction on blockchain
 * @param {string} userAddress - User's blockchain address
 * @param {number} timestamp - Transaction timestamp
 * @returns {Promise<Object>} - Transaction result
 */
const recordTransaction = async (userAddress, timestamp) => {
  try {
    const contract = await getContractWithSigner();
    
    // Convert timestamp to seconds if it's in milliseconds
    const timestampInSeconds = Math.floor(timestamp / 1000);
    
    // Call the smart contract
    const tx = await contract.call(
      "recordTransaction",
      [userAddress, timestampInSeconds]
    );
    
    // Invalidate cache for this user
    await invalidateCache(generateKey(CacheKeys.USER_POINTS, userAddress));
    await invalidateCache(generateKey(CacheKeys.FREE_WASH_STATUS, userAddress));
    await invalidateCache(generateKey(CacheKeys.NFT_METADATA, userAddress));
    
    logger.info(`Transaction recorded for ${userAddress} at ${timestamp}`, {
      category: 'blockchain',
      function: 'recordTransaction',
      txHash: tx.receipt.transactionHash
    });
    
    return {
      success: true,
      txHash: tx.receipt.transactionHash
    };
  } catch (error) {
    logger.error(`Error recording transaction for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'recordTransaction'
    });
    throw error;
  }
};

/**
 * Update NFT metadata on blockchain
 * @param {string} userAddress - User's blockchain address
 * @param {string} newMetadataURI - New metadata URI
 * @param {string} tier - User tier (Bronze, Silver, Gold)
 * @param {number} points - User points
 * @returns {Promise<Object>} - Update result
 */
const updateNFTMetadata = async (userAddress, newMetadataURI, tier, points) => {
  try {
    const contract = await getContractWithSigner();
    
    // Call the smart contract
    const tx = await contract.call(
      "updateNFTMetadata",
      [userAddress, newMetadataURI, tier, points]
    );
    
    // Invalidate cache for this user
    await invalidateCache(generateKey(CacheKeys.NFT_METADATA, userAddress));
    
    logger.info(`NFT metadata updated for ${userAddress}`, {
      category: 'blockchain',
      function: 'updateNFTMetadata',
      txHash: tx.receipt.transactionHash
    });
    
    return {
      success: true,
      txHash: tx.receipt.transactionHash
    };
  } catch (error) {
    logger.error(`Error updating NFT metadata for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'updateNFTMetadata'
    });
    throw error;
  }
};

/**
 * Mint loyalty NFT
 * @param {string} userAddress - User's blockchain address
 * @param {string} initialMetadataURI - Initial metadata URI
 * @returns {Promise<Object>} - Mint result
 */
const mintLoyaltyNFT = async (userAddress, initialMetadataURI) => {
  try {
    const contract = await getContractWithSigner();
    
    // Call the smart contract
    const tx = await contract.call(
      "mintLoyaltyNFT",
      [userAddress, initialMetadataURI]
    );
    
    logger.info(`Loyalty NFT minted for ${userAddress}`, {
      category: 'blockchain',
      function: 'mintLoyaltyNFT',
      txHash: tx.receipt.transactionHash
    });
    
    return {
      success: true,
      txHash: tx.receipt.transactionHash
    };
  } catch (error) {
    logger.error(`Error minting loyalty NFT for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'mintLoyaltyNFT'
    });
    throw error;
  }
};

/**
 * Get free wash status
 * @param {string} userAddress - User's blockchain address
 * @returns {Promise<Object>} - Free wash status
 */
const getFreeWashStatus = async (userAddress) => {
  try {
    // Check cache first
    const cacheKey = generateKey(CacheKeys.FREE_WASH_STATUS, userAddress);
    const cachedStatus = await getCachedData(cacheKey);
    
    if (cachedStatus !== null) {
      return cachedStatus;
    }
    
    // If not in cache, fetch from blockchain
    const contract = await getContract();
    const status = await contract.getFreeWashStatus(userAddress);
    
    // Transform to a more usable format
    const transformedStatus = {
      available: status.available,
      expiryTime: Number(status.expiryTime.toString()),
      used: status.used
    };
    
    // Cache the result
    await cacheData(cacheKey, transformedStatus);
    
    return transformedStatus;
  } catch (error) {
    logger.error(`Error getting free wash status for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'getFreeWashStatus'
    });
    throw error;
  }
};

/**
 * Generate signature for redeeming package
 * @param {string} userAddress - User's blockchain address
 * @param {number} packageType - Package type to redeem
 * @param {number} nonce - Nonce for the signature
 * @returns {Promise<string>} - EIP-712 signature
 */
const signRedeemPackage = async (userAddress, packageType, nonce) => {
  try {
    // Check if user has enough points
    const points = await getUserPoints(userAddress);
    
    // Determine required points based on package type
    let requiredPoints = 0;
    switch (packageType) {
      case 1: // Basic package
        requiredPoints = 1000;
        break;
      case 2: // Premium package
        requiredPoints = 3000;
        break;
      case 3: // Deluxe package
        requiredPoints = 5000;
        break;
      default:
        throw new Error('Invalid package type');
    }
    
    // Verify user has enough points
    if (points < requiredPoints) {
      throw new Error(`Insufficient points. Required: ${requiredPoints}, Available: ${points}`);
    }
    
    // Generate the signature
    const signature = await generateEIP712Signature(userAddress, packageType, nonce);
    
    logger.info(`Signature generated for package redemption - ${userAddress}, Package: ${packageType}, Nonce: ${nonce}`, {
      category: 'blockchain',
      function: 'signRedeemPackage'
    });
    
    return signature;
  } catch (error) {
    logger.error(`Error generating signature for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'signRedeemPackage'
    });
    throw error;
  }
};

/**
 * Check if address is admin
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} - Is admin
 */
const isAdmin = async (address) => {
  try {
    // Check cache first
    const cacheKey = generateKey(CacheKeys.ADMINS, 'list');
    let adminsList = await getCachedData(cacheKey);
    
    if (!adminsList) {
      // If not in cache, fetch from blockchain
      const contract = await getContract();
      adminsList = await contract.getAdmins();
      
      // Get owner as well, who is always an admin
      const owner = await contract.owner();
      
      // Combine owner with admins list
      adminsList = [...adminsList, owner];
      
      // Cache the result
      await cacheData(cacheKey, adminsList);
    }
    
    // Check if the address is in the admins list (case-insensitive)
    return adminsList.some(admin => admin.toLowerCase() === address.toLowerCase());
  } catch (error) {
    logger.error(`Error checking admin status for ${address}: ${error.message}`, {
      category: 'blockchain',
      function: 'isAdmin'
    });
    throw error;
  }
};

/**
 * Add admin
 * @param {string} adminAddress - New admin address
 * @returns {Promise<Object>} - Result
 */
const addAdmin = async (adminAddress) => {
  try {
    const contract = await getContractWithSigner();
    
    // Call the smart contract
    const tx = await contract.call("addAdmin", [adminAddress]);
    
    // Invalidate admins cache
    await invalidateCache(generateKey(CacheKeys.ADMINS, 'list'));
    
    logger.info(`Admin added: ${adminAddress}`, {
      category: 'blockchain',
      function: 'addAdmin',
      txHash: tx.receipt.transactionHash
    });
    
    return {
      success: true,
      txHash: tx.receipt.transactionHash
    };
  } catch (error) {
    logger.error(`Error adding admin ${adminAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'addAdmin'
    });
    throw error;
  }
};

/**
 * Remove admin
 * @param {string} adminAddress - Admin address to remove
 * @returns {Promise<Object>} - Result
 */
const removeAdmin = async (adminAddress) => {
  try {
    const contract = await getContractWithSigner();
    
    // Call the smart contract
    const tx = await contract.call("removeAdmin", [adminAddress]);
    
    // Invalidate admins cache
    await invalidateCache(generateKey(CacheKeys.ADMINS, 'list'));
    
    logger.info(`Admin removed: ${adminAddress}`, {
      category: 'blockchain',
      function: 'removeAdmin',
      txHash: tx.receipt.transactionHash
    });
    
    return {
      success: true,
      txHash: tx.receipt.transactionHash
    };
  } catch (error) {
    logger.error(`Error removing admin ${adminAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'removeAdmin'
    });
    throw error;
  }
};

/**
 * Get activity log
 * @param {string} userAddress - User's blockchain address
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {Promise<Array>} - Activity logs
 */
const getActivityLog = async (userAddress, page = 1, pageSize = 10) => {
  try {
    // Check cache first
    const cacheKey = generateKey(CacheKeys.ACTIVITY_LOG, `${userAddress}:${page}:${pageSize}`);
    const cachedLogs = await getCachedData(cacheKey);
    
    if (cachedLogs !== null) {
      return cachedLogs;
    }
    
    // If not in cache, fetch from blockchain
    const contract = await getContract();
    const logs = await contract.getActivityLog(userAddress, page - 1, pageSize);
    
    // Transform to a more usable format
    const transformedLogs = logs.map(log => ({
      eventType: log.eventType,
      user: log.user,
      timestamp: Number(log.timestamp.toString()),
      data: log.data
    }));
    
    // Cache the result
    await cacheData(cacheKey, transformedLogs);
    
    return transformedLogs;
  } catch (error) {
    logger.error(`Error getting activity log for ${userAddress}: ${error.message}`, {
      category: 'blockchain',
      function: 'getActivityLog'
    });
    throw error;
  }
};

/**
 * Get active free wash users
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {Promise<Object>} - Active free wash users
 */
const getActiveFreeWashUsers = async (page = 1, pageSize = 10) => {
  try {
    const contract = await getContract();
    const result = await contract.getActiveFreeWashUsers(page - 1, pageSize);
    
    // Transform to a more usable format
    const users = result.users;
    const expiryTimes = result.expiryTimes.map(time => Number(time.toString()));
    
    const activeFreeWashes = users.map((user, index) => ({
      userAddress: user,
      expiryTime: expiryTimes[index]
    }));
    
    return activeFreeWashes;
  } catch (error) {
    logger.error(`Error getting active free wash users: ${error.message}`, {
      category: 'blockchain',
      function: 'getActiveFreeWashUsers'
    });
    throw error;
  }
};

module.exports = {
  getUserPoints,
  getNFTMetadata,
  recordTransaction,
  updateNFTMetadata,
  mintLoyaltyNFT,
  getFreeWashStatus,
  signRedeemPackage,
  isAdmin,
  addAdmin,
  removeAdmin,
  getActivityLog,
  getActiveFreeWashUsers
};
