/**
 * @module middleware/simulation
 * Structured dry-run preview helpers.
 */

import type { EvaluationDecision } from '../types/decision.js';
import type { AgentIdentity } from '../types/identity.js';
import type { RateLimitResult } from '../core/rate-limiter.js';
import type { SpendSnapshot } from '../types/spend.js';

/** Preview payload returned by simulation mode. */
export interface SimulationPreview {
  readonly simulation: true;
  readonly wouldExecute: boolean;
  readonly action: string;
  readonly toolName: string;
  readonly status: EvaluationDecision['status'];
  readonly reason: string | null;
  readonly identityTier: AgentIdentity['classification'];
  readonly agentId: string;
  readonly ownerId: string | null;
  readonly spendAmount: number | null;
  readonly requiresHumanApproval: boolean;
  readonly rateLimit: RateLimitPreview | null;
  readonly spendSnapshot: SpendSnapshot | null;
  readonly receiptStored: false;
  readonly timestamp: string;
}

/** Compact rate-limit state included in simulation previews. */
export interface RateLimitPreview {
  readonly limit: number;
  readonly remaining: number;
  readonly resetMs: number;
}

export function createSimulationPreview(input: {
  readonly decision: EvaluationDecision;
  readonly identity: AgentIdentity;
  readonly rateLimit?: RateLimitResult | null;
  readonly spendSnapshot?: SpendSnapshot | null;
}): SimulationPreview {
  return Object.freeze({
    simulation: true,
    wouldExecute: input.decision.status === 'PASSED',
    action: input.decision.action,
    toolName: input.decision.toolName,
    status: input.decision.status,
    reason: input.decision.reason,
    identityTier: input.identity.classification,
    agentId: input.identity.agentId,
    ownerId: input.identity.ownerId,
    spendAmount: input.decision.spendAmount,
    requiresHumanApproval: input.decision.requiresHumanApproval,
    rateLimit: input.rateLimit ? toRateLimitPreview(input.rateLimit) : null,
    spendSnapshot: input.spendSnapshot ?? null,
    receiptStored: false,
    timestamp: input.decision.timestamp,
  });
}

function toRateLimitPreview(result: RateLimitResult): RateLimitPreview {
  return Object.freeze({
    limit: result.limit,
    remaining: result.remaining,
    resetMs: result.resetMs,
  });
}
