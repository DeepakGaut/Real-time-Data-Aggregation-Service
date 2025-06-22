import request from 'supertest';
import app from '../../app.js';

describe('Advanced Filtering and Sorting', () => {
  describe('Sorting functionality', () => {
    it('should sort by volume in descending order by default', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ limit: 10 })
        .expect(200);

      const tokens = response.body.data.tokens;
      if (tokens.length > 1) {
        for (let i = 0; i < tokens.length - 1; i++) {
          expect(tokens[i].volume_sol).toBeGreaterThanOrEqual(tokens[i + 1].volume_sol);
        }
      }
    });

    it('should sort by different metrics', async () => {
      const sortOptions = ['volume', 'price_change', 'market_cap', 'liquidity'];

      for (const sortBy of sortOptions) {
        const response = await request(app)
          .get('/api/tokens')
          .query({ sortBy, sortOrder: 'desc', limit: 5 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens).toBeDefined();
      }
    });

    it('should sort in ascending and descending order', async () => {
      const ascResponse = await request(app)
        .get('/api/tokens')
        .query({ sortBy: 'volume', sortOrder: 'asc', limit: 5 })
        .expect(200);

      const descResponse = await request(app)
        .get('/api/tokens')
        .query({ sortBy: 'volume', sortOrder: 'desc', limit: 5 })
        .expect(200);

      expect(ascResponse.body.success).toBe(true);
      expect(descResponse.body.success).toBe(true);

      const ascTokens = ascResponse.body.data.tokens;
      const descTokens = descResponse.body.data.tokens;

      if (ascTokens.length > 1) {
        for (let i = 0; i < ascTokens.length - 1; i++) {
          expect(ascTokens[i].volume_sol).toBeLessThanOrEqual(ascTokens[i + 1].volume_sol);
        }
      }

      if (descTokens.length > 1) {
        for (let i = 0; i < descTokens.length - 1; i++) {
          expect(descTokens[i].volume_sol).toBeGreaterThanOrEqual(descTokens[i + 1].volume_sol);
        }
      }
    });
  });

  describe('Filtering functionality', () => {
    it('should filter by minimum volume', async () => {
      const minVolume = 100;
      const response = await request(app)
        .get('/api/tokens')
        .query({ minVolume, limit: 10 })
        .expect(200);

      const tokens = response.body.data.tokens;
      tokens.forEach((token: any) => {
        expect(token.volume_sol).toBeGreaterThanOrEqual(minVolume);
      });
    });

    it('should filter by minimum market cap', async () => {
      const minMarketCap = 1000;
      const response = await request(app)
        .get('/api/tokens')
        .query({ minMarketCap, limit: 10 })
        .expect(200);

      const tokens = response.body.data.tokens;
      tokens.forEach((token: any) => {
        expect(token.market_cap_sol).toBeGreaterThanOrEqual(minMarketCap);
      });
    });

    it('should filter by timeframe', async () => {
      const timeframes = ['1h', '24h', '7d'];

      for (const timeframe of timeframes) {
        const response = await request(app)
          .get('/api/tokens')
          .query({ timeframe, limit: 5 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.filters.applied.timeframe).toBe(timeframe);
      }
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({
          minVolume: 50,
          minMarketCap: 500,
          sortBy: 'volume',
          sortOrder: 'desc',
          limit: 5
        })
        .expect(200);

      const tokens = response.body.data.tokens;
      tokens.forEach((token: any) => {
        expect(token.volume_sol).toBeGreaterThanOrEqual(50);
        expect(token.market_cap_sol).toBeGreaterThanOrEqual(500);
      });
    });
  });

  describe('Special endpoints', () => {
    it('should return trending tokens', async () => {
      const response = await request(app)
        .get('/api/tokens/trending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      
      // All trending tokens should have positive price changes
      response.body.data.tokens.forEach((token: any) => {
        expect(token.price_1hr_change).toBeGreaterThan(0);
      });
    });

    it('should return volume leaders', async () => {
      const response = await request(app)
        .get('/api/tokens/volume-leaders')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      
      // Should be sorted by volume in descending order
      const tokens = response.body.data.tokens;
      if (tokens.length > 1) {
        for (let i = 0; i < tokens.length - 1; i++) {
          expect(tokens[i].volume_sol).toBeGreaterThanOrEqual(tokens[i + 1].volume_sol);
        }
      }
    });

    it('should return aggregated statistics', async () => {
      const response = await request(app)
        .get('/api/tokens/stats/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTokens');
      expect(response.body.data).toHaveProperty('totalVolume');
      expect(response.body.data).toHaveProperty('totalMarketCap');
      expect(response.body.data).toHaveProperty('averagePrice');
      expect(response.body.data).toHaveProperty('topGainers');
      expect(response.body.data).toHaveProperty('topLosers');
      expect(response.body.data).toHaveProperty('protocolDistribution');
    });
  });

  describe('Error handling', () => {
    it('should reject invalid sort parameters', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ sortBy: 'invalid_sort' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid request parameters');
    });

    it('should reject invalid timeframe', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ timeframe: 'invalid_timeframe' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject negative filter values', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ minVolume: -100 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});