/**
 * @module types/policy
 * Core policy types for the guard-policy.json schema.
 *
 * These types are the internal representation of a loaded and validated policy.
 * All properties are readonly to enforce immutability after loading.
 */

/** Identity tier required to perform an action. */
export type IdentityTier = 'any' | 'token' | 'verified';

/** Default behavior for actions not explicitly listed in the policy. */
export type DefaultRule = 'allow' | 'deny';

/** A single action rule within the policy. */
export interface ActionRule {
  /** Whether the action is permitted. */
  readonly allowed: boolean;
  /** Minimum identity tier required. Defaults to 'any' if omitted. */
  readonly identity?: IdentityTier;
  /** Maximum spend amount allowed for this action in major units (for example, 299.99 USD). */
  readonly max_spend?: number;
  /** ISO 4217 currency code for max_spend, if provided. */
  readonly currency?: string;
  /** Whether human approval is required before execution. */
  readonly requires_human_approval?: boolean;
  /** SHA-256 hash of the tool's expected input schema. Used for drift detection. */
  readonly schema_hash?: string;
}

/** Rolling-window spend cap configuration. */
export interface SpendWindowConfig {
  /** Maximum spend amount allowed within the rolling window. */
  readonly max_amount: number;
  /** Duration of the rolling window in minutes. */
  readonly duration_minutes: number;
}

/** Global spend limits for one policy in major units. */
export interface SpendLimitsConfig {
  /** Maximum projected session spend per agent. */
  readonly session_max?: number;
  /** Maximum projected UTC-day spend per agent. */
  readonly daily_max?: number;
  /** Rolling-window spend cap. Blocks when cumulative spend within duration_minutes exceeds max_amount. */
  readonly window?: SpendWindowConfig;
  /** ISO 4217 currency code for spend reporting, if known. */
  readonly currency?: string;
  /**
   * Idle timeout in minutes after which `sessionTotal` resets to 0.
   * When omitted and `session_max` is configured, defaults to 60 minutes
   * so sessions don't grow indefinitely across idle periods.
   * Set to 0 to disable idle-timeout resets entirely.
   */
  readonly session_timeout_minutes?: number;
}

/** Rate limiting configuration. */
export interface RateLimitsConfig {
  /** Maximum requests per minute per agent. 0 disables the limit. */
  readonly requests_per_minute?: number;
  /** Maximum transactions (write operations) per day per agent. 0 disables the limit. */
  readonly transactions_per_day?: number;
}

/**
 * Global circuit breaker configuration.
 * When total global spend across ALL agents exceeds the ceiling, the breaker trips
 * and (depending on `action`) either blocks all subsequent calls or fires an alert.
 */
export interface CircuitBreakerConfig {
  /** Hard ceiling for cumulative global spend in major units (e.g., 10000 = $10,000). */
  readonly global_max_spend: number;
  /** Behavior when the breaker trips. 'block_all' denies every call; 'alert_only' logs a warning. */
  readonly action: 'block_all' | 'alert_only';
  /** ISO 4217 currency code for display purposes. */
  readonly currency?: string;
}

/** Schema enforcement configuration. */
export interface SchemaEnforcementConfig {
  /** Behavior when tool schema mismatch is detected. */
  readonly on_mismatch: 'warn' | 'block';
}

/**
 * The top-level guard policy object.
 * This is the normalized internal representation — parsed from guard-policy.json.
 */
export interface GuardPolicy {
  /** Optional JSON Schema reference. */
  readonly $schema?: string;
  /** Service name this policy belongs to. */
  readonly service: string;
  /** Policy version string. */
  readonly version: string;
  /** Default rule for actions not listed in `actions`. */
  readonly default_rule: DefaultRule;
  /** Map of action names to their rules. */
  readonly actions: Readonly<Record<string, ActionRule>>;
  /** Optional rate limiting configuration. */
  readonly rate_limits?: RateLimitsConfig;
  /** Optional global spend limits in major units. */
  readonly spend_limits?: SpendLimitsConfig;
  /** Optional global circuit breaker — a master kill-switch across all agents. */
  readonly circuit_breaker?: CircuitBreakerConfig;
  /** Optional tool schema enforcement config for drift detection. */
  readonly schema_enforcement?: SchemaEnforcementConfig;
  /** Regulatory frameworks (stored only, not enforced in v1). */
  readonly regulations?: readonly string[];
}
