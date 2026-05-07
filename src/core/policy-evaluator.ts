/**
 * @module core/policy-evaluator
 * Evaluates an action request against the loaded guard policy.
 *
 * Evaluation order:
 * 1. Look up action in policy.actions
 * 2. If not found → apply default_rule
 * 3. Check allowed field
 * 4. Check identity tier requirement
 * 5. Check max_spend cap
 * 6. Set requires_human_approval flag
 */

import type { GuardPolicy, IdentityTier } from '../types/policy.js';
import type { AgentIdentity, IdentityClassification } from '../types/identity.js';
import type { EvaluationDecision } from '../types/decision.js';

/**
 * Numeric identity tier hierarchy for comparison.
 * Higher value = more trusted.
 */
const IDENTITY_TIER_LEVEL: Record<IdentityClassification, number> = {
  anonymous: 0,
  token: 1,
  verified: 2,
} as const;

/**
 * Maps policy identity requirements to the minimum classification needed.
 * 'any' means all tiers are accepted (including anonymous).
 */
const REQUIRED_TIER_LEVEL: Record<IdentityTier, number> = {
  any: 0,
  token: 1,
  verified: 2,
} as const;

/**
 * PolicyEvaluator checks actions against the guard policy and produces decisions.
 * It is stateless with respect to the evaluation itself — all state comes from the policy.
 */
export class PolicyEvaluator {
  private policy: GuardPolicy;

  constructor(policy: GuardPolicy) {
    this.policy = policy;
  }

  /** Hot-swap the active policy (used by watchPolicy). */
  updatePolicy(policy: GuardPolicy): void {
    this.policy = policy;
  }

  /**
   * Evaluate a single action against the policy.
   *
   * @param action - The policy action name to evaluate.
   * @param toolName - The original tool name (may differ from action if actionResolver is used).
   * @param identity - The resolved agent identity.
   * @param spendAmount - The spend amount for this action, or null.
   * @returns An immutable EvaluationDecision.
   */
  evaluate(
    action: string,
    toolName: string,
    identity: AgentIdentity,
    spendAmount: number | null = null,
  ): EvaluationDecision {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const baseDecision = {
      action,
      toolName,
      identityTier: identity.classification,
      spendAmount,
      timestamp,
    };

    // Step 1: Look up action in policy
    const rule = this.policy.actions[action];

    // Step 2: Action not found → apply default_rule
    if (!rule) {
      const durationMs = performance.now() - startTime;

      if (this.policy.default_rule === 'deny') {
        return {
          ...baseDecision,
          status: 'BLOCKED',
          reason: `Action "${action}" is not listed in the policy (default: deny)`,
          requiresHumanApproval: false,
          durationMs,
        };
      }

      // default_rule === 'allow'
      return {
        ...baseDecision,
        status: 'PASSED',
        reason: null,
        requiresHumanApproval: false,
        durationMs,
      };
    }

    // Step 3: Check allowed field
    if (!rule.allowed) {
      return {
        ...baseDecision,
        status: 'BLOCKED',
        reason: `Action "${action}" is explicitly denied by policy`,
        requiresHumanApproval: false,
        durationMs: performance.now() - startTime,
      };
    }

    // Step 4: Check identity tier requirement
    const requiredTier = rule.identity ?? 'any';
    const agentLevel = IDENTITY_TIER_LEVEL[identity.classification];
    const requiredLevel = REQUIRED_TIER_LEVEL[requiredTier];

    if (agentLevel < requiredLevel) {
      return {
        ...baseDecision,
        status: 'BLOCKED',
        reason: `Action "${action}" requires identity tier "${requiredTier}", but agent is "${identity.classification}"`,
        requiresHumanApproval: false,
        durationMs: performance.now() - startTime,
      };
    }

    // Step 5: Check max_spend
    if (rule.max_spend !== undefined && spendAmount !== null) {
      if (!Number.isFinite(spendAmount) || spendAmount < 0) {
        return {
          ...baseDecision,
          status: 'BLOCKED',
          reason: `Action "${action}" requires a valid, non-negative spend amount (received: ${spendAmount})`,
          requiresHumanApproval: false,
          durationMs: performance.now() - startTime,
        };
      }

      if (spendAmount > rule.max_spend) {
        return {
          ...baseDecision,
          status: 'BLOCKED',
          reason: `Action "${action}" spend amount $${spendAmount} exceeds cap of $${rule.max_spend}`,
          requiresHumanApproval: false,
          durationMs: performance.now() - startTime,
        };
      }
    }

    // Step 6: All checks passed
    return {
      ...baseDecision,
      status: 'PASSED',
      reason: null,
      requiresHumanApproval: rule.requires_human_approval ?? false,
      durationMs: performance.now() - startTime,
    };
  }
}
