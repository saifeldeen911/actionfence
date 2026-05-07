/**
 * @module core/identity-reader
 * Reads and classifies agent identity from request context.
 */

import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyOptions,
} from 'jose';
import type { AgentIdentity, IdentityClassification } from '../types/identity.js';

/** Configuration for the IdentityReader. */
export interface IdentityReaderOptions {
  /** JWKS URI for JWT signature verification. */
  readonly jwksUri?: string;
  /** Trusted issuer or issuers for JWT verification. */
  readonly issuer?: string | readonly string[];
  /** Expected audience or audiences for JWT verification. */
  readonly audience?: string | readonly string[];
}

/**
 * Context object shape expected by the IdentityReader.
 * Supports MCP authInfo and HTTP-style headers.
 */
export interface RequestContext {
  /** MCP OAuth auth info; contains token if MCP OAuth flow was used. */
  authInfo?: { token?: string; [key: string]: unknown };
  /** HTTP-style headers; used as fallback for Bearer token extraction. */
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
 * It always decodes JWTs for metadata extraction and optionally upgrades
 * identities to `verified` when JWKS validation succeeds.
 */
export class IdentityReader {
  private readonly verifyOptions: JWTVerifyOptions;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet> | null;

  constructor(options: IdentityReaderOptions = {}) {
    this.verifyOptions = {
      issuer: normalizeVerifyOption(options.issuer),
      audience: normalizeVerifyOption(options.audience),
    };
    this.jwks = options.jwksUri ? createRemoteJWKSet(new URL(options.jwksUri)) : null;
  }

  /**
   * Read identity from a request context object.
   *
   * @param context - The request context (MCP or HTTP-style).
   * @returns The resolved AgentIdentity. Never throws; returns anonymous on decode failure.
   */
  async readIdentity(context: RequestContext): Promise<AgentIdentity> {
    const token = this.extractToken(context);

    if (!token) {
      return ANONYMOUS_IDENTITY;
    }

    const decodedIdentity = this.decodeToken(token);
    if (decodedIdentity.classification === 'anonymous' || !this.jwks) {
      return decodedIdentity;
    }

    return this.verifyToken(token, decodedIdentity);
  }

  /**
   * Extract a bearer token from the request context.
   * Priority: MCP authInfo.token -> Authorization header.
   */
  private extractToken(context: RequestContext): string | null {
    if (context.authInfo?.token && typeof context.authInfo.token === 'string') {
      return context.authInfo.token;
    }

    const authHeader = context.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }

    return null;
  }

  /**
   * Decode a JWT and extract agent identity fields.
   * Falls back to anonymous on malformed tokens.
   */
  private decodeToken(token: string): AgentIdentity {
    try {
      const payload = decodeJwt(token);
      return createIdentityFromPayload(payload, token, 'token');
    } catch {
      console.warn('[actionfence] Failed to decode JWT, falling back to anonymous identity');
      return ANONYMOUS_IDENTITY;
    }
  }

  private async verifyToken(
    token: string,
    decodedIdentity: AgentIdentity,
  ): Promise<AgentIdentity> {
    if (!this.jwks) {
      return decodedIdentity;
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, this.verifyOptions);
      return createIdentityFromPayload(payload, token, 'verified');
    } catch {
      return decodedIdentity;
    }
  }
}

function normalizeVerifyOption(
  value: string | readonly string[] | undefined,
): string | string[] | undefined {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

function createIdentityFromPayload(
  payload: JWTPayload,
  token: string,
  classification: IdentityClassification,
): AgentIdentity {
  const agentId = typeof payload.sub === 'string' ? payload.sub : 'unknown';
  const ownerId = extractStringClaim(payload, 'azp')
    ?? extractStringClaim(payload, 'owner')
    ?? null;
  const capabilities = extractStringArrayClaim(payload, 'capabilities');

  return Object.freeze({
    classification,
    agentId,
    ownerId,
    capabilities,
    rawToken: token,
  });
}

function extractStringClaim(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

function extractStringArrayClaim(payload: JWTPayload, key: string): readonly string[] {
  const value = payload[key];
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return Object.freeze([...value]);
  }
  return Object.freeze([]);
}
