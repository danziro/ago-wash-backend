const { isAdmin } = require('../services/blockchainService');
const logger = require('../utils/logger');

/**
 * Middleware to check API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkApiKey = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('API key missing or invalid format', { 
        category: 'security',
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid API key' 
      });
    }
    
    const apiKey = authHeader.split(' ')[1];
    
    if (apiKey !== process.env.API_KEY) {
      logger.warn('Invalid API key provided', { 
        category: 'security',
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid API key' 
      });
    }
    
    next();
  } catch (error) {
    logger.error(`Error in API key validation: ${error.message}`, { 
      category: 'security',
      ip: req.ip,
      path: req.path
    });
    
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'An error occurred during authentication' 
    });
  }
};

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkAdmin = async (req, res, next) => {
  try {
    // First check API key
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.API_KEY) {
      logger.warn('Admin access attempted with invalid API key', { 
        category: 'security',
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid API key' 
      });
    }
    
    // Get admin address from request body or query
    const adminAddress = req.body.adminAddress || 
                         req.query.adminAddress || 
                         req.body.callerAddress || 
                         req.query.callerAddress;
    
    if (!adminAddress) {
      logger.warn('Admin access attempted without providing address', { 
        category: 'security',
        ip: req.ip,
        path: req.path
      });
      
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Admin address is required' 
      });
    }
    
    // Check if user is admin
    const admin = await isAdmin(adminAddress);
    
    if (!admin) {
      logger.warn(`Unauthorized admin access attempt by ${adminAddress}`, { 
        category: 'security',
        ip: req.ip,
        path: req.path,
        adminAddress
      });
      
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Not authorized as admin' 
      });
    }
    
    // Store admin address for logging
    req.adminAddress = adminAddress;
    
    next();
  } catch (error) {
    logger.error(`Error in admin validation: ${error.message}`, { 
      category: 'security',
      ip: req.ip,
      path: req.path
    });
    
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'An error occurred during admin authentication' 
    });
  }
};

module.exports = {
  checkApiKey,
  checkAdmin
};
