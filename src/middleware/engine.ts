/**
 * @module middleware/engine
 * Shared enforcement pipeline for MCP and HTTP middleware adapters.
 */

import { basename } from 'node:path';
import { loadPolicy, watchPolicy } from '../core/policy-loader.js';
import { IdentityReader, sanitizeIdentity, type RequestContext } from '../core/identity-reader.js';
import { PolicyEvaluator } from '../core/policy-evaluator.js';
import { RateLimiter, type RateLimitResult } from '../core/rate-limiter.js';
import { ReceiptStore } from '../core/receipt-store.js';
import type { StorageAdapter } from '../storage/adapter.js';
import { SpendTracker } from '../core/spend-tracker.js';
import { ConsoleReporter } from '../reporters/console.js';
import { AsyncMutex } from '../utils/async-mutex.js';
import type { GuardOptions } from '../types/config.js';
import type { EvaluationDecision } from '../types/decision.js';
import type { AgentIdentity, IdentityReaderLike, SafeAgentIdentity } from '../types/identity.js';
import type { ActionReceipt } from '../types/receipt.js';
import type { SpendSnapshot } from '../types/spend.js';
import type { GuardPolicy, SpendLimitsConfig } from '../types/policy.js';
import type { WindowCheckResult } from '../core/spend-tracker.js';
import { createSimulationPreview, type SimulationPreview } from './simulation.js';

/** Whether a guard evaluation is enforcing or dry-running. */
export type GuardMode = 'enforce' | 'simulate';

/** Input to the shared guard pipeline. */
export interface GuardEvaluationInput {
  readonly toolName: string;
  readonly params: unknown;
  readonly context?: RequestContext;
  readonly mode?: GuardMode;
}

/** Machine-readable error shape returned by middleware adapters. */
export interface GuardErrorBody {
  readonly error: {
    readonly code: GuardErrorCode;
    readonly message: string;
    readonly action: string;
    readonly toolName: string;
    readonly policyRef: string;
    readonly receiptId: string | null;
  };
}

export type GuardErrorCode =
  | 'ACTIONFENCE_BLOCKED'
  | 'ACTIONFENCE_RATE_LIMITED'
  | 'ACTIONFENCE_INTERNAL_ERROR';

/** Result returned by the shared guard pipeline. */
export interface GuardEvaluationResult {
  readonly allowed: boolean;
  readonly mode: GuardMode;
  readonly statusCode: number;
  readonly decision: EvaluationDecision;
  readonly identity: SafeAgentIdentity;
  readonly receipt: ActionReceipt | null;
  readonly spendSnapshot: SpendSnapshot | null;
  readonly preview: SimulationPreview | null;
  readonly error: GuardErrorBody | null;
}

/** Runtime instance returned by middleware factories. */
export interface GuardInstance {
  readonly engine: GuardEngine;
  dispose(): void;
}

/**
 * GuardEngine composes the core modules into one request/tool evaluation path.
 *
 * Lock ordering: when both the per-agent mutex (evaluate) and the
 * ReceiptStore insert mutex are needed, the agent mutex MUST be acquired
 * first to prevent deadlocks. ReceiptStore.insert() acquires its internal
 * mutex inside the agent-mutex critical section.
 */
export class GuardEngine {
  private policy: GuardPolicy;
  private readonly evaluator: PolicyEvaluator;
  private readonly identityReader: IdentityReaderLike;
  private readonly rateLimiter: RateLimiter;
  private readonly spendTracker: SpendTracker;
  private readonly reporter: ConsoleReporter;
  private readonly cleanupPolicyWatcher: (() => void) | null;
  private readonly ownsRateLimiter: boolean;
  private readonly ownsReceiptStore: boolean;
  private receiptStore?: ReceiptStore;
  private receiptStorePromise?: Promise<ReceiptStore>;
  private readonly options: GuardOptions;
  private readonly policyRefBase: string;
  private readonly agentMutexes = new Map<string, AsyncMutex>();

