/**
 * @module core/spend-tracker
 * In-memory spend accounting keyed by agent id.
 */

import type { SpendRecordResult, SpendSnapshot } from '../types/spend.js';

interface SpendEntry {
  sessionTotal: number;
  dailyTotal: number;
  dayKeyUtc: string;
}

/**
 * SpendTracker maintains per-agent session and UTC-day totals.
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
  record(agentId: string, amount: number | null): SpendRecordResult {
    const entry = this.getOrCreateEntry(agentId);

    if (amount === null) {
      return {
        recorded: false,
        amount: null,
        snapshot: toSnapshot(agentId, entry),
      };
    }

    assertValidAmount(amount);

    entry.sessionTotal += amount;
    entry.dailyTotal += amount;

    return {
      recorded: true,
      amount,
      snapshot: toSnapshot(agentId, entry),
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
      };
    }

    if (existing.dayKeyUtc !== dayKeyUtc) {
      return {
        sessionTotal: existing.sessionTotal,
        dailyTotal: 0,
        dayKeyUtc,
      };
    }

    return {
      sessionTotal: existing.sessionTotal,
      dailyTotal: existing.dailyTotal,
      dayKeyUtc,
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
