import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptStore } from '../../src/core/receipt-store.js';
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
  },
  rate_limits: {
    requests_per_minute: 10,
    transactions_per_day: 1,
  },
};

function createStore(): {
  readonly tempDir: string;
  readonly store: ReceiptStore;
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'agentguard-engine-'));
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

  it('should fail closed and log when transactionResolver throws', () => {
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

    const first = engine.evaluate({
      toolName: 'search_flights',
      params: { q: 'CAI' },
    });
    const second = engine.evaluate({
      toolName: 'search_flights',
      params: { q: 'CAI' },
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.statusCode).toBe(429);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[agentguard] transactionResolver failed closed: boom',
    );

    consoleErrorSpy.mockRestore();
    engine.dispose();
    store.close();
  });
});
