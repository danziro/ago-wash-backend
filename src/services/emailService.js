const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create SES service object
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

/**
 * Send email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML)
 * @param {string} category - Email category for logging
 * @returns {Promise<boolean>} - Success status
 */
const sendEmail = async (to, subject, body, category = 'notification') => {
  try {
    const params = {
      Source: process.env.ADMIN_EMAIL,
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject
        },
        Body: {
          Html: {
            Data: body
          }
        }
      }
    };

    const result = await ses.sendEmail(params).promise();
    logger.info(`Email sent to ${to}`, { category, messageId: result.MessageId });
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`, { 
      category: 'email', 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Send tier upgrade notification to admin
 * @param {string} userAddress - User's blockchain address
 * @param {number} points - User's current points
 * @param {string} newTier - New tier (Bronze, Silver, Gold)
 * @returns {Promise<boolean>} - Success status
 */
const sendTierUpgradeNotification = async (userAddress, points, newTier) => {
  const subject = `[AGO WASH] User Tier Upgrade Notification`;
  const body = `
    <h2>AGO WASH Loyalty Program - Tier Upgrade</h2>
    <p>User <strong>${userAddress}</strong> has reached <strong>${points}</strong> points and is eligible for <strong>${newTier}</strong> tier.</p>
    <p>Please update their NFT frame by visiting the admin dashboard or using the API.</p>
    <p>Thank you,<br>
    AGO WASH Team</p>
  `;
  
  return await sendEmail(process.env.ADMIN_EMAIL, subject, body, 'tier-upgrade');
};

/**
 * Send free wash activation notification
 * @param {string} email - User's email address
 * @param {string} date - Transaction date
 * @returns {Promise<boolean>} - Success status
 */
const sendFreeWashActivatedNotification = async (email, date) => {
  const subject = `[AGO WASH] Free Wash Coupon Activated`;
  const body = `
    <h2>AGO WASH Loyalty Program - Free Wash Coupon</h2>
    <p>You have received a free wash coupon valid for 24 hours since your last transaction on <strong>${date}</strong>.</p>
    <p>Visit any AGO WASH location to redeem your free wash.</p>
    <p>Thank you for choosing AGO WASH!</p>
  `;
  
  return await sendEmail(email, subject, body, 'free-wash-activated');
};

/**
 * Send free wash expiry notification
 * @param {string} email - User's email address
 * @returns {Promise<boolean>} - Success status
 */
const sendFreeWashExpiredNotification = async (email) => {
  const subject = `[AGO WASH] Free Wash Coupon Expired`;
  const body = `
    <h2>AGO WASH Loyalty Program - Free Wash Expired</h2>
    <p>Your free wash at AGO WASH has expired! Visit us again for more offers.</p>
    <p>Thank you for choosing AGO WASH!</p>
  `;
  
  return await sendEmail(email, subject, body, 'free-wash-expired');
};

/**
 * Send package redeemed notification
 * @param {string} email - User's email address
 * @param {number} packageType - Package type redeemed
 * @param {number} points - Points spent
 * @returns {Promise<boolean>} - Success status
 */
const sendPackageRedeemedNotification = async (email, packageType, points) => {
  const subject = `[AGO WASH] Package Redeemed Successfully`;
  const body = `
    <h2>AGO WASH Loyalty Program - Package Redeemed</h2>
    <p>Congratulations! You have redeemed Package Type ${packageType} using ${points} points.</p>
    <p>Thank you for choosing AGO WASH!</p>
  `;
  
  return await sendEmail(email, subject, body, 'package-redeemed');
};

/**
 * Send rate limit exceeded notification to admin
 * @param {string} ip - IP address that exceeded rate limit
 * @param {string} endpoint - API endpoint
 * @returns {Promise<boolean>} - Success status
 */
const sendRateLimitExceededNotification = async (ip, endpoint) => {
  const subject = `[AGO WASH] Rate Limit Exceeded Alert`;
  const body = `
    <h2>AGO WASH API - Security Alert</h2>
    <p>Warning: IP <strong>${ip}</strong> exceeded rate limit on endpoint <strong>${endpoint}</strong>!</p>
    <p>This may indicate a potential attack or misconfigured client.</p>
    <p>Please check the logs for more information.</p>
  `;
  
  return await sendEmail(process.env.ADMIN_EMAIL, subject, body, 'security');
};

module.exports = {
  sendEmail,
  sendTierUpgradeNotification,
  sendFreeWashActivatedNotification,
  sendFreeWashExpiredNotification,
  sendPackageRedeemedNotification,
  sendRateLimitExceededNotification
};
