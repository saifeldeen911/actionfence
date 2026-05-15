import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../../src/core/circuit-breaker.js';
import type { CircuitBreakerConfig } from '../../src/types/policy.js';

describe('CircuitBreaker — no config', () => {
  it('should do nothing when no config is provided', () => {
    const breaker = new CircuitBreaker();

    const recordResult = breaker.record(5000);
    expect(recordResult.tripped).toBe(false);
    expect(recordResult.globalTotal).toBe(0);

    const checkResult = breaker.check();
    expect(checkResult.allowed).toBe(true);
    expect(checkResult.reason).toBeUndefined();

    expect(breaker.isTripped()).toBe(false);
  });

  it('should return safe defaults from getStatus when unconfigured', () => {
    const breaker = new CircuitBreaker();
    const status = breaker.getStatus();

    expect(status.globalTotal).toBe(0);
    expect(status.globalMax).toBeNull();
    expect(status.tripped).toBe(false);
  });
});

describe('CircuitBreaker — block_all mode', () => {
  const CONFIG: CircuitBreakerConfig = {
    global_max_spend: 10000,
    action: 'block_all',
    currency: 'USD',
  };

  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(CONFIG);
  });

  it('should trip at threshold: 10 calls of $1000 each trips at 10th call', () => {
    // Record 9 calls — $9000, still below threshold
    for (let i = 0; i < 9; i++) {
      const result = breaker.record(1000);
      expect(result.tripped).toBe(false);
      expect(result.globalTotal).toBe((i + 1) * 1000);
    }

    // 10th call — $10,000, hits threshold exactly → trips
    const result = breaker.record(1000);
    expect(result.tripped).toBe(true);
    expect(result.globalTotal).toBe(10000);

    // check() should now block
    const checkResult = breaker.check();
    expect(checkResult.allowed).toBe(false);
    expect(checkResult.reason).toContain('Circuit breaker tripped');
    expect(checkResult.reason).toContain('10000.00 USD');
  });

  it('should stay tripped: once tripped, all subsequent calls blocked even with $0 amount', () => {
    // Trip the breaker
    breaker.record(10000);
    expect(breaker.isTripped()).toBe(true);

    // Even $0 calls should be blocked
    breaker.record(0);
    const check1 = breaker.check();
    expect(check1.allowed).toBe(false);

    // A new $0 record does not un-trip
    breaker.record(0);
    const check2 = breaker.check();
    expect(check2.allowed).toBe(false);
    expect(breaker.isTripped()).toBe(true);
  });

  it('should trip on a single large spend that exceeds the threshold', () => {
    const result = breaker.record(15000);
    expect(result.tripped).toBe(true);
    expect(result.globalTotal).toBe(15000);

    const check = breaker.check();
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('15000.00 USD');
    expect(check.reason).toContain('10000.00 USD');
  });

  it('should allow calls below the threshold', () => {
    breaker.record(5000);
    const check = breaker.check();
    expect(check.allowed).toBe(true);
    expect(check.reason).toBeUndefined();
  });

  it('should format the block reason with currency when provided', () => {
    breaker.record(10000);
    const check = breaker.check();
    expect(check.reason).toMatch(/10000\.00 USD/);
  });

  it('should format the block reason without currency when omitted', () => {
    const noCurrencyBreaker = new CircuitBreaker({
      global_max_spend: 500,
      action: 'block_all',
    });
    noCurrencyBreaker.record(500);
    const check = noCurrencyBreaker.check();
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('500.00');
    expect(check.reason).not.toContain('USD');
  });
});

describe('CircuitBreaker — manual reset', () => {
  const CONFIG: CircuitBreakerConfig = {
    global_max_spend: 1000,
    action: 'block_all',
    currency: 'USD',
  };

  it('should clear tripped state and reset counter', () => {
    const breaker = new CircuitBreaker(CONFIG);

    // Trip the breaker
    breaker.record(1500);
    expect(breaker.isTripped()).toBe(true);
    expect(breaker.getStatus().globalTotal).toBe(1500);

    // Reset
    breaker.reset();

    expect(breaker.isTripped()).toBe(false);
    expect(breaker.getStatus().globalTotal).toBe(0);
    expect(breaker.getStatus().tripped).toBe(false);

    // Should accept new spend after reset
    const check = breaker.check();
    expect(check.allowed).toBe(true);

    breaker.record(500);
    expect(breaker.getStatus().globalTotal).toBe(500);
    expect(breaker.isTripped()).toBe(false);
  });
});

