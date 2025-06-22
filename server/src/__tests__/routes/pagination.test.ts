import request from 'supertest';
import app from '../../app.js';

describe('Cursor-based Pagination', () => {
  describe('GET /api/tokens with pagination', () => {
    it('should return cursor for next page when hasNext is true', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hasNext');
      expect(response.body.pagination).toHaveProperty('nextCursor');
      
      if (response.body.data.hasNext) {
        expect(response.body.pagination.nextCursor).toBeDefined();
        expect(typeof response.body.pagination.nextCursor).toBe('string');
      }
    });

    it('should accept cursor parameter for pagination', async () => {
      // First request to get a cursor
      const firstResponse = await request(app)
        .get('/api/tokens')
        .query({ limit: 3 })
        .expect(200);

      if (firstResponse.body.data.hasNext && firstResponse.body.pagination.nextCursor) {
        // Second request using the cursor
        const secondResponse = await request(app)
          .get('/api/tokens')
          .query({ 
            limit: 3,
            cursor: firstResponse.body.pagination.nextCursor
          })
          .expect(200);

        expect(secondResponse.body.success).toBe(true);
        expect(secondResponse.body.data.tokens).toBeDefined();
        
        // Tokens should be different from first page
        const firstPageAddresses = firstResponse.body.data.tokens.map((t: any) => t.token_address);
        const secondPageAddresses = secondResponse.body.data.tokens.map((t: any) => t.token_address);
        
        // Should have no overlap between pages
        const overlap = firstPageAddresses.filter((addr: string) => secondPageAddresses.includes(addr));
        expect(overlap).toHaveLength(0);
      }
    });

    it('should handle invalid cursor gracefully', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ 
          limit: 5,
          cursor: 'invalid_cursor_string'
        })
        .expect(200); // Should not fail, just ignore invalid cursor

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      const limits = [1, 5, 10, 20];

      for (const limit of limits) {
        const response = await request(app)
          .get('/api/tokens')
          .query({ limit })
          .expect(200);

        expect(response.body.data.tokens.length).toBeLessThanOrEqual(limit);
      }
    });

    it('should enforce maximum limit', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ limit: 1000 }) // Exceeds max limit
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid request parameters');
    });
  });

  describe('Cursor structure validation', () => {
    it('should generate valid base64 cursor', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .query({ limit: 5 })
        .expect(200);

      if (response.body.pagination.nextCursor) {
        const cursor = response.body.pagination.nextCursor;
        
        // Should be valid base64
        expect(() => {
          Buffer.from(cursor, 'base64').toString();
        }).not.toThrow();

        // Decoded cursor should be valid JSON
        const decoded = Buffer.from(cursor, 'base64').toString();
        expect(() => {
          JSON.parse(decoded);
        }).not.toThrow();

        // Should contain required fields
        const cursorData = JSON.parse(decoded);
        expect(cursorData).toHaveProperty('token_address');
        expect(cursorData).toHaveProperty('sort_value');
        expect(cursorData).toHaveProperty('offset');
      }
    });
  });
});