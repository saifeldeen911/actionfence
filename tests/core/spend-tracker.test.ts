import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpendTracker } from '../../src/core/spend-tracker.js';
import type { SpendWindowConfig } from '../../src/types/policy.js';

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

  it('should allow spend within the window cap', () => {
    // Record 10 calls × $5 = $50 — well within $500 window
    for (let i = 0; i < 10; i++) {
      tracker.record('agent-1', 5);
    }

    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 5);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(50);
    expect(result.windowMax).toBe(500);
  });

  it('should block spend at 100 calls × $5 (exactly at limit)', () => {
    // Record 99 calls × $5 = $495
    for (let i = 0; i < 99; i++) {
      tracker.record('agent-1', 5);
    }

    // 99th check: $495 + $5 = $500 — exactly at limit, should be allowed
    const resultAt99 = tracker.checkWindow('agent-1', WINDOW_CONFIG, 5);
    expect(resultAt99.allowed).toBe(true);
    expect(resultAt99.windowTotal).toBe(495);

    // Record the 100th call
    tracker.record('agent-1', 5);

    // 100th check: $500 + $5 = $505 — exceeds, should block
    const resultAt100 = tracker.checkWindow('agent-1', WINDOW_CONFIG, 5);
    expect(resultAt100.allowed).toBe(false);
    expect(resultAt100.windowTotal).toBe(500);
    expect(resultAt100.windowMax).toBe(500);
  });

  it('should not count entries older than the window duration', () => {
    // Record $400 at T=0
    tracker.record('agent-1', 400);

    // Advance 61 minutes (past the 60-minute window)
    vi.advanceTimersByTime(61 * 60 * 1000);

    // The $400 should have expired
    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 100);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
  });

  it('should count entries exactly at the boundary as expired', () => {
    // Record $300 at T=0
    tracker.record('agent-1', 300);

    // Advance exactly 60 minutes
    vi.advanceTimersByTime(60 * 60 * 1000);

    // At exactly the boundary, the entry at T=0 is now at cutoff (60 mins ago)
    // cutoff = now - windowMs, entries > cutoff are valid
    // entry timestamp = T=0, cutoff = T=0, T=0 is NOT > T=0, so it's expired
    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 300);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
  });

  it('should handle partial window expiry (mix of old and new entries)', () => {
    // Record $300 at T=0
    tracker.record('agent-1', 300);

    // Advance 30 minutes and record another $100
    vi.advanceTimersByTime(30 * 60 * 1000);
    tracker.record('agent-1', 100);

    // Advance another 31 minutes — first entry is expired, second still valid
    vi.advanceTimersByTime(31 * 60 * 1000);

    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 100);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(100); // Only the $100 from 31 mins ago
  });

  it('should trigger window cap before daily cap when window is smaller', () => {
    const tightWindow: SpendWindowConfig = {
      max_amount: 100,
      duration_minutes: 60,
    };

    // Record $90 within the window
    tracker.record('agent-1', 90);

    // Window check should block at $90 + $20 = $110 > $100
    const windowResult = tracker.checkWindow('agent-1', tightWindow, 20);
    expect(windowResult.allowed).toBe(false);

    // But daily total is still low
    const totals = tracker.getTotals('agent-1');
    expect(totals.dailyTotal).toBe(90);
  });

  it('should preview window check without mutating the window log', () => {
    tracker.record('agent-1', 200);

    const preview = tracker.previewCheckWindow('agent-1', WINDOW_CONFIG, 100);
    expect(preview.allowed).toBe(true);
    expect(preview.windowTotal).toBe(200);

    // Window total should be unchanged — no new entry added
    const after = tracker.checkWindow('agent-1', WINDOW_CONFIG);
    expect(after.windowTotal).toBe(200);
  });

  it('should return allowed when no window log exists for the agent', () => {
    const result = tracker.checkWindow('nonexistent', WINDOW_CONFIG, 100);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
    expect(result.windowMax).toBe(500);
    expect(result.windowResetMs).toBe(0);
  });

  it('should clear window log on reset', () => {
    tracker.record('agent-1', 400);
    tracker.reset('agent-1');

    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 500);
    expect(result.allowed).toBe(true);
    expect(result.windowTotal).toBe(0);
  });

  it('should clear all window logs on full reset', () => {
    tracker.record('agent-1', 400);
    tracker.record('agent-2', 300);
    tracker.reset();

    expect(tracker.checkWindow('agent-1', WINDOW_CONFIG, 500).allowed).toBe(true);
    expect(tracker.checkWindow('agent-2', WINDOW_CONFIG, 500).allowed).toBe(true);
  });

  it('should isolate window logs by agent', () => {
    tracker.record('agent-1', 400);
    tracker.record('agent-2', 100);

    const result1 = tracker.checkWindow('agent-1', WINDOW_CONFIG, 101);
    const result2 = tracker.checkWindow('agent-2', WINDOW_CONFIG, 101);

    expect(result1.allowed).toBe(false); // $400 + $101 = $501 > $500
    expect(result2.allowed).toBe(true); // $100 + $101 = $201 < $500
  });

  it('should provide correct resetMs for window expiry', () => {
    // Record at T=0
    tracker.record('agent-1', 100);

    // Advance 30 minutes
    vi.advanceTimersByTime(30 * 60 * 1000);

    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG);
    // Oldest entry was at T=0, window is 60 mins
    // resetMs should be approximately 30 minutes from now
    expect(result.windowResetMs).toBeCloseTo(30 * 60 * 1000, -2);
  });

  it('should handle zero-amount spend entries in the window', () => {
    tracker.record('agent-1', 0);
    tracker.record('agent-1', 0);
    tracker.record('agent-1', 500);

    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 1);
    expect(result.allowed).toBe(false); // $500 + $1 > $500
    expect(result.windowTotal).toBe(500);
  });

  it('should block when amount alone exceeds the window', () => {
    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 501);
    expect(result.allowed).toBe(false);
  });

  it('should allow exactly max_amount as a single spend', () => {
    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG, 500);
    expect(result.allowed).toBe(true);
  });

  it('should perform lazy eviction during checkWindow', () => {
    // Fill with 100 entries at T=0
    for (let i = 0; i < 100; i++) {
      tracker.record('agent-1', 1);
    }

    // Advance past the window
    vi.advanceTimersByTime(61 * 60 * 1000);

    // Record one new entry
    tracker.record('agent-1', 1);

    // Check — all old entries should be evicted
    const result = tracker.checkWindow('agent-1', WINDOW_CONFIG);
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

  it('should treat null amounts as a no-op', () => {
    const result = tracker.record('agent-1', null);

    expect(result.recorded).toBe(false);
    expect(result.snapshot.sessionTotal).toBe(0);
    expect(result.snapshot.dailyTotal).toBe(0);
  });

  it('should reject negative amounts', () => {
    expect(() => tracker.record('agent-1', -1)).toThrow(/non-negative/);
  });

  it('should preview spend without mutating totals', () => {
    tracker.record('agent-1', 10);

    const preview = tracker.previewRecord('agent-1', 15);
    expect(preview.recorded).toBe(true);
    expect(preview.snapshot.sessionTotal).toBe(25);
    expect(preview.snapshot.dailyTotal).toBe(25);

    const totals = tracker.getTotals('agent-1');
    expect(totals.sessionTotal).toBe(10);
    expect(totals.dailyTotal).toBe(10);
  });

  it('should accumulate session and daily totals', () => {
    tracker.record('agent-1', 10);
    const result = tracker.record('agent-1', 15.5);

    expect(result.snapshot.sessionTotal).toBe(25.5);
    expect(result.snapshot.dailyTotal).toBe(25.5);
  });

  it('should isolate totals by agent', () => {
    tracker.record('agent-1', 10);
    tracker.record('agent-2', 5);

    expect(tracker.getTotals('agent-1').sessionTotal).toBe(10);
    expect(tracker.getTotals('agent-2').sessionTotal).toBe(5);
  });

  it('should reset only the empty-string agent key when explicitly requested', () => {
    tracker.record('', 10);
    tracker.record('agent-1', 5);

    tracker.reset('');

    expect(tracker.getTotals('').sessionTotal).toBe(0);
    expect(tracker.getTotals('agent-1').sessionTotal).toBe(5);
  });

  it('should reset daily totals at midnight UTC while keeping session totals', () => {
    tracker.record('agent-1', 10);
    vi.setSystemTime(new Date('2026-05-07T00:00:01.000Z'));

    const totalsBeforeNewSpend = tracker.getTotals('agent-1');
    expect(totalsBeforeNewSpend.sessionTotal).toBe(10);
    expect(totalsBeforeNewSpend.dailyTotal).toBe(0);
    expect(totalsBeforeNewSpend.dayKeyUtc).toBe('2026-05-07');

    const result = tracker.record('agent-1', 7);
    expect(result.snapshot.sessionTotal).toBe(17);
    expect(result.snapshot.dailyTotal).toBe(7);
  });
});
