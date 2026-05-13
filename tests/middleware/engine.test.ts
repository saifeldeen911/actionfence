import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptStore } from '../../src/core/receipt-store.js';
import type { IdentityReaderLike } from '../../src/types/identity.js';
import { RateLimiter } from '../../src/core/rate-limiter.js';
import { GuardEngine } from '../../src/middleware/engine.js';
import type { GuardPolicy } from '../../src/types/policy.js';

const FIXED_SECRET = Buffer.alloc(32, 9).toString('base64url');

const POLICY: GuardPolicy = {
  service: 'EngineTest',
  version: '1.0',
  default_rule: 'deny',
  actions: {
    search_flights: { allowed: true, identity: 'any' },
    book_flight: { allowed: true, identity: 'verified', max_spend: 500 },
  },
  rate_limits: {
    requests_per_minute: 10,
    transactions_per_day: 1,
  },
  spend_limits: {
    session_max: 600,
    daily_max: 700,
    currency: 'USD',
  },
};

function createStore(): {
  readonly tempDir: string;
  readonly store: ReceiptStore;
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-engine-'));
  const store = new ReceiptStore({
    databasePath: join(tempDir, 'receipts.db'),
    signerOptions: {
      secret: FIXED_SECRET,
      keyFilePath: join(tempDir, 'key'),
    },
  });
  return { tempDir, store };
}

describe('GuardEngine', () => {
  let cleanupDirs: string[] = [];

  afterEach(() => {
    for (const dir of cleanupDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    cleanupDirs = [];
  });

  it('should fail closed and log when transactionResolver throws', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      rateLimiter: new RateLimiter(POLICY.rate_limits ?? {}),
      silent: true,
      transactionResolver: () => {
        throw new Error('boom');
      },
    });

    const first = await engine.evaluate({
      toolName: 'search_flights',
      params: { q: 'CAI' },
    });
    const second = await engine.evaluate({
      toolName: 'search_flights',
      params: { q: 'CAI' },
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.statusCode).toBe(429);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[actionfence] transactionResolver failed closed: boom',
    );

    consoleErrorSpy.mockRestore();
    engine.dispose();
    store.close();
  });

  it('should strip rawToken from the returned identity', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'agent-1',
        ownerId: 'owner-1',
        capabilities: ['search_flights'],
        rawToken: 'secret-jwt-token',
      }),
    };
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      identityReader,
      silent: true,
    });

    const result = await engine.evaluate({
      toolName: 'search_flights',
      params: {},
    });

    expect(result.identity).not.toHaveProperty('rawToken');
    expect(result.identity.classification).toBe('verified');
    expect(result.identity.agentId).toBe('agent-1');
    expect(result.identity.ownerId).toBe('owner-1');
    expect(result.identity.capabilities).toEqual(['search_flights']);

    engine.dispose();
    store.close();
  });

  it('should block allowed actions that are outside declared capabilities', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'agent-1',
        ownerId: 'owner-1',
        capabilities: ['search_flights'],
        rawToken: 'token',
      }),
    };
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      identityReader,
      silent: true,
    });

    const result = await engine.evaluate({
      toolName: 'book_flight',
      params: { amount: 200 },
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.decision.reason).toContain("outside the agent's declared capabilities");

    engine.dispose();
    store.close();
  });

  it('should block when projected session spend exceeds the configured limit', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'spender',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      identityReader,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    const first = await engine.evaluate({
      toolName: 'book_flight',
      params: { amount: 400 },
    });
    const second = await engine.evaluate({
      toolName: 'book_flight',
      params: { amount: 250 },
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.statusCode).toBe(403);
    expect(second.decision.reason).toContain('session spend limit of 600.00 USD');
    expect(second.spendSnapshot?.sessionTotal).toBe(650);

    engine.dispose();
    store.close();
  });

  it('should return projected totals in simulation mode when daily spend would be exceeded', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'daily-spender',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const engine = new GuardEngine({
      policy: {
        ...POLICY,
        spend_limits: {
          session_max: 1000,
          daily_max: 500,
          currency: 'USD',
        },
      },
      receiptStore: store,
      identityReader,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    const seed = await engine.evaluate({
      toolName: 'book_flight',
      params: { amount: 300 },
    });
    const preview = await engine.evaluate({
      toolName: 'book_flight',
      params: { amount: 250 },
      mode: 'simulate',
    });

    expect(seed.allowed).toBe(true);
    expect(preview.allowed).toBe(false);
    expect(preview.preview?.reason).toContain('daily spend limit of 500.00 USD');
    expect(preview.preview?.spendSnapshot?.sessionTotal).toBe(550);
    expect(preview.preview?.spendSnapshot?.dailyTotal).toBe(550);

    engine.dispose();
    store.close();
  });
});
