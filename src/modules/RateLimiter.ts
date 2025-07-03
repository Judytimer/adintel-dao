/**
 * Rate Limiter Module
 * Controls the frequency of operations to prevent overload
 */

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[];

  /**
   * Create a rate limiter
   * @param maxRequests - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Check if a new request can be made
   * @returns True if request is allowed
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove expired requests
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if under limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  /**
   * Get current request count in the window
   * @returns Current request count
   */
  getCurrentCount(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length;
  }

  /**
   * Get remaining requests allowed
   * @returns Remaining requests
   */
  getRemainingRequests(): number {
    return Math.max(0, this.maxRequests - this.getCurrentCount());
  }

  /**
   * Get time until next request is allowed
   * @returns Milliseconds until next allowed request
   */
  getTimeUntilNextRequest(): number {
    if (this.getCurrentCount() < this.maxRequests) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilExpiry = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

export default RateLimiter;