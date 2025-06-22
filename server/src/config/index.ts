export const config = {
  port: process.env.PORT || 3001,
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL || '30') // seconds
  },
  apis: {
    dexScreener: {
      baseUrl: 'https://api.dexscreener.com',
      rateLimit: 300, // requests per minute
      timeout: 5000
    },
    jupiter: {
      baseUrl: 'https://price.jup.ag',
      timeout: 5000
    },
    geckoTerminal: {
      baseUrl: 'https://api.geckoterminal.com',
      timeout: 5000
    }
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },
  websocket: {
    updateInterval: 30000 // 30 seconds
  }
};