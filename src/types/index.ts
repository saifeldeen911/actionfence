/**
 * @module types
 * Barrel re-export of all public types.
 */

export type {
  IdentityTier,
  DefaultRule,
  ActionRule,
  RateLimitsConfig,
  SpendLimitsConfig,
  SpendWindowConfig,
  GuardPolicy,
} from './policy.js';

export type { IdentityClassification, AgentIdentity, SafeAgentIdentity, IdentityReaderLike } from './identity.js';

export type { DecisionStatus, EvaluationDecision } from './decision.js';

export type { GuardOptions } from './config.js';

export type {
  ActionReceipt,
  CreateReceiptInput,
  ReceiptVerificationFailure,
  ReceiptVerificationFailureReason,
  ReceiptVerificationResult,
  ReceiptVerificationSuccess,
} from './receipt.js';

export type { SpendSnapshot, SpendRecordResult } from './spend.js';

export { PolicyValidationError, PolicyLoadError, IdentityError } from './errors.js';
