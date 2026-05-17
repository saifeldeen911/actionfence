import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpendTracker } from '../../src/core/spend-tracker.js';
import type { SpendLimitsConfig, SpendWindowConfig } from '../../src/types/policy.js';

describe('SpendTracker — rolling window', () => {
  let tracker: SpendTracker;
  const WINDOW_CONFIG: SpendWindowConfig = {
    max_amount: 500,
    duration_minutes: 60,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
    tracker = new SpendTracker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow spend within the window cap', async () => {
    for (let i = 0; i < 10; i++) {
      await tracker.record('agent-1', 5);
    }

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 5);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(50);
    expect(result.windowMax).toBe(500);
  });

  it('should block spend at 100 calls × $5 (exactly at limit)', async () => {
    for (let i = 0; i < 99; i++) {
      await tracker.record('agent-1', 5);
    }

    const resultAt99 = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 5);
    expect(resultAt99.allowed).toBe(true);
    expect(resultAt99.windowTotal).toBe(495);

    await tracker.record('agent-1', 5);

    const resultAt100 = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 5);
    expect(resultAt100.allowed).toBe(false);
    expect(resultAt100.windowTotal).toBe(500);
    expect(resultAt100.windowMax).toBe(500);
  });

  it('should not count entries older than the window duration', async () => {
    await tracker.record('agent-1', 400);

    vi.advanceTimersByTime(61 * 60 * 1000);

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 100);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
  });

  it('should count entries exactly at the boundary as expired', async () => {
    await tracker.record('agent-1', 300);

    vi.advanceTimersByTime(60 * 60 * 1000);

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 300);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
  });

  it('should handle partial window expiry (mix of old and new entries)', async () => {
    await tracker.record('agent-1', 300);

    vi.advanceTimersByTime(30 * 60 * 1000);
    await tracker.record('agent-1', 100);

    vi.advanceTimersByTime(31 * 60 * 1000);

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 100);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(100);
  });

  it('should trigger window cap before daily cap when window is smaller', async () => {
    const tightWindow: SpendWindowConfig = {
      max_amount: 100,
      duration_minutes: 60,
    };

    await tracker.record('agent-1', 90);

    const windowResult = await tracker.checkWindow('agent-1', tightWindow, 20);
    expect(windowResult.allowed).toBe(false);

    const totals = tracker.getTotals('agent-1');
    expect(totals.dailyTotal).toBe(90);
  });

  it('should preview window check without mutating the window log', async () => {
    await tracker.record('agent-1', 200);

    const preview = await tracker.previewCheckWindow('agent-1', WINDOW_CONFIG, 100);
    expect(preview.allowed).toBe(true);
    expect(preview.windowTotal).toBe(200);

    const after = await tracker.checkWindow('agent-1', WINDOW_CONFIG);
    expect(after.windowTotal).toBe(200);
  });

  it('should return allowed when no window log exists for the agent', async () => {
    const result = await tracker.checkWindow('nonexistent', WINDOW_CONFIG, 100);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
    expect(result.windowMax).toBe(500);
    expect(result.windowResetMs).toBe(0);
  });

  it('should clear window log on reset', async () => {
    await tracker.record('agent-1', 400);
    tracker.reset('agent-1');

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 500);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
  });

  it('should clear all window logs on full reset', async () => {
    await tracker.record('agent-1', 400);
    await tracker.record('agent-2', 300);
    tracker.reset();

    expect((await tracker.checkWindow('agent-1', WINDOW_CONFIG, 500)).allowed).toBe(true);
    expect((await tracker.checkWindow('agent-2', WINDOW_CONFIG, 500)).allowed).toBe(true);
  });

  it('should isolate window logs by agent', async () => {
    await tracker.record('agent-1', 400);
    await tracker.record('agent-2', 100);

    const result1 = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 101);
    const result2 = await tracker.checkWindow('agent-2', WINDOW_CONFIG, 101);

    expect(result1.allowed).toBe(false);
    expect(result2.allowed).toBe(true);
  });

  it('should provide correct resetMs for window expiry', async () => {
    await tracker.record('agent-1', 100);

    vi.advanceTimersByTime(30 * 60 * 1000);

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG);
    expect(result.windowResetMs).toBeCloseTo(30 * 60 * 1000, -2);
  });

  it('should handle zero-amount spend entries in the window', async () => {
    await tracker.record('agent-1', 0);
    await tracker.record('agent-1', 0);
    await tracker.record('agent-1', 500);

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 1);
    expect(result.allowed).toBe(false);
    expect(result.windowTotal).toBe(500);
  });

  it('should block when amount alone exceeds the window', async () => {
    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 501);
    expect(result.allowed).toBe(false);
  });

  it('should allow exactly max_amount as a single spend', async () => {
    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG, 500);
    expect(result.allowed).toBe(true);
  });

  it('should perform lazy eviction during checkWindow', async () => {
    for (let i = 0; i < 100; i++) {
      await tracker.record('agent-1', 1);
    }

    vi.advanceTimersByTime(61 * 60 * 1000);

    await tracker.record('agent-1', 1);

    const result = await tracker.checkWindow('agent-1', WINDOW_CONFIG);
    expect(result.windowTotal).toBe(1);
  });
});

