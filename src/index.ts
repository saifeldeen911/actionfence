/**
 * @module index
 * Public API surface for AgentGuard.
 * Re-exports all types and core modules.
 */

// --- Types ---
export type {
  IdentityTier,
  DefaultRule,
  ActionRule,
  RateLimitsConfig,
  GuardPolicy,
} from './types/policy.js';

export type {
  IdentityClassification,
  AgentIdentity,
} from './types/identity.js';

export type {
  DecisionStatus,
  EvaluationDecision,
} from './types/decision.js';

export type { GuardOptions } from './types/config.js';

export type {
  ActionReceipt,
  CreateReceiptInput,
  ReceiptVerificationFailure,
  ReceiptVerificationFailureReason,
  ReceiptVerificationResult,
  ReceiptVerificationSuccess,
} from './types/receipt.js';

export type {
  SpendSnapshot,
  SpendRecordResult,
} from './types/spend.js';

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
export { ReceiptSigner } from './core/receipt-signer.js';
export type { ReceiptSignerOptions } from './core/receipt-signer.js';
export { ReceiptStore } from './core/receipt-store.js';
export type { ReceiptStoreOptions } from './core/receipt-store.js';
export { SpendTracker } from './core/spend-tracker.js';
export { ConsoleReporter } from './reporters/console.js';
export type { ConsoleReporterOptions, ConsoleReportInput } from './reporters/console.js';
