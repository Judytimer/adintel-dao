/**
 * RateLimiter unit tests
 */

import RateLimiter from '@modules/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  
  beforeEach(() => {
    rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
  });
  
  describe('canMakeRequest', () => {
    it('should allow requests within limit', () => {
      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
    
    it('should block requests over limit', () => {
      // Use up all requests
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      
      // Fourth request should be blocked
      expect(rateLimiter.canMakeRequest()).toBe(false);
    });
    
    it('should allow requests after window expires', async () => {
      // Use up all requests
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      
      // Should be blocked
      expect(rateLimiter.canMakeRequest()).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });
  
  describe('getCurrentCount', () => {
    it('should return correct count', () => {
      expect(rateLimiter.getCurrentCount()).toBe(0);
      
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getCurrentCount()).toBe(1);
      
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getCurrentCount()).toBe(2);
    });
    
    it('should update count after window expires', async () => {
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getCurrentCount()).toBe(2);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(rateLimiter.getCurrentCount()).toBe(0);
    });
  });
  
  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', () => {
      expect(rateLimiter.getRemainingRequests()).toBe(3);
      
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(2);
      
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(1);
      
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(0);
    });
  });
  
  describe('getTimeUntilNextRequest', () => {
    it('should return 0 when requests available', () => {
      expect(rateLimiter.getTimeUntilNextRequest()).toBe(0);
      rateLimiter.canMakeRequest();
      expect(rateLimiter.getTimeUntilNextRequest()).toBe(0);
    });
    
    it('should return time until next request when limit reached', () => {
      // Use up all requests
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      
      const timeUntilNext = rateLimiter.getTimeUntilNextRequest();
      expect(timeUntilNext).toBeGreaterThan(0);
      expect(timeUntilNext).toBeLessThanOrEqual(1000);
    });
  });
  
  describe('reset', () => {
    it('should reset all requests', () => {
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      rateLimiter.canMakeRequest();
      
      expect(rateLimiter.getCurrentCount()).toBe(3);
      expect(rateLimiter.canMakeRequest()).toBe(false);
      
      rateLimiter.reset();
      
      expect(rateLimiter.getCurrentCount()).toBe(0);
      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });
});