  constructor(options: GuardOptions) {
    this.options = options;
    this.policy = loadPolicy(options.policy);
    this.policyRefBase = getPolicyRefBase(options.policy, this.policy);
    this.evaluator = new PolicyEvaluator(this.policy);
    this.identityReader =
      options.identityReader ?? new IdentityReader(options.identityReaderOptions);
    this.rateLimiter = options.rateLimiter ?? new RateLimiter(this.policy.rate_limits ?? {});
    this.spendTracker = options.spendTracker ?? new SpendTracker(this.policy.spend_limits);
    this.spendTracker.updateConfig(this.policy.spend_limits);
    if (options.receiptStore) {
      this.receiptStore = options.receiptStore;
    }
    this.reporter = options.reporter ?? new ConsoleReporter({ silent: options.silent });
    this.ownsRateLimiter = options.rateLimiter === undefined;
    this.ownsReceiptStore = options.receiptStore === undefined;
    this.cleanupPolicyWatcher =
      typeof options.policy === 'string' && options.watchPolicy === true
        ? watchPolicy(options.policy, (policy) => this.updatePolicy(policy))
        : null;
  }

  async evaluate(input: GuardEvaluationInput): Promise<GuardEvaluationResult> {
    const mode = input.mode ?? (this.options.simulate ? 'simulate' : 'enforce');
    const context = input.context ?? {};
    const identity = await this.identityReader.readIdentity(context);
    const action = this.resolveAction(input.toolName, input.params);
    const spendAmount = this.extractSpend(input.params);

    const mutex = this.acquireMutex(identity.agentId);
    try {
      return await mutex.runExclusive(async () => {
        const requestRate = this.checkRequestRate(identity.agentId, mode);

        if (!requestRate.allowed) {
          return this.finalize({
            mode,
            decision: createBlockedDecision({
              action,
              toolName: input.toolName,
              identity,
              spendAmount,
              reason: `Request rate limit exceeded for agent "${identity.agentId}"`,
            }),
            identity,
            params: input.params,
            statusCode: 429,
            errorCode: 'ACTIONFENCE_RATE_LIMITED',
            rateLimit: requestRate,
          });
        }

        let decision = this.evaluator.evaluate(action, input.toolName, identity, spendAmount);
        decision = this.enforceCapabilities(action, decision, identity);

        let statusCode = decision.status === 'PASSED' ? 200 : 403;
        let errorCode: GuardErrorCode = 'ACTIONFENCE_BLOCKED';
        let effectiveRateLimit: RateLimitResult | null = requestRate;

        if (decision.status === 'PASSED') {
          decision = this.enforceSpendLimits(action, decision, identity);
          if (decision.status === 'BLOCKED') {
            statusCode = 403;
          }
        }

        if (
          decision.status === 'PASSED' &&
          this.isTransaction(input.toolName, input.params, decision)
        ) {
          const transactionRate = this.checkTransactionRate(identity.agentId, mode);
          effectiveRateLimit = transactionRate;

          if (!transactionRate.allowed) {
            decision = createBlockedDecision({
              action,
              toolName: input.toolName,
              identity,
              spendAmount,
              reason: `Transaction rate limit exceeded for agent "${identity.agentId}"`,
            });
            statusCode = 429;
            errorCode = 'ACTIONFENCE_RATE_LIMITED';
          }
        }

        return this.finalize({
          mode,
          decision,
          identity,
          params: input.params,
          statusCode,
          errorCode,
          rateLimit: effectiveRateLimit,
        });
      });
    } finally {
      this.releaseMutexIfIdle(identity.agentId, mutex);
    }
  }

  dispose(): void {
    this.cleanupPolicyWatcher?.();

    if (this.ownsRateLimiter) {
      this.rateLimiter.dispose();
    }

    if (this.ownsReceiptStore && this.receiptStore) {
      void this.receiptStore.close().catch((err: unknown) => {
        console.error('[actionfence] Failed to close receipt store during engine disposal:', err);
      });
    }
  }

