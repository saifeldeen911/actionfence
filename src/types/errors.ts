/**
 * @module types/errors
 * Custom error classes for AgentGuard.
 * Each has a unique `code` property for programmatic error handling.
 */

/** Error thrown when a policy file fails JSON Schema validation. */
export class PolicyValidationError extends Error {
  readonly code = 'AGENTGUARD_POLICY_VALIDATION_ERROR' as const;

  constructor(
    message: string,
    public readonly validationErrors: readonly string[] = [],
  ) {
    super(message);
    this.name = 'PolicyValidationError';
  }
}

/** Error thrown when a policy file cannot be loaded from disk. */
export class PolicyLoadError extends Error {
  readonly code = 'AGENTGUARD_POLICY_LOAD_ERROR' as const;

  constructor(
    message: string,
    public readonly filePath: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = 'PolicyLoadError';
  }
}

/** Error thrown when identity reading fails unexpectedly. */
export class IdentityError extends Error {
  readonly code = 'AGENTGUARD_IDENTITY_ERROR' as const;

  constructor(
    message: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
