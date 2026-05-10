/**
 * @module core/spend-tracker
 * In-memory spend accounting keyed by agent id.
 */

import type { SpendRecordResult, SpendSnapshot } from '../types/spend.js';
import type { SpendWindowConfig } from '../types/policy.js';

/** A single timestamped spend entry within the rolling window log. */
interface TimestampedSpend {
  readonly amount: number;
  readonly timestamp: number; // epoch ms
}

/** Result of a rolling-window spend check. */
export interface WindowCheckResult {
  /** Whether the spend is allowed within the window. */
  readonly allowed: boolean;
  /** Current total spend within the active window. */
  readonly windowTotal: number;
  /** Configured maximum spend for the window. */
  readonly windowMax: number;
  /** Milliseconds until the oldest entry in the window expires. */
  readonly windowResetMs: number;
}

interface SpendEntry {
  sessionTotal: number;
  dailyTotal: number;
  dayKeyUtc: string;
  windowLog: TimestampedSpend[];
}

/**
 * SpendTracker maintains per-agent session and UTC-day totals,
 * plus an optional rolling-window spend log for time-based caps.
 */
export class SpendTracker {
  private readonly spendByAgent = new Map<string, SpendEntry>();

  /**
   * Preview spend recording without mutating tracked totals.
   */
  previewRecord(agentId: string, amount: number | null): SpendRecordResult {
    const current = this.getCurrentEntry(agentId);

    if (amount === null) {
      return {
        recorded: false,
        amount: null,
        snapshot: toSnapshot(agentId, current),
      };
    }

    assertValidAmount(amount);

    return {
      recorded: true,
      amount,
      snapshot: Object.freeze({
        agentId,
        sessionTotal: current.sessionTotal + amount,
        dailyTotal: current.dailyTotal + amount,
        dayKeyUtc: current.dayKeyUtc,
      }),
    };
  }

  /**
   * Record a spend amount for one agent.
   */
  record(agentId: string, amount: number | null, maxWindowMillis?: number): SpendRecordResult {
    const entry = this.getOrCreateEntry(agentId);

    if (amount === null) {
      return {
        recorded: false,
        amount: null,
        snapshot: toSnapshot(agentId, entry),
      };
    }

    assertValidAmount(amount);

    const now = Date.now();
    entry.sessionTotal += amount;
    entry.dailyTotal += amount;
    entry.windowLog.push({ amount, timestamp: now });

    const evictionWindow = maxWindowMillis ?? 7 * 24 * 60 * 60 * 1000;
    evictExpired(entry.windowLog, now - evictionWindow);

    return {
      recorded: true,
      amount,
      snapshot: toSnapshot(agentId, entry),
    };
  }

  /**
   * Check whether a prospective spend would exceed the rolling window cap.
   * This does NOT mutate the window log — it reads from the current state.
   *
   * @param agentId - The agent to check.
   * @param windowConfig - Rolling window configuration from the policy.
   * @param amount - The prospective spend amount to check against the window.
   * @returns WindowCheckResult with allowed status and window totals.
   */
  checkWindow(
    agentId: string,
    windowConfig: SpendWindowConfig,
    amount = 0,
  ): WindowCheckResult {
    const entry = this.spendByAgent.get(agentId);
    if (!entry) {
      return {
        allowed: amount <= windowConfig.max_amount,
        windowTotal: 0,
        windowMax: windowConfig.max_amount,
        windowResetMs: 0,
      };
    }

    const now = Date.now();
    const windowMs = windowConfig.duration_minutes * 60 * 1000;
    const cutoff = now - windowMs;

    const filteredLog = entry.windowLog.filter((e) => e.timestamp > cutoff);

    const currentTotal = sumWindowLog(filteredLog);
    const projectedTotal = currentTotal + amount;
    const oldestTimestamp = filteredLog[0]?.timestamp ?? now;
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);

