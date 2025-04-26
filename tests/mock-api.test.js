const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Routes
const userRoutes = require('../src/routes/userRoutes');
const transactionRoutes = require('../src/routes/transactionRoutes');
const blockchainRoutes = require('../src/routes/blockchainRoutes');
const priceRoutes = require('../src/routes/priceRoutes');

// Mock dependencies
jest.mock('../src/services/blockchainService', () => require('./mocks/blockchainService'));
jest.mock('../src/services/ipfsService', () => require('./mocks/ipfsService'));
jest.mock('../src/services/emailService', () => require('./mocks/emailService'));
jest.mock('../src/services/cacheService', () => require('./mocks/cacheService'));
jest.mock('../src/utils/logger', () => require('./mocks/logger'));

// Mock middleware
jest.mock('../src/middlewares/auth', () => ({
  checkApiKey: (req, res, next) => {
    req.apiKey = 'test-api-key';
    next();
  },
  checkAdmin: (req, res, next) => {
    req.adminAddress = '0xAdminAddress12345678901234567890123456789012';
    req.isAdmin = true;
    next();
  }
}));

// Mock rate limit middleware
jest.mock('../src/middlewares/rateLimit', () => ({
  standardLimiter: (req, res, next) => next(),
  signRedeemLimiter: (req, res, next) => next()
}));

// Mock upload middleware
jest.mock('../src/middlewares/upload', () => ({
  upload: {
    single: () => (req, res, next) => next()
  },
  handleUploadError: (req, res, next) => next()
}));

// Mock validation middleware
jest.mock('../src/middlewares/validation', () => ({
  validate: () => (req, res, next) => next(),
  addUserSchema: {},
  getUserSchema: {},
  updateUserSchema: {},
  deleteUserSchema: {},
  recordTransactionSchema: {},
  transactionsByDateSchema: {},
  userPointsSchema: {},
  freeWashStatusSchema: {},
  updateNFTFrameSchema: {},
  signRedeemSchema: {},
  activityLogSchema: {},
  addAdminSchema: {},
  removeAdminSchema: {}
}));

let mongoServer;
let app;

// Set up test app and in-memory MongoDB
beforeAll(async () => {
  // Create in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect mongoose to in-memory database
  await mongoose.connect(mongoUri);
  
  // Create test app
  app = express();
  app.use(express.json());
  
  // Add routes
  app.use('/api', userRoutes);
  app.use('/api', transactionRoutes);
  app.use('/api', blockchainRoutes);
  app.use('/api', priceRoutes);
});

// Clean up after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Test user endpoints
describe('User API Endpoints', () => {
  test('POST /api/add-user should add a new user', async () => {
    const userData = {
      userAddress: '0x1234567890123456789012345678901234567890',
      name: 'Budi Santoso',
      motorbikeType: 'Honda Vario',
      dateOfBirth: '1990-01-01',
      email: 'budi@example.com'
    };
    
    const response = await request(app)
      .post('/api/add-user')
      .send(userData);
      
    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
  });
  
  test('GET /api/get-user should return user data', async () => {
    const response = await request(app)
      .get('/api/get-user?userAddress=0x1234567890123456789012345678901234567890');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// Test transaction endpoints
describe('Transaction API Endpoints', () => {
  test('POST /api/record-transaction should record a transaction', async () => {
    const transactionData = {
      userAddress: '0x1234567890123456789012345678901234567890',
      date: '2025-04-25',
      vehicleType: 'Motor Kecil',
      serviceType: 'Reguler',
      price: 18000
    };
    
    const response = await request(app)
      .post('/api/record-transaction')
      .send(transactionData);
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('GET /api/transactions-by-date should return transactions for a specific date', async () => {
    const response = await request(app)
      .get('/api/transactions-by-date?date=2025-04-25');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('GET /api/analytics should return transaction analytics', async () => {
    const response = await request(app)
      .get('/api/analytics');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('GET /api/monitoring should return monitoring data', async () => {
    const response = await request(app)
      .get('/api/monitoring');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// Test blockchain endpoints
describe('Blockchain API Endpoints', () => {
  test('GET /api/user-points should return user points', async () => {
    const response = await request(app)
      .get('/api/user-points?userAddress=0x1234567890123456789012345678901234567890');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.points).toBe(150);
  });
  
  test('GET /api/free-wash-status should return free wash status', async () => {
    const response = await request(app)
      .get('/api/free-wash-status?userAddress=0x1234567890123456789012345678901234567890');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.active).toBe(true);
  });
  
  test('POST /api/update-nft-frame should update NFT frame', async () => {
    const response = await request(app)
      .post('/api/update-nft-frame')
      .send({ userAddress: '0x1234567890123456789012345678901234567890' });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('POST /api/sign-redeem should generate EIP-712 signature', async () => {
    const response = await request(app)
      .post('/api/sign-redeem')
      .send({
        userAddress: '0x1234567890123456789012345678901234567890',
        packageType: 1
      });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.signature).toBe('0xsignature');
  });
  
  test('GET /api/activity-log should return activity log', async () => {
    const response = await request(app)
      .get('/api/activity-log?userAddress=0x1234567890123456789012345678901234567890&page=1&limit=10');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('GET /api/active-free-washes should return active free wash users', async () => {
    const response = await request(app)
      .get('/api/active-free-washes');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('POST /api/add-admin should add a new admin', async () => {
    const response = await request(app)
      .post('/api/add-admin')
      .send({
        adminAddress: '0xNewAdmin1234567890123456789012345678901234'
      });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  test('POST /api/remove-admin should remove an admin', async () => {
    const response = await request(app)
      .post('/api/remove-admin')
      .send({
        adminAddress: '0xOldAdmin1234567890123456789012345678901234'
      });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// Test price endpoints
describe('Price API Endpoints', () => {
  test('GET /api/prices should return service prices', async () => {
    const response = await request(app)
      .get('/api/prices');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
