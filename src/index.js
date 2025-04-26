require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// Import configuration and services
const { connectMongoDB, connectRedis } = require('./config/database');
const { initDefaultPrices } = require('./controllers/priceController');
const logger = require('./utils/logger');
const { trackPerformance } = require('./middlewares/performance');

// Import routes
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const blockchainRoutes = require('./routes/blockchainRoutes');
const priceRoutes = require('./routes/priceRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance in app for controllers to access
app.set('io', io);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(trackPerformance);

// CSRF protection for all POST, PUT, DELETE routes
const csrfProtection = csrf({ cookie: true });
app.use((req, res, next) => {
  // Skip CSRF for specific endpoints that may be called from other services
  if (req.path === '/api/sign-redeem') {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Generate CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// API Routes
app.use('/api', userRoutes);
app.use('/api', transactionRoutes);
app.use('/api', blockchainRoutes);
app.use('/api', priceRoutes);

// Root route for health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AGO WASH Loyalty Program API',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    category: 'server',
    stack: err.stack,
    path: req.path
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Not found middleware
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    category: 'server',
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Set up event listeners
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`, { category: 'socket' });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`, { category: 'socket' });
  });
});

// Set up blockchain event listeners
const setupEventListeners = () => {
  const { ethers } = require('ethers');
  const { getBlockchainProvider } = require('./config/blockchain');
  const contractABI = require('../contract/abi.json');
  const User = require('./models/User');
  const { 
    sendFreeWashActivatedNotification, 
    sendFreeWashExpiredNotification,
    sendPackageRedeemedNotification
  } = require('./services/emailService');
  
  try {
    const provider = getBlockchainProvider();
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      provider
    );
    
    // Listen for FreeWashGranted event
    contract.on('FreeWashGranted', async (user, expiryTime, event) => {
      try {
        logger.info(`FreeWashGranted event for ${user}`, { 
          category: 'blockchain',
          event: 'FreeWashGranted',
          user,
          expiryTime: expiryTime.toString()
        });
        
        // Find user in database
        const userData = await User.findOne({ userAddress: user });
        
        if (userData && userData.email) {
          // Format date
          const expiryDate = new Date(expiryTime.toNumber() * 1000)
            .toISOString()
            .split('T')[0];
          
          // Send notification
          await sendFreeWashActivatedNotification(userData.email, expiryDate);
        }
        
        // Emit event to connected clients
        io.emit('freeWash:granted', {
          userAddress: user,
          expiryTime: expiryTime.toString()
        });
      } catch (error) {
        logger.error(`Error handling FreeWashGranted event: ${error.message}`, {
          category: 'blockchain',
          event: 'FreeWashGranted'
        });
      }
    });
    
    // Listen for FreeWashExpired event
    contract.on('FreeWashExpired', async (user, timestamp, event) => {
      try {
        logger.info(`FreeWashExpired event for ${user}`, { 
          category: 'blockchain',
          event: 'FreeWashExpired',
          user,
          timestamp: timestamp.toString()
        });
        
        // Find user in database
        const userData = await User.findOne({ userAddress: user });
        
        if (userData && userData.email) {
          // Send notification
          await sendFreeWashExpiredNotification(userData.email);
        }
        
        // Emit event to connected clients
        io.emit('freeWash:expired', {
          userAddress: user,
          timestamp: timestamp.toString()
        });
      } catch (error) {
        logger.error(`Error handling FreeWashExpired event: ${error.message}`, {
          category: 'blockchain',
          event: 'FreeWashExpired'
        });
      }
    });
    
    // Listen for PackageRedeemed event
    contract.on('PackageRedeemed', async (user, packageType, pointsSpent, event) => {
      try {
        logger.info(`PackageRedeemed event for ${user}`, { 
          category: 'blockchain',
          event: 'PackageRedeemed',
          user,
          packageType: packageType.toString(),
          pointsSpent: pointsSpent.toString()
        });
        
        // Find user in database
        const userData = await User.findOne({ userAddress: user });
        
        if (userData && userData.email) {
          // Send notification
          await sendPackageRedeemedNotification(
            userData.email, 
            packageType.toNumber(), 
            pointsSpent.toNumber()
          );
        }
        
        // Emit event to connected clients
        io.emit('package:redeemed', {
          userAddress: user,
          packageType: packageType.toString(),
          pointsSpent: pointsSpent.toString()
        });
      } catch (error) {
        logger.error(`Error handling PackageRedeemed event: ${error.message}`, {
          category: 'blockchain',
          event: 'PackageRedeemed'
        });
      }
    });
    
    logger.info('Blockchain event listeners set up successfully', {
      category: 'blockchain'
    });
  } catch (error) {
    logger.error(`Error setting up event listeners: ${error.message}`, {
      category: 'blockchain',
      stack: error.stack
    });
  }
};

// Start the server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    
    // Connect to Redis
    await connectRedis();
    
    // Initialize default prices
    await initDefaultPrices();
    
    // Setup blockchain event listeners
    setupEventListeners();
    
    // Start Express server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, { category: 'server' });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, {
      category: 'server',
      stack: error.stack
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...', { category: 'server' });
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed', { category: 'server' });
    
    // Close MongoDB connection
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed', { category: 'server' });
      process.exit(0);
    });
  });
  
  // If server doesn't close in 10 seconds, force exit
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down', {
      category: 'server'
    });
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, {
    category: 'server',
    stack: error.stack
  });
  
  // Exit with error
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at ${promise}, reason: ${reason}`, {
    category: 'server',
    stack: reason.stack
  });
  
  // Don't exit process, just log the error
});

// Start the server
startServer();
