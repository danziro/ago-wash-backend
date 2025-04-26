# AGO WASH Loyalty Program Backend

A backend application for the AGO WASH loyalty program that integrates with a smart contract deployed on opBNB Testnet to manage user data, transactions, NFT metadata, and rewards.

## Features

- User data management (registration, updates, retrieval)
- Transaction recording with blockchain integration
- NFT metadata creation and management with IPFS integration
- EIP-712 signature generation for package redemption
- Real-time notifications via WebSockets
- Email notifications for key events using AWS SES
- Caching with Redis for improved performance
- MongoDB for persistent data storage
- Admin management and analytics
- Comprehensive monitoring and logging
- Security features (rate limiting, API key validation, CSRF protection)

## Technology Stack

- **Backend Framework**: Node.js with Express
- **Database**: MongoDB
- **Caching**: Redis
- **Blockchain**: opBNB Testnet (Chain ID: 5611)
- **Blockchain SDK**: thirdweb SDK
- **Email Service**: AWS SES
- **File Storage**: IPFS (via Infura)
- **WebSockets**: Socket.io

## Prerequisites

- Node.js 16.x or later
- MongoDB 4.x or later
- Redis 6.x or later
- AWS Account with SES access
- Infura IPFS project
- thirdweb API key

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ago-wash-backend.git
cd ago-wash-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example` and populate with your configuration:

```
# Copy the example file
cp .env.example .env

# Edit the .env file with your specific configuration
nano .env
```

4. Start the server:

```bash
# For development
npm run dev

# For production
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection URI |
| `REDIS_URL` | Redis connection URI |
| `AWS_ACCESS_KEY_ID` | AWS access key for SES |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for SES |
| `AWS_REGION` | AWS region for SES |
| `THIRDWEB_SECRET_KEY` | thirdweb secret key for blockchain operations |
| `ADMIN_EMAIL` | Email address for admin notifications |
| `API_KEY` | API key for securing endpoints |
| `CONTRACT_ADDRESS` | Address of the deployed smart contract |
| `RPC_URL` | RPC URL for opBNB Testnet |
| `CHAIN_ID` | Chain ID for opBNB Testnet (5611) |
| `IPFS_GATEWAY` | IPFS gateway URL |
| `IPFS_PROJECT_ID` | Infura IPFS project ID |
| `IPFS_PROJECT_SECRET` | Infura IPFS project secret |
| `BRONZE_FRAME_CID` | IPFS CID for bronze frame image |
| `SILVER_FRAME_CID` | IPFS CID for silver frame image |
| `GOLD_FRAME_CID` | IPFS CID for gold frame image |
| `PORT` | Port for the server (default: 3000) |
| `NODE_ENV` | Environment (development or production) |
| `FRONTEND_URL` | URL of the frontend application for CORS |

## API Endpoints

### User Management

- `POST /api/add-user`: Add a new user
  - Body: `userAddress`, `name`, `motorbikeType`, `dateOfBirth`, `email`, `photo` (optional)
  - Response: User data and metadata URI

- `GET /api/get-user`: Get user data
  - Query: `userAddress`
  - Response: User data

- `PUT /api/update-user`: Update user data
  - Body: `userAddress`, `name` (optional), `motorbikeType` (optional), `dateOfBirth` (optional), `email` (optional), `photo` (optional)
  - Response: Updated user data and metadata URI

- `DELETE /api/delete-user`: Delete user data
  - Body: `userAddress`
  - Response: Success status

### Transactions

- `POST /api/record-transaction`: Record a transaction
  - Body: `userAddress`, `date`, `vehicleType`, `serviceType`, `price`
  - Response: Success status, transaction hash, points, and tier

- `GET /api/transactions-by-date`: Get transactions for a date (admin only)
  - Query: `date` (YYYY-MM-DD)
  - Response: List of transactions

- `GET /api/analytics`: Get analytics data (admin only)
  - Response: Transaction analytics

- `GET /api/monitoring`: Get monitoring data (admin only)
  - Response: Daily transaction counts and recent errors

### Blockchain Operations

- `GET /api/user-points`: Get user points
  - Query: `userAddress`
  - Response: Points balance

- `GET /api/free-wash-status`: Get free wash status
  - Query: `userAddress`
  - Response: Status, expiry time, and usage status

- `POST /api/update-nft-frame`: Update NFT frame (admin only)
  - Body: `userAddress`
  - Response: Success status, metadata URI, and transaction hash

- `POST /api/sign-redeem`: Generate signature for package redemption
  - Body: `userAddress`, `packageType`, `nonce`
  - Response: EIP-712 signature

- `GET /api/activity-log`: Get user activity log
  - Query: `userAddress`, `page` (optional), `pageSize` (optional)
  - Response: Activity logs

- `GET /api/active-free-washes`: Get active free wash users (admin only)
  - Response: List of users with active free wash coupons

- `POST /api/add-admin`: Add an admin (admin only)
  - Body: `adminAddress`
  - Response: Success status and transaction hash

- `POST /api/remove-admin`: Remove an admin (admin only)
  - Body: `adminAddress`
  - Response: Success status and transaction hash

### Prices

- `GET /api/prices`: Get all prices
  - Response: Price list for all vehicle types and services

- `POST /api/update-price`: Update a price (admin only)
  - Body: `vehicle`, `serviceType`, `prices` (object with `kecil`, `sedang`, `besar`)
  - Response: Updated price

## WebSocket Events

The backend emits the following events via Socket.io:

- `transaction:recorded`: When a transaction is recorded
- `tier:upgraded`: When a user's tier is upgraded
- `nft:updated`: When an NFT metadata is updated
- `freeWash:granted`: When a free wash is granted to a user
- `freeWash:expired`: When a free wash expires
- `package:redeemed`: When a package is redeemed

## Tiers and Points

The loyalty program has three tiers based on points:

- **Bronze**: 0-999 points
- **Silver**: 1,000-4,999 points
- **Gold**: 5,000+ points

## Security Considerations

- All API endpoints require an API key
- Admin-only endpoints require admin verification via blockchain
- Rate limiting is implemented for all endpoints
- Stricter rate limiting (5 requests per minute) for signature generation
- Photo uploads are limited to 2MB and only accept JPEG and PNG formats
- CSRF protection for all POST/PUT/DELETE requests
- Data validation using Joi for all inputs

## Monitoring and Logging

The application includes comprehensive logging with Winston that captures:

- API requests and responses
- Blockchain interactions
- Email notifications
- Performance metrics
- Security events
- Admin activities

Logs are stored both in files and in MongoDB for easy querying.

## Deployment

For production deployment, it's recommended to:

1. Use a process manager like PM2
2. Set up HTTPS with a valid SSL certificate
3. Configure a reverse proxy like Nginx
4. Set NODE_ENV to "production"

Example deployment with PM2:

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start src/index.js --name ago-wash-backend

# Ensure it starts on system reboot
pm2 startup
pm2 save
```

## Development

For development and testing:

```bash
# Start in development mode with auto-restart
npm run dev

# Run tests
npm test
```

## License

[MIT](LICENSE)
