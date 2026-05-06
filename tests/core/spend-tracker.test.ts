import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpendTracker } from '../../src/core/spend-tracker.js';

describe('SpendTracker', () => {
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
