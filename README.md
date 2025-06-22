# MemeFlow - Real-time Meme Coin Data Aggregation Service

A production-ready service that aggregates real-time meme coin data from multiple DEX sources with efficient caching and real-time updates. Built with Node.js, TypeScript, React, and Socket.io.

## 🚀 Features

### Core Functionality
- **Multi-Source Data Aggregation**: Fetches data from DexScreener, Jupiter Price API, and GeckoTerminal
- **Real-time Updates**: WebSocket support for live price updates and volume spikes (15-second intervals)
- **Intelligent Token Merging**: Deduplicates tokens across sources using address as key with smart data consolidation
- **Advanced Caching**: Redis-based caching with configurable TTL (30s default) for 90% API call reduction
- **Rate Limiting**: Exponential backoff with retry logic for API rate limit handling

### Advanced Features
- **Cursor-based Pagination**: Efficient pagination for large token lists using token address + sort value
- **Comprehensive Filtering**: Support for timeframes (1h, 24h, 7d), sorting, and minimum thresholds
- **Real-time Event Detection**: Volume spikes (>50% increase) and significant price changes (>10%)
- **WebSocket Event Types**: `token_update`, `volume_spike`, `price_change`, `tokens_update`
- **Beautiful UI**: Modern React frontend with real-time data display and responsive design

## 🏗️ Architecture

### Backend Services
- **Express.js Server**: RESTful API with comprehensive error handling and validation
- **WebSocket Service**: Real-time updates using Socket.io with intelligent event detection
- **Data Aggregation**: Multi-source token merging with source priority (DexScreener > Jupiter > GeckoTerminal)
- **Cache Layer**: Redis-based caching with intelligent key generation
- **Rate Limiting**: Smart rate limiting with exponential backoff and retry interceptors

### Frontend
- **React 18**: Modern React with TypeScript and hooks
- **Real-time UI**: Live updates via WebSocket with visual indicators
- **Responsive Design**: Mobile-first responsive design with Tailwind CSS
- **Advanced Filtering**: Comprehensive search and filter controls with real-time application

## 🛠️ Tech Stack

**Backend:**
- Node.js with TypeScript
- Express.js for REST API
- Socket.io for WebSocket communication
- Redis for caching (ioredis client)
- Axios with retry interceptors
- Zod for request validation
- Jest for testing (15+ tests)

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Socket.io-client for WebSocket
- Lucide React for icons
- Vite for build tooling

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- Redis server
- npm or yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd meme-coin-aggregator
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### 3. Setup Redis
```bash
# Using Docker (Recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally (macOS)
brew install redis
brew services start redis

# Or install locally (Ubuntu)
sudo apt update && sudo apt install redis-server
sudo systemctl start redis-server
```

### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

**Environment Variables:**
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=30

# API Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Client Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

### 5. Start Application
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or start individually
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:3001
```

## 📡 API Documentation

### Core Endpoints

#### `GET /api/tokens`
Get paginated token list with comprehensive filtering and sorting.

**Query Parameters:**
- `timeframe`: `1h` | `24h` | `7d` (default: `1h`)
- `sortBy`: `volume` | `price_change` | `market_cap` | `liquidity` (default: `volume`)
- `sortOrder`: `asc` | `desc` (default: `desc`)
- `limit`: Number (1-100, default: 20)
- `cursor`: Base64 encoded pagination cursor
- `minVolume`: Minimum volume filter (SOL)
- `minMarketCap`: Minimum market cap filter (SOL)
- `minLiquidity`: Minimum liquidity filter (SOL)
- `protocol`: Filter by protocol name
- `source`: Filter by data source

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [...],
    "total": 150,
    "hasNext": true,
    "nextCursor": "eyJ0b2tlbl9hZGRyZXNzIjoiQUJDMTIzIiwic29ydF92YWx1ZSI6MTAwMCwib2Zmc2V0IjoyMH0="
  },
  "pagination": {
    "limit": 20,
    "hasNext": true,
    "nextCursor": "..."
  }
}
```

#### `GET /api/tokens/:address`
Get specific token by Solana address.

#### `GET /api/tokens/search/:query`
Search tokens by name, symbol, or address (minimum 2 characters).

#### `GET /api/tokens/trending`
Get trending tokens (positive price changes, sorted by price change).

#### `GET /api/tokens/volume-leaders`
Get tokens with highest volume.

#### `GET /api/tokens/stats/summary`
Get aggregated statistics including top gainers/losers and protocol distribution.

### Cursor-Based Pagination

The API uses cursor-based pagination for efficient handling of large datasets:

```javascript
// Cursor structure (Base64 encoded JSON)
{
  "token_address": "ABC123...",
  "sort_value": 1000,
  "offset": 20  // Fallback for offset-based pagination
}
```

## 🔌 WebSocket Events

### Client → Server Events
- `subscribe_token`: Subscribe to specific token updates
- `unsubscribe_token`: Unsubscribe from token updates

### Server → Client Events
- `initial_tokens`: Initial token data on connection
- `tokens_update`: Periodic token list updates (every 15s)
- `price_update`: Individual token price updates
- `volume_spike`: Volume spike alerts (>50% increase)
- `price_change`: Significant price change alerts (>10% change)
- `token_update`: Individual token updates
- `error`: Error messages

### WebSocket Usage Example
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('volume_spike', (spikes) => {
  spikes.forEach(spike => {
    console.log(`Volume spike: ${spike.token_ticker} +${spike.spike_percentage}%`);
  });
});

