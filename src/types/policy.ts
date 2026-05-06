/**
 * @module types/policy
 * Core policy types for the bouncer-policy.json schema.
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
  /** Maximum spend amount allowed for this action (in base currency unit). */
  readonly max_spend?: number;
  /** Whether human approval is required before execution. */
  readonly requires_human_approval?: boolean;
}

/** Rate limiting configuration. */
export interface RateLimitsConfig {
  /** Maximum requests per minute per agent. */
  readonly requests_per_minute?: number;
  /** Maximum transactions (write operations) per day per agent. */
  readonly transactions_per_day?: number;
}

/**
 * The top-level bouncer policy object.
 * This is the normalized internal representation — parsed from bouncer-policy.json.
 */
export interface BouncerPolicy {
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
  /** Regulatory frameworks (stored only, not enforced in v1). */
  readonly regulations?: readonly string[];
}
