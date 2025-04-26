const logger = require('../utils/logger');
const Log = require('../models/Log');

/**
 * Middleware for tracking API performance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const trackPerformance = (req, res, next) => {
  // Record request start time
  const startTime = Date.now();
  
  // Record original end method
  const originalEnd = res.end;
  
  // Override end method to calculate and log response time
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Store the response time in the request object
    req.responseTime = responseTime;
    
    // Log performance data
    const performanceData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: responseTime,
      userAddress: req.body.userAddress || req.query.userAddress || null,
      adminAddress: req.adminAddress || null
    };
    
    // Log to winston
    logger.debug(`Response time: ${responseTime}ms for ${req.method} ${req.path}`, {
      category: 'performance',
      ...performanceData
    });
    
    // For slower responses, log to MongoDB
    if (responseTime > 1000) {
      const log = new Log({
        level: 'warn',
        message: `Slow response time (${responseTime}ms) for ${req.method} ${req.path}`,
        category: 'performance',
        metadata: performanceData,
        ip: req.ip,
        adminAddress: req.adminAddress
      });
      
      log.save().catch(err => {
        logger.error(`Failed to save performance log: ${err.message}`);
      });
    }
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = {
  trackPerformance
};
