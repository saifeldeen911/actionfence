/**
 * @module types/decision
 * Evaluation decision types produced by the PolicyEvaluator.
 */

import type { IdentityClassification } from './identity.js';

/** Whether the action was allowed or blocked. */
export type DecisionStatus = 'PASSED' | 'BLOCKED';

/**
 * The result of evaluating a single action against the policy.
 * Immutable — produced by PolicyEvaluator.evaluate().
 */
export interface EvaluationDecision {
  /** Whether the action passed or was blocked. */
  readonly status: DecisionStatus;
  /** The policy action name that was evaluated. */
  readonly action: string;
  /** The original MCP tool name (may differ from action if actionResolver is used). */
  readonly toolName: string;
  /** The identity tier of the agent that triggered this evaluation. */
  readonly identityTier: IdentityClassification;
  /** Human-readable reason for blocking. Null when status is PASSED. */
  readonly reason: string | null;
  /** Spend amount for this action, if applicable. */
  readonly spendAmount: number | null;
  /** Whether human approval is required (informational in v1). */
  readonly requiresHumanApproval: boolean;
  /** ISO 8601 timestamp of the evaluation. */
  readonly timestamp: string;
  /** Evaluation duration in milliseconds. */
  readonly durationMs: number;
}
