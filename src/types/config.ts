/**
 * @module types/config
 * Configuration options for the guard middleware and engine.
 */

import type { GuardPolicy } from './policy.js';
import type { EvaluationDecision } from './decision.js';
import type { IdentityReaderLike } from './identity.js';
import type { IdentityReaderOptions } from '../core/identity-reader.js';
import type { RateLimiter } from '../core/rate-limiter.js';
import type { ReceiptStore, ReceiptStoreOptions } from '../core/receipt-store.js';
import type { SpendTracker } from '../core/spend-tracker.js';
import type { ConsoleReporter } from '../reporters/console.js';
import type { PoolConfig } from 'pg';

export interface SqliteStorageConfig {
  /**
   * Which adapter to use. Required on the configuration object.
   * If `GuardOptions.storage` is omitted entirely, ActionFence defaults to 'sqlite'.
   */
  readonly adapter: 'sqlite';
  /** File path for the SQLite database. If omitted, a default path in .actionfence/ is used. */
  readonly connectionString?: string;
}

export interface PostgresStorageConfig {
  /** Which adapter to use. Required. */
  readonly adapter: 'postgres';
  /** Connection string for the PostgreSQL database. Required for postgres adapter. */
  readonly connectionString: string;
  /** Advanced: raw pg.Pool config. Only valid for postgres. */
  readonly poolConfig?: PoolConfig;
}

export type StorageConfig = SqliteStorageConfig | PostgresStorageConfig;

/** Behavior when enforced receipt persistence fails. */
export type ReceiptFailureMode = 'allow' | 'block';

/**
 * Options passed to `withGuard()` or `guard()` middleware.
 */
export interface GuardOptions {
  /** Path to a guard-policy.json file, or an inline policy object. */
  readonly policy: string | GuardPolicy;

  /** If true, run in simulation mode — evaluate but don't execute. */
  readonly simulate?: boolean;

  /** If true, suppress console output. */
  readonly silent?: boolean;

  /**
   * HMAC signing secret override.
   * If not set, falls back to ACTIONFENCE_SECRET, then AGENTGUARD_SECRET,
   * then file-based key resolution.
   */
  readonly secret?: string;

  /**
   * Map a tool name + params to a policy action name.
   * Useful when tool names don't match policy action names.
   * If not provided, the tool name is used as-is.
   */
  readonly actionResolver?: (toolName: string, params: unknown) => string;

  /**
   * Extract a spend amount from tool parameters.
   * Return null if the action has no spend component.
   */
  readonly spendExtractor?: (params: unknown) => number | null;

  /**
   * Redact sensitive fields before receipt storage.
   * Return a sanitized copy and avoid mutating the input value.
   */
  readonly payloadRedactor?: (params: unknown) => unknown;

  /** Maximum persisted payload size in bytes before truncation. Defaults to 65536. */
  readonly maxPayloadBytes?: number;

  /**
   * Classify whether a passed action should count toward transaction-per-day limits.
   * Defaults to true when spend was extracted or human approval is required.
   */
  readonly transactionResolver?: (
    toolName: string,
    params: unknown,
    decision: EvaluationDecision,
  ) => boolean;

  /**
   * Custom receipt store. Useful for tests and applications that need an explicit DB path.
   */
  readonly receiptStore?: ReceiptStore;

  /** Options used when ActionFence creates its default ReceiptStore. */
  readonly receiptStoreOptions?: ReceiptStoreOptions;

  /**
   * Behavior when receipt persistence fails in enforce mode.
   * Defaults to 'allow' for backward compatibility. Set to 'block' to fail closed.
   */
  readonly receiptFailureMode?: ReceiptFailureMode;

  /**
   * Storage backend configuration. Defaults to a SQLite backend if undefined.
   * Note: If `receiptStore` is provided, it takes precedence and this `storage` config is ignored.
   */
  readonly storage?: StorageConfig;

  /** Dependency injection hooks for tests or advanced integrations. */
  readonly identityReader?: IdentityReaderLike;
  readonly identityReaderOptions?: IdentityReaderOptions;
  readonly rateLimiter?: RateLimiter;
  readonly spendTracker?: SpendTracker;
  readonly reporter?: ConsoleReporter;

  /**
   * Callback fired after every evaluation decision.
   * Useful for custom logging, metrics, or webhooks.
   */
  readonly onDecision?: (decision: EvaluationDecision) => void;

  /** Enable hot-reload of policy file on changes. Defaults to false. */
  readonly watchPolicy?: boolean;

  /**
   * Callback fired when human approval is required.
   * If it returns true, request proceeds. If false, request is blocked.
   */
  readonly onApprovalRequired?: (decision: EvaluationDecision & { agentId: string; receiptId: string }) => Promise<boolean>;

  /** Timeout in milliseconds for onApprovalRequired. Defaults to 30000 (30s). */
  readonly approvalTimeoutMs?: number;
}
