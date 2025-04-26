const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate user input
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(
        { ...req.body, ...req.query, ...req.params }, 
        { abortEarly: false }
      );
      
      if (error) {
        const errorDetails = error.details.map(detail => detail.message).join(', ');
        
        logger.warn(`Validation error: ${errorDetails}`, { 
          category: 'api',
          ip: req.ip,
          path: req.path
        });
        
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: errorDetails 
        });
      }
      
      next();
    } catch (err) {
      logger.error(`Unexpected validation error: ${err.message}`, { 
        category: 'api',
        ip: req.ip,
        path: req.path
      });
      
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Validation processing error' 
      });
    }
  };
};

// Schema for Ethereum address validation
const ethereumAddressSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .message('Must be a valid Ethereum address (42 characters starting with 0x)');

// Schema for ISO date validation
const isoDateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .message('Date must be in YYYY-MM-DD format');

// Add User Validation Schema
const addUserSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
  name: Joi.string().min(1).max(100).required(),
  motorbikeType: Joi.string().min(1).max(100).required(),
  dateOfBirth: isoDateSchema.required(),
  email: Joi.string().email().required(),
  // Note: photo is validated in the multer middleware
});

// Get User Validation Schema
const getUserSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
});

// Update User Validation Schema
const updateUserSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
  name: Joi.string().min(1).max(100),
  motorbikeType: Joi.string().min(1).max(100),
  dateOfBirth: isoDateSchema,
  email: Joi.string().email(),
  // Note: photo is validated in the multer middleware
});

// Delete User Validation Schema
const deleteUserSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
});

// Record Transaction Validation Schema
const recordTransactionSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
  date: isoDateSchema.required(),
  vehicleType: Joi.string().valid(
    'Motor Kecil', 
    'Motor Sedang', 
    'Motor Besar', 
    'Mobil Kecil', 
    'Mobil Sedang', 
    'Mobil Besar'
  ).required(),
  serviceType: Joi.string().valid('Reguler', 'Premium', 'Body Only').required(),
  price: Joi.number().min(0).required(),
});

// Update NFT Frame Validation Schema
const updateNFTFrameSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
});

// Sign Redeem Validation Schema
const signRedeemSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
  packageType: Joi.number().integer().min(1).max(3).required(),
  nonce: Joi.number().integer().min(0).required(),
});

// Add Admin Validation Schema
const addAdminSchema = Joi.object({
  adminAddress: ethereumAddressSchema.required(),
});

// Remove Admin Validation Schema
const removeAdminSchema = Joi.object({
  adminAddress: ethereumAddressSchema.required(),
});

// Activity Log Validation Schema
const activityLogSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
});

// User Points Validation Schema
const userPointsSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
});

// Free Wash Status Validation Schema
const freeWashStatusSchema = Joi.object({
  userAddress: ethereumAddressSchema.required(),
});

// Transactions By Date Validation Schema
const transactionsByDateSchema = Joi.object({
  date: isoDateSchema.required(),
});

module.exports = {
  validate,
  addUserSchema,
  getUserSchema,
  updateUserSchema,
  deleteUserSchema,
  recordTransactionSchema,
  updateNFTFrameSchema,
  signRedeemSchema,
  addAdminSchema,
  removeAdminSchema,
  activityLogSchema,
  userPointsSchema,
  freeWashStatusSchema,
  transactionsByDateSchema,
};
