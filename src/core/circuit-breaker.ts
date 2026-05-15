/**
 * @module core/circuit-breaker
 * Global circuit breaker — a master kill-switch across ALL agents.
 *
 * When total cumulative spend exceeds a configured ceiling, the breaker
 * trips and (depending on the policy `action`) either blocks every
 * subsequent call or fires a warning.
 *
 * Design decisions:
 * - Immutable config after construction (swap via updateConfig for hot-reload).
 * - Once tripped, the breaker stays tripped until manually reset.
 * - `alert_only` mode still tracks the tripped state but does not block.
 * - Thread-safe by design: single-threaded JS, but guard engine serializes
 *   per-agent via AsyncMutex; circuit breaker is checked inside that mutex.
 */

import type { CircuitBreakerConfig } from '../types/policy.js';

/** Read-only snapshot of the circuit breaker's current status. */
export interface CircuitBreakerStatus {
  /** Cumulative global spend recorded since last reset. */
  readonly globalTotal: number;
  /** Configured global maximum spend, or null when unconfigured. */
  readonly globalMax: number | null;
  /** Whether the breaker is currently tripped. */
  readonly tripped: boolean;
}

/** Result of a circuit breaker check. */
export interface CircuitBreakerCheckResult {
  /** Whether the action is allowed to proceed. */
  readonly allowed: boolean;
  /** Human-readable block reason, or undefined when allowed. */
  readonly reason?: string;
}

/** Result of recording spend against the circuit breaker. */
export interface CircuitBreakerRecordResult {
  /** Whether the breaker is currently tripped (may have just tripped). */
  readonly tripped: boolean;
  /** Cumulative global spend after this recording. */
  readonly globalTotal: number;
}

export class CircuitBreaker {
  private globalTotal = 0;
  private tripped = false;
  private config: CircuitBreakerConfig | undefined;

  constructor(config?: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Hot-swap the circuit breaker configuration.
   * Does NOT reset the tripped state or global total — those persist across
   * policy reloads so a previously tripped breaker stays tripped.
   */
  updateConfig(config?: CircuitBreakerConfig): void {
    this.config = config;
  }

  /**
   * Record a spend amount and check if the breaker should trip.
   *
   * @param amount - Non-negative spend amount in major units.
   * @returns Whether the breaker is tripped and the new global total.
   */
  record(amount: number): CircuitBreakerRecordResult {
    if (!this.config) {
      return { tripped: false, globalTotal: 0 };
    }

    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(
        `CircuitBreaker.record: amount must be finite and non-negative. Received: ${amount}`,
      );
    }

    this.globalTotal += amount;

    if (this.globalTotal >= this.config.global_max_spend) {
      this.tripped = true;
    }

    return { tripped: this.tripped, globalTotal: this.globalTotal };
  }

  /**
   * Check whether the breaker is currently tripped.
   * Does not record any spend — pure read.
   */
  isTripped(): boolean {
    return this.tripped;
  }

  /**
   * Check before any action. If the breaker is tripped AND the configured
   * action is `block_all`, deny the request. In `alert_only` mode, the
   * breaker is tripped but calls are still allowed.
   */
  check(): CircuitBreakerCheckResult {
    if (!this.config) {
      return { allowed: true };
    }

    if (this.tripped && this.config.action === 'block_all') {
      const currency = this.config.currency;
      const totalLabel = currency
        ? `${this.globalTotal.toFixed(2)} ${currency}`
        : this.globalTotal.toFixed(2);
      const limitLabel = currency
        ? `${this.config.global_max_spend.toFixed(2)} ${currency}`
        : this.config.global_max_spend.toFixed(2);

      return {
        allowed: false,
        reason: `Circuit breaker tripped: global spend ${totalLabel} exceeded limit ${limitLabel}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Manual reset — intentionally requires explicit action.
   * Clears the tripped flag and resets the global total to zero.
   */
  reset(): void {
    this.tripped = false;
    this.globalTotal = 0;
  }

  /**
   * Read-only snapshot of the breaker's current state.
   */
  getStatus(): CircuitBreakerStatus {
    return Object.freeze({
      globalTotal: this.globalTotal,
      globalMax: this.config?.global_max_spend ?? null,
      tripped: this.tripped,
    });
  }
}
