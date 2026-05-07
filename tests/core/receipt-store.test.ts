import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { ReceiptStore } from '../../src/core/receipt-store.js';
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

function makeDecision(
  overrides: Partial<EvaluationDecision> = {},
): EvaluationDecision {
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

    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should insert and read back receipts', () => {
    const { store, tempDir } = createTempStore();
    const receipt = store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'guard-policy.json v1.0',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const storedReceipt = store.getById(receipt.receipt_id);
    const byAgent = store.listByAgent('agent-123');

    expect(storedReceipt).not.toBeNull();
    expect(storedReceipt?.receipt_hash).toBe(receipt.receipt_hash);
    expect(byAgent).toHaveLength(1);
    expect(byAgent[0]?.receipt_id).toBe(receipt.receipt_id);

    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return the last receipt hash', () => {
    const { store, tempDir } = createTempStore();

    expect(store.getLastHash()).toBe('');

    const first = store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    const second = store.insert({
      decision: makeDecision({ action: 'cancel_booking', toolName: 'cancel_booking' }),
      identity: makeIdentity(),
      params: { bookingId: 'bk_123' },
      policyRef: 'policy',
      receiptId: 'receipt-2',
      timestamp: '2026-05-06T20:01:00.000Z',
    });

    expect(store.getLastHash()).toBe(second.receipt_hash);
    expect(second.prev_hash).toBe(first.receipt_hash);

    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reject duplicate receipt ids', () => {
    const { store, tempDir } = createTempStore();

    store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-duplicate',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    expect(() =>
      store.insert({
        decision: makeDecision(),
        identity: makeIdentity(),
        params: { itinerary: 'CAI-LHR' },
        policyRef: 'policy',
        receiptId: 'receipt-duplicate',
        timestamp: '2026-05-06T20:01:00.000Z',
      }),
    ).toThrow();

    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reopen an existing database', () => {
    const { store, databasePath, tempDir } = createTempStore();
    const receipt = store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-reopen',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    store.close();

    const reopenedStore = new ReceiptStore({
      databasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
    });

    expect(reopenedStore.getById(receipt.receipt_id)?.receipt_hash).toBe(receipt.receipt_hash);

    reopenedStore.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should verify a valid chain successfully', () => {
    const { store, tempDir } = createTempStore();

    store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    store.insert({
      decision: makeDecision({ action: 'cancel_booking', toolName: 'cancel_booking' }),
      identity: makeIdentity(),
      params: { bookingId: 'bk_123' },
      policyRef: 'policy',
      receiptId: 'receipt-2',
      timestamp: '2026-05-06T20:01:00.000Z',
    });

    expect(store.verifyChain()).toEqual({
      valid: true,
      checkedCount: 2,
    });

    store.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect tampering in stored payload data', () => {
    const { store, databasePath, tempDir } = createTempStore();
    const receipt = store.insert({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'policy',
      receiptId: 'receipt-tampered',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    store.close();

    const db = new Database(databasePath);
    db.prepare('UPDATE receipts SET payload_json = ? WHERE receipt_id = ?')
      .run('{"itinerary":"CAI-JFK"}', receipt.receipt_id);
    db.close();

    const reopenedStore = new ReceiptStore({
      databasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
    });

    expect(reopenedStore.verifyChain()).toEqual({
      valid: false,
      checkedCount: 1,
      brokenReceiptId: receipt.receipt_id,
      reason: 'PAYLOAD_HASH_MISMATCH',
    });

    reopenedStore.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
});
