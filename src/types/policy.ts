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
}

/** Global spend limits for one policy in major units. */
export interface SpendLimitsConfig {
  /** Maximum projected session spend per agent. */
  readonly session_max?: number;
  /** Maximum projected UTC-day spend per agent. */
  readonly daily_max?: number;
  /** ISO 4217 currency code for spend reporting, if known. */
  readonly currency?: string;
}

/** Rate limiting configuration. */
export interface RateLimitsConfig {
  /** Maximum requests per minute per agent. 0 disables the limit. */
  readonly requests_per_minute?: number;
  /** Maximum transactions (write operations) per day per agent. 0 disables the limit. */
  readonly transactions_per_day?: number;
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
  /** Regulatory frameworks (stored only, not enforced in v1). */
  readonly regulations?: readonly string[];
}
