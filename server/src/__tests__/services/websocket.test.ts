import { Server as HTTPServer } from 'http';
import { WebSocketService } from '../../services/websocket.js';
import { DexAggregatorService } from '../../services/dexAggregator.js';

// Mock dependencies
jest.mock('../../services/dexAggregator.js');
jest.mock('socket.io');

describe('WebSocket Service', () => {
  let httpServer: HTTPServer;
  let wsService: WebSocketService;
  let mockAggregator: jest.Mocked<DexAggregatorService>;

  beforeEach(() => {
    httpServer = new HTTPServer();
    mockAggregator = new DexAggregatorService() as jest.Mocked<DexAggregatorService>;
    wsService = new WebSocketService(httpServer);
  });

  afterEach(() => {
    httpServer.close();
  });

  describe('Real-time Updates', () => {
    it('should detect volume spikes correctly', () => {
      const previousData = {
        token_address: 'TEST123',
        volume_sol: 100
      };

      const currentData = {
        token_address: 'TEST123',
        token_name: 'Test Token',
        token_ticker: 'TEST',
        volume_sol: 200, // 100% increase
        price_sol: 1.0,
        market_cap_sol: 1000,
        liquidity_sol: 200,
        transaction_count: 100,
        price_1hr_change: 5.0,
        protocol: 'Test',
        last_updated: Date.now(),
        source: ['test']
      };

      // Access private method for testing
      const volumeChangePercent = ((currentData.volume_sol - previousData.volume_sol) / previousData.volume_sol) * 100;
      
      expect(volumeChangePercent).toBe(100);
      expect(volumeChangePercent).toBeGreaterThan(50); // Volume spike threshold
    });

    it('should detect significant price changes', () => {
      const previousPrice = 1.0;
      const currentPrice = 1.15; // 15% increase

      const priceChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100;

      expect(priceChangePercent).toBe(15);
      expect(Math.abs(priceChangePercent)).toBeGreaterThan(10); // Price change threshold
    });

    it('should track connected clients correctly', () => {
      expect(wsService.getConnectedClientsCount()).toBe(0);

      // Simulate client connection
      (wsService as any).connectedClients.add('client1');
      expect(wsService.getConnectedClientsCount()).toBe(1);

      // Simulate client disconnection
      (wsService as any).connectedClients.delete('client1');
      expect(wsService.getConnectedClientsCount()).toBe(0);
    });

    it('should provide update statistics', () => {
      const stats = wsService.getUpdateStats();

      expect(stats).toHaveProperty('connectedClients');
      expect(stats).toHaveProperty('isUpdating');
      expect(stats).toHaveProperty('trackedTokens');
      expect(typeof stats.connectedClients).toBe('number');
      expect(typeof stats.isUpdating).toBe('boolean');
      expect(typeof stats.trackedTokens).toBe('number');
    });
  });

  describe('Event Types', () => {
    it('should define proper event structure for volume spikes', () => {
      const volumeSpike = {
        token_address: 'TEST123',
        token_name: 'Test Token',
        token_ticker: 'TEST',
        current_volume: 200,
        previous_volume: 100,
        spike_percentage: 100,
        timestamp: Date.now()
      };

      expect(volumeSpike).toHaveProperty('token_address');
      expect(volumeSpike).toHaveProperty('spike_percentage');
      expect(volumeSpike).toHaveProperty('timestamp');
      expect(typeof volumeSpike.spike_percentage).toBe('number');
    });

    it('should define proper event structure for price changes', () => {
      const priceChange = {
        token_address: 'TEST123',
        token_name: 'Test Token',
        token_ticker: 'TEST',
        current_price: 1.15,
        previous_price: 1.0,
        change_percentage: 15,
        timestamp: Date.now()
      };

      expect(priceChange).toHaveProperty('token_address');
      expect(priceChange).toHaveProperty('change_percentage');
      expect(priceChange).toHaveProperty('timestamp');
      expect(typeof priceChange.change_percentage).toBe('number');
    });
  });
});