const axios = require('axios');
const { io } = require('socket.io-client');
const colors = require('colors/safe');
const fs = require('fs');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'test-api-key';
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '0xAdminAddress12345678901234567890123456789012';
const USER_ADDRESS = process.env.USER_ADDRESS || '0x1234567890123456789012345678901234567890';

// Test data
const userData = {
  userAddress: USER_ADDRESS,
  name: 'Budi Santoso',
  motorbikeType: 'Honda Vario',
  dateOfBirth: '1990-01-01',
  email: 'budi@example.com'
};

const transactionData = {
  userAddress: USER_ADDRESS,
  date: '2025-04-25',
  vehicleType: 'Motor Kecil',
  serviceType: 'Reguler',
  price: 18000
};

// Helper functions
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Get CSRF token
async function getCsrfToken() {
  try {
    const response = await axios.get(`${API_URL}/csrf-token`, {
      withCredentials: true
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error(colors.red('Error getting CSRF token:'), error.message);
    return null;
  }
}

// Test result tracking
const testResults = {
  success: 0,
  failure: 0,
  results: []
};

// Record test result
function recordResult(endpoint, scenario, expected, actual, success) {
  testResults.results.push({
    endpoint,
    scenario,
    expected,
    actual,
    success
  });

  if (success) {
    testResults.success++;
    console.log(colors.green(`✓ PASS: ${endpoint} - ${scenario}`));
  } else {
    testResults.failure++;
    console.log(colors.red(`✗ FAIL: ${endpoint} - ${scenario}`));
    console.log(colors.yellow(`  Expected: ${expected}`));
    console.log(colors.yellow(`  Actual: ${actual}`));
  }
}

// Test functions
async function testAddUser() {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    // Success case
    const response = await api.post('/add-user', userData, {
      headers: {
        'X-CSRF-Token': csrfToken
      },
      withCredentials: true
    });
    
    recordResult(
      '/add-user',
      'Success case',
      'Status 201, user created',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 201 && response.data.success === true
    );
    
    // Failure case - duplicate user
    try {
      await api.post('/add-user', userData, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      recordResult(
        '/add-user',
        'Failure case - duplicate user',
        'Error response',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/add-user',
        'Failure case - duplicate user',
        'Error response',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 400 || error.response?.status === 409
      );
    }
    
    // Failure case - invalid input
    try {
      await api.post('/add-user', { ...userData, userAddress: 'invalid' }, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      recordResult(
        '/add-user',
        'Failure case - invalid input',
        'Error response',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/add-user',
        'Failure case - invalid input',
        'Error response with status 400',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 400
      );
    }
  } catch (error) {
    console.error(colors.red('Error testing /add-user:'), error.message);
    recordResult(
      '/add-user',
      'Success case',
      'Status 201, user created',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testGetUser() {
  try {
    // Success case
    const response = await api.get(`/get-user?userAddress=${USER_ADDRESS}`);
    
    recordResult(
      '/get-user',
      'Success case',
      'Status 200, user data returned',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true && response.data.user.userAddress === USER_ADDRESS
    );
    
    // Failure case - user not found
    try {
      await api.get('/get-user?userAddress=0xNonExistentUser123456789012345678901234567890');
      recordResult(
        '/get-user',
        'Failure case - user not found',
        'Error response',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/get-user',
        'Failure case - user not found',
        'Error response with status 404',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 404
      );
    }
    
    // Failure case - invalid input
    try {
      await api.get('/get-user?userAddress=invalid');
      recordResult(
        '/get-user',
        'Failure case - invalid input',
        'Error response',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/get-user',
        'Failure case - invalid input',
        'Error response with status 400',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 400
      );
    }
  } catch (error) {
    console.error(colors.red('Error testing /get-user:'), error.message);
    recordResult(
      '/get-user',
      'Success case',
      'Status 200, user data returned',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testRecordTransaction() {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    // Success case
    const response = await api.post('/record-transaction', transactionData, {
      headers: {
        'X-CSRF-Token': csrfToken
      },
      withCredentials: true
    });
    
    recordResult(
      '/record-transaction',
      'Success case',
      'Status 200, transaction recorded',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true
    );
    
    // Failure case - invalid input
    try {
      await api.post('/record-transaction', { ...transactionData, userAddress: 'invalid' }, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      recordResult(
        '/record-transaction',
        'Failure case - invalid input',
        'Error response',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/record-transaction',
        'Failure case - invalid input',
        'Error response with status 400',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 400
      );
    }
  } catch (error) {
    console.error(colors.red('Error testing /record-transaction:'), error.message);
    recordResult(
      '/record-transaction',
      'Success case',
      'Status 200, transaction recorded',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testUpdateNFTFrame() {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    // Success case (admin only)
    const response = await api.post('/update-nft-frame', { userAddress: USER_ADDRESS }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'X-Admin-Address': ADMIN_ADDRESS
      },
      withCredentials: true
    });
    
    recordResult(
      '/update-nft-frame',
      'Success case',
      'Status 200, NFT frame updated',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true
    );
    
    // Failure case - non-admin
    try {
      await api.post('/update-nft-frame', { userAddress: USER_ADDRESS }, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      recordResult(
        '/update-nft-frame',
        'Failure case - non-admin',
        'Error response',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/update-nft-frame',
        'Failure case - non-admin',
        'Error response with status 403',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 403
      );
    }
  } catch (error) {
    console.error(colors.red('Error testing /update-nft-frame:'), error.message);
    recordResult(
      '/update-nft-frame',
      'Success case',
      'Status 200, NFT frame updated',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testGetPrices() {
  try {
    // Success case
    const response = await api.get('/prices');
    
    recordResult(
      '/prices',
      'Success case',
      'Status 200, prices returned',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true && response.data.prices !== undefined
    );
  } catch (error) {
    console.error(colors.red('Error testing /prices:'), error.message);
    recordResult(
      '/prices',
      'Success case',
      'Status 200, prices returned',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testGetUserPoints() {
  try {
    // Success case
    const response = await api.get(`/user-points?userAddress=${USER_ADDRESS}`);
    
    recordResult(
      '/user-points',
      'Success case',
      'Status 200, points returned',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true && typeof response.data.points === 'number'
    );
    
    // Test caching
    console.log(colors.blue('Testing caching for /user-points...'));
    const startTime = Date.now();
    const cachedResponse = await api.get(`/user-points?userAddress=${USER_ADDRESS}`);
    const endTime = Date.now();
    
    recordResult(
      '/user-points',
      'Caching test',
      'Faster response time for cached request',
      `Response time: ${endTime - startTime}ms`,
      endTime - startTime < 100 // Assuming cached responses are faster
    );
  } catch (error) {
    console.error(colors.red('Error testing /user-points:'), error.message);
    recordResult(
      '/user-points',
      'Success case',
      'Status 200, points returned',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testGetFreeWashStatus() {
  try {
    // Success case
    const response = await api.get(`/free-wash-status?userAddress=${USER_ADDRESS}`);
    
    recordResult(
      '/free-wash-status',
      'Success case',
      'Status 200, free wash status returned',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true && response.data.active !== undefined
    );
  } catch (error) {
    console.error(colors.red('Error testing /free-wash-status:'), error.message);
    recordResult(
      '/free-wash-status',
      'Success case',
      'Status 200, free wash status returned',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testGetActivityLog() {
  try {
    // Success case
    const response = await api.get(`/activity-log?userAddress=${USER_ADDRESS}&page=1&limit=10`);
    
    recordResult(
      '/activity-log',
      'Success case',
      'Status 200, activity log returned',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true && Array.isArray(response.data.activities)
    );
  } catch (error) {
    console.error(colors.red('Error testing /activity-log:'), error.message);
    recordResult(
      '/activity-log',
      'Success case',
      'Status 200, activity log returned',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testSignRedeem() {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    // Success case
    const response = await api.post('/sign-redeem', {
      userAddress: USER_ADDRESS,
      packageType: 1
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      },
      withCredentials: true
    });
    
    recordResult(
      '/sign-redeem',
      'Success case',
      'Status 200, signature returned',
      `Status ${response.status}, success: ${response.data.success}`,
      response.status === 200 && response.data.success === true && response.data.signature !== undefined
    );
    
    // Test rate limiting
    console.log(colors.blue('Testing rate limiting for /sign-redeem...'));
    try {
      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 6; i++) {
        await api.post('/sign-redeem', {
          userAddress: USER_ADDRESS,
          packageType: 1
        }, {
          headers: {
            'X-CSRF-Token': csrfToken
          },
          withCredentials: true
        });
      }
      recordResult(
        '/sign-redeem',
        'Rate limiting test',
        'Error response after too many requests',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        '/sign-redeem',
        'Rate limiting test',
        'Error response with status 429',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 429
      );
    }
  } catch (error) {
    console.error(colors.red('Error testing /sign-redeem:'), error.message);
    recordResult(
      '/sign-redeem',
      'Success case',
      'Status 200, signature returned',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testAdminEndpoints() {
  try {
    // Test analytics
    const analyticsResponse = await api.get('/analytics', {
      headers: {
        'X-Admin-Address': ADMIN_ADDRESS
      }
    });
    
    recordResult(
      '/analytics',
      'Success case',
      'Status 200, analytics returned',
      `Status ${analyticsResponse.status}, success: ${analyticsResponse.data.success}`,
      analyticsResponse.status === 200 && analyticsResponse.data.success === true
    );
    
    // Test monitoring
    const monitoringResponse = await api.get('/monitoring', {
      headers: {
        'X-Admin-Address': ADMIN_ADDRESS
      }
    });
    
    recordResult(
      '/monitoring',
      'Success case',
      'Status 200, monitoring data returned',
      `Status ${monitoringResponse.status}, success: ${monitoringResponse.data.success}`,
      monitoringResponse.status === 200 && monitoringResponse.data.success === true
    );
    
    // Test transactions by date
    const transactionsResponse = await api.get('/transactions-by-date?date=2025-04-25', {
      headers: {
        'X-Admin-Address': ADMIN_ADDRESS
      }
    });
    
    recordResult(
      '/transactions-by-date',
      'Success case',
      'Status 200, transactions returned',
      `Status ${transactionsResponse.status}, success: ${transactionsResponse.data.success}`,
      transactionsResponse.status === 200 && transactionsResponse.data.success === true
    );
    
    // Test active free washes
    const freeWashesResponse = await api.get('/active-free-washes', {
      headers: {
        'X-Admin-Address': ADMIN_ADDRESS
      }
    });
    
    recordResult(
      '/active-free-washes',
      'Success case',
      'Status 200, active free washes returned',
      `Status ${freeWashesResponse.status}, success: ${freeWashesResponse.data.success}`,
      freeWashesResponse.status === 200 && freeWashesResponse.data.success === true
    );
    
    // Test add admin
    const csrfToken = await getCsrfToken();
    const addAdminResponse = await api.post('/add-admin', {
      adminAddress: '0xNewAdmin1234567890123456789012345678901234'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'X-Admin-Address': ADMIN_ADDRESS
      },
      withCredentials: true
    });
    
    recordResult(
      '/add-admin',
      'Success case',
      'Status 200, admin added',
      `Status ${addAdminResponse.status}, success: ${addAdminResponse.data.success}`,
      addAdminResponse.status === 200 && addAdminResponse.data.success === true
    );
    
    // Test remove admin
    const removeAdminResponse = await api.post('/remove-admin', {
      adminAddress: '0xNewAdmin1234567890123456789012345678901234'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'X-Admin-Address': ADMIN_ADDRESS
      },
      withCredentials: true
    });
    
    recordResult(
      '/remove-admin',
      'Success case',
      'Status 200, admin removed',
      `Status ${removeAdminResponse.status}, success: ${removeAdminResponse.data.success}`,
      removeAdminResponse.status === 200 && removeAdminResponse.data.success === true
    );
  } catch (error) {
    console.error(colors.red('Error testing admin endpoints:'), error.message);
    recordResult(
      '/admin-endpoints',
      'Success case',
      'Status 200, admin endpoints working',
      `Error: ${error.message}`,
      false
    );
  }
}

async function testWebSocketNotifications() {
  return new Promise((resolve) => {
    console.log(colors.blue('Testing WebSocket notifications...'));
    
    // Connect to WebSocket server
    const socket = io('http://localhost:3000', {
      withCredentials: true
    });
    
    socket.on('connect', async () => {
      console.log(colors.blue('WebSocket connected'));
      
      // Listen for transaction notification
      socket.on('transaction:new', (data) => {
        recordResult(
          'WebSocket',
          'Transaction notification',
          'Notification received for new transaction',
          `Received data: ${JSON.stringify(data)}`,
          data.userAddress === USER_ADDRESS
        );
        
        socket.disconnect();
        resolve();
      });
      
      // Trigger a transaction to generate notification
      try {
        const csrfToken = await getCsrfToken();
        await api.post('/record-transaction', {
          ...transactionData,
          date: '2025-04-26' // Use a different date to avoid duplicate
        }, {
          headers: {
            'X-CSRF-Token': csrfToken
          },
          withCredentials: true
        });
      } catch (error) {
        console.error(colors.red('Error triggering transaction:'), error.message);
        socket.disconnect();
        resolve();
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error(colors.red('WebSocket connection error:'), error.message);
      recordResult(
        'WebSocket',
        'Connection',
        'Successful connection',
        `Error: ${error.message}`,
        false
      );
      resolve();
    });
    
    // Set timeout in case we don't receive any notifications
    setTimeout(() => {
      console.log(colors.yellow('WebSocket test timed out'));
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

async function testSecurityFeatures() {
  try {
    // Test API key authentication
    try {
      await axios.get(`${API_URL}/prices`);
      recordResult(
        'Security',
        'API key authentication',
        'Error response for missing API key',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        'Security',
        'API key authentication',
        'Error response with status 401',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 401
      );
    }
    
    // Test CSRF protection
    try {
      await axios.post(`${API_URL}/add-user`, userData, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        },
        withCredentials: true
      });
      recordResult(
        'Security',
        'CSRF protection',
        'Error response for missing CSRF token',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        'Security',
        'CSRF protection',
        'Error response for missing CSRF token',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 403
      );
    }
    
    // Test CORS
    try {
      await axios.get(`${API_URL}/prices`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Origin': 'https://malicious-site.com'
        }
      });
      recordResult(
        'Security',
        'CORS protection',
        'Error response for unauthorized origin',
        'No error thrown',
        false
      );
    } catch (error) {
      recordResult(
        'Security',
        'CORS protection',
        'Error response for unauthorized origin',
        `Status ${error.response?.status || 'unknown'}, message: ${error.response?.data?.message || error.message}`,
        error.response?.status === 403
      );
    }
  } catch (error) {
    console.error(colors.red('Error testing security features:'), error.message);
    recordResult(
      'Security',
      'Security features',
      'Security features working properly',
      `Error: ${error.message}`,
      false
    );
  }
}

// Generate test report
function generateReport() {
  console.log('\n' + colors.cyan('='.repeat(80)));
  console.log(colors.cyan('AGO WASH Backend Test Report'));
  console.log(colors.cyan('='.repeat(80)));
  
  console.log(colors.cyan('\nSummary:'));
  console.log(colors.green(`Passed: ${testResults.success}`));
  console.log(colors.red(`Failed: ${testResults.failure}`));
  console.log(colors.blue(`Total: ${testResults.success + testResults.failure}`));
  
  console.log(colors.cyan('\nDetailed Results:'));
  testResults.results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.endpoint} - ${result.scenario}`);
    console.log(`   Status: ${result.success ? colors.green('PASS') : colors.red('FAIL')}`);
    console.log(`   Expected: ${result.expected}`);
    console.log(`   Actual: ${result.actual}`);
    console.log('');
  });
  
  console.log(colors.cyan('='.repeat(80)));
  
  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.success,
      failed: testResults.failure,
      total: testResults.success + testResults.failure
    },
    results: testResults.results
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(reportData, null, 2));
  console.log(colors.blue('Test report saved to test-report.json'));
}

// Run all tests
async function runTests() {
  console.log(colors.cyan('Starting AGO WASH Backend Tests'));
  console.log(colors.cyan('='.repeat(80)));
  
  // User endpoints
  await testAddUser();
  await testGetUser();
  
  // Transaction endpoints
  await testRecordTransaction();
  
  // Blockchain endpoints
  await testUpdateNFTFrame();
  await testGetPrices();
  await testGetUserPoints();
  await testGetFreeWashStatus();
  await testGetActivityLog();
  await testSignRedeem();
  
  // Admin endpoints
  await testAdminEndpoints();
  
  // WebSocket notifications
  await testWebSocketNotifications();
  
  // Security features
  await testSecurityFeatures();
  
  // Generate report
  generateReport();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(colors.red('Error running tests:'), error);
  });
}

module.exports = { runTests };