describe('SpendTracker — existing behavior preserved', () => {
  let tracker: SpendTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T10:00:00.000Z'));
    tracker = new SpendTracker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should treat null amounts as a no-op', async () => {
    const result = await tracker.record('agent-1', null);

    expect(result.recorded).toBe(false);
    expect(result.snapshot.sessionTotal).toBe(0);
    expect(result.snapshot.dailyTotal).toBe(0);
  });

  it('should reject negative amounts', async () => {
    await expect(() => tracker.record('agent-1', -1)).rejects.toThrow(/non-negative/);
  });

  it('should preview spend without mutating totals', async () => {
    await tracker.record('agent-1', 10);

    const preview = await tracker.previewRecord('agent-1', 15);
    expect(preview.recorded).toBe(true);
    expect(preview.snapshot.sessionTotal).toBe(25);
    expect(preview.snapshot.dailyTotal).toBe(25);

    const totals = tracker.getTotals('agent-1');
    expect(totals.sessionTotal).toBe(10);
    expect(totals.dailyTotal).toBe(10);
  });

  it('should accumulate session and daily totals', async () => {
    await tracker.record('agent-1', 10);
    const result = await tracker.record('agent-1', 15.5);

    expect(result.snapshot.sessionTotal).toBe(25.5);
    expect(result.snapshot.dailyTotal).toBe(25.5);
  });

  it('should isolate totals by agent', async () => {
    await tracker.record('agent-1', 10);
    await tracker.record('agent-2', 5);

    expect(tracker.getTotals('agent-1').sessionTotal).toBe(10);
    expect(tracker.getTotals('agent-2').sessionTotal).toBe(5);
  });

  it('should reset only the empty-string agent key when explicitly requested', async () => {
    await tracker.record('', 10);
    await tracker.record('agent-1', 5);

    tracker.reset('');

    expect(tracker.getTotals('').sessionTotal).toBe(0);
    expect(tracker.getTotals('agent-1').sessionTotal).toBe(5);
  });

  it('should reset daily totals at midnight UTC while keeping session totals', async () => {
    await tracker.record('agent-1', 10);
    vi.setSystemTime(new Date('2026-05-07T00:00:01.000Z'));

    const totalsBeforeNewSpend = tracker.getTotals('agent-1');
    expect(totalsBeforeNewSpend.sessionTotal).toBe(10);
    expect(totalsBeforeNewSpend.dailyTotal).toBe(0);
    expect(totalsBeforeNewSpend.dayKeyUtc).toBe('2026-05-07');

    const result = await tracker.record('agent-1', 7);
    expect(result.snapshot.sessionTotal).toBe(17);
    expect(result.snapshot.dailyTotal).toBe(7);
  });
});

