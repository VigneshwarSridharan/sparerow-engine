import { describe, expect, it, beforeEach } from 'vitest';
import { createRateLimiter } from '../../src/middlewares/rate-limit';

const IP_A = '1.2.3.4';
const IP_B = '5.6.7.8';
const NOW = Date.now();
const WINDOW = 60_000;

describe('createRateLimiter', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('auth-strict', IP_A, 5, WINDOW, NOW + i);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('auth-strict', IP_A, 5, WINDOW, NOW);
    }
    const result = limiter.check('auth-strict', IP_A, 5, WINDOW, NOW + 1);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns a resetAt in the future', () => {
    const result = limiter.check('auth-strict', IP_A, 5, WINDOW, NOW);
    expect(result.resetAt).toBeGreaterThan(NOW);
  });

  it('tracks IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('auth-strict', IP_A, 5, WINDOW, NOW);
    }
    // IP_A is exhausted — IP_B should still be allowed
    const result = limiter.check('auth-strict', IP_B, 5, WINDOW, NOW);
    expect(result.allowed).toBe(true);
  });

  it('resets counter after window expires', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('auth-strict', IP_A, 5, WINDOW, NOW);
    }
    // One full window later
    const result = limiter.check('auth-strict', IP_A, 5, WINDOW, NOW + WINDOW + 1);
    expect(result.allowed).toBe(true);
  });

  it('tracks buckets independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('auth-strict', IP_A, 5, WINDOW, NOW);
    }
    // Same IP but different bucket (storefront limit = 100)
    const result = limiter.check('storefront', IP_A, 100, WINDOW, NOW);
    expect(result.allowed).toBe(true);
  });

  it('decrements remaining correctly', () => {
    const r1 = limiter.check('storefront', IP_A, 100, WINDOW, NOW);
    expect(r1.remaining).toBe(99);
    const r2 = limiter.check('storefront', IP_A, 100, WINDOW, NOW + 1);
    expect(r2.remaining).toBe(98);
  });

  it('pruneExpired removes stale entries', () => {
    limiter.check('auth-strict', IP_A, 5, WINDOW, NOW);
    // Prune at a time past the window reset
    limiter.pruneExpired(NOW + WINDOW + 1);
    // Entry should be gone — next check should start fresh
    const result = limiter.check('auth-strict', IP_A, 5, WINDOW, NOW + WINDOW + 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
