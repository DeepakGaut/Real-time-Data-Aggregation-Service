import { DexAggregatorService } from '../../services/dexAggregator.js';
import { Token } from '../../models/token.js';

// Mock the services
jest.mock('../../services/dexScreener.js');
jest.mock('../../services/jupiter.js');
jest.mock('../../services/geckoTerminal.js');
jest.mock('../../services/cache.js');

describe('Token Merging Logic', () => {
  let aggregator: DexAggregatorService;

  beforeEach(() => {
    aggregator = new DexAggregatorService();
  });

  describe('mergeTokensIntelligently', () => {
    it('should merge duplicate tokens by address', () => {
      const token1: Token = {
        token_address: 'ABC123',
        token_name: 'Test Token',
        token_ticker: 'TEST',
        price_sol: 1.0,
        market_cap_sol: 1000,
        volume_sol: 500,
        liquidity_sol: 200,
        transaction_count: 100,
        price_1hr_change: 5.0,
        protocol: 'Raydium',
        last_updated: Date.now() - 1000,
        source: ['dexscreener']
      };

      const token2: Token = {
        token_address: 'ABC123', // Same address
        token_name: 'Test Token Enhanced',
        token_ticker: 'TEST',
        price_sol: 1.1,
        market_cap_sol: 1200,
        volume_sol: 600,
        liquidity_sol: 250,
        transaction_count: 150,
        price_1hr_change: 6.0,
        protocol: 'Jupiter',
        last_updated: Date.now(),
        source: ['jupiter']
      };

      // Access private method through any casting for testing
      const mergedTokens = (aggregator as any).mergeTokensIntelligently([token1, token2]);

      expect(mergedTokens).toHaveLength(1);
      expect(mergedTokens[0].token_address).toBe('ABC123');
      expect(mergedTokens[0].volume_sol).toBe(600); // Should use max volume
      expect(mergedTokens[0].market_cap_sol).toBe(1200); // Should use max market cap
      expect(mergedTokens[0].transaction_count).toBe(250); // Should sum transaction counts
      expect(mergedTokens[0].source).toEqual(['dexscreener', 'jupiter']);
    });

    it('should select best price based on source priority', () => {
      const dexScreenerToken: Token = {
        token_address: 'XYZ789',
        token_name: 'Priority Test',
        token_ticker: 'PRIO',
        price_sol: 2.0,
        market_cap_sol: 2000,
        volume_sol: 1000,
        liquidity_sol: 400,
        transaction_count: 200,
        price_1hr_change: 10.0,
        protocol: 'Raydium',
        last_updated: Date.now(),
        source: ['dexscreener']
      };

      const geckoToken: Token = {
        token_address: 'XYZ789',
        token_name: 'Priority Test',
        token_ticker: 'PRIO',
        price_sol: 2.5, // Higher price but lower priority source
        market_cap_sol: 2500,
        volume_sol: 1200,
        liquidity_sol: 500,
        transaction_count: 250,
        price_1hr_change: 12.0,
        protocol: 'GeckoTerminal',
        last_updated: Date.now(),
        source: ['geckoterminal']
      };

      const mergedTokens = (aggregator as any).mergeTokensIntelligently([geckoToken, dexScreenerToken]);

      expect(mergedTokens).toHaveLength(1);
      expect(mergedTokens[0].price_sol).toBe(2.0); // Should prefer DexScreener price
    });

    it('should handle tokens with missing data gracefully', () => {
      const completeToken: Token = {
        token_address: 'COMPLETE123',
        token_name: 'Complete Token',
        token_ticker: 'COMP',
        price_sol: 1.5,
        market_cap_sol: 1500,
        volume_sol: 750,
        liquidity_sol: 300,
        transaction_count: 150,
        price_1hr_change: 7.5,
        protocol: 'Raydium',
        last_updated: Date.now(),
        source: ['dexscreener']
      };

      const incompleteToken: Token = {
        token_address: 'COMPLETE123',
        token_name: 'Unknown',
        token_ticker: 'UNKNOWN',
        price_sol: 0,
        market_cap_sol: 0,
        volume_sol: 0,
        liquidity_sol: 0,
        transaction_count: 0,
        price_1hr_change: 0,
        protocol: 'Unknown',
        last_updated: Date.now() - 5000,
        source: ['geckoterminal']
      };

      const mergedTokens = (aggregator as any).mergeTokensIntelligently([incompleteToken, completeToken]);

      expect(mergedTokens).toHaveLength(1);
      expect(mergedTokens[0].token_name).toBe('Complete Token');
      expect(mergedTokens[0].token_ticker).toBe('COMP');
      expect(mergedTokens[0].price_sol).toBe(1.5);
    });
  });

  describe('cursor-based pagination', () => {
    it('should generate proper cursor for pagination', () => {
      const tokens: Token[] = Array.from({ length: 50 }, (_, i) => ({
        token_address: `TOKEN${i}`,
        token_name: `Token ${i}`,
        token_ticker: `TK${i}`,
        price_sol: i * 0.1,
        market_cap_sol: i * 100,
        volume_sol: i * 50,
        liquidity_sol: i * 20,
        transaction_count: i * 10,
        price_1hr_change: i * 0.5,
        protocol: 'Test',
        last_updated: Date.now(),
        source: ['test']
      }));

      const result = (aggregator as any).applyCursorPagination(tokens, { limit: 20 });

      expect(result.tokens).toHaveLength(20);
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toBeDefined();

      // Decode cursor to verify structure
      const decodedCursor = JSON.parse(Buffer.from(result.nextCursor!, 'base64').toString());
      expect(decodedCursor).toHaveProperty('token_address');
      expect(decodedCursor).toHaveProperty('sort_value');
      expect(decodedCursor).toHaveProperty('offset');
    });

    it('should handle cursor-based pagination correctly', () => {
      const tokens: Token[] = Array.from({ length: 30 }, (_, i) => ({
        token_address: `TOKEN${i}`,
        token_name: `Token ${i}`,
        token_ticker: `TK${i}`,
        price_sol: i * 0.1,
        market_cap_sol: i * 100,
        volume_sol: i * 50,
        liquidity_sol: i * 20,
        transaction_count: i * 10,
        price_1hr_change: i * 0.5,
        protocol: 'Test',
        last_updated: Date.now(),
        source: ['test']
      }));

      // First page
      const firstPage = (aggregator as any).applyCursorPagination(tokens, { limit: 10 });
      expect(firstPage.tokens).toHaveLength(10);
      expect(firstPage.hasNext).toBe(true);

      // Second page using cursor
      const secondPage = (aggregator as any).applyCursorPagination(tokens, { 
        limit: 10, 
        cursor: firstPage.nextCursor 
      });
      expect(secondPage.tokens).toHaveLength(10);
      expect(secondPage.tokens[0].token_address).toBe('TOKEN10');
    });
  });

  describe('filtering and sorting', () => {
    it('should apply volume filter correctly', () => {
      const tokens: Token[] = [
        {
          token_address: 'HIGH_VOL',
          token_name: 'High Volume',
          token_ticker: 'HIGH',
          price_sol: 1.0,
          market_cap_sol: 1000,
          volume_sol: 1000, // High volume
          liquidity_sol: 200,
          transaction_count: 100,
          price_1hr_change: 5.0,
          protocol: 'Test',
          last_updated: Date.now(),
          source: ['test']
        },
        {
          token_address: 'LOW_VOL',
          token_name: 'Low Volume',
          token_ticker: 'LOW',
          price_sol: 1.0,
          market_cap_sol: 1000,
          volume_sol: 10, // Low volume
          liquidity_sol: 200,
          transaction_count: 100,
          price_1hr_change: 5.0,
          protocol: 'Test',
          last_updated: Date.now(),
          source: ['test']
        }
      ];

      const filtered = (aggregator as any).applyFiltersAndSorting(tokens, { minVolume: 100 });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].token_address).toBe('HIGH_VOL');
    });

    it('should sort by different metrics correctly', () => {
      const tokens: Token[] = [
        {
          token_address: 'TOKEN_A',
          token_name: 'Token A',
          token_ticker: 'TKA',
          price_sol: 1.0,
          market_cap_sol: 500,
          volume_sol: 100,
          liquidity_sol: 200,
          transaction_count: 100,
          price_1hr_change: 5.0,
          protocol: 'Test',
          last_updated: Date.now(),
          source: ['test']
        },
        {
          token_address: 'TOKEN_B',
          token_name: 'Token B',
          token_ticker: 'TKB',
          price_sol: 2.0,
          market_cap_sol: 1000,
          volume_sol: 200,
          liquidity_sol: 400,
          transaction_count: 200,
          price_1hr_change: 10.0,
          protocol: 'Test',
          last_updated: Date.now(),
          source: ['test']
        }
      ];

      // Sort by volume descending
      const sortedByVolume = (aggregator as any).applyFiltersAndSorting(tokens, { 
        sortBy: 'volume', 
        sortOrder: 'desc' 
      });
      expect(sortedByVolume[0].token_address).toBe('TOKEN_B');

      // Sort by price change ascending
      const sortedByPriceChange = (aggregator as any).applyFiltersAndSorting(tokens, { 
        sortBy: 'price_change', 
        sortOrder: 'asc' 
      });
      expect(sortedByPriceChange[0].token_address).toBe('TOKEN_A');
    });
  });
});