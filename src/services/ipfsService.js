const { create } = require('ipfs-http-client');
const logger = require('../utils/logger');

// Create IPFS client with authentication
const createIPFSClient = () => {
  const auth = 'Basic ' + Buffer.from(
    process.env.IPFS_PROJECT_ID + ':' + process.env.IPFS_PROJECT_SECRET
  ).toString('base64');

  const client = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth,
    },
  });

  return client;
};

// Upload file to IPFS
const uploadFileToIPFS = async (fileBuffer) => {
  try {
    const ipfs = createIPFSClient();
    const result = await ipfs.add(fileBuffer);
    const cid = result.cid.toString();
    logger.info(`File uploaded to IPFS with CID: ${cid}`);
    return cid;
  } catch (error) {
    logger.error(`Error uploading file to IPFS: ${error.message}`);
    throw new Error('Failed to upload file to IPFS');
  }
};

// Upload JSON metadata to IPFS
const uploadMetadataToIPFS = async (metadata) => {
  try {
    const ipfs = createIPFSClient();
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const result = await ipfs.add(metadataBuffer);
    const cid = result.cid.toString();
    logger.info(`Metadata uploaded to IPFS with CID: ${cid}`);
    return cid;
  } catch (error) {
    logger.error(`Error uploading metadata to IPFS: ${error.message}`);
    throw new Error('Failed to upload metadata to IPFS');
  }
};

// Generate NFT metadata
const generateNFTMetadata = (imageUrl, tier = 'Bronze', frame = null) => {
  return {
    name: "AGO WASH Loyalty NFT",
    image: imageUrl,
    tier: tier,
    frame: frame,
    description: "AGO WASH Loyalty Program NFT",
    attributes: [
      {
        trait_type: "Tier",
        value: tier
      }
    ]
  };
};

// Get frame URL based on tier
const getFrameUrlByTier = (tier) => {
  switch (tier.toLowerCase()) {
    case 'bronze':
      return `ipfs://${process.env.BRONZE_FRAME_CID}`;
    case 'silver':
      return `ipfs://${process.env.SILVER_FRAME_CID}`;
    case 'gold':
      return `ipfs://${process.env.GOLD_FRAME_CID}`;
    default:
      return null;
  }
};

// Determine tier based on points
const determineTierByPoints = (points) => {
  if (points >= 5000) {
    return 'Gold';
  } else if (points >= 1000) {
    return 'Silver';
  } else {
    return 'Bronze';
  }
};

module.exports = {
  uploadFileToIPFS,
  uploadMetadataToIPFS,
  generateNFTMetadata,
  getFrameUrlByTier,
  determineTierByPoints
};
