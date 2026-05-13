/**
 * @module index
 * Public API surface for ActionFence.
 * Re-exports all types and core modules.
 */

// --- Types ---
export type {
  IdentityTier,
  DefaultRule,
  ActionRule,
  RateLimitsConfig,
  SpendLimitsConfig,
  SpendWindowConfig,
  GuardPolicy,
} from './types/policy.js';

export type {
  IdentityClassification,
  AgentIdentity,
  SafeAgentIdentity,
  IdentityReaderLike,
} from './types/identity.js';

export type { DecisionStatus, EvaluationDecision } from './types/decision.js';

export type { GuardOptions } from './types/config.js';

export type {
  ActionReceipt,
  CreateReceiptInput,
  ReceiptVerificationFailure,
  ReceiptVerificationFailureReason,
  ReceiptVerificationResult,
  ReceiptVerificationSuccess,
} from './types/receipt.js';

export type { SpendSnapshot, SpendRecordResult } from './types/spend.js';

export { PolicyValidationError, PolicyLoadError, IdentityError } from './types/errors.js';

// --- Core ---
export { loadPolicy, watchPolicy } from './core/policy-loader.js';
export { PolicyEvaluator } from './core/policy-evaluator.js';
export { IdentityReader, sanitizeIdentity } from './core/identity-reader.js';
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

// --- Storage ---
export type { StorageAdapter, ReceiptFilters } from './storage/adapter.js';
export { SQLiteAdapter } from './storage/sqlite-adapter.js';
export type { SQLiteAdapterOptions } from './storage/sqlite-adapter.js';
export { PostgresAdapter } from './storage/postgres-adapter.js';
export type { PostgresAdapterOptions } from './storage/postgres-adapter.js';
export { MemoryAdapter } from './storage/memory-adapter.js';

// --- Middleware ---
export { withGuard } from './middleware/mcp.js';
export type {
  GuardableMcpServer,
  McpTextContent,
  McpToolHandler,
  McpToolResult,
} from './middleware/mcp.js';

export { guard } from './middleware/express.js';
export type {
  GuardHttpMiddleware,
  GuardHttpPayload,
  GuardHttpRequest,
  GuardHttpResponse,
  GuardNextFunction,
} from './middleware/express.js';

export { GuardEngine } from './middleware/engine.js';
export type {
  GuardErrorBody,
  GuardErrorCode,
  GuardEvaluationInput,
  GuardEvaluationResult,
  GuardInstance,
  GuardMode,
} from './middleware/engine.js';

export { createSimulationPreview } from './middleware/simulation.js';
export type { RateLimitPreview, SimulationPreview } from './middleware/simulation.js';
