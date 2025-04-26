const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const priceRoutes = require('../src/routes/priceRoutes');
const blockchainRoutes = require('../src/routes/blockchainRoutes');
const transactionRoutes = require('../src/routes/transactionRoutes');

// Mock dependencies
jest.mock('../src/services/blockchainService');
jest.mock('../src/services/ipfsService');
jest.mock('../src/services/emailService');
jest.mock('../src/services/cacheService');
jest.mock('../src/utils/logger');

let mongoServer;
let app;

// Mock admin middleware
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
  app.use('/api', priceRoutes);
  app.use('/api', blockchainRoutes);
  app.use('/api', transactionRoutes);
});

// Clean up after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Price API Endpoints', () => {
  // Test getting prices
  test('GET /api/prices should return service prices', async () => {
    // Mock price data
    const priceData = {
      motor: {
        reguler: { kecil: 18000, sedang: 20000, besar: 25000 },
        premium: { kecil: 30000, sedang: 32000, besar: 35000 }
      },
      mobil: {
        bodyOnly: { kecil: 55000, sedang: 60000, besar: 65000 }
      }
    };
    
    // Mock the price controller's getPrices method
    jest.spyOn(require('../src/controllers/priceController'), 'getPrices')
      .mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          prices: priceData
        });
      });
    
    const response = await request(app)
      .get('/api/prices')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.prices).toEqual(priceData);
  });
});

describe('Blockchain API Endpoints', () => {
  // Test getting user points
  test('GET /api/user-points should return user points', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').getUserPoints.mockResolvedValue(150);
    
    // Mock cache service
    require('../src/services/cacheService').getCache.mockResolvedValue(null);
    require('../src/services/cacheService').setCache.mockResolvedValue(true);
    
    const response = await request(app)
      .get('/api/user-points?userAddress=0x1234567890123456789012345678901234567890')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.points).toBe(150);
  });
  
  // Test getting free wash status
  test('GET /api/free-wash-status should return free wash status', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').getFreeWashStatus.mockResolvedValue({
      active: true,
      expiryTime: Date.now() + 86400000
    });
    
    // Mock cache service
    require('../src/services/cacheService').getCache.mockResolvedValue(null);
    require('../src/services/cacheService').setCache.mockResolvedValue(true);
    
    const response = await request(app)
      .get('/api/free-wash-status?userAddress=0x1234567890123456789012345678901234567890')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.active).toBe(true);
  });
  
  // Test signing redeem
  test('POST /api/sign-redeem should generate EIP-712 signature', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').signRedeem.mockResolvedValue({
      signature: '0xsignature',
      deadline: Math.floor(Date.now() / 1000) + 3600
    });
    
    const response = await request(app)
      .post('/api/sign-redeem')
      .set('Authorization', 'Bearer test-api-key')
      .send({
        userAddress: '0x1234567890123456789012345678901234567890',
        packageType: 1
      });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.signature).toBe('0xsignature');
  });
});

describe('Admin API Endpoints', () => {
  // Test getting analytics
  test('GET /api/analytics should return transaction analytics', async () => {
    const response = await request(app)
      .get('/api/analytics')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.analytics).toBeDefined();
  });
  
  // Test getting monitoring data
  test('GET /api/monitoring should return monitoring data', async () => {
    const response = await request(app)
      .get('/api/monitoring')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.dailyTransactions).toBeDefined();
    expect(response.body.recentErrors).toBeDefined();
  });
  
  // Test getting transactions by date
  test('GET /api/transactions-by-date should return transactions for a specific date', async () => {
    const response = await request(app)
      .get('/api/transactions-by-date?date=2025-04-25')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transactions).toBeDefined();
  });
  
  // Test getting active free washes
  test('GET /api/active-free-washes should return list of active free wash coupons', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').getActiveFreeWashUsers.mockResolvedValue([
      {
        userAddress: '0x1234567890123456789012345678901234567890',
        expiryTime: Date.now() + 86400000
      }
    ]);
    
    const response = await request(app)
      .get('/api/active-free-washes')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.users).toHaveLength(1);
  });
  
  // Test adding admin
  test('POST /api/add-admin should add a new admin', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').addAdmin.mockResolvedValue({
      success: true,
      txHash: '0xabc123'
    });
    
    const response = await request(app)
      .post('/api/add-admin')
      .set('Authorization', 'Bearer test-api-key')
      .send({
        adminAddress: '0xNewAdmin1234567890123456789012345678901234'
      });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHash).toBe('0xabc123');
  });
  
  // Test removing admin
  test('POST /api/remove-admin should remove an admin', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').removeAdmin.mockResolvedValue({
      success: true,
      txHash: '0xabc123'
    });
    
    const response = await request(app)
      .post('/api/remove-admin')
      .set('Authorization', 'Bearer test-api-key')
      .send({
        adminAddress: '0xOldAdmin1234567890123456789012345678901234'
      });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHash).toBe('0xabc123');
  });
});

// Test failure cases
describe('API Endpoint Failure Cases', () => {
  // Test invalid input
  test('GET /api/user-points should return 400 for invalid userAddress', async () => {
    const response = await request(app)
      .get('/api/user-points?userAddress=invalid')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });
  
  // Test unauthorized access
  test('GET /api/analytics should return 403 for non-admin users', async () => {
    // Override admin middleware for this test
    jest.spyOn(require('../src/middlewares/auth'), 'checkAdmin')
      .mockImplementationOnce((req, res, next) => {
        req.isAdmin = false;
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Admin access required'
        });
      });
    
    const response = await request(app)
      .get('/api/analytics')
      .set('Authorization', 'Bearer test-api-key');
      
    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