  private updatePolicy(policy: GuardPolicy): void {
    this.policy = policy;
    this.evaluator.updatePolicy(policy);
    this.rateLimiter.updateConfig(policy.rate_limits ?? {});
    this.spendTracker.updateConfig(policy.spend_limits);
  }

  private acquireMutex(agentId: string): AsyncMutex {
    const existing = this.agentMutexes.get(agentId);
    if (existing) {
      return existing;
    }
    const mutex = new AsyncMutex();
    this.agentMutexes.set(agentId, mutex);
    return mutex;
  }

  private releaseMutexIfIdle(agentId: string, mutex: AsyncMutex): void {
    // Intentionally retain one mutex instance per agent to avoid TOCTOU races
    // between a release and a concurrent acquire.
    void agentId;
    void mutex;
  }

  private async getReceiptStore(): Promise<ReceiptStore> {
    if (this.receiptStore) return this.receiptStore;
    if (this.receiptStorePromise) return this.receiptStorePromise;

    this.receiptStorePromise = (async () => {
      let adapter: StorageAdapter | undefined;
      const storageConfig = this.options.storage;

      if (storageConfig?.adapter === 'postgres') {
        const { PostgresAdapter } = await import('../storage/postgres-adapter.js');
        adapter = await PostgresAdapter.create({
          connectionString: storageConfig.connectionString,
          poolConfig: storageConfig.poolConfig,
        });
      }

      this.receiptStore = new ReceiptStore({
        ...this.options.receiptStoreOptions,
        adapter,
        signerOptions: {
          ...this.options.receiptStoreOptions?.signerOptions,
          secret: this.options.secret ?? this.options.receiptStoreOptions?.signerOptions?.secret,
          maxPayloadBytes:
            this.options.maxPayloadBytes ??
            this.options.receiptStoreOptions?.signerOptions?.maxPayloadBytes,
        },
      });

      return this.receiptStore;
    })();

    return this.receiptStorePromise;
  }

  private async finalize(input: {
    readonly mode: GuardMode;
    readonly decision: EvaluationDecision;
    readonly identity: AgentIdentity;
    readonly params: unknown;
    readonly statusCode: number;
    readonly errorCode: GuardErrorCode;
    readonly rateLimit: RateLimitResult | null;
  }): Promise<GuardEvaluationResult> {
    let spendSnapshot: SpendSnapshot | null = null;

    if (input.mode === 'simulate') {
      spendSnapshot = this.resolveSpendSnapshot(input.identity.agentId, input.decision, input.mode);
    }

    const preview =
      input.mode === 'simulate'
        ? createSimulationPreview({
            decision: input.decision,
            identity: input.identity,
            rateLimit: input.rateLimit,
            spendSnapshot,
          })
        : null;
    const receipt =
      input.mode === 'enforce'
        ? await (
            await this.getReceiptStore()
          ).insert({
            decision: input.decision,
            identity: input.identity,
            params: this.redactPayload(input.params),
            originalParams: input.params,
            policyRef: this.policyRef,
          })
        : null;

    if (input.mode === 'enforce') {
      spendSnapshot = this.resolveSpendSnapshot(input.identity.agentId, input.decision, input.mode);
    }

    this.reporter.report({
      decision: input.decision,
      receiptId: receipt?.receipt_id,
      spendSnapshot: spendSnapshot ?? undefined,
    });
    this.notifyDecision(input.decision);

    const error =
      input.decision.status === 'BLOCKED'
        ? createErrorBody({
            code: input.errorCode,
            message: input.decision.reason ?? 'Action blocked by ActionFence',
            action: input.decision.action,
            toolName: input.decision.toolName,
            policyRef: this.policyRef,
            receiptId: receipt?.receipt_id ?? null,
          })
        : null;

    return Object.freeze({
      allowed: input.decision.status === 'PASSED',
      mode: input.mode,
      statusCode: input.decision.status === 'PASSED' ? 200 : input.statusCode,
      decision: input.decision,
      identity: sanitizeIdentity(input.identity),
      receipt,
      spendSnapshot,
      preview,
      error,
    });
  }

