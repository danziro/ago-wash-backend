const { ThirdwebSDK } = require('@thirdweb-dev/sdk');
const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Load contract ABI
const contractABI = require('../../contract/abi.json');

// Initialize provider and signer
const getBlockchainProvider = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    return provider;
  } catch (error) {
    logger.error(`Error initializing blockchain provider: ${error.message}`);
    throw error;
  }
};

// Initialize Thirdweb SDK
const initializeThirdwebSDK = () => {
  try {
    // Setting up the provider
    const provider = getBlockchainProvider();
    
    // Using Thirdweb SDK with our provider
    const sdk = ThirdwebSDK.fromPrivateKey(
      process.env.THIRDWEB_SECRET_KEY,
      process.env.RPC_URL,
      {
        secretKey: process.env.THIRDWEB_SECRET_KEY,
      }
    );
    
    logger.info(`Thirdweb SDK initialized - Chain ID: ${process.env.CHAIN_ID}`);
    return sdk;
  } catch (error) {
    logger.error(`Error initializing Thirdweb SDK: ${error.message}`);
    throw error;
  }
};

// Get contract instance
const getContract = async () => {
  try {
    const provider = getBlockchainProvider();
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      provider
    );
    return contract;
  } catch (error) {
    logger.error(`Error getting contract instance: ${error.message}`);
    throw error;
  }
};

// Get contract with signer for write operations
const getContractWithSigner = async () => {
  try {
    const sdk = initializeThirdwebSDK();
    const contract = await sdk.getContract(process.env.CONTRACT_ADDRESS);
    return contract;
  } catch (error) {
    logger.error(`Error getting contract with signer: ${error.message}`);
    throw error;
  }
};

// Generate EIP-712 signature for redeeming packages
const generateEIP712Signature = async (userAddress, packageType, nonce) => {
  try {
    const sdk = initializeThirdwebSDK();
    const contract = await sdk.getContract(process.env.CONTRACT_ADDRESS);
    
    // Define the types for EIP-712 signature
    const types = {
      RedeemPackage: [
        { name: 'user', type: 'address' },
        { name: 'packageType', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }
      ]
    };
    
    // Create the signature data
    const value = {
      user: userAddress,
      packageType: packageType,
      nonce: nonce
    };
    
    // Generate the signature
    const signature = await contract.encoder.encode(types, value);
    
    return signature;
  } catch (error) {
    logger.error(`Error generating EIP-712 signature: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getBlockchainProvider,
  initializeThirdwebSDK,
  getContract,
  getContractWithSigner,
  generateEIP712Signature
};
