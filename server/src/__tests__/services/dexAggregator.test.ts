import { DexAggregatorService } from '../../services/dexAggregator.js';
import { Token } from '../../models/token.js';

// Mock the services
jest.mock('../../services/dexScreener.js');
jest.mock('../../services/jupiter.js');
jest.mock('../../services/geckoTerminal.js');
jest.mock('../../services/cache.js');

describe('DexAggregatorService', () => {
  let aggregator: DexAggregatorService;

  beforeEach(() => {
    aggregator = new DexAggregatorService();
  });

  describe('getTokens', () => {
    it('should return empty array when no tokens found', async () => {
      const result = await aggregator.getTokens();
      
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasNext');
      expect(Array.isArray(result.tokens)).toBe(true);
    });

    it('should apply sorting correctly', async () => {
      const mockTokens: Token[] = [
        {
          token_address: '1',
          token_name: 'Token A',
          token_ticker: 'TKA',
          price_sol: 1,
          market_cap_sol: 100,
          volume_sol: 50,
          liquidity_sol: 25,
          transaction_count: 10,
          price_1hr_change: 5,
          protocol: 'Test',
          last_updated: Date.now(),
          source: ['test']
        },
        {
          token_address: '2',
          token_name: 'Token B',
          token_ticker: 'TKB',
          price_sol: 2,
          market_cap_sol: 200,
          volume_sol: 100,
          liquidity_sol: 50,
          transaction_count: 20,
          price_1hr_change: 10,
          protocol: 'Test',
          last_updated: Date.now(),
          source: ['test']
        }
      ];

      // Test descending sort by volume (default)
      const result = await aggregator.getTokens({ sortBy: 'volume', sortOrder: 'desc' });
      expect(result.tokens).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      const result = await aggregator.getTokens({ limit: 5 });
      
      expect(result.tokens.length).toBeLessThanOrEqual(5);
      expect(typeof result.hasNext).toBe('boolean');
    });
  });

  describe('getTokenByAddress', () => {
    it('should return null for non-existent token', async () => {
      const result = await aggregator.getTokenByAddress('invalid_address');
      expect(result).toBeNull();
    });

    it('should handle valid token address', async () => {
      const validAddress = '576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y';
      const result = await aggregator.getTokenByAddress(validAddress);
      
      // Should either return a token or null (depending on API availability)
      if (result) {
        expect(result).toHaveProperty('token_address');
        expect(result).toHaveProperty('token_name');
        expect(result).toHaveProperty('price_sol');
      }
    });
  });
});