describe('CircuitBreaker — alert_only mode', () => {
  const CONFIG: CircuitBreakerConfig = {
    global_max_spend: 5000,
    action: 'alert_only',
    currency: 'USD',
  };

  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(CONFIG);
  });

  it('should trip the breaker but NOT block calls', () => {
    breaker.record(5000);
    expect(breaker.isTripped()).toBe(true);

    // check() should still allow
    const check = breaker.check();
    expect(check.allowed).toBe(true);
    expect(check.reason).toBeUndefined();
  });

  it('should continue allowing calls even after exceeding the threshold', () => {
    breaker.record(10000); // 2x the limit
    expect(breaker.isTripped()).toBe(true);

    const check = breaker.check();
    expect(check.allowed).toBe(true);
  });

  it('should track the tripped status correctly via getStatus', () => {
    breaker.record(3000);
    expect(breaker.getStatus().tripped).toBe(false);

    breaker.record(2000); // now at 5000 = threshold
    expect(breaker.getStatus().tripped).toBe(true);
    expect(breaker.getStatus().globalTotal).toBe(5000);
    expect(breaker.getStatus().globalMax).toBe(5000);
  });
});

describe('CircuitBreaker — getStatus', () => {
  it('should return frozen status objects', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 1000,
      action: 'block_all',
    });

    breaker.record(500);
    const status = breaker.getStatus();

    expect(Object.isFrozen(status)).toBe(true);
    expect(status.globalTotal).toBe(500);
    expect(status.globalMax).toBe(1000);
    expect(status.tripped).toBe(false);
  });
});

describe('CircuitBreaker — updateConfig', () => {
  it('should apply a new config without resetting state', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 10000,
      action: 'block_all',
      currency: 'USD',
    });

    breaker.record(5000);
    expect(breaker.isTripped()).toBe(false);

    // Lower the threshold — the existing $5000 now exceeds the new $3000 limit
    // but the breaker doesn't retroactively trip (only on next record)
    breaker.updateConfig({
      global_max_spend: 3000,
      action: 'block_all',
      currency: 'USD',
    });

    // Next record should trip (5000 + 1 >= 3000)
    breaker.record(1);
    expect(breaker.isTripped()).toBe(true);
  });

  it('should allow disabling the breaker by passing undefined', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 100,
      action: 'block_all',
    });

    breaker.record(200); // Trip
    expect(breaker.isTripped()).toBe(true);

    // Disable — check should now allow (no config)
    breaker.updateConfig(undefined);
    // Note: isTripped() still returns true, but check() doesn't use it without config
    const check = breaker.check();
    expect(check.allowed).toBe(true);
  });

  it('should preserve tripped state across config updates', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 100,
      action: 'block_all',
    });

    breaker.record(100);
    expect(breaker.isTripped()).toBe(true);

    // Update to a higher threshold — breaker stays tripped
    breaker.updateConfig({
      global_max_spend: 50000,
      action: 'block_all',
    });

    // Still tripped because reset() was not called
    expect(breaker.isTripped()).toBe(true);
    const check = breaker.check();
    expect(check.allowed).toBe(false);
  });
});

describe('CircuitBreaker — edge cases', () => {
  it('should handle zero threshold correctly', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 0,
      action: 'block_all',
    });

    // Even $0 spend should trip (0 >= 0)
    breaker.record(0);
    expect(breaker.isTripped()).toBe(true);
  });

  it('should handle very small fractional amounts', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 1,
      action: 'block_all',
    });

    breaker.record(0.001);
    breaker.record(0.001);
    expect(breaker.isTripped()).toBe(false);
    expect(breaker.getStatus().globalTotal).toBeCloseTo(0.002);
  });

  it('should reject negative amounts', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 1000,
      action: 'block_all',
    });

    expect(() => breaker.record(-1)).toThrow(RangeError);
    expect(() => breaker.record(-1)).toThrow(/non-negative/);
  });

  it('should reject NaN and Infinity amounts', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 1000,
      action: 'block_all',
    });

    expect(() => breaker.record(NaN)).toThrow(RangeError);
    expect(() => breaker.record(Infinity)).toThrow(RangeError);
    expect(() => breaker.record(-Infinity)).toThrow(RangeError);
  });

  it('should allow exactly global_max_spend - epsilon', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 100,
      action: 'block_all',
    });

    breaker.record(99.99);
    expect(breaker.isTripped()).toBe(false);
    expect(breaker.check().allowed).toBe(true);
  });

  it('should accumulate across many small spends', () => {
    const breaker = new CircuitBreaker({
      global_max_spend: 100,
      action: 'block_all',
    });

    for (let i = 0; i < 100; i++) {
      breaker.record(1);
    }
    expect(breaker.isTripped()).toBe(true);
    expect(breaker.getStatus().globalTotal).toBe(100);
  });
});
