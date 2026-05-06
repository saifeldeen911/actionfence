import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { ReceiptStore } from '../../src/core/receipt-store.js';
import type { AgentIdentity } from '../../src/types/identity.js';
import type { EvaluationDecision } from '../../src/types/decision.js';

const FIXED_SECRET = Buffer.alloc(32, 7).toString('base64url');

function makeIdentity(): AgentIdentity {
  return {
    classification: 'verified',
    agentId: 'agent-load',
    ownerId: 'owner-load',
    capabilities: ['book_flight'],
    rawToken: 'token',
  };
}

function makeDecision(index: number): EvaluationDecision {
  return {
    status: 'PASSED',
    action: 'book_flight',
    toolName: 'book_flight',
    identityTier: 'verified',
    reason: null,
    spendAmount: index,
    requiresHumanApproval: false,
    timestamp: new Date(Date.UTC(2026, 4, 6, 20, 0, index % 60)).toISOString(),
    durationMs: 1,
  };
}

describe('receipt chain integrity', () => {
  it('should verify 1000+ receipts and detect tampering at the first broken record', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'agent-bouncer-chain-'));
    const databasePath = join(tempDir, 'receipts.db');
    const store = new ReceiptStore({
      databasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
    });

    const insertedIds: string[] = [];
    for (let index = 0; index < 1005; index++) {
      const receipt = store.insert({
        decision: makeDecision(index),
        identity: makeIdentity(),
        params: {
          flightId: `flight-${index}`,
          seats: index % 5,
          meta: { index, batch: 'load-test' },
        },
        policyRef: 'bouncer-policy.json v1.0',
        receiptId: `receipt-${index}`,
      });
      insertedIds.push(receipt.receipt_id);
    }

    expect(store.verifyChain()).toEqual({
      valid: true,
      checkedCount: 1005,
    });
    store.close();

    const tamperedId = insertedIds[500];
    const db = new Database(databasePath);
    db.prepare('UPDATE receipts SET payload_json = ? WHERE receipt_id = ?')
      .run('{"tampered":true}', tamperedId);
    db.close();

    const reopenedStore = new ReceiptStore({
      databasePath,
      signerOptions: { secret: FIXED_SECRET, keyFilePath: join(tempDir, 'key') },
    });

    expect(reopenedStore.verifyChain()).toEqual({
      valid: false,
      checkedCount: 501,
      brokenReceiptId: tamperedId,
      reason: 'PAYLOAD_HASH_MISMATCH',
    });

    reopenedStore.close();
    rmSync(tempDir, { recursive: true, force: true });
  });
});
