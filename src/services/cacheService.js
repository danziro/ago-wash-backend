const { getRedisClient } = require('../config/database');
const logger = require('../utils/logger');

// Default cache expiration time (10 minutes)
const DEFAULT_EXPIRY = 60 * 10;

/**
 * Cache key generator
 * @param {string} prefix - Cache key prefix
 * @param {string} identifier - Unique identifier
 * @returns {string} - Cache key
 */
const generateKey = (prefix, identifier) => {
  return `${prefix}:${identifier}`;
};

/**
 * Cache data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} expirySeconds - Expiry time in seconds
 * @returns {Promise<boolean>} - Success status
 */
const cacheData = async (key, data, expirySeconds = DEFAULT_EXPIRY) => {
  try {
    const redis = getRedisClient();
    await redis.setEx(key, expirySeconds, JSON.stringify(data));
    logger.debug(`Cached data with key: ${key}`, { category: 'cache' });
    return true;
  } catch (error) {
    logger.error(`Error caching data: ${error.message}`, { category: 'cache', key });
    return false;
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached data or null
 */
const getCachedData = async (key) => {
  try {
    const redis = getRedisClient();
    const data = await redis.get(key);
    
    if (!data) {
      logger.debug(`Cache miss for key: ${key}`, { category: 'cache' });
      return null;
    }
    
    logger.debug(`Cache hit for key: ${key}`, { category: 'cache' });
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error getting cached data: ${error.message}`, { category: 'cache', key });
    return null;
  }
};

/**
 * Invalidate cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - Success status
 */
const invalidateCache = async (key) => {
  try {
    const redis = getRedisClient();
    await redis.del(key);
    logger.debug(`Invalidated cache for key: ${key}`, { category: 'cache' });
    return true;
  } catch (error) {
    logger.error(`Error invalidating cache: ${error.message}`, { category: 'cache', key });
    return false;
  }
};

/**
 * Invalidate multiple cache keys by pattern
 * @param {string} pattern - Pattern to match keys (e.g., userPoints:*)
 * @returns {Promise<boolean>} - Success status
 */
const invalidateCacheByPattern = async (pattern) => {
  try {
    const redis = getRedisClient();
    let cursor = 0;
    let deleteCount = 0;
    
    do {
      const result = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      cursor = result.cursor;
      
      if (result.keys.length > 0) {
        await redis.del(result.keys);
        deleteCount += result.keys.length;
      }
    } while (cursor !== 0);
    
    logger.debug(`Invalidated ${deleteCount} cache keys for pattern: ${pattern}`, { category: 'cache' });
    return true;
  } catch (error) {
    logger.error(`Error invalidating cache by pattern: ${error.message}`, { category: 'cache', pattern });
    return false;
  }
};

/**
 * Cache keys for AGO WASH functions
 */
const CacheKeys = {
  USER_POINTS: 'userPoints',
  FREE_WASH_STATUS: 'freeWashStatus',
  ACTIVITY_LOG: 'activityLog',
  NFT_METADATA: 'nftMetadata',
  ADMINS: 'admins',
  PRICES: 'prices'
};

module.exports = {
  generateKey,
  cacheData,
  getCachedData,
  invalidateCache,
  invalidateCacheByPattern,
  CacheKeys
};
