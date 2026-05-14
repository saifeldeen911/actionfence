import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptStore } from '../../src/core/receipt-store.js';
import { ReceiptSigner } from '../../src/core/receipt-signer.js';
import type { StorageAdapter } from '../../src/storage/adapter.js';
import type { IdentityReaderLike } from '../../src/types/identity.js';
import { RateLimiter } from '../../src/core/rate-limiter.js';
import { GuardEngine } from '../../src/middleware/engine.js';
import { SpendTracker } from '../../src/core/spend-tracker.js';
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

  it('should retain a stable mutex instance per agent', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'mutex-agent',
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
    const mutexes = engine as unknown as { readonly agentMutexes: Map<string, unknown> };

    await engine.evaluate({
      toolName: 'search_flights',
      params: {},
    });

    const firstMutex = mutexes.agentMutexes.get('mutex-agent');
    expect(firstMutex).toBeDefined();

    await engine.evaluate({
      toolName: 'search_flights',
      params: {},
    });

    expect(mutexes.agentMutexes.get('mutex-agent')).toBe(firstMutex);
    expect(mutexes.agentMutexes.size).toBe(1);

    engine.dispose();
    store.close();
  });

  it('should redact stored payloads while preserving original payload integrity', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const signer = new ReceiptSigner({ secret: FIXED_SECRET });
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      silent: true,
      actionResolver: () => 'search_flights',
      payloadRedactor: (params) => {
        const record = params as { password?: string; query?: string } | null;
        if (!record) {
          return params;
        }

        const { password: _password, ...safe } = record;
        return safe;
      },
    });

    const params = {
      query: 'CAI',
      password: 'super-secret',
    };

    const result = await engine.evaluate({
      toolName: 'search_flights',
      params,
    });

    expect(result.allowed).toBe(true);
    expect(result.receipt).not.toBeNull();
    expect(result.receipt?.payload_json).toBe('{"query":"CAI"}');
    expect(result.receipt?.payload_hash).toBe(signer.hashPayload(params));
    expect(result.receipt?.payload_json_hash).toBe(signer.hashPayload({ query: 'CAI' }));
    expect(await store.verifyChain()).toEqual({ valid: true, checkedCount: 1 });

    engine.dispose();
    store.close();
  });

  it('should not commit spend when receipt insertion fails', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-engine-fail-'));
    cleanupDirs.push(tempDir);
    const store = new ReceiptStore({
      adapter: {
        insert: vi.fn(async () => {
          throw new Error('receipt insert failed');
        }),
        getLastHash: vi.fn().mockResolvedValue(''),
        getById: vi.fn(),
        listByAgent: vi.fn(),
        count: vi.fn(),
        query: vi.fn(),
        getAllOrdered: vi.fn(),
        close: vi.fn(),
      } satisfies StorageAdapter,
      signerOptions: {
        secret: FIXED_SECRET,
        keyFilePath: join(tempDir, 'key'),
      },
    });
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'spender',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const spendTracker = new SpendTracker(POLICY.spend_limits);
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      identityReader,
      spendTracker,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    await expect(
      engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 150 },
      }),
    ).rejects.toThrow('receipt insert failed');

    expect(spendTracker.getTotals('spender').sessionTotal).toBe(0);

    engine.dispose();
    await store.close();
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
    expect(result.identity).not.toHaveProperty('rawToken');
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
    expect(second.identity).not.toHaveProperty('rawToken');
    expect(second.decision.reason).toContain('session spend limit of 600.00 USD');
    expect(second.spendSnapshot?.sessionTotal).toBe(650);

    engine.dispose();
    store.close();
  });

  it('should apply the default session timeout from policy through the engine', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'timeout-agent',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const spendTracker = new SpendTracker();
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      identityReader,
      spendTracker,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));

    try {
      const first = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 400 },
      });

      vi.advanceTimersByTime(61 * 60 * 1000);

      const second = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 250 },
      });

      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(true);
      expect(second.statusCode).toBe(200);
      expect(second.spendSnapshot?.sessionTotal).toBe(250);
    } finally {
      vi.useRealTimers();
      engine.dispose();
      store.close();
    }
  });

  it('should apply explicit session_timeout_minutes from policy through the engine', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'explicit-timeout-agent',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const spendTracker = new SpendTracker();
    const engine = new GuardEngine({
      policy: {
        ...POLICY,
        spend_limits: {
          session_max: 600,
          daily_max: 700,
          session_timeout_minutes: 15,
          currency: 'USD',
        },
      },
      receiptStore: store,
      identityReader,
      spendTracker,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));

    try {
      const first = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 400 },
      });
      expect(first.allowed).toBe(true);

      // 14 minutes — within the 15-minute timeout, session should accumulate
      vi.advanceTimersByTime(14 * 60 * 1000);

      const withinTimeout = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 100 },
      });
      expect(withinTimeout.allowed).toBe(true);
      expect(withinTimeout.spendSnapshot?.sessionTotal).toBe(500);

      // 16 minutes from last activity — past the 15-minute timeout, session resets
      vi.advanceTimersByTime(16 * 60 * 1000);

      const afterTimeout = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 200 },
      });
      expect(afterTimeout.allowed).toBe(true);
      expect(afterTimeout.spendSnapshot?.sessionTotal).toBe(200);
    } finally {
      vi.useRealTimers();
      engine.dispose();
      store.close();
    }
  });

  it('should disable session timeout when session_timeout_minutes is 0', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'no-timeout-agent',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const spendTracker = new SpendTracker();
    const engine = new GuardEngine({
      policy: {
        ...POLICY,
        spend_limits: {
          session_max: 600,
          daily_max: 700,
          session_timeout_minutes: 0,
          currency: 'USD',
        },
      },
      receiptStore: store,
      identityReader,
      spendTracker,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));

    try {
      const first = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 300 },
      });
      expect(first.allowed).toBe(true);

      // Advance 3 hours — session should NOT reset because timeout is disabled
      vi.advanceTimersByTime(180 * 60 * 1000);

      const second = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 200 },
      });
      expect(second.allowed).toBe(true);
      expect(second.spendSnapshot?.sessionTotal).toBe(500);
    } finally {
      vi.useRealTimers();
      engine.dispose();
      store.close();
    }
  });

  it('should apply updated session timeout on policy hot-reload', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'hotreload-agent',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const engine = new GuardEngine({
      policy: {
        ...POLICY,
        spend_limits: {
          session_max: 600,
          daily_max: 700,
          session_timeout_minutes: 0,
          currency: 'USD',
        },
      },
      receiptStore: store,
      identityReader,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));

    try {
      // Initial spend — timeout is disabled (0), so no reset expected
      const first = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 300 },
      });
      expect(first.allowed).toBe(true);

      // Advance 2 hours — session stays because timeout is disabled
      vi.advanceTimersByTime(120 * 60 * 1000);

      const beforeReload = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 100 },
      });
      expect(beforeReload.allowed).toBe(true);
      expect(beforeReload.spendSnapshot?.sessionTotal).toBe(400);

      // Simulate hot-reload by invoking the engine update path directly.
      (engine as unknown as { updatePolicy(policy: GuardPolicy): void }).updatePolicy({
        ...POLICY,
        spend_limits: {
          session_max: 600,
          daily_max: 700,
          session_timeout_minutes: 10,
          currency: 'USD',
        },
      });

      // Advance 11 minutes — past the new 10-minute timeout
      vi.advanceTimersByTime(11 * 60 * 1000);

      const afterReload = await engine.evaluate({
        toolName: 'book_flight',
        params: { amount: 50 },
      });
      expect(afterReload.allowed).toBe(true);
      // Session should have reset due to the newly active timeout
      expect(afterReload.spendSnapshot?.sessionTotal).toBe(50);
    } finally {
      vi.useRealTimers();
      engine.dispose();
      store.close();
    }
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
    expect(preview.identity).not.toHaveProperty('rawToken');
    expect(preview.preview?.reason).toContain('daily spend limit of 500.00 USD');
    expect(preview.preview?.spendSnapshot?.sessionTotal).toBe(550);
    expect(preview.preview?.spendSnapshot?.dailyTotal).toBe(550);

    engine.dispose();
    store.close();
  });

  it('should serialize concurrent evaluate() calls for the same agent and enforce spend limits', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const spendTracker = new SpendTracker();
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => ({
        classification: 'verified',
        agentId: 'concurrent-agent',
        ownerId: 'owner-1',
        capabilities: ['book_flight'],
        rawToken: 'token',
      }),
    };
    const engine = new GuardEngine({
      policy: {
        ...POLICY,
        spend_limits: { session_max: 500, daily_max: 1000, currency: 'USD' },
      },
      receiptStore: store,
      identityReader,
      spendTracker,
      silent: true,
      spendExtractor: (params) => (params as { amount: number }).amount,
      transactionResolver: () => false,
    });

    const [first, second] = await Promise.all([
      engine.evaluate({ toolName: 'book_flight', params: { amount: 300 } }),
      engine.evaluate({ toolName: 'book_flight', params: { amount: 300 } }),
    ]);

    const passed = [first, second].filter((r) => r.allowed);
    const blocked = [first, second].filter((r) => !r.allowed);
    const [passedResult] = passed;
    const [blockedResult] = blocked;

    expect(passed).toHaveLength(1);
    expect(blocked).toHaveLength(1);
    expect(blockedResult).toBeDefined();
    expect(passedResult).toBeDefined();
    expect(blockedResult?.statusCode).toBe(403);
    expect(passedResult?.identity).not.toHaveProperty('rawToken');
    expect(
      [first.spendSnapshot?.sessionTotal, second.spendSnapshot?.sessionTotal].filter(
        (t): t is number => t !== undefined,
      ),
    ).toContain(300);

    engine.dispose();
    store.close();
  });

  it('should not block concurrent evaluate() calls for different agents', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);

    let agentCallCount = 0;
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => {
        agentCallCount++;
        return {
          classification: 'verified',
          agentId: `agent-${agentCallCount}`,
          ownerId: 'owner-1',
          capabilities: ['search_flights'],
          rawToken: 'token',
        };
      },
    };
    const engine = new GuardEngine({
      policy: POLICY,
      receiptStore: store,
      identityReader,
      silent: true,
    });

    const results = await Promise.all([
      engine.evaluate({ toolName: 'search_flights', params: { q: 'A' } }),
      engine.evaluate({ toolName: 'search_flights', params: { q: 'B' } }),
      engine.evaluate({ toolName: 'search_flights', params: { q: 'C' } }),
    ]);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.allowed).toBe(true);
      expect(result.identity).not.toHaveProperty('rawToken');
    }

    engine.dispose();
    store.close();
  });
});
