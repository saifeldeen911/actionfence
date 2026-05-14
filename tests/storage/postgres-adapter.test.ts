import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresAdapter } from '../../src/storage/postgres-adapter.js';
import type { ActionReceipt } from '../../src/types/receipt.js';

const mockQuery = vi.fn();
const mockEnd = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockQuery,
      end: mockEnd,
    })),
    default: {
      Pool: vi.fn().mockImplementation(() => ({
        query: mockQuery,
        end: mockEnd,
      })),
    },
  };
});

function createDummyReceipt(id: string): ActionReceipt {
  return {
    receipt_id: id,
    timestamp: '2026-05-10T00:00:00.000Z',
    agent_id: 'agent-1',
    owner_id: null,
    action: 'test_action',
    tool_name: 'test_tool',
    payload_json: '{}',
    payload_json_hash: `jsonhash-${id}`,
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

describe('PostgresAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('should run migration on create', async () => {
    await PostgresAdapter.create({ connectionString: 'postgres://localhost' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toContain('CREATE TABLE IF NOT EXISTS actionfence_receipts');
  });

  it('should parameterize insert correctly', async () => {
    const adapter = await PostgresAdapter.create({ autoMigrate: false });
    mockQuery.mockClear();

    const receipt = createDummyReceipt('r-1');
    await adapter.insert(receipt);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0]?.[0];
    const values = mockQuery.mock.calls[0]?.[1];
    
    expect(sql).toContain('INSERT INTO actionfence_receipts');
    expect(values).toEqual([
      'r-1',
      '2026-05-10T00:00:00.000Z',
      'agent-1',
      null,
      'test_action',
      'test_tool',
      '{}',
      'jsonhash-r-1',
      'hash-r-1',
      'v1',
      'PASSED',
      null,
      'anonymous',
      null,
      'prev',
      'rhash-r-1',
      'sig',
    ]);
  });

  it('should get last hash', async () => {
    const adapter = await PostgresAdapter.create({ autoMigrate: false });
    
    mockQuery.mockResolvedValueOnce({ rows: [{ receipt_hash: 'rhash-latest' }] });
    const hash = await adapter.getLastHash();
    expect(hash).toBe('rhash-latest');
    
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const emptyHash = await adapter.getLastHash();
    expect(emptyHash).toBe('');
  });

  it('should build where clause for query', async () => {
    const adapter = await PostgresAdapter.create({ autoMigrate: false });
    mockQuery.mockClear();

    await adapter.query({ status: 'BLOCKED', agentId: 'agent-1' }, 10);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0]?.[0];
    const values = mockQuery.mock.calls[0]?.[1];

    expect(sql).toContain('WHERE agent_id = $1 AND status = $2 ORDER BY');
    expect(sql).toContain('LIMIT $3');
    expect(values).toEqual(['agent-1', 'BLOCKED', 10]);
  });

  it('should call pool.end on close', async () => {
    const adapter = await PostgresAdapter.create({ autoMigrate: false });
    await adapter.close();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
