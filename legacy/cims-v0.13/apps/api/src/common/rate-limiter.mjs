import { DomainError } from './domain-error.mjs';

export class FixedWindowRateLimiter {
  constructor({ windowMs = 60_000, max = 60 } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.buckets = new Map();
  }

  consume(key, at = Date.now()) {
    const bucketKey = String(key);
    const existing = this.buckets.get(bucketKey);
    if (!existing || at >= existing.resetAt) {
      const next = { count: 1, resetAt: at + this.windowMs };
      this.buckets.set(bucketKey, next);
      return { remaining: this.max - 1, resetAt: next.resetAt };
    }
    existing.count += 1;
    if (existing.count > this.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - at) / 1000));
      throw new DomainError(
        'RATE_LIMITED',
        'Too many requests. Retry after the configured window.',
        429,
        { retry_after_seconds: retryAfterSeconds }
      );
    }
    return { remaining: this.max - existing.count, resetAt: existing.resetAt };
  }

  prune(at = Date.now()) {
    for (const [key, value] of this.buckets.entries())
      if (at >= value.resetAt) this.buckets.delete(key);
  }
}
