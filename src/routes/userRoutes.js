const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkApiKey } = require('../middlewares/auth');
const { validate, addUserSchema, getUserSchema, updateUserSchema, deleteUserSchema } = require('../middlewares/validation');
const { upload, handleUploadError } = require('../middlewares/upload');
const { standardLimiter } = require('../middlewares/rateLimit');

// Apply API key check and rate limiting to all routes
router.use(checkApiKey);
router.use(standardLimiter);

// Add user
router.post(
  '/add-user',
  upload.single('photo'),
  handleUploadError,
  validate(addUserSchema),
  userController.addUser
);

// Get user
router.get(
  '/get-user',
  validate(getUserSchema),
  userController.getUser
);

// Update user
router.put(
  '/update-user',
  upload.single('photo'),
  handleUploadError,
  validate(updateUserSchema),
  userController.updateUser
);

// Delete user
router.delete(
  '/delete-user',
  validate(deleteUserSchema),
  userController.deleteUser
);

module.exports = router;
