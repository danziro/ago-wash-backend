// Mock implementation of blockchain service
module.exports = {
  mintLoyaltyNFT: jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xabc123'
  }),
  recordTransaction: jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xabc123'
  }),
  getUserPoints: jest.fn().mockResolvedValue(150),
  getNFTMetadata: jest.fn().mockResolvedValue({
    tokenId: 1,
    metadataURI: 'ipfs://QmTestCID',
    points: 150,
    tier: 'Bronze',
    expiryTime: Date.now() + 86400000,
    exists: true
  }),
  updateNFTMetadata: jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xabc123'
  }),
  getFreeWashStatus: jest.fn().mockResolvedValue({
    active: true,
    expiryTime: Date.now() + 86400000
  }),
  signRedeem: jest.fn().mockResolvedValue({
    signature: '0xsignature',
    deadline: Math.floor(Date.now() / 1000) + 3600
  }),
  getActiveFreeWashUsers: jest.fn().mockResolvedValue([
    {
      userAddress: '0x1234567890123456789012345678901234567890',
      expiryTime: Date.now() + 86400000
    }
  ]),
  addAdmin: jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xabc123'
  }),
  removeAdmin: jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xabc123'
  })
};
