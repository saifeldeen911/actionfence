import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import {
  exportJWK,
  SignJWT,
  type JWK,
  type KeyLike,
} from 'jose';
import { IdentityReader } from '../../src/core/identity-reader.js';
import type { RequestContext } from '../../src/core/identity-reader.js';

function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

describe('IdentityReader', () => {
  const reader = new IdentityReader();

  describe('anonymous identity', () => {
    it('should return anonymous when context is empty', async () => {
      const identity = await reader.readIdentity({});
      expect(identity.classification).toBe('anonymous');
      expect(identity.agentId).toBe('anonymous');
      expect(identity.ownerId).toBeNull();
      expect(identity.rawToken).toBeNull();
    });

    it('should return anonymous when no auth headers are present', async () => {
      const identity = await reader.readIdentity({ headers: {} });
      expect(identity.classification).toBe('anonymous');
    });

    it('should return anonymous when authorization header is not Bearer', async () => {
      const identity = await reader.readIdentity({
        headers: { authorization: 'Basic abc123' },
      });
      expect(identity.classification).toBe('anonymous');
    });
  });

  describe('token identity (Bearer token)', () => {
    it('should decode JWT from Authorization header', async () => {
      const token = makeUnsignedJwt({ sub: 'agent-abc', azp: 'owner-xyz' });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('agent-abc');
      expect(identity.ownerId).toBe('owner-xyz');
      expect(identity.rawToken).toBe(token);
    });

    it('should extract owner from custom "owner" claim if azp is absent', async () => {
      const token = makeUnsignedJwt({ sub: 'agent-1', owner: 'owner-custom' });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.ownerId).toBe('owner-custom');
    });

    it('should prefer azp over owner claim', async () => {
      const token = makeUnsignedJwt({
        sub: 'agent-1',
        azp: 'azp-owner',
        owner: 'custom-owner',
      });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.ownerId).toBe('azp-owner');
    });

    it('should extract capabilities from JWT', async () => {
      const token = makeUnsignedJwt({
        sub: 'agent-1',
        capabilities: ['search', 'book'],
      });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.capabilities).toEqual(['search', 'book']);
    });

    it('should return empty capabilities if not present', async () => {
      const token = makeUnsignedJwt({ sub: 'agent-1' });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.capabilities).toEqual([]);
    });

    it('should handle case-insensitive Bearer prefix', async () => {
      const token = makeUnsignedJwt({ sub: 'agent-case' });
      const identity = await reader.readIdentity({
        headers: { authorization: `bearer ${token}` },
      });

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('agent-case');
    });
  });

  describe('MCP authInfo', () => {
    it('should extract token from MCP authInfo', async () => {
      const token = makeUnsignedJwt({ sub: 'mcp-agent' });
      const context: RequestContext = {
        authInfo: { token },
      };
      const identity = await reader.readIdentity(context);

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('mcp-agent');
    });

    it('should prefer authInfo.token over Authorization header', async () => {
      const mcpToken = makeUnsignedJwt({ sub: 'mcp-agent' });
      const httpToken = makeUnsignedJwt({ sub: 'http-agent' });
      const context: RequestContext = {
        authInfo: { token: mcpToken },
        headers: { authorization: `Bearer ${httpToken}` },
      };
      const identity = await reader.readIdentity(context);

      expect(identity.agentId).toBe('mcp-agent');
    });
  });

  describe('malformed tokens', () => {
    it('should fall back to anonymous for completely invalid token', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const identity = await reader.readIdentity({
        headers: { authorization: 'Bearer not-a-jwt' },
      });

      expect(identity.classification).toBe('anonymous');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to decode JWT'),
      );
      consoleSpy.mockRestore();
    });

    it('should still decode an expired JWT when not verifying signatures', async () => {
      const token = makeUnsignedJwt({
        sub: 'expired-agent',
        exp: Math.floor(Date.now() / 1000) - 3600,
      });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('expired-agent');
    });

    it('should return agentId as "unknown" if sub claim is missing', async () => {
      const token = makeUnsignedJwt({ azp: 'some-owner' });
      const identity = await reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.agentId).toBe('unknown');
    });
  });
});

