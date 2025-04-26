const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const userRoutes = require('../src/routes/userRoutes');
const transactionRoutes = require('../src/routes/transactionRoutes');
const blockchainRoutes = require('../src/routes/blockchainRoutes');

// Mock dependencies
jest.mock('../src/services/blockchainService');
jest.mock('../src/services/ipfsService');
jest.mock('../src/services/emailService');
jest.mock('../src/services/cacheService');
jest.mock('../src/utils/logger');

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
  
  // Override middleware for testing
  app.use((req, res, next) => {
    req.adminAddress = '0x1234567890123456789012345678901234567890'; // Mock admin
    next();
  });
  
  // Add routes
  app.use('/api', userRoutes);
  app.use('/api', transactionRoutes);
  app.use('/api', blockchainRoutes);
});

// Clean up after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Endpoints', () => {
  // Test adding a user
  test('POST /api/add-user should add a new user', async () => {
    const userData = {
      userAddress: '0x1234567890123456789012345678901234567890',
      name: 'Test User',
      motorbikeType: 'Yamaha NMAX',
      dateOfBirth: '1990-01-01',
      email: 'test@example.com'
    };
    
    // Mock blockchain service
    require('../src/services/blockchainService').mintLoyaltyNFT.mockResolvedValue({
      success: true,
      txHash: '0xabc123'
    });
    
    // Mock IPFS service
    require('../src/services/ipfsService').uploadMetadataToIPFS.mockResolvedValue('QmTestCID');
    require('../src/services/ipfsService').generateNFTMetadata.mockReturnValue({});
    
    const response = await request(app)
      .post('/api/add-user')
      .set('Authorization', 'Bearer test-api-key')
      .send(userData);
      
    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.userAddress).toBe(userData.userAddress);
  });
  
  // Test recording a transaction
  test('POST /api/record-transaction should record a transaction', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').recordTransaction.mockResolvedValue({
      success: true,
      txHash: '0xabc123'
    });
    
    require('../src/services/blockchainService').getUserPoints.mockResolvedValue(100);
    require('../src/services/blockchainService').getNFTMetadata.mockResolvedValue({
      tokenId: 1,
      metadataURI: 'ipfs://QmTestCID',
      points: 100,
      tier: 'Bronze',
      expiryTime: Date.now() + 86400000,
      exists: true
    });
    
    const transactionData = {
      userAddress: '0x1234567890123456789012345678901234567890',
      date: '2025-04-25',
      vehicleType: 'Motor Kecil',
      serviceType: 'Reguler',
      price: 18000
    };
    
    const response = await request(app)
      .post('/api/record-transaction')
      .set('Authorization', 'Bearer test-api-key')
      .send(transactionData);
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  // Test updating NFT frame
  test('POST /api/update-nft-frame should update NFT frame', async () => {
    // Mock blockchain service
    require('../src/services/blockchainService').getUserPoints.mockResolvedValue(1500);
    require('../src/services/blockchainService').getNFTMetadata.mockResolvedValue({
      tokenId: 1,
      metadataURI: 'ipfs://QmTestCID',
      points: 1500,
      tier: 'Bronze',
      expiryTime: Date.now() + 86400000,
      exists: true
    });
    require('../src/services/blockchainService').updateNFTMetadata.mockResolvedValue({
      success: true,
      txHash: '0xabc123'
    });
    
    // Mock IPFS service
    require('../src/services/ipfsService').uploadMetadataToIPFS.mockResolvedValue('QmNewTestCID');
    require('../src/services/ipfsService').generateNFTMetadata.mockReturnValue({});
    require('../src/services/ipfsService').getFrameUrlByTier.mockReturnValue('ipfs://QmSilverFrameCID');
    require('../src/services/ipfsService').determineTierByPoints.mockReturnValue('Silver');
    
    const response = await request(app)
      .post('/api/update-nft-frame')
      .set('Authorization', 'Bearer test-api-key')
      .send({ userAddress: '0x1234567890123456789012345678901234567890' });
      
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tier).toBe('Silver');
  });
});
