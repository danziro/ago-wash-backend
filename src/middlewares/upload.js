const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

// Temporary storage configuration
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  // Accept only jpeg and png
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    logger.warn(`Rejected file upload: Invalid mimetype ${file.mimetype}`, {
      category: 'security',
      ip: req.ip,
      filename: file.originalname
    });
    
    cb(new Error('Only JPEG and PNG images are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
  },
  fileFilter: fileFilter
});

// Error handler for file upload
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred during upload
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn(`File upload rejected: File too large (max 2MB)`, {
        category: 'security',
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'File Too Large',
        message: 'File size exceeds the 2MB limit'
      });
    }
    
    logger.error(`Multer upload error: ${err.message}`, {
      category: 'api',
      ip: req.ip,
      code: err.code
    });
    
    return res.status(400).json({
      error: 'Upload Error',
      message: err.message
    });
  } else if (err) {
    // Non-Multer error
    logger.error(`Upload error: ${err.message}`, {
      category: 'api',
      ip: req.ip
    });
    
    return res.status(400).json({
      error: 'Upload Error',
      message: err.message
    });
  }
  
  next();
};

module.exports = {
  upload,
  handleUploadError
};
