const rateLimit = require('express-rate-limit');
const { sendRateLimitExceededNotification } = require('../services/emailService');
const logger = require('../utils/logger');

// Standard rate limiter - 100 requests per minute per IP
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, next) => {
    const endpoint = req.originalUrl;
    logger.warn(`Rate limit exceeded for IP ${req.ip} on endpoint ${endpoint}`, {
      category: 'security',
      ip: req.ip,
      endpoint
    });
    
    // Send email notification about rate limit exceed
    try {
      await sendRateLimitExceededNotification(req.ip, endpoint);
    } catch (error) {
      logger.error(`Failed to send rate limit notification: ${error.message}`, {
        category: 'email'
      });
    }
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
});

// Restricted rate limiter for sign-redeem endpoint - 5 requests per minute per IP
const signRedeemLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, next) => {
    logger.warn(`Sign-redeem rate limit exceeded for IP ${req.ip}`, {
      category: 'security',
      ip: req.ip,
      endpoint: '/api/sign-redeem'
    });
    
    // Send email notification about rate limit exceed
    try {
      await sendRateLimitExceededNotification(req.ip, '/api/sign-redeem');
    } catch (error) {
      logger.error(`Failed to send rate limit notification: ${error.message}`, {
        category: 'email'
      });
    }
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit for signature generation exceeded. Please try again later.'
    });
  }
});

module.exports = {
  standardLimiter,
  signRedeemLimiter
};
