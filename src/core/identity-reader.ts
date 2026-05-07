/**
 * @module core/identity-reader
 * Reads and classifies agent identity from request context.
 *
 * Classification tiers:
 * - anonymous: No credentials presented
 * - token:     Bearer token present but NOT signature-verified
 * - verified:  JWT with verified signature (requires JWKS config)
 */

import { decodeJwt } from 'jose';
import type { AgentIdentity, IdentityClassification } from '../types/identity.js';

/** Configuration for the IdentityReader. */
export interface IdentityReaderOptions {
  /** JWKS URI for full JWT verification (v1.5 — not implemented in v1). */
  readonly jwksUri?: string;
  /** List of trusted JWT issuers for validation. */
  readonly trustedIssuers?: readonly string[];
}

/**
 * Context object shape expected by the IdentityReader.
 * Supports MCP authInfo and HTTP-style headers.
 */
export interface RequestContext {
  /** MCP OAuth auth info — contains token if MCP OAuth flow was used. */
  authInfo?: { token?: string; [key: string]: unknown };
  /** HTTP-style headers — used as fallback for Bearer token extraction. */
  headers?: { authorization?: string; [key: string]: unknown };
  /** Catch-all for other context properties. */
  [key: string]: unknown;
}

const ANONYMOUS_IDENTITY: AgentIdentity = Object.freeze({
  classification: 'anonymous' as IdentityClassification,
  agentId: 'anonymous',
  ownerId: null,
  capabilities: [],
  rawToken: null,
});

/**
 * IdentityReader extracts and classifies agent identity from request context.
 * It decodes JWTs to extract agent metadata but does NOT verify signatures in v1
 * (decode-only → 'token' tier). Full verification requires JWKS configuration.
 */
export class IdentityReader {
  // Stored for future use (JWKS verification in v1.5)
  private readonly options: IdentityReaderOptions;

  constructor(options: IdentityReaderOptions = {}) {
    this.options = options;
    // Reserved: this.options will be used for JWKS verification in v1.5
    void this.options;
  }

  /**
   * Read identity from a request context object.
   *
   * @param context - The request context (MCP or HTTP-style).
   * @returns The resolved AgentIdentity. Never throws — returns anonymous on failure.
   */
  readIdentity(context: RequestContext): AgentIdentity {
    const token = this.extractToken(context);

    if (!token) {
      return ANONYMOUS_IDENTITY;
    }

    return this.decodeToken(token);
  }

  /**
   * Extract a bearer token from the request context.
   * Priority: MCP authInfo.token → Authorization header.
   */
  private extractToken(context: RequestContext): string | null {
    // Priority 1: MCP OAuth authInfo
    if (context.authInfo?.token && typeof context.authInfo.token === 'string') {
      return context.authInfo.token;
    }

    // Priority 2: HTTP Authorization header
    const authHeader = context.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }

    return null;
  }

  /**
   * Decode a JWT and extract agent identity fields.
   * Uses jose.decodeJwt() — decode-only, no signature verification.
   * Falls back to anonymous on any decode failure.
   */
  private decodeToken(token: string): AgentIdentity {
    try {
      const payload = decodeJwt(token);

      const agentId = typeof payload.sub === 'string' ? payload.sub : 'unknown';

      // Owner ID: check 'azp' (authorized party) first, then custom 'owner' claim
      const ownerId = extractStringClaim(payload, 'azp')
        ?? extractStringClaim(payload, 'owner')
        ?? null;

      // Capabilities: check custom 'capabilities' claim (array of strings)
      const capabilities = extractStringArrayClaim(payload, 'capabilities');

      return Object.freeze({
        classification: 'token' as IdentityClassification,
        agentId,
        ownerId,
        capabilities,
        rawToken: token,
      });
    } catch {
      // Malformed JWT — fail gracefully to anonymous
      console.warn('[agentguard] Failed to decode JWT, falling back to anonymous identity');
      return ANONYMOUS_IDENTITY;
    }
  }
}

/** Safely extract a string claim from a JWT payload. */
function extractStringClaim(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

/** Safely extract a string array claim from a JWT payload. */
function extractStringArrayClaim(
  payload: Record<string, unknown>,
  key: string,
): readonly string[] {
  const value = payload[key];
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return Object.freeze(value as string[]);
  }
  return Object.freeze([]);
}
