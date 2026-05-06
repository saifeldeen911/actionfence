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

    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(`Spend amount must be a finite, non-negative number. Received: ${amount}`);
    }

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
    if (agentId) {
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
