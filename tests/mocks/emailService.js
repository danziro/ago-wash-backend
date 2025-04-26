// Mock implementation of email service
module.exports = {
  sendTransactionNotification: jest.fn().mockResolvedValue(true),
  sendTierUpgradeNotification: jest.fn().mockResolvedValue(true),
  sendFreeWashActivatedNotification: jest.fn().mockResolvedValue(true),
  sendFreeWashExpiredNotification: jest.fn().mockResolvedValue(true),
  sendPackageRedeemedNotification: jest.fn().mockResolvedValue(true),
  sendRateLimitExceededNotification: jest.fn().mockResolvedValue(true)
};
