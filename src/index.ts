/**
 * @module index
 * Public API surface for Agent Bouncer.
 * Re-exports all types and core modules.
 */

// --- Types ---
export type {
  IdentityTier,
  DefaultRule,
  ActionRule,
  RateLimitsConfig,
  BouncerPolicy,
} from './types/policy.js';

export type {
  IdentityClassification,
  AgentIdentity,
} from './types/identity.js';

export type {
  DecisionStatus,
  EvaluationDecision,
} from './types/decision.js';

export type { BouncerOptions } from './types/config.js';

export {
  PolicyValidationError,
  PolicyLoadError,
  IdentityError,
} from './types/errors.js';

// --- Core ---
export { loadPolicy, watchPolicy } from './core/policy-loader.js';
export { PolicyEvaluator } from './core/policy-evaluator.js';
export { IdentityReader } from './core/identity-reader.js';
export type { IdentityReaderOptions, RequestContext } from './core/identity-reader.js';
export { RateLimiter } from './core/rate-limiter.js';
export type { RateLimitResult } from './core/rate-limiter.js';
