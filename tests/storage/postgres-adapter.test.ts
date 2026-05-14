import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresAdapter } from '../../src/storage/postgres-adapter.js';
import type { ActionReceipt } from '../../src/types/receipt.js';

const mockQuery = vi.fn();
const mockEnd = vi.fn();
const mockClientQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn();
const mockPoolConstructor = vi.fn().mockImplementation(() => ({
  query: mockQuery,
  end: mockEnd,
  connect: mockConnect,
}));

vi.mock('pg', () => {
  return {
    Pool: mockPoolConstructor,
    default: {
      Pool: mockPoolConstructor,
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
    mockQuery.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
    mockClientQuery.mockResolvedValue({ rows: [] });
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
  });

  it('should run migration on create', async () => {
    await PostgresAdapter.create({ connectionString: 'postgres://localhost' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toContain(
      'CREATE TABLE IF NOT EXISTS actionfence_receipts',
    );
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

  it('should sanitize credentials in initialization error messages', async () => {
    mockPoolConstructor.mockImplementationOnce(() => {
      throw new Error('connect failed for postgres://user:secret@db.example/app');
    });

    let caughtError: unknown;
    try {
      await PostgresAdapter.create({ connectionString: 'postgres://user:secret@db.example/app' });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    const error = caughtError as Error & { cause?: unknown };
    expect(error.message).toContain('postgres://user:***@db.example/app');
    expect(error.message).not.toContain('secret');
    expect(error).not.toHaveProperty('cause');
  });

  it('should preserve useful messages for non-credential errors', async () => {
    mockPoolConstructor.mockImplementationOnce(() => {
      throw new Error('database not ready');
    });

    let caughtError: unknown;
    try {
      await PostgresAdapter.create({ connectionString: 'postgres://user@db.example/app' });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    const error = caughtError as Error;
    expect(error.message).toContain('database not ready');
  });

  it('should atomically insert receipts with an advisory lock', async () => {
    const adapter = await PostgresAdapter.create({ autoMigrate: false });

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ receipt_hash: 'rhash-prev' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const receipt = createDummyReceipt('r-atomic');
    const builtReceipt = { ...receipt, prev_hash: 'rhash-prev' };

    const result = await adapter.insertAtomic((prevHash) => ({
      ...builtReceipt,
      prev_hash: prevHash,
    }));

    expect(result.prev_hash).toBe('rhash-prev');
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClientQuery).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_advisory_xact_lock($1)',
      [0x416374696f6e],
    );
    expect(mockClientQuery).toHaveBeenNthCalledWith(
      3,
      'SELECT receipt_hash FROM actionfence_receipts ORDER BY created_at DESC, receipt_id DESC LIMIT 1',
    );
    expect(mockClientQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO actionfence_receipts'),
      [
        'r-atomic',
        '2026-05-10T00:00:00.000Z',
        'agent-1',
        null,
        'test_action',
        'test_tool',
        '{}',
        'jsonhash-r-atomic',
        'hash-r-atomic',
        'v1',
        'PASSED',
        null,
        'anonymous',
        null,
        'rhash-prev',
        'rhash-r-atomic',
        'sig',
      ],
    );
    expect(mockClientQuery).toHaveBeenNthCalledWith(5, 'COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('should roll back atomic inserts on failure', async () => {
    const adapter = await PostgresAdapter.create({ autoMigrate: false });

    const insertError = Object.assign(new Error('duplicate receipt'), {
      code: '23505',
      constraint: 'actionfence_receipts_receipt_hash_key',
    });

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ receipt_hash: 'rhash-prev' }] })
      .mockRejectedValueOnce(insertError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      adapter.insertAtomic((prevHash) => ({
        ...createDummyReceipt('r-fail'),
        prev_hash: prevHash,
      })),
    ).rejects.toThrow(/Duplicate receipt_hash/);

    expect(mockClientQuery).toHaveBeenNthCalledWith(5, 'ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
