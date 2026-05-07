import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../src/core/rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({
      requests_per_minute: 5,
      transactions_per_day: 3,
    });
  });

  afterEach(() => {
    limiter.dispose();
    vi.useRealTimers();
  });

  describe('request rate limiting', () => {
    it('should allow the first request', () => {
      const result = limiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('should allow requests within the limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkRequestRate('agent-1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests exceeding the limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkRequestRate('agent-1');
      }

      const result = limiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetMs).toBeGreaterThan(0);
    });

    it('should reset after the window expires', () => {
      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        limiter.checkRequestRate('agent-1');
      }
      expect(limiter.checkRequestRate('agent-1').allowed).toBe(false);

      // Advance past the 1-minute window
      vi.advanceTimersByTime(61_000);

      const result = limiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track different keys independently', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkRequestRate('agent-1');
      }
      expect(limiter.checkRequestRate('agent-1').allowed).toBe(false);

      // Different agent should still be allowed
      const result = limiter.checkRequestRate('agent-2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('transaction rate limiting', () => {
    it('should allow transactions within the daily limit', () => {
      for (let i = 0; i < 3; i++) {
        const result = limiter.checkTransactionRate('agent-1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block transactions exceeding the daily limit', () => {
      for (let i = 0; i < 3; i++) {
        limiter.checkTransactionRate('agent-1');
      }

      const result = limiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(3);
    });

    it('should be independent from request rate limiting', () => {
      // Fill up request limit
      for (let i = 0; i < 5; i++) {
        limiter.checkRequestRate('agent-1');
      }

      // Transaction limit should still be available
      const result = limiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset a specific key', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkRequestRate('agent-1');
      }
      expect(limiter.checkRequestRate('agent-1').allowed).toBe(false);

      limiter.reset('agent-1');

      expect(limiter.checkRequestRate('agent-1').allowed).toBe(true);
    });

    it('should reset all keys when called without argument', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkRequestRate('agent-1');
        limiter.checkRequestRate('agent-2');
      }

      limiter.reset();

      expect(limiter.checkRequestRate('agent-1').allowed).toBe(true);
      expect(limiter.checkRequestRate('agent-2').allowed).toBe(true);
    });
  });

  describe('unconfigured limits', () => {
    it('should return unlimited when requests_per_minute is not set', () => {
      const unlimitedLimiter = new RateLimiter({});
      const result = unlimitedLimiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });

    it('should return unlimited when transactions_per_day is not set', () => {
      const unlimitedLimiter = new RateLimiter({});
      const result = unlimitedLimiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });

    it('should treat requests_per_minute: 0 as unlimited', () => {
      const unlimitedLimiter = new RateLimiter({ requests_per_minute: 0 });
      const result = unlimitedLimiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });

    it('should treat transactions_per_day: 0 as unlimited', () => {
      const unlimitedLimiter = new RateLimiter({ transactions_per_day: 0 });
      const result = unlimitedLimiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });
  });

  describe('dispose', () => {
    it('should stop the cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      limiter.dispose();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
