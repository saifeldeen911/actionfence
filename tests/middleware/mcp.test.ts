import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptStore } from '../../src/core/receipt-store.js';
import { withGuard, type McpToolHandler, type McpToolResult } from '../../src/middleware/mcp.js';
import type { StorageAdapter } from '../../src/storage/adapter.js';
import type { GuardPolicy } from '../../src/types/policy.js';

const FIXED_SECRET = Buffer.alloc(32, 7).toString('base64url');

const POLICY: GuardPolicy = {
  service: 'MiddlewareTest',
  version: '1.0',
  default_rule: 'deny',
  actions: {
    search_flights: { allowed: true, identity: 'any' },
    bulk_booking: { allowed: false },
  },
  rate_limits: {
    requests_per_minute: 10,
    transactions_per_day: 2,
  },
};

class FakeMcpServer {
  readonly handlers = new Map<string, McpToolHandler>();

  registerTool(name: string, _config: unknown, handler: McpToolHandler): unknown {
    this.handlers.set(name, handler);
    return { name };
  }
}

function createStore(): {
  readonly tempDir: string;
  readonly store: ReceiptStore;
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-mcp-'));
  const store = new ReceiptStore({
    databasePath: join(tempDir, 'receipts.db'),
    signerOptions: {
      secret: FIXED_SECRET,
      keyFilePath: join(tempDir, 'key'),
    },
  });
  return { tempDir, store };
}

function createFailingStore(): {
  readonly tempDir: string;
  readonly store: ReceiptStore;
  readonly adapter: StorageAdapter;
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-mcp-fail-'));
  const adapter = {
    insert: vi.fn(async () => {
      throw new Error('receipt insert failed');
    }),
    getLastHash: vi.fn().mockResolvedValue(''),
    getById: vi.fn().mockResolvedValue(null),
    listByAgent: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    query: vi.fn().mockResolvedValue([]),
    getAllOrdered: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  } satisfies StorageAdapter;
  const store = new ReceiptStore({
    adapter,
    signerOptions: {
      secret: FIXED_SECRET,
      keyFilePath: join(tempDir, 'key'),
    },
  });

  return { tempDir, store, adapter };
}

function parseResult(result: unknown): unknown {
  const toolResult = result as McpToolResult;
  return JSON.parse(toolResult.content[0]?.text ?? 'null') as unknown;
}

describe('withGuard', () => {
  let cleanupDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of cleanupDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    cleanupDirs = [];
  });

  it('should pass allowed MCP tool calls to the original handler and store a receipt', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const server = new FakeMcpServer();
    const instance = withGuard(server, {
      policy: POLICY,
      receiptStore: store,
      silent: true,
    });
    const handler = vi.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }));

    server.registerTool('search_flights', {}, handler);
    const result = await server.handlers.get('search_flights')?.({ q: 'CAI' }, {});

    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
    expect(handler).toHaveBeenCalledWith({ q: 'CAI' }, {});

    const receipts = await store.listByAgent('anonymous');
    expect(receipts).toHaveLength(1);
    expect(receipts[0]?.action).toBe('search_flights');
    expect(receipts[0]?.status).toBe('PASSED');

    instance.dispose();
    await store.close();
  });

  it('should block denied MCP tool calls without invoking the handler', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const server = new FakeMcpServer();
    const instance = withGuard(server, {
      policy: POLICY,
      receiptStore: store,
      silent: true,
    });
    const handler = vi.fn();

    server.registerTool('bulk_booking', {}, handler);
    const result = await server.handlers.get('bulk_booking')?.({ count: 10 }, {});
    const body = parseResult(result) as { error: { code: string; receiptId: string } };

    expect((result as McpToolResult).isError).toBe(true);
    expect(body.error.code).toBe('ACTIONFENCE_BLOCKED');
    expect(body.error.receiptId).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
    expect((await store.getById(body.error.receiptId))?.status).toBe('BLOCKED');

    instance.dispose();
    await store.close();
  });

  it('should return an MCP error and skip the handler when receipt storage fails in block mode', async () => {
    const { tempDir, store, adapter } = createFailingStore();
    cleanupDirs.push(tempDir);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const server = new FakeMcpServer();
    const instance = withGuard(server, {
      policy: POLICY,
      receiptStore: store,
      silent: true,
      receiptFailureMode: 'block',
    });
    const handler = vi.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] }));

    server.registerTool('search_flights', {}, handler);
    const result = await server.handlers.get('search_flights')?.({ q: 'CAI' }, {});
    const body = parseResult(result) as { error: { code: string; receiptId: string | null } };

    expect((result as McpToolResult).isError).toBe(true);
    expect(body.error.code).toBe('ACTIONFENCE_RECEIPT_PERSISTENCE_FAILED');
    expect(body.error.receiptId).toBeNull();
    expect(handler).not.toHaveBeenCalled();
    expect(adapter.insert).toHaveBeenCalledTimes(1);

    instance.dispose();
    await store.close();
  });

  it('should return simulation previews without calling handlers or writing receipts', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const server = new FakeMcpServer();
    const instance = withGuard(server, {
      policy: POLICY,
      receiptStore: store,
      silent: true,
      simulate: true,
    });
    const handler = vi.fn();

    server.registerTool('search_flights', {}, handler);
    const result = await server.handlers.get('search_flights')?.({ q: 'CAI' }, {});
    const preview = parseResult(result) as { simulation: boolean; receiptStored: boolean };

    expect((result as McpToolResult).isError).toBe(false);
    expect(preview.simulation).toBe(true);
    expect(preview.receiptStored).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    expect(await store.getLastHash()).toBe('');

    instance.dispose();
    await store.close();
  });

  it('should restore registerTool on dispose', async () => {
    const { tempDir, store } = createStore();
    cleanupDirs.push(tempDir);
    const server = new FakeMcpServer();
    const originalRegisterTool = server.registerTool;
    const instance = withGuard(server, {
      policy: POLICY,
      receiptStore: store,
      silent: true,
    });

    expect(server.registerTool).not.toBe(originalRegisterTool);
    instance.dispose();
    expect(server.registerTool).toBe(originalRegisterTool);
    await store.close();
  });
});
