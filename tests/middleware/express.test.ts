import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptStore } from '../../src/core/receipt-store.js';
import {
  guard,
  type GuardHttpRequest,
  type GuardHttpResponse,
} from '../../src/middleware/express.js';
import type { GuardPolicy } from '../../src/types/policy.js';

const FIXED_SECRET = Buffer.alloc(32, 8).toString('base64url');

const POLICY: GuardPolicy = {
  service: 'ExpressTest',
  version: '1.0',
  default_rule: 'deny',
  actions: {
    search_flights: { allowed: true, identity: 'any' },
    bulk_booking: { allowed: false },
  },
  rate_limits: {
    requests_per_minute: 5,
  },
};

class FakeResponse implements GuardHttpResponse {
  statusCode = 200;
  body: unknown;
  headers: Record<string, string> = {};
  headersSent = false;

  status(code: number): GuardHttpResponse {
    this.statusCode = code;
    return this;
  }

  json(body: unknown): unknown {
    this.body = body;
    this.headersSent = true;
    return this;
  }

  setHeader(field: string, value: string): void {
    this.headers[field] = value;
  }

  getHeader(field: string): string | undefined {
    return this.headers[field];
  }
}

class SendOnlyResponse implements GuardHttpResponse {
  statusCode = 200;
  body: unknown;
  headers: Record<string, string> = {};

  status(code: number): GuardHttpResponse {
    this.statusCode = code;
    return this;
  }

  send(body: unknown): unknown {
    this.body = body;
    return body;
  }

  setHeader(field: string, value: string): void {
    this.headers[field] = value;
  }

  getHeader(field: string): string | undefined {
    return this.headers[field];
  }
}

function createStore(): {
  readonly tempDir: string;
  readonly store: ReceiptStore;
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-http-'));
  const store = new ReceiptStore({
    databasePath: join(tempDir, 'receipts.db'),
    signerOptions: {
      secret: FIXED_SECRET,
      keyFilePath: join(tempDir, 'key'),
    },
  });
  return { tempDir, store };
}

function makeRequest(overrides: Partial<GuardHttpRequest> = {}): GuardHttpRequest {
  return {
    method: 'GET',
    path: '/search',
    params: {},
    query: { q: 'CAI' },
    body: null,
    headers: {},
    ...overrides,
  };
}

function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

describe('guard Express middleware', () => {
  let cleanupDirs: string[] = [];

  afterEach(() => {
    for (const dir of cleanupDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    cleanupDirs = [];
  });

  it('should call next for allowed HTTP requests and store a sanitized receipt payload', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const middleware = guard({
      policy: POLICY,
      receiptStore: store,
      silent: true,
      actionResolver: () => 'search_flights',
    });
    const req = makeRequest({
      headers: { authorization: `Bearer ${makeUnsignedJwt({ sub: 'agent-http' })}` },
    });
    const res = new FakeResponse();
    const next = vi.fn();

    middleware(req, res, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith();
    expect(res.headersSent).toBe(false);

    const receipts = store.listByAgent('agent-http');
    expect(receipts).toHaveLength(1);
    expect(receipts[0]?.status).toBe('PASSED');
    expect(receipts[0]?.payload_json).toContain('"path":"/search"');
    expect(receipts[0]?.payload_json).not.toContain('authorization');

    store.close();
    middleware.dispose();
  });

  it('should return structured JSON for blocked HTTP requests', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const middleware = guard({
      policy: POLICY,
      receiptStore: store,
      silent: true,
      actionResolver: () => 'bulk_booking',
    });
    const res = new FakeResponse();
    const next = vi.fn();

    middleware(makeRequest(), res, next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      error: {
        code: 'ACTIONFENCE_BLOCKED',
        action: 'bulk_booking',
        receiptId: expect.any(String),
      },
    });

    store.close();
    middleware.dispose();
  });

  it('should return simulation previews without calling next or writing receipts', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const middleware = guard({
      policy: POLICY,
      receiptStore: store,
      silent: true,
      simulate: true,
      actionResolver: () => 'search_flights',
    });
    const res = new FakeResponse();
    const next = vi.fn();

    middleware(makeRequest(), res, next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['X-ActionFence-Simulation']).toBe('true');
    expect(res.body).toMatchObject({
      simulation: true,
      wouldExecute: true,
      receiptStored: false,
    });
    expect(store.getLastHash()).toBe('');

    store.close();
    middleware.dispose();
  });

  it('should set JSON content type when falling back to send', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const middleware = guard({
      policy: POLICY,
      receiptStore: store,
      silent: true,
      actionResolver: () => 'bulk_booking',
    });
    const res = new SendOnlyResponse();
    const next = vi.fn();

    middleware(makeRequest(), res, next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('ACTIONFENCE_BLOCKED');
    expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8');

    store.close();
    middleware.dispose();
  });

  it('should strip query strings from fallback HTTP paths before resolving actions', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const middleware = guard({
      policy: {
        ...POLICY,
        actions: {
          ...POLICY.actions,
          'GET /flights': { allowed: true, identity: 'any' },
        },
      },
      receiptStore: store,
      silent: true,
    });
    const res = new FakeResponse();
    const next = vi.fn();

    middleware(
      makeRequest({
        path: undefined,
        originalUrl: '/flights?origin=LAX&destination=JFK',
      }),
      res,
      next,
    );
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith();
    expect(res.headersSent).toBe(false);

    store.close();
    middleware.dispose();
  });
});
