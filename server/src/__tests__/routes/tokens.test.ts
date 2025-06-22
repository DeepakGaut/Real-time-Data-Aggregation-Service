import request from 'supertest';
import app from '../../app.js';

describe('/api/tokens', () => {
  describe('GET /api/tokens', () => {
    it('should return token list with default parameters', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('hasNext');
      expect(Array.isArray(response.body.data.tokens)).toBe(true);
    });

    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({
          limit: 10,
          sortBy: 'volume',
          sortOrder: 'desc',
          timeframe: '24h'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.length).toBeLessThanOrEqual(10);
    });

    it('should reject invalid parameters', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({
          limit: 1000, // Exceeds max limit
          sortBy: 'invalid_sort'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle minimum volume filter', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({
          minVolume: 100
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned tokens should have volume >= 100
      response.body.data.tokens.forEach((token: any) => {
        expect(token.volume_sol).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('GET /api/tokens/:address', () => {
    it('should return 404 for invalid token address', async () => {
      const response = await request(app)
        .get('/api/tokens/invalid_address')
        .expect(400); // Should fail validation first

      expect(response.body.success).toBe(false);
    });

    it('should handle valid token address format', async () => {
      const validAddress = '576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y';
      const response = await request(app)
        .get(`/api/tokens/${validAddress}`);

      // Should be either 200 (found) or 404 (not found), not 400 (invalid)
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token_address', validAddress);
      }
    });
  });

  describe('GET /api/tokens/search/:query', () => {
    it('should reject short search queries', async () => {
      const response = await request(app)
        .get('/api/tokens/search/a')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 2 characters');
    });

    it('should accept valid search queries', async () => {
      const response = await request(app)
        .get('/api/tokens/search/token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokens');
      expect(Array.isArray(response.body.data.tokens)).toBe(true);
    });

    it('should limit search results', async () => {
      const response = await request(app)
        .get('/api/tokens/search/test')
        .expect(200);

      expect(response.body.data.tokens.length).toBeLessThanOrEqual(20);
    });
  });
});