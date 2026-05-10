/**
 * @module types/spend
 * In-memory spend tracking types.
 */

/** Current tracked spend totals for a single agent. */
export interface SpendSnapshot {
  readonly agentId: string;
  readonly sessionTotal: number;
  readonly dailyTotal: number;
  readonly dayKeyUtc: string;
  /** Total spend within the rolling window, if configured. */
  readonly windowTotal?: number;
  /** Milliseconds until the oldest entry in the window expires, if configured. */
  readonly windowResetMs?: number;
}

/** Result returned after recording a spend amount. */
export interface SpendRecordResult {
  readonly recorded: boolean;
  readonly amount: number | null;
  readonly snapshot: SpendSnapshot;
}
