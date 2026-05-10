import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SQLiteAdapter } from '../../src/storage/sqlite-adapter.js';
import type { ActionReceipt } from '../../src/types/receipt.js';

function createDummyReceipt(id: string): ActionReceipt {
  return {
    receipt_id: id,
    timestamp: new Date().toISOString(),
    agent_id: 'agent-1',
    owner_id: null,
    action: 'test_action',
    tool_name: 'test_tool',
    payload_json: '{}',
    payload_hash: `hash-${id}`,
    policy_ref: 'v1',
    status: 'PASSED',
    block_reason: null,
    identity_tier: 'anonymous',
    spend_amount: null,
    prev_hash: 'prev',
    receipt_hash: `rhash-${id}`,
    receipt_sig: 'sig',
  };
}

describe('SQLiteAdapter', () => {
  let tempDir: string;
  let dbPath: string;
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'actionfence-sqlite-'));
    dbPath = join(tempDir, 'test.db');
    adapter = new SQLiteAdapter({ databasePath: dbPath });
  });

  afterEach(() => {
    adapter.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should initialize schema and insert a receipt', () => {
    const receipt = createDummyReceipt('r-1');
    adapter.insert(receipt);
    
    const fetched = adapter.getById('r-1');
    expect(fetched).toEqual(receipt);
  });

  it('should throw on duplicate receipt_id', () => {
    const receipt = createDummyReceipt('r-1');
    adapter.insert(receipt);
    
    const duplicateId = { ...receipt, receipt_hash: 'rhash-r-1-diff' };
    expect(() => adapter.insert(duplicateId)).toThrow(/Duplicate receipt_id/);
  });

  it('should throw on duplicate receipt_hash', () => {
    const receipt = createDummyReceipt('r-1');
    adapter.insert(receipt);
    
    const duplicateHash = { ...receipt, receipt_id: 'r-1-diff' };
    expect(() => adapter.insert(duplicateHash)).toThrow(/Duplicate receipt_hash/);
  });

  it('should return the last hash', () => {
    expect(adapter.getLastHash()).toBe('');

    adapter.insert(createDummyReceipt('r-1'));
    expect(adapter.getLastHash()).toBe('rhash-r-1');

    adapter.insert(createDummyReceipt('r-2'));
    expect(adapter.getLastHash()).toBe('rhash-r-2');
  });

  it('should list by agent in insertion order', () => {
    const r1 = createDummyReceipt('r-1');
    const r2 = createDummyReceipt('r-2');
    r2.agent_id = 'agent-2';
    const r3 = createDummyReceipt('r-3');

    adapter.insert(r1);
    adapter.insert(r2);
    adapter.insert(r3);

    const agent1Receipts = adapter.listByAgent('agent-1');
    expect(agent1Receipts).toHaveLength(2);
    expect(agent1Receipts[0]?.receipt_id).toBe('r-1');
    expect(agent1Receipts[1]?.receipt_id).toBe('r-3');
  });

  it('should count and query with filters', () => {
    const r1 = createDummyReceipt('r-1');
    r1.status = 'PASSED';
    const r2 = createDummyReceipt('r-2');
    r2.status = 'BLOCKED';
    
    adapter.insert(r1);
    adapter.insert(r2);

    expect(adapter.count()).toBe(2);
    expect(adapter.count({ status: 'PASSED' })).toBe(1);

    const queryRes = adapter.query({ status: 'BLOCKED' });
    expect(queryRes).toHaveLength(1);
    expect(queryRes[0]?.receipt_id).toBe('r-2');
  });

  it('should get all ordered', () => {
    const r1 = createDummyReceipt('r-1');
    const r2 = createDummyReceipt('r-2');
    
    adapter.insert(r1);
    adapter.insert(r2);

    const all = adapter.getAllOrdered();
    expect(all).toHaveLength(2);
    expect(all[0]?.receipt_id).toBe('r-1');
    expect(all[1]?.receipt_id).toBe('r-2');
  });
});
