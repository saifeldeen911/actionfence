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

import type { GuardPolicy, IdentityTier, ActionRule } from '../types/policy.js';
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
  private exactRules = new Map<string, ActionRule>();
  private wildcardRules: { prefix: string; rule: ActionRule }[] = [];

  constructor(policy: GuardPolicy) {
    // Initializer just calls updatePolicy to set up everything
    this.policy = policy; // set temporarily to satisfy TypeScript before updatePolicy assigns it
    this.updatePolicy(policy);
  }

  /** Hot-swap the active policy (used by watchPolicy). */
  updatePolicy(policy: GuardPolicy): void {
    this.policy = policy;
    this.exactRules.clear();
    this.wildcardRules = [];

    for (const [key, rule] of Object.entries(policy.actions)) {
      if (key.endsWith('*')) {
        this.wildcardRules.push({ prefix: key.slice(0, -1), rule });
      } else {
        this.exactRules.set(key, rule);
      }
    }

    // Sort wildcard rules by prefix length descending (longest wins)
    this.wildcardRules.sort((a, b) => b.prefix.length - a.prefix.length);
  }

  /** Look up the rule for an action string. */
  private findRule(action: string): ActionRule | undefined {
    if (this.exactRules.has(action)) {
      return this.exactRules.get(action);
    }
    for (const wc of this.wildcardRules) {
      if (action.startsWith(wc.prefix)) {
        return wc.rule;
      }
    }
    return undefined;
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
    const rule = this.findRule(action);
    const defaultRule = resolveDefaultRule(this.policy.default_rule);

    // Step 2: Action not found → apply default_rule
    if (!rule) {
      const durationMs = performance.now() - startTime;

      if (defaultRule === 'deny') {
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
        const spendLabel = formatSpendLabel(spendAmount, rule.currency);
        const capLabel = formatSpendLabel(rule.max_spend, rule.currency);

        return {
          ...baseDecision,
          status: 'BLOCKED',
          reason: `Action "${action}" spend amount ${spendLabel} exceeds cap of ${capLabel}`,
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

  /**
   * Determine which actions are allowed and blocked for a given identity classification.
   * If classification is null, only actions requiring 'any' are allowed.
   */
  getAllowedActions(classification: IdentityClassification | null): { allowedActions: string[]; blockedActions: string[] } {
    const allowedActions: string[] = [];
    const blockedActions: string[] = [];
    
    // Treat null classification as level 0 (same as 'any'/'anonymous')
    const tierLevel = classification ? IDENTITY_TIER_LEVEL[classification] : 0;
    
    for (const [action, rule] of Object.entries(this.policy.actions)) {
      if (!rule.allowed) {
        blockedActions.push(action);
        continue;
      }
      
      const reqTier = rule.identity ?? 'any';
      const reqLevel = REQUIRED_TIER_LEVEL[reqTier];
      
      if (tierLevel >= reqLevel) {
        allowedActions.push(action);
      } else {
        blockedActions.push(action);
      }
    }
    
    return { allowedActions, blockedActions };
  }
}

function resolveDefaultRule(
  value: GuardPolicy['default_rule'] | string | undefined,
): IdentityTier | 'allow' | 'deny' {
  return value === 'allow' ? 'allow' : 'deny';
}

function formatSpendLabel(amount: number, currency: string | undefined): string {
  return currency ? `${amount.toFixed(2)} ${currency}` : amount.toFixed(2);
}