socket.on('price_change', (changes) => {
  changes.forEach(change => {
    console.log(`Price change: ${change.token_ticker} ${change.change_percentage}%`);
  });
});
```

## 🧪 Testing

The project includes comprehensive test coverage with 15+ tests:

```bash
# Run all tests
cd server && npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm test -- --testNamePattern="Token Merging"
npm test -- --testNamePattern="Pagination"
npm test -- --testNamePattern="WebSocket"
```

**Test Coverage:**
- ✅ Token merging logic and deduplication
- ✅ Cursor-based pagination functionality
- ✅ WebSocket real-time update events
- ✅ API endpoint validation and error handling
- ✅ Rate limiting and exponential backoff
- ✅ Filtering, sorting, and search functionality
- ✅ Cache service operations
- ✅ Data aggregation from multiple sources

## 🚀 Deployment

### Production Build
```bash
# Build both frontend and backend
npm run build

# Start production server
cd server && npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production
RUN cd server && npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
REDIS_URL=redis://your-redis-server:6379
ALLOWED_ORIGINS=https://your-domain.com
```

## 📊 Performance Optimizations

### 1. Caching Strategy
- **Redis TTL**: 30-second cache reduces API calls by ~90%
- **Intelligent Cache Keys**: Generated based on filter parameters
- **Cache Warming**: Proactive cache updates via WebSocket

### 2. Rate Limiting & Retry Logic
- **Exponential Backoff**: 1s → 2s → 4s → 8s → 30s max delay
- **Retry Interceptors**: Automatic retry with Axios interceptors
- **Service-Specific Limits**: Different limits for each API source

### 3. Data Aggregation
- **Intelligent Merging**: Source priority-based token consolidation
- **Parallel Fetching**: Concurrent API calls with Promise.allSettled
- **Graceful Degradation**: Continue with partial data if sources fail

### 4. WebSocket Efficiency
- **Targeted Updates**: Only emit to subscribed clients
- **Event Batching**: Batch similar events to reduce network overhead
- **Connection Management**: Automatic reconnection with exponential backoff

### 5. Frontend Optimizations
- **Memoized Components**: React.memo for expensive renders
- **Debounced Search**: 300ms debounce for search input
- **Virtual Scrolling**: Efficient rendering of large token lists
- **Optimistic Updates**: Immediate UI updates with WebSocket data

## 🔍 Monitoring & Logging

### Logging Strategy
```javascript
// Structured logging with service attribution
console.log('DexScreener returned 45 valid tokens');
console.log('Jupiter enriched 38/45 tokens with prices');
console.log('Detected 3 volume spikes, 7 significant price changes');
```

### Key Metrics Tracked
- API response times and success rates
- Cache hit/miss ratios
- WebSocket connection counts
- Rate limit status per service
- Token merge success rates
- Real-time event detection rates

## 🤝 API Integration Examples

### Postman Collection
Import the provided Postman collection for easy API testing:

```json
{
  "info": { "name": "MemeFlow API" },
  "item": [
    {
      "name": "Get Tokens",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/tokens?limit=20&sortBy=volume&sortOrder=desc"
      }
    },
    {
      "name": "Search Tokens",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/tokens/search/BONK"
      }
    }
  ]
}
```

### cURL Examples
```bash
# Get trending tokens
curl "http://localhost:3001/api/tokens/trending"

# Get tokens with pagination
curl "http://localhost:3001/api/tokens?limit=10&cursor=eyJ0b2tlbl9hZGRyZXNzIjoiQUJDMTIzIn0="

# Search for specific token
curl "http://localhost:3001/api/tokens/search/PEPE"

# Get volume leaders
curl "http://localhost:3001/api/tokens/volume-leaders"
```

## 🎯 Design Decisions

### 1. **Cursor-Based Pagination**
- **Why**: More efficient than offset-based for large datasets
- **Implementation**: Uses token address + sort value for stable cursors
- **Fallback**: Offset-based pagination for invalid cursors

### 2. **Intelligent Token Merging**
- **Strategy**: Address-based deduplication with source priority
- **Priority**: DexScreener > Jupiter > GeckoTerminal
- **Logic**: Max values for volume/market cap, sum for transactions

### 3. **Real-time Event Detection**
- **Volume Spikes**: >50% increase threshold
- **Price Changes**: >10% change threshold
- **Update Frequency**: 15-second intervals for balance of freshness vs. performance

### 4. **Caching Architecture**
- **TTL Strategy**: 30-second cache balances freshness with performance
- **Key Generation**: Parameter-based keys for precise cache invalidation
- **Graceful Degradation**: Continue without cache if Redis unavailable

### 5. **Error Handling**
- **Retry Logic**: Exponential backoff with jitter
- **Partial Failures**: Continue with available data sources
- **User Experience**: Graceful error messages without technical details

## 📹 Demo Video

**YouTube Demo**: [https://youtu.be/your-demo-video](https://youtu.be/your-demo-video)

The demo showcases:
- Real-time token data aggregation
- WebSocket updates and event detection
- Advanced filtering and pagination
- Volume spike and price change alerts
- Responsive UI with live data updates

## 🔧 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check Redis status
redis-cli ping
# Should return "PONG"

# Start Redis if not running
redis-server
```

**API Rate Limits**
```bash
# Check rate limit status
curl "http://localhost:3001/api/tokens" -v
# Look for rate limit headers
```

**WebSocket Connection Issues**
```javascript
// Enable debug logging
localStorage.debug = 'socket.io-client:socket';
```

### Performance Tuning

**Increase Cache TTL**
```env
CACHE_TTL=60  # Increase to 60 seconds
```

**Adjust Update Frequency**
```javascript
// In websocket.ts
const updateInterval = 30000; // 30 seconds instead of 15
```

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Add tests for new features
- Update documentation
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ for the DeFi community**

*Real-time meme coin data aggregation made simple and reliable.*