    return {
      allowed: projectedTotal <= windowConfig.max_amount,
      windowTotal: currentTotal,
      windowMax: windowConfig.max_amount,
      windowResetMs: resetMs,
    };
  }

  /**
   * Preview a window check without mutating the window log.
   * Identical to checkWindow but explicitly named for simulation mode clarity.
   */
  previewCheckWindow(
    agentId: string,
    windowConfig: SpendWindowConfig,
    amount = 0,
  ): WindowCheckResult {
    const entry = this.spendByAgent.get(agentId);
    if (!entry) {
      return {
        allowed: amount <= windowConfig.max_amount,
        windowTotal: 0,
        windowMax: windowConfig.max_amount,
        windowResetMs: 0,
      };
    }

    const now = Date.now();
    const windowMs = windowConfig.duration_minutes * 60 * 1000;
    const cutoff = now - windowMs;

    const filteredLog = entry.windowLog.filter((e) => e.timestamp > cutoff);
    const currentTotal = sumWindowLog(filteredLog);
    const projectedTotal = currentTotal + amount;
    const oldestTimestamp = filteredLog[0]?.timestamp ?? now;
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);

    return {
      allowed: projectedTotal <= windowConfig.max_amount,
      windowTotal: currentTotal,
      windowMax: windowConfig.max_amount,
      windowResetMs: resetMs,
    };
  }

  /**
   * Return the current totals for one agent.
   */
  getTotals(agentId: string): SpendSnapshot {
    const entry = this.getOrCreateEntry(agentId);
    return toSnapshot(agentId, entry);
  }

  /**
   * Reset one agent or all tracked state.
   */
  reset(agentId?: string): void {
    if (agentId !== undefined) {
      this.spendByAgent.delete(agentId);
      return;
    }

    this.spendByAgent.clear();
  }

  private getOrCreateEntry(agentId: string): SpendEntry {
    const dayKeyUtc = getUtcDayKey();
    const existing = this.spendByAgent.get(agentId);

    if (!existing) {
      const freshEntry: SpendEntry = {
        sessionTotal: 0,
        dailyTotal: 0,
        dayKeyUtc,
        windowLog: [],
      };
      this.spendByAgent.set(agentId, freshEntry);
      return freshEntry;
    }

    if (existing.dayKeyUtc !== dayKeyUtc) {
      existing.dayKeyUtc = dayKeyUtc;
      existing.dailyTotal = 0;
    }

    return existing;
  }

  private getCurrentEntry(agentId: string): SpendEntry {
    const dayKeyUtc = getUtcDayKey();
    const existing = this.spendByAgent.get(agentId);

    if (!existing) {
      return {
        sessionTotal: 0,
        dailyTotal: 0,
        dayKeyUtc,
        windowLog: [],
      };
    }

    if (existing.dayKeyUtc !== dayKeyUtc) {
      return {
        sessionTotal: existing.sessionTotal,
        dailyTotal: 0,
        dayKeyUtc,
        windowLog: existing.windowLog,
      };
    }

    return {
      sessionTotal: existing.sessionTotal,
      dailyTotal: existing.dailyTotal,
      dayKeyUtc,
      windowLog: existing.windowLog,
    };
  }
}

function toSnapshot(agentId: string, entry: SpendEntry): SpendSnapshot {
  return Object.freeze({
    agentId,
    sessionTotal: entry.sessionTotal,
    dailyTotal: entry.dailyTotal,
    dayKeyUtc: entry.dayKeyUtc,
  });
}

function getUtcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Spend amount must be a finite, non-negative number. Received: ${amount}`);
  }
}

/**
 * Remove entries older than the cutoff from the front of the sorted log.
 * Mutates the array in-place for performance.
 */
function evictExpired(log: TimestampedSpend[], cutoff: number): void {
  const firstValidIndex = log.findIndex((entry) => entry.timestamp > cutoff);
  if (firstValidIndex > 0) {
    log.splice(0, firstValidIndex);
  } else if (firstValidIndex === -1 && log.length > 0) {
    log.length = 0;
  }
}

/** Sum all amounts in the window log. */
function sumWindowLog(log: readonly TimestampedSpend[]): number {
  let total = 0;
  for (const entry of log) {
    total += entry.amount;
  }
  return total;
}
