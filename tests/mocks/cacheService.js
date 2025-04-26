// Mock implementation of cache service
module.exports = {
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  deleteCache: jest.fn().mockResolvedValue(true),
  getCacheWithFallback: jest.fn().mockImplementation(async (key, fallbackFn) => {
    // Simulate cache miss and call the fallback function
    const result = await fallbackFn();
    return result;
  })
};
