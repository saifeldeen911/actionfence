/**
 * @module core/rate-limiter
 * Sliding window rate limiter with separate request-per-minute and transaction-per-day limits.
 *
 * Algorithm: Sliding Window Log
 * - Stores an array of timestamps per key
 * - On each check, filters out expired timestamps (lazy eviction)
 * - Periodic cleanup removes fully expired keys to prevent memory leaks
 */

import type { RateLimitsConfig } from '../types/policy.js';

/** Result of a rate limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed under the rate limit. */
  readonly allowed: boolean;
  /** The configured limit. */
  readonly limit: number;
  /** Remaining requests in the current window. */
  readonly remaining: number;
  /** Milliseconds until the oldest entry in the window expires. */
  readonly resetMs: number;
}

/** Default result when no rate limit is configured. */
const UNLIMITED_RESULT: RateLimitResult = Object.freeze({
  allowed: true,
  limit: Infinity,
  remaining: Infinity,
  resetMs: 0,
});

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every 60s

/**
 * In-memory sliding window rate limiter.
 *
 * Uses timestamp arrays per key for precise rate limiting.
 * Supports both per-minute request limits and per-day transaction limits.
 */
export class RateLimiter {
  private config: RateLimitsConfig;

  /** Map of key → array of request timestamps (epoch ms). */
  private readonly requestWindows = new Map<string, number[]>();

  /** Map of key → array of transaction timestamps (epoch ms). */
  private readonly transactionWindows = new Map<string, number[]>();

  /** Periodic cleanup interval handle. */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitsConfig) {
    this.config = config;
    this.startCleanup();
  }

  /** Update the rate limit configuration. */
  updateConfig(config: RateLimitsConfig): void {
    this.config = config;
  }

  /**
   * Check and record a request against the per-minute rate limit.
   *
   * @param key - Identifier for the rate limit bucket (e.g., agentId).
   * @returns The rate limit check result.
   */
  checkRequestRate(key: string): RateLimitResult {
    if (this.config.requests_per_minute === undefined) {
      return UNLIMITED_RESULT;
    }

    return this.checkWindow(
      this.requestWindows,
      key,
      this.config.requests_per_minute,
      ONE_MINUTE_MS,
    );
  }

  /**
   * Check and record a transaction against the per-day rate limit.
   *
   * @param key - Identifier for the rate limit bucket (e.g., agentId).
   * @returns The rate limit check result.
   */
  checkTransactionRate(key: string): RateLimitResult {
    if (this.config.transactions_per_day === undefined) {
      return UNLIMITED_RESULT;
    }

    return this.checkWindow(
      this.transactionWindows,
      key,
      this.config.transactions_per_day,
      ONE_DAY_MS,
    );
  }

  /**
   * Reset rate limit state.
   * @param key - If provided, reset only this key. Otherwise, reset all.
   */
  reset(key?: string): void {
    if (key) {
      this.requestWindows.delete(key);
      this.transactionWindows.delete(key);
    } else {
      this.requestWindows.clear();
      this.transactionWindows.clear();
    }
  }

  /** Stop the periodic cleanup interval. Call this when the limiter is no longer needed. */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Core sliding window check.
   *
   * 1. Get or create the timestamp array for the key.
   * 2. Evict timestamps older than the window.
   * 3. Check if the count is under the limit.
   * 4. If allowed, record the new timestamp.
   */
  private checkWindow(
    store: Map<string, number[]>,
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitResult {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Get or initialize the window
    let timestamps = store.get(key);
    if (!timestamps) {
      timestamps = [];
      store.set(key, timestamps);
    }

    // Lazy eviction: remove expired timestamps
    const firstValidIndex = timestamps.findIndex((t) => t > cutoff);
    if (firstValidIndex > 0) {
      timestamps.splice(0, firstValidIndex);
    } else if (firstValidIndex === -1 && timestamps.length > 0) {
      timestamps.length = 0;
    }

    // Check limit
    if (timestamps.length >= limit) {
      const oldestTimestamp = timestamps[0] ?? now;
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetMs: oldestTimestamp + windowMs - now,
      };
    }

    // Record the new timestamp
    timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: limit - timestamps.length,
      resetMs: (timestamps[0] ?? now) + windowMs - now,
    };
  }

  /** Start periodic cleanup of fully expired keys. */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.cleanupStore(this.requestWindows, now, ONE_MINUTE_MS);
      this.cleanupStore(this.transactionWindows, now, ONE_DAY_MS);
    }, CLEANUP_INTERVAL_MS);

    // Ensure the interval doesn't prevent Node.js from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /** Remove map entries where all timestamps have expired. */
  private cleanupStore(
    store: Map<string, number[]>,
    now: number,
    windowMs: number,
  ): void {
    const cutoff = now - windowMs;
    for (const [key, timestamps] of store) {
      const lastTimestamp = timestamps[timestamps.length - 1];
      if (lastTimestamp === undefined || lastTimestamp <= cutoff) {
        store.delete(key);
      }
    }
  }
}
