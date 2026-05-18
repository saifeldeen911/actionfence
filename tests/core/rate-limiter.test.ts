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
    it('should allow the first request', async () => {
      const result = await limiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('should allow requests within the limit', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkRequestRate('agent-1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests exceeding the limit', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkRequestRate('agent-1');
      }

      const result = await limiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetMs).toBeGreaterThan(0);
    });

    it('should reset after the window expires', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkRequestRate('agent-1');
      }
      expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(false);

      vi.advanceTimersByTime(61_000);

      const result = await limiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track different keys independently', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkRequestRate('agent-1');
      }
      expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(false);

      const result = await limiter.checkRequestRate('agent-2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should preview request limits without consuming capacity', async () => {
      const preview = await limiter.previewRequestRate('agent-1');
      expect(preview.allowed).toBe(true);
      expect(preview.remaining).toBe(4);

      for (let i = 0; i < 5; i++) {
        expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(true);
      }
      expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(false);
    });
  });

  describe('transaction rate limiting', () => {
    it('should allow transactions within the daily limit', async () => {
      for (let i = 0; i < 3; i++) {
        const result = await limiter.checkTransactionRate('agent-1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block transactions exceeding the daily limit', async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.checkTransactionRate('agent-1');
      }

      const result = await limiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(3);
    });

    it('should be independent from request rate limiting', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkRequestRate('agent-1');
      }

      const result = await limiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(true);
    });

    it('should preview transaction limits without consuming capacity', async () => {
      const preview = await limiter.previewTransactionRate('agent-1');
      expect(preview.allowed).toBe(true);
      expect(preview.remaining).toBe(2);

      for (let i = 0; i < 3; i++) {
        expect((await limiter.checkTransactionRate('agent-1')).allowed).toBe(true);
      }
      expect((await limiter.checkTransactionRate('agent-1')).allowed).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset a specific key', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkRequestRate('agent-1');
      }
      expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(false);

      limiter.reset('agent-1');

      expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(true);
    });

    it('should reset all keys when called without argument', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkRequestRate('agent-1');
        await limiter.checkRequestRate('agent-2');
      }

      limiter.reset();

      expect((await limiter.checkRequestRate('agent-1')).allowed).toBe(true);
      expect((await limiter.checkRequestRate('agent-2')).allowed).toBe(true);
    });
  });

  describe('unconfigured limits', () => {
    it('should return unlimited when requests_per_minute is not set', async () => {
      const unlimitedLimiter = new RateLimiter({});
      const result = await unlimitedLimiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });

    it('should return unlimited when transactions_per_day is not set', async () => {
      const unlimitedLimiter = new RateLimiter({});
      const result = await unlimitedLimiter.checkTransactionRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });

    it('should treat requests_per_minute: 0 as unlimited', async () => {
      const unlimitedLimiter = new RateLimiter({ requests_per_minute: 0 });
      const result = await unlimitedLimiter.checkRequestRate('agent-1');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      unlimitedLimiter.dispose();
    });

    it('should treat transactions_per_day: 0 as unlimited', async () => {
      const unlimitedLimiter = new RateLimiter({ transactions_per_day: 0 });
      const result = await unlimitedLimiter.checkTransactionRate('agent-1');
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
