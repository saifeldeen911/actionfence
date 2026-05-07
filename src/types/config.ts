/**
 * @module types/config
 * Configuration options for the guard middleware and engine.
 */

import type { GuardPolicy } from './policy.js';
import type { EvaluationDecision } from './decision.js';

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
   * If not set, falls back to AGENTGUARD_SECRET env var, then auto-generated key.
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
   * Callback fired after every evaluation decision.
   * Useful for custom logging, metrics, or webhooks.
   */
  readonly onDecision?: (decision: EvaluationDecision) => void;

  /** Enable hot-reload of policy file on changes. Defaults to false. */
  readonly watchPolicy?: boolean;
}
