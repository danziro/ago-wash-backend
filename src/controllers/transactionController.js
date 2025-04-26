const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { recordTransaction, getUserPoints, getNFTMetadata } = require('../services/blockchainService');
const { determineTierByPoints } = require('../services/ipfsService');
const { sendTierUpgradeNotification, sendFreeWashActivatedNotification } = require('../services/emailService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Record a transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const recordTransactionHandler = async (req, res) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userAddress, date, vehicleType, serviceType, price } = req.body;
    
    // Find user in database
    const user = await User.findOne({ userAddress });
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User with this address does not exist'
      });
    }
    
    // Get current timestamp
    const currentTimestamp = Date.now();
    
    // Record transaction in MongoDB first
    const transaction = new Transaction({
      userAddress,
      date,
      vehicleType,
      serviceType,
      price,
      recordedOnChain: false
    });
    
    await transaction.save({ session });
    
    // Record on blockchain
    try {
      const result = await recordTransaction(userAddress, currentTimestamp);
      
      // Update transaction with blockchain tx hash
      transaction.recordedOnChain = true;
      transaction.blockchainTxHash = result.txHash;
      await transaction.save({ session });
      
      // Send notification about free wash activation
      try {
        await sendFreeWashActivatedNotification(user.email, date);
      } catch (emailError) {
        logger.error(`Failed to send free wash activation email: ${emailError.message}`, {
          category: 'email',
          function: 'recordTransaction'
        });
        // Continue execution even if email fails
      }
      
      // Get updated user points and check tier
      const points = await getUserPoints(userAddress);
      const newTier = determineTierByPoints(points);
      
      // Get current tier from blockchain
      const nftMetadata = await getNFTMetadata(userAddress);
      const currentTier = nftMetadata.tier || 'Bronze';
      
      // If tier has changed, notify admin
      if (newTier !== currentTier) {
        try {
          await sendTierUpgradeNotification(userAddress, points, newTier);
          
          logger.info(`Tier upgrade notification sent for ${userAddress}: ${currentTier} -> ${newTier}`, {
            category: 'email',
            function: 'recordTransaction'
          });
        } catch (emailError) {
          logger.error(`Failed to send tier upgrade email: ${emailError.message}`, {
            category: 'email',
            function: 'recordTransaction'
          });
          // Continue execution even if email fails
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      // Emit WebSocket event if available
      if (req.app.get('io')) {
        const io = req.app.get('io');
        
        // Emit transaction record event to all connected clients
        io.emit('transaction:recorded', {
          userAddress,
          date,
          vehicleType,
          serviceType,
          points
        });
        
        // If tier upgraded, emit tier upgrade event
        if (newTier !== currentTier) {
          io.emit('tier:upgraded', {
            userAddress,
            previousTier: currentTier,
            newTier,
            points
          });
        }
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        txHash: result.txHash,
        points,
        tier: newTier
      });
      
    } catch (blockchainError) {
      // Rollback transaction if blockchain call fails
      await session.abortTransaction();
      session.endSession();
      
      logger.error(`Blockchain error in recordTransaction: ${blockchainError.message}`, {
        category: 'blockchain',
        function: 'recordTransaction',
        stack: blockchainError.stack
      });
      
      return res.status(500).json({
        error: 'Blockchain Error',
        message: `Failed to record transaction on blockchain: ${blockchainError.message}`
      });
    }
    
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Error recording transaction: ${error.message}`, {
      category: 'api',
      function: 'recordTransaction',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record transaction'
    });
  }
};

/**
 * Get transactions by date
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransactionsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Find transactions for this date
    const transactions = await Transaction.find({ date }).sort({ createdAt: -1 });
    
    // Return transactions
    return res.status(200).json({
      transactions: await Promise.all(transactions.map(async tx => {
        // Get user name if available
        const user = await User.findOne({ userAddress: tx.userAddress }, { name: 1 });
        
        return {
          userAddress: tx.userAddress,
          userName: user ? user.name : 'Unknown',
          date: tx.date,
          vehicleType: tx.vehicleType,
          serviceType: tx.serviceType,
          price: tx.price,
          createdAt: tx.createdAt
        };
      }))
    });
    
  } catch (error) {
    logger.error(`Error getting transactions by date: ${error.message}`, {
      category: 'api',
      function: 'getTransactionsByDate',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get transactions'
    });
  }
};

/**
 * Get analytics data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAnalytics = async (req, res) => {
  try {
    // Aggregate transactions by vehicle and service type
    const transactionsByType = await Transaction.aggregate([
      {
        $group: {
          _id: {
            vehicleType: '$vehicleType',
            serviceType: '$serviceType'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Aggregate transactions by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const transactionsByDate = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Return analytics data
    return res.status(200).json({
      transactionsByType,
      transactionsByDate
    });
    
  } catch (error) {
    logger.error(`Error getting analytics: ${error.message}`, {
      category: 'api',
      function: 'getAnalytics',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get analytics data'
    });
  }
};

/**
 * Get monitoring data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMonitoring = async (req, res) => {
  try {
    // Get daily transaction counts for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get recent errors from logs
    const Log = require('../models/Log');
    const recentErrors = await Log.find(
      { level: 'error' },
      { timestamp: 1, message: 1, category: 1, metadata: 1 }
    )
      .sort({ timestamp: -1 })
      .limit(5);
    
    // Transform errors for response
    const formattedErrors = recentErrors.map(err => ({
      timestamp: err.timestamp,
      message: err.message,
      category: err.category,
      details: err.metadata
    }));
    
    // Return monitoring data
    return res.status(200).json({
      dailyTransactions,
      recentErrors: formattedErrors
    });
    
  } catch (error) {
    logger.error(`Error getting monitoring data: ${error.message}`, {
      category: 'api',
      function: 'getMonitoring',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get monitoring data'
    });
  }
};

module.exports = {
  recordTransaction: recordTransactionHandler,
  getTransactionsByDate,
  getAnalytics,
  getMonitoring
};
