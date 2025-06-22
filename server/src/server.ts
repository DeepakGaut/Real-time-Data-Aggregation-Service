import { createServer } from 'http';
import app from './app.js';
import { WebSocketService } from './services/websocket.js';
import { cacheService } from './services/cache.js';
import { config } from './config/index.js';

const server = createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    server.close(() => {
      console.log('HTTP server closed');
    });

    // Disconnect from Redis
    await cacheService.disconnect();
    console.log('Redis connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await cacheService.connect();
    
    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 WebSocket service initialized`);
      console.log(`💾 Redis cache service connected`);
      console.log(`🔗 API endpoints available at http://localhost:${config.port}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();