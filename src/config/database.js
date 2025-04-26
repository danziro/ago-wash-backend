const mongoose = require('mongoose');
const { createClient } = require('redis');
const logger = require('../utils/logger');

// MongoDB Connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected successfully');
    
    // Create indexes for optimization
    const db = mongoose.connection;
    await db.collection('users').createIndex({ userAddress: 1 }, { unique: true });
    await db.collection('transactions').createIndex({ userAddress: 1 });
    await db.collection('transactions').createIndex({ date: 1 });
    
    logger.info('MongoDB indexes created');
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Redis Connection
let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis Error: ${err.message}`);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    await redisClient.connect();
    
    // Configure Redis with max memory and LRU policy
    await redisClient.configSet('maxmemory', '100mb');
    await redisClient.configSet('maxmemory-policy', 'allkeys-lru');
    
    return redisClient;
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    process.exit(1);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

module.exports = {
  connectMongoDB,
  connectRedis,
  getRedisClient
};
