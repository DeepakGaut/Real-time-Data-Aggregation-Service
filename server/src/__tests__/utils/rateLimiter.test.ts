import { RateLimiter } from '../../utils/rateLimiter.js';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await rateLimiter.checkLimit('test-service', 5, 1000);
      expect(result).toBe(true);
    });

    it('should track multiple requests', async () => {
      const service = 'test-service';
      const maxRequests = 3;
      
      // First 3 requests should succeed
      for (let i = 0; i < maxRequests; i++) {
        const result = await rateLimiter.checkLimit(service, maxRequests, 1000);
        expect(result).toBe(true);
      }
    });

    it('should apply rate limiting after limit exceeded', async () => {
      const service = 'test-service';
      const maxRequests = 2;
      
      // Exceed the limit
      await rateLimiter.checkLimit(service, maxRequests, 1000);
      await rateLimiter.checkLimit(service, maxRequests, 1000);
      
      // This should trigger rate limiting (return false after backoff)
      const result = await rateLimiter.checkLimit(service, maxRequests, 1000);
      expect(result).toBe(false);
    });

    it('should reset limit after window expires', async () => {
      const service = 'test-service';
      const maxRequests = 1;
      const windowMs = 100; // Short window for testing
      
      // Use up the limit
      await rateLimiter.checkLimit(service, maxRequests, windowMs);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 10));
      
      // Should allow requests again
      const result = await rateLimiter.checkLimit(service, maxRequests, windowMs);
      expect(result).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return null for unknown service', () => {
      const status = rateLimiter.getStatus('unknown-service');
      expect(status).toBeNull();
    });

    it('should return status after requests', async () => {
      const service = 'test-service';
      await rateLimiter.checkLimit(service, 5, 1000);
      
      const status = rateLimiter.getStatus(service);
      expect(status).not.toBeNull();
      expect(status).toHaveProperty('requests');
      expect(status).toHaveProperty('resetTime');
    });
  });
});