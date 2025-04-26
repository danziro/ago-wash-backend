// Mock implementation of IPFS service
module.exports = {
  uploadMetadataToIPFS: jest.fn().mockResolvedValue('QmTestCID'),
  uploadImageToIPFS: jest.fn().mockResolvedValue('QmTestImageCID'),
  generateNFTMetadata: jest.fn().mockReturnValue({
    name: 'AGO WASH Loyalty Card',
    description: 'Loyalty card for AGO WASH services',
    image: 'ipfs://QmTestImageCID',
    attributes: [
      { trait_type: 'Tier', value: 'Bronze' },
      { trait_type: 'Points', value: 100 },
      { trait_type: 'Vehicle Type', value: 'Honda Vario' }
    ]
  }),
  getFrameUrlByTier: jest.fn().mockReturnValue('ipfs://QmFrameCID'),
  determineTierByPoints: jest.fn().mockImplementation((points) => {
    if (points >= 2000) return 'Gold';
    if (points >= 1000) return 'Silver';
    return 'Bronze';
  })
};