describe('IdentityReader with JWKS', () => {
  const issuer = 'https://issuer.example';
  const audience = 'actionfence-tests';
  const primaryKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const secondaryKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

  let server: Server;
  let serverUrl = '';
  let jwk: JWK;

  beforeAll(async () => {
    jwk = await exportJWK(primaryKeys.publicKey);
    jwk.kid = 'primary-key';
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    server = createServer((req, res) => {
      if (req.url !== '/.well-known/jwks.json') {
        res.statusCode = 404;
        res.end('not found');
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve JWKS test server address');
    }

    serverUrl = `http://127.0.0.1:${address.port}/.well-known/jwks.json`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should classify a valid JWT as verified', async () => {
    const token = await signJwt(primaryKeys.privateKey, {
      sub: 'verified-agent',
      azp: 'owner-1',
      capabilities: ['book_flight'],
    });
    const reader = new IdentityReader({
      jwksUri: serverUrl,
      issuer,
      audience,
    });

    const identity = await reader.readIdentity({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(identity.classification).toBe('verified');
    expect(identity.agentId).toBe('verified-agent');
    expect(identity.capabilities).toEqual(['book_flight']);
  });

  it('should return anonymous when the signature is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const token = await signJwt(secondaryKeys.privateKey, {
      sub: 'fallback-agent',
      azp: 'owner-2',
      capabilities: ['book_flight'],
    });
    const reader = new IdentityReader({
      jwksUri: serverUrl,
      issuer,
      audience,
    });

    const identity = await reader.readIdentity({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(identity.classification).toBe('anonymous');
    expect(identity.agentId).toBe('anonymous');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT verification failed'),
      expect.anything(),
    );
  });

  it('should return anonymous when issuer validation fails', async () => {
    const token = await signJwt(primaryKeys.privateKey, { sub: 'issuer-agent' }, {
      issuer: 'https://wrong-issuer.example',
    });
    const reader = new IdentityReader({
      jwksUri: serverUrl,
      issuer,
      audience,
    });

    const identity = await reader.readIdentity({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(identity.classification).toBe('anonymous');
    expect(identity.agentId).toBe('anonymous');
  });

  it('should return anonymous when audience validation fails', async () => {
    const token = await signJwt(primaryKeys.privateKey, { sub: 'audience-agent' }, {
      audience: 'wrong-audience',
    });
    const reader = new IdentityReader({
      jwksUri: serverUrl,
      issuer,
      audience,
    });

    const identity = await reader.readIdentity({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(identity.classification).toBe('anonymous');
    expect(identity.agentId).toBe('anonymous');
  });

  it('should fall back to token when the JWKS endpoint cannot be reached', async () => {
    const token = await signJwt(primaryKeys.privateKey, {
      sub: 'network-agent',
    });

    const unreachableServer = createServer((_req, res) => {
      res.statusCode = 204;
      res.end();
    });

    await new Promise<void>((resolve) => {
      unreachableServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = unreachableServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve temporary JWKS server address');
    }

    const jwksUri = `http://127.0.0.1:${address.port}/.well-known/jwks.json`;

    await new Promise<void>((resolve, reject) => {
      unreachableServer.close((error) => (error ? reject(error) : resolve()));
    });

    const reader = new IdentityReader({
      jwksUri,
      issuer,
      audience,
    });

    const identity = await reader.readIdentity({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(identity.classification).toBe('token');
    expect(identity.agentId).toBe('network-agent');
  });
});

async function signJwt(
  key: KeyLike,
  payload: Record<string, unknown>,
  overrides: {
    issuer?: string;
    audience?: string | readonly string[];
  } = {},
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'primary-key', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setIssuer(overrides.issuer ?? 'https://issuer.example')
    .setAudience(overrides.audience ?? 'actionfence-tests')
    .sign(key);
}
