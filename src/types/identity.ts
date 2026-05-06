/**
 * @module types/identity
 * Agent identity types used throughout the bouncer evaluation pipeline.
 */

/** Classification of an agent's identity based on presented credentials. */
export type IdentityClassification = 'anonymous' | 'token' | 'verified';

/**
 * Represents the resolved identity of an incoming agent.
 * Produced by the IdentityReader from request context.
 */
export interface AgentIdentity {
  /** How the agent's identity was classified. */
  readonly classification: IdentityClassification;
  /** Agent identifier extracted from JWT `sub` claim, or 'anonymous'. */
  readonly agentId: string;
  /** Owner identifier from JWT `azp` or `owner` claim, if present. */
  readonly ownerId: string | null;
  /** Declared capabilities from JWT claims, if present. */
  readonly capabilities: readonly string[];
  /** The raw token string, if one was presented. Null for anonymous. */
  readonly rawToken: string | null;
}
