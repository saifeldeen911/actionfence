import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { ReceiptStore } from '../../src/core/receipt-store.js';
import { MemoryAdapter } from '../../src/storage/memory-adapter.js';
import type { StorageAdapter } from '../../src/storage/adapter.js';
import type { AgentIdentity } from '../../src/types/identity.js';
import type { EvaluationDecision } from '../../src/types/decision.js';

const FIXED_SECRET = Buffer.alloc(32, 9).toString('base64url');

function makeIdentity(agentId = 'agent-123'): AgentIdentity {
  return {
    classification: 'verified',
    agentId,
    ownerId: 'owner-456',
    capabilities: ['book_flight'],
    rawToken: 'token',
  };
}

function makeDecision(overrides: Partial<EvaluationDecision> = {}): EvaluationDecision {
  return {
    status: 'PASSED',
    action: 'book_flight',
    toolName: 'book_flight',
    identityTier: 'verified',
    reason: null,
    spendAmount: 120,
    requiresHumanApproval: false,
    timestamp: '2026-05-06T20:00:00.000Z',
    durationMs: 2,
    ...overrides,
  };
}

function createTempStore(): {
  tempDir: string;
  databasePath: string;
  store: ReceiptStore;
} {
  const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-store-'));
  const databasePath = join(tempDir, 'receipts.db');
  const store = new ReceiptStore({
    databasePath,
    signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
  });

  return { tempDir, databasePath, store };
}

describe('ReceiptStore', () => {
  it('should bootstrap the SQLite schema on first open', () => {
    const { databasePath, store, tempDir } = createTempStore();

    expect(existsSync(databasePath)).toBe(true);

    void store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should insert and read back receipts', async () => {
    const { store, tempDir } = createTempStore();
    const receipt = await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'guard-policy.json v1.0',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const storedReceipt = await store.getById(receipt.receipt_id);
    const byAgent = await store.listByAgent('agent-123');

    expect(storedReceipt).not.toBeNull();
    expect(storedReceipt?.receipt_hash).toBe(receipt.receipt_hash);
    expect(byAgent).toHaveLength(1);
    expect(byAgent[0]?.receipt_id).toBe(receipt.receipt_id);

    await store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return the last receipt hash', async () => {
    const { store, tempDir } = createTempStore();

    expect(await store.getLastHash()).toBe('');

    const first = await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    const second = await store.insert({
      decision: makeDecision({ action: 'cancel_booking', toolName: 'cancel_booking' }),
      identity: makeIdentity(),
      params: { bookingId: 'bk_123' },
      policyRef: 'policy',
      receiptId: 'receipt-2',
      timestamp: '2026-05-06T20:01:00.000Z',
    });

    expect(await store.getLastHash()).toBe(second.receipt_hash);
    expect(second.prev_hash).toBe(first.receipt_hash);

    await store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reject duplicate receipt ids', async () => {
    const { store, tempDir } = createTempStore();

    await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-duplicate',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    await expect(
      store.insert({
        decision: makeDecision(),
        identity: makeIdentity(),
        params: { itinerary: 'CAI-LHR' },
        policyRef: 'policy',
        receiptId: 'receipt-duplicate',
        timestamp: '2026-05-06T20:01:00.000Z',
      }),
    ).rejects.toThrow();

    await store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reopen an existing database', async () => {
    const { store, databasePath, tempDir } = createTempStore();
    const receipt = await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-reopen',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    await store.close();

    const reopenedStore = new ReceiptStore({
      databasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
    });

    const found = await reopenedStore.getById(receipt.receipt_id);
    expect(found?.receipt_hash).toBe(receipt.receipt_hash);

    await reopenedStore.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should fall back to the legacy database path when the default is missing', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-store-'));
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    const legacyDatabasePath = join(tempDir, '.agentguard', 'receipts.db');
    const legacyStore = new ReceiptStore({
      databasePath: legacyDatabasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key-legacy') },
    });

    const receipt = await legacyStore.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-legacy-db',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    await legacyStore.close();

    const reopenedStore = new ReceiptStore({
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key-default') },
    });

    const found = await reopenedStore.getById(receipt.receipt_id);
    expect(found?.receipt_hash).toBe(receipt.receipt_hash);

    await reopenedStore.close();
    cwdSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should verify a valid chain successfully', async () => {
    const { store, tempDir } = createTempStore();

    await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    await store.insert({
      decision: makeDecision({ action: 'cancel_booking', toolName: 'cancel_booking' }),
      identity: makeIdentity(),
      params: { bookingId: 'bk_123' },
      policyRef: 'policy',
      receiptId: 'receipt-2',
      timestamp: '2026-05-06T20:01:00.000Z',
    });

    expect(await store.verifyChain()).toEqual({
      valid: true,
      checkedCount: 2,
    });

    await store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect tampering in stored payload data', async () => {
    const { store, databasePath, tempDir } = createTempStore();
    const receipt = await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-tampered',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    await store.close();

    const db = new Database(databasePath);
    db.prepare('UPDATE receipts SET payload_json = ? WHERE receipt_id = ?').run(
      '{"itinerary":"CAI-JFK"}',
      receipt.receipt_id,
    );
    db.close();

    const reopenedStore = new ReceiptStore({
      databasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
    });

    expect(await reopenedStore.verifyChain()).toEqual({
      valid: false,
      checkedCount: 1,
      brokenReceiptId: receipt.receipt_id,
      reason: 'PAYLOAD_HASH_MISMATCH',
    });

    await reopenedStore.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should work with a custom MemoryAdapter', async () => {
    const adapter = new MemoryAdapter();
    const store = new ReceiptStore({
      adapter,
      signerOptions: { secret: FIXED_SECRET },
    });

    const receipt = await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-mem-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    expect(adapter.size).toBe(1);
    expect(await store.getById(receipt.receipt_id)).not.toBeNull();
    expect(await store.verifyChain()).toEqual({ valid: true, checkedCount: 1 });

    await store.close();
    // MemoryAdapter.close() is a no-op — adapter should still be usable
    expect(adapter.size).toBe(1);
  });

  it('should prefer insertAtomic when the adapter provides it', async () => {
    const insertAtomic = vi.fn(
      async (
        buildReceipt: (
          prevHash: string,
        ) => ReturnType<ReceiptStore['insert']> extends Promise<infer Receipt> ? Receipt : never,
      ) => {
        return buildReceipt('atomic-prev');
      },
    );
    const adapter: StorageAdapter = {
      insert: vi.fn(),
      insertAtomic,
      getLastHash: vi.fn(),
      getById: vi.fn(),
      listByAgent: vi.fn(),
      count: vi.fn(),
      query: vi.fn(),
      getAllOrdered: vi.fn(),
      close: vi.fn(),
    };
    const store = new ReceiptStore({
      adapter,
      signerOptions: { secret: FIXED_SECRET },
    });

    const receipt = await store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-atomic',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    expect(insertAtomic).toHaveBeenCalledTimes(1);
    expect(adapter.getLastHash).not.toHaveBeenCalled();
    expect(adapter.insert).not.toHaveBeenCalled();
    expect(receipt.prev_hash).toBe('atomic-prev');

    await store.close();
  });
});