describe('SpendTracker — session idle timeout', () => {
  let tracker: SpendTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reset sessionTotal after the configured idle timeout elapses', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 50);
    expect(tracker.getTotals('agent-1').sessionTotal).toBe(50);

    vi.advanceTimersByTime(31 * 60 * 1000);

    const result = await tracker.record('agent-1', 10);
    expect(result.snapshot.sessionTotal).toBe(10);
  });

  it('should NOT reset sessionTotal before the idle timeout', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 50);

    vi.advanceTimersByTime(29 * 60 * 1000);

    const result = await tracker.record('agent-1', 10);
    expect(result.snapshot.sessionTotal).toBe(60);
  });

  it('should apply default 60-minute timeout when session_max is set but session_timeout_minutes is omitted', async () => {
    const config: SpendLimitsConfig = {
      session_max: 200,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 100);

    vi.advanceTimersByTime(61 * 60 * 1000);

    const result = await tracker.record('agent-1', 5);
    expect(result.snapshot.sessionTotal).toBe(5);
  });

  it('should NOT apply idle timeout when session_timeout_minutes is 0 (disabled)', async () => {
    const config: SpendLimitsConfig = {
      session_max: 200,
      session_timeout_minutes: 0,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 100);

    vi.advanceTimersByTime(120 * 60 * 1000);

    const result = await tracker.record('agent-1', 5);
    expect(result.snapshot.sessionTotal).toBe(105);
  });

  it('should NOT apply idle timeout when neither session_max nor session_timeout_minutes is set', async () => {
    tracker = new SpendTracker();

    await tracker.record('agent-1', 100);

    vi.advanceTimersByTime(120 * 60 * 1000);

    const result = await tracker.record('agent-1', 5);
    expect(result.snapshot.sessionTotal).toBe(105);
  });

  it('should reset sessionTotal at exactly the timeout boundary', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 50);

    vi.advanceTimersByTime(30 * 60 * 1000);

    const result = await tracker.record('agent-1', 10);
    expect(result.snapshot.sessionTotal).toBe(10);
  });

  it('should preserve dailyTotal across session resets', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 50);

    vi.advanceTimersByTime(31 * 60 * 1000);

    const result = await tracker.record('agent-1', 10);
    expect(result.snapshot.sessionTotal).toBe(10);
    expect(result.snapshot.dailyTotal).toBe(60);
  });

  it('should reflect idle-timeout reset in previewRecord without mutating lastActivity', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 50);

    vi.advanceTimersByTime(31 * 60 * 1000);

    const preview = await tracker.previewRecord('agent-1', 10);
    expect(preview.snapshot.sessionTotal).toBe(10);

    const preview2 = await tracker.previewRecord('agent-1', 20);
    expect(preview2.snapshot.sessionTotal).toBe(20);
  });

  it('should isolate idle-timeout resets per agent', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 50);

    vi.advanceTimersByTime(20 * 60 * 1000);
    await tracker.record('agent-2', 30);

    vi.advanceTimersByTime(11 * 60 * 1000);

    const result1 = await tracker.record('agent-1', 10);
    expect(result1.snapshot.sessionTotal).toBe(10);

    const result2 = await tracker.record('agent-2', 10);
    expect(result2.snapshot.sessionTotal).toBe(40);
  });
});

describe('SpendTracker — updateConfig', () => {
  let tracker: SpendTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply a new timeout via updateConfig', async () => {
    tracker = new SpendTracker();
    await tracker.record('agent-1', 50);

    vi.advanceTimersByTime(120 * 60 * 1000);
    expect(tracker.getTotals('agent-1').sessionTotal).toBe(50);

    tracker.updateConfig({ session_max: 100, session_timeout_minutes: 10, currency: 'USD' });

    const result = await tracker.record('agent-1', 5);
    expect(result.snapshot.sessionTotal).toBe(5);
  });

  it('should disable timeout when updateConfig sets session_timeout_minutes to 0', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);
    await tracker.record('agent-1', 50);

    tracker.updateConfig({ session_max: 100, session_timeout_minutes: 0, currency: 'USD' });

    vi.advanceTimersByTime(120 * 60 * 1000);

    const result = await tracker.record('agent-1', 5);
    expect(result.snapshot.sessionTotal).toBe(55);
  });

  it('should not clear existing tracked state when updateConfig is called', async () => {
    const config: SpendLimitsConfig = {
      session_max: 100,
      session_timeout_minutes: 60,
      currency: 'USD',
    };
    tracker = new SpendTracker(config);

    await tracker.record('agent-1', 30);
    await tracker.record('agent-2', 40);

    tracker.updateConfig({ session_max: 100, session_timeout_minutes: 120, currency: 'USD' });

    expect(tracker.getTotals('agent-1').sessionTotal).toBe(30);
    expect(tracker.getTotals('agent-2').sessionTotal).toBe(40);
  });

  it('should fall back to default 60-minute timeout when updateConfig has session_max but no explicit timeout', async () => {
    tracker = new SpendTracker();
    await tracker.record('agent-1', 50);

    tracker.updateConfig({ session_max: 100, currency: 'USD' });

    vi.advanceTimersByTime(61 * 60 * 1000);

    const result = await tracker.record('agent-1', 5);
    expect(result.snapshot.sessionTotal).toBe(5);
  });
});

describe('SpendTracker — cleanup and dispose', () => {
  let tracker: SpendTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
    tracker = new SpendTracker({
      session_max: 100,
      session_timeout_minutes: 30,
      currency: 'USD',
    });
  });

  afterEach(() => {
    tracker.dispose();
    vi.useRealTimers();
  });

  it('should evict idle entries once the map exceeds the cap', async () => {
    for (let index = 0; index < 50_001; index += 1) {
      await tracker.record(`idle-${index}`, 1);
    }

    vi.advanceTimersByTime(31 * 60 * 1000);
    await tracker.record('active-agent', 1);
    vi.advanceTimersByTime(5 * 60 * 1000);

    const internal = tracker as unknown as { readonly spendByAgent: Map<string, unknown> };
    expect(internal.spendByAgent.size).toBeLessThanOrEqual(25_001);
    expect(internal.spendByAgent.has('active-agent')).toBe(true);
  });

  it('should clear the cleanup interval on dispose', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    tracker.dispose();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
