interface RateLimitState {
  requests: number;
  resetTime: number;
  backoffDelay: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private readonly maxBackoffDelay = 300000; // 5 minutes
  private readonly baseBackoffDelay = 1000; // 1 second

  async checkLimit(service: string, maxRequests: number, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now();
    const state = this.limits.get(service) || {
      requests: 0,
      resetTime: now + windowMs,
      backoffDelay: this.baseBackoffDelay
    };

    // Reset window if expired
    if (now >= state.resetTime) {
      state.requests = 0;
      state.resetTime = now + windowMs;
      state.backoffDelay = this.baseBackoffDelay;
    }

    // Check if we've hit the limit
    if (state.requests >= maxRequests) {
      // Apply exponential backoff
      await this.delay(state.backoffDelay);
      state.backoffDelay = Math.min(state.backoffDelay * 2, this.maxBackoffDelay);
      this.limits.set(service, state);
      return false;
    }

    state.requests++;
    this.limits.set(service, state);
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(service: string): { requests: number; resetTime: number } | null {
    return this.limits.get(service) || null;
  }
}

export const rateLimiter = new RateLimiter();