  private redactPayload(params: unknown): unknown {
    if (!this.options.payloadRedactor) {
      return params;
    }

    try {
      const redacted = this.options.payloadRedactor(params);
      if (redacted === undefined) {
        throw new TypeError('payloadRedactor must return a JSON-serializable value');
      }
      return redacted;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ActionFence payloadRedactor failed closed: ${message}`);
    }
  }

  private resolveAction(toolName: string, params: unknown): string {
    if (!this.options.actionResolver) {
      return toolName;
    }

    try {
      const action = this.options.actionResolver(toolName, params);
      if (typeof action !== 'string' || action.trim().length === 0) {
        throw new TypeError('actionResolver must return a non-empty string');
      }
      return action;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ActionFence actionResolver failed closed: ${message}`);
    }
  }

  private extractSpend(params: unknown): number | null {
    if (!this.options.spendExtractor) {
      return null;
    }

    try {
      const amount = this.options.spendExtractor(params);
      if (amount === null) {
        return null;
      }
      if (!Number.isFinite(amount) || amount < 0) {
        throw new RangeError(`Spend amount must be finite and non-negative. Received: ${amount}`);
      }
      return amount;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ActionFence spendExtractor failed closed: ${message}`);
    }
  }

  private checkRequestRate(agentId: string, mode: GuardMode): RateLimitResult {
    return mode === 'simulate'
      ? this.rateLimiter.previewRequestRate(agentId)
      : this.rateLimiter.checkRequestRate(agentId);
  }

  private checkTransactionRate(agentId: string, mode: GuardMode): RateLimitResult {
    return mode === 'simulate'
      ? this.rateLimiter.previewTransactionRate(agentId)
      : this.rateLimiter.checkTransactionRate(agentId);
  }

  private recordSpend(
    agentId: string,
    amount: number | null,
    mode: GuardMode,
  ): SpendSnapshot | null {
    const windowConfig = this.policy.spend_limits?.window;
    const maxWindowMillis = windowConfig ? windowConfig.duration_minutes * 60 * 1000 : undefined;

    const result =
      mode === 'simulate'
        ? this.spendTracker.previewRecord(agentId, amount)
        : this.spendTracker.record(agentId, amount, maxWindowMillis);
    return result.recorded ? result.snapshot : null;
  }

  private resolveSpendSnapshot(
    agentId: string,
    decision: EvaluationDecision,
    mode: GuardMode,
  ): SpendSnapshot | null {
    if (decision.status !== 'PASSED') {
      return decision.spendAmount !== null
        ? this.previewSpend(agentId, decision.spendAmount)
        : null;
    }

    const snapshot = this.recordSpend(agentId, decision.spendAmount, mode);
    return this.enrichWithWindowData(agentId, snapshot);
  }

  private previewSpend(agentId: string, amount: number): SpendSnapshot | null {
    const result = this.spendTracker.previewRecord(agentId, amount);
    return result.recorded ? result.snapshot : null;
  }

  /**
   * Enrich a spend snapshot with rolling-window data if configured.
   */
  private enrichWithWindowData(
    agentId: string,
    snapshot: SpendSnapshot | null,
  ): SpendSnapshot | null {
    if (!snapshot) return null;

    const windowConfig = this.policy.spend_limits?.window;
    if (!windowConfig) return snapshot;

    const windowResult = this.spendTracker.checkWindow(agentId, windowConfig);
    return Object.freeze({
      ...snapshot,
      windowTotal: windowResult.windowTotal,
      windowResetMs: windowResult.windowResetMs,
    });
  }

  private enforceCapabilities(
    action: string,
    decision: EvaluationDecision,
    identity: AgentIdentity,
  ): EvaluationDecision {
    if (decision.status !== 'PASSED' || identity.capabilities.length === 0) {
      return decision;
    }

    if (identity.capabilities.includes(action)) {
      return decision;
    }

    return createBlockedDecision({
      action,
      toolName: decision.toolName,
      identity,
      spendAmount: decision.spendAmount,
      reason: `Action "${action}" is outside the agent's declared capabilities`,
    });
  }

  private enforceSpendLimits(
    action: string,
    decision: EvaluationDecision,
    identity: AgentIdentity,
  ): EvaluationDecision {
    const amount = decision.spendAmount;
    if (decision.status !== 'PASSED' || amount === null) {
      return decision;
    }

    const projected = this.spendTracker.previewRecord(identity.agentId, amount);

    // Check rolling-window spend cap
    const windowConfig = this.policy.spend_limits?.window;
    const windowResult = windowConfig
      ? this.spendTracker.checkWindow(identity.agentId, windowConfig, amount)
      : null;

    const blockedReason = resolveSpendLimitReason(
      this.policy.spend_limits,
      projected.snapshot,
      windowResult,
    );

    if (!blockedReason) {
      return decision;
    }

    return createBlockedDecision({
      action,
      toolName: decision.toolName,
      identity,
      spendAmount: amount,
      reason: blockedReason,
    });
  }

  private isTransaction(toolName: string, params: unknown, decision: EvaluationDecision): boolean {
    if (this.options.transactionResolver) {
      try {
        return this.options.transactionResolver(toolName, params, decision);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[actionfence] transactionResolver failed closed: ${message}`);
        return true;
      }
    }

    return decision.spendAmount !== null || decision.requiresHumanApproval;
  }

  private notifyDecision(decision: EvaluationDecision): void {
    try {
      this.options.onDecision?.(decision);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[actionfence] onDecision callback failed: ${message}`);
    }
  }

  private get policyRef(): string {
    return `${this.policyRefBase} v${this.policy.version}`;
  }
}

function getPolicyRefBase(policySource: GuardOptions['policy'], policy: GuardPolicy): string {
  return typeof policySource === 'string' ? basename(policySource) : policy.service;
}

function createBlockedDecision(input: {
  readonly action: string;
  readonly toolName: string;
  readonly identity: AgentIdentity;
  readonly spendAmount: number | null;
  readonly reason: string;
}): EvaluationDecision {
  return Object.freeze({
    status: 'BLOCKED',
    action: input.action,
    toolName: input.toolName,
    identityTier: input.identity.classification,
    reason: input.reason,
    spendAmount: input.spendAmount,
    requiresHumanApproval: false,
    timestamp: new Date().toISOString(),
    durationMs: 0,
  });
}

function resolveSpendLimitReason(
  config: SpendLimitsConfig | undefined,
  snapshot: SpendSnapshot,
  windowResult: WindowCheckResult | null = null,
): string | null {
  if (!config) {
    return null;
  }

  if (config.session_max !== undefined && snapshot.sessionTotal > config.session_max) {
    return `Action would exceed session spend limit of ${formatMoney(config.session_max, config.currency)}`;
  }

  if (config.daily_max !== undefined && snapshot.dailyTotal > config.daily_max) {
    return `Action would exceed daily spend limit of ${formatMoney(config.daily_max, config.currency)}`;
  }

  if (windowResult && !windowResult.allowed) {
    const windowDuration = config.window?.duration_minutes;
    if (typeof windowDuration !== 'number' || windowDuration <= 0) {
      return `Action would exceed rolling window spend limit of ${formatMoney(windowResult.windowMax, config.currency)} per configured window`;
    }
    return `Action would exceed rolling window spend limit of ${formatMoney(windowResult.windowMax, config.currency)} per ${windowDuration} minutes`;
  }

  return null;
}

function formatMoney(amount: number, currency: string | undefined): string {
  return currency ? `${amount.toFixed(2)} ${currency}` : amount.toFixed(2);
}

function createErrorBody(input: {
  readonly code: GuardErrorCode;
  readonly message: string;
  readonly action: string;
  readonly toolName: string;
  readonly policyRef: string;
  readonly receiptId: string | null;
}): GuardErrorBody {
  return Object.freeze({
    error: Object.freeze({
      code: input.code,
      message: input.message,
      action: input.action,
      toolName: input.toolName,
      policyRef: input.policyRef,
      receiptId: input.receiptId,
    }),
  });
}
