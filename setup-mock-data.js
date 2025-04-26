require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('redis');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const Price = require('./src/models/Price');
const Admin = require('./src/models/Admin');

// Mock data
const userData = {
  userAddress: '0x1234567890123456789012345678901234567890',
  name: 'Budi Santoso',
  motorbikeType: 'Honda Vario',
  dateOfBirth: '1990-01-01',
  email: 'budi@example.com',
  nftTokenId: 1,
  metadataURI: 'ipfs://QmTestCID',
  registrationDate: new Date('2025-04-20')
};

const adminData = {
  adminAddress: '0xAdminAddress12345678901234567890123456789012'
};

const transactionData = [
  {
    userAddress: '0x1234567890123456789012345678901234567890',
    date: new Date('2025-04-25'),
    vehicleType: 'Motor Kecil',
    serviceType: 'Reguler',
    price: 18000,
    points: 18,
    txHash: '0xabc123',
    timestamp: new Date('2025-04-25T10:30:00')
  },
  {
    userAddress: '0x1234567890123456789012345678901234567890',
    date: new Date('2025-04-24'),
    vehicleType: 'Motor Sedang',
    serviceType: 'Premium',
    price: 32000,
    points: 32,
    txHash: '0xdef456',
    timestamp: new Date('2025-04-24T14:15:00')
  }
];

const priceData = {
  motor: {
    reguler: { kecil: 18000, sedang: 20000, besar: 25000 },
    premium: { kecil: 30000, sedang: 32000, besar: 35000 }
  },
  mobil: {
    bodyOnly: { kecil: 55000, sedang: 60000, besar: 65000 }
  }
};

// Setup MongoDB
async function setupMongoDB() {
  console.log('Setting up MongoDB...');
  
  try {
    // Use real MongoDB if connection string is provided
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    } else {
      // Use in-memory MongoDB
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to in-memory MongoDB');
    }
    
    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Price.deleteMany({});
    await Admin.deleteMany({});
    
    // Insert mock data
    await User.create(userData);
    await Transaction.insertMany(transactionData);
    await Price.create({ prices: priceData });
    await Admin.create(adminData);
    
    console.log('Mock data inserted into MongoDB');
  } catch (error) {
    console.error('Error setting up MongoDB:', error.message);
    throw error;
  }
}

// Setup Redis
async function setupRedis() {
  console.log('Setting up Redis...');
  
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = Redis.createClient({ url: redisUrl });
    
    client.on('error', (err) => console.error('Redis Client Error', err));
    
    await client.connect();
    
    // Clear existing data
    await client.flushDb();
    
    // Set mock data
    await client.set(
      `userPoints:${userData.userAddress}`,
      '150',
      { EX: 600 } // 10 minutes expiry
    );
    
    await client.set(
      `freeWashStatus:${userData.userAddress}`,
      JSON.stringify({ active: true, expiryTime: Date.now() + 86400000 }),
      { EX: 600 } // 10 minutes expiry
    );
    
    console.log('Mock data inserted into Redis');
    
    await client.quit();
  } catch (error) {
    console.error('Error setting up Redis:', error.message);
    throw error;
  }
}

// Run setup
async function setup() {
  try {
    await setupMongoDB();
    await setupRedis();
    console.log('Mock data setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if executed directly
if (require.main === module) {
  setup();
}

module.exports = { setup, userData, adminData, transactionData, priceData };
