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
}
