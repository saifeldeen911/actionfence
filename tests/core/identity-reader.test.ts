import { describe, it, expect, vi } from 'vitest';
import { IdentityReader } from '../../src/core/identity-reader.js';
import type { RequestContext } from '../../src/core/identity-reader.js';

/**
 * Helper: create a minimal unsigned JWT with the given payload.
 * This is NOT a secure JWT — it's decode-only for testing.
 * Format: header.payload.signature (signature is empty).
 */
function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

describe('IdentityReader', () => {
  const reader = new IdentityReader();

  describe('anonymous identity', () => {
    it('should return anonymous when context is empty', () => {
      const identity = reader.readIdentity({});
      expect(identity.classification).toBe('anonymous');
      expect(identity.agentId).toBe('anonymous');
      expect(identity.ownerId).toBeNull();
      expect(identity.rawToken).toBeNull();
    });

    it('should return anonymous when no auth headers are present', () => {
      const identity = reader.readIdentity({ headers: {} });
      expect(identity.classification).toBe('anonymous');
    });

    it('should return anonymous when authorization header is not Bearer', () => {
      const identity = reader.readIdentity({
        headers: { authorization: 'Basic abc123' },
      });
      expect(identity.classification).toBe('anonymous');
    });
  });

  describe('token identity (Bearer token)', () => {
    it('should decode JWT from Authorization header', () => {
      const token = makeUnsignedJwt({ sub: 'agent-abc', azp: 'owner-xyz' });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('agent-abc');
      expect(identity.ownerId).toBe('owner-xyz');
      expect(identity.rawToken).toBe(token);
    });

    it('should extract owner from custom "owner" claim if azp is absent', () => {
      const token = makeUnsignedJwt({ sub: 'agent-1', owner: 'owner-custom' });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.ownerId).toBe('owner-custom');
    });

    it('should prefer azp over owner claim', () => {
      const token = makeUnsignedJwt({
        sub: 'agent-1',
        azp: 'azp-owner',
        owner: 'custom-owner',
      });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.ownerId).toBe('azp-owner');
    });

    it('should extract capabilities from JWT', () => {
      const token = makeUnsignedJwt({
        sub: 'agent-1',
        capabilities: ['search', 'book'],
      });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.capabilities).toEqual(['search', 'book']);
    });

    it('should return empty capabilities if not present', () => {
      const token = makeUnsignedJwt({ sub: 'agent-1' });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.capabilities).toEqual([]);
    });

    it('should handle case-insensitive Bearer prefix', () => {
      const token = makeUnsignedJwt({ sub: 'agent-case' });
      const identity = reader.readIdentity({
        headers: { authorization: `bearer ${token}` },
      });

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('agent-case');
    });
  });

  describe('MCP authInfo', () => {
    it('should extract token from MCP authInfo', () => {
      const token = makeUnsignedJwt({ sub: 'mcp-agent' });
      const context: RequestContext = {
        authInfo: { token },
      };
      const identity = reader.readIdentity(context);

      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('mcp-agent');
    });

    it('should prefer authInfo.token over Authorization header', () => {
      const mcpToken = makeUnsignedJwt({ sub: 'mcp-agent' });
      const httpToken = makeUnsignedJwt({ sub: 'http-agent' });
      const context: RequestContext = {
        authInfo: { token: mcpToken },
        headers: { authorization: `Bearer ${httpToken}` },
      };
      const identity = reader.readIdentity(context);

      expect(identity.agentId).toBe('mcp-agent');
    });
  });

  describe('malformed tokens', () => {
    it('should fall back to anonymous for completely invalid token', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const identity = reader.readIdentity({
        headers: { authorization: 'Bearer not-a-jwt' },
      });

      expect(identity.classification).toBe('anonymous');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to decode JWT'),
      );
      consoleSpy.mockRestore();
    });

    it('should still decode an expired JWT (decode-only, no verification)', () => {
      const token = makeUnsignedJwt({
        sub: 'expired-agent',
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      // decodeJwt does NOT check expiration — that's jwtVerify's job
      expect(identity.classification).toBe('token');
      expect(identity.agentId).toBe('expired-agent');
    });

    it('should return agentId as "unknown" if sub claim is missing', () => {
      const token = makeUnsignedJwt({ azp: 'some-owner' });
      const identity = reader.readIdentity({
        headers: { authorization: `Bearer ${token}` },
      });

      expect(identity.agentId).toBe('unknown');
    });
  });
});
