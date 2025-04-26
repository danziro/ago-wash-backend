const Price = require('../models/Price');
const { CacheKeys, generateKey, cacheData, invalidateCache } = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Initialize default prices
 */
const initDefaultPrices = async () => {
  try {
    // Check if any prices exist
    const count = await Price.countDocuments();
    
    if (count === 0) {
      logger.info('Initializing default prices', { category: 'price' });
      
      // Create default prices
      const defaultPrices = [
        {
          vehicle: 'motor',
          serviceType: 'reguler',
          prices: {
            kecil: 18000,
            sedang: 20000,
            besar: 25000
          }
        },
        {
          vehicle: 'motor',
          serviceType: 'premium',
          prices: {
            kecil: 30000,
            sedang: 32000,
            besar: 35000
          }
        },
        {
          vehicle: 'mobil',
          serviceType: 'bodyOnly',
          prices: {
            kecil: 55000,
            sedang: 60000,
            besar: 65000
          }
        }
      ];
      
      // Insert default prices
      await Price.insertMany(defaultPrices);
      
      // Cache prices
      await cacheData(generateKey(CacheKeys.PRICES, 'all'), defaultPrices);
      
      logger.info('Default prices initialized', { category: 'price' });
    }
  } catch (error) {
    logger.error(`Error initializing default prices: ${error.message}`, {
      category: 'price',
      stack: error.stack
    });
  }
};

/**
 * Get all prices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPrices = async (req, res) => {
  try {
    // Check cache first
    const cacheKey = generateKey(CacheKeys.PRICES, 'all');
    const cachedPrices = await getCachedData(cacheKey);
    
    if (cachedPrices) {
      return res.status(200).json(formatPricesResponse(cachedPrices));
    }
    
    // Get prices from database
    const prices = await Price.find({});
    
    // Cache prices for 1 hour (360 minutes)
    await cacheData(cacheKey, prices, 60 * 60);
    
    // Return formatted prices
    return res.status(200).json(formatPricesResponse(prices));
    
  } catch (error) {
    logger.error(`Error getting prices: ${error.message}`, {
      category: 'api',
      function: 'getPrices',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get prices'
    });
  }
};

/**
 * Update price
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePrice = async (req, res) => {
  try {
    const { vehicle, serviceType, prices } = req.body;
    
    // Validate input
    if (!vehicle || !serviceType || !prices) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'vehicle, serviceType, and prices are required'
      });
    }
    
    // Validate prices
    if (!prices.kecil || !prices.sedang || !prices.besar) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'prices must include kecil, sedang, and besar'
      });
    }
    
    // Find and update price
    const result = await Price.findOneAndUpdate(
      { vehicle, serviceType },
      { prices },
      { new: true, upsert: true }
    );
    
    // Invalidate price cache
    await invalidateCache(generateKey(CacheKeys.PRICES, 'all'));
    
    // Log admin action
    logger.info(`Admin ${req.adminAddress} updated price for ${vehicle} ${serviceType}`, {
      category: 'admin',
      action: 'updatePrice',
      adminAddress: req.adminAddress,
      vehicle,
      serviceType,
      prices
    });
    
    // Return updated price
    return res.status(200).json({
      success: true,
      price: {
        vehicle: result.vehicle,
        serviceType: result.serviceType,
        prices: result.prices
      }
    });
    
  } catch (error) {
    logger.error(`Error updating price: ${error.message}`, {
      category: 'api',
      function: 'updatePrice',
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update price'
    });
  }
};

/**
 * Format prices for response
 * @param {Array} prices - Array of price documents
 * @returns {Object} - Formatted prices
 */
const formatPricesResponse = (prices) => {
  // Initialize response structure
  const response = {
    motor: {
      reguler: {},
      premium: {}
    },
    mobil: {
      bodyOnly: {}
    }
  };
  
  // Populate response with prices
  prices.forEach(price => {
    if (response[price.vehicle] && response[price.vehicle][price.serviceType]) {
      response[price.vehicle][price.serviceType] = price.prices;
    }
  });
  
  return response;
};

module.exports = {
  initDefaultPrices,
  getPrices,
  updatePrice
};
