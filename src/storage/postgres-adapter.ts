/**
 * @module storage/postgres-adapter
 * PostgreSQL-backed StorageAdapter using pg.Pool.
 *
 * This adapter is designed for horizontally scaled deployments.
 * Uses a dynamic import for `pg` to avoid adding a hard dependency.
 */

import type { Pool as PgPool, PoolConfig } from 'pg';
import type { ActionReceipt } from '../types/receipt.js';
import type { StorageAdapter, ReceiptFilters } from './adapter.js';

/** Configuration options for the Postgres storage adapter. */
export interface PostgresAdapterOptions {
  /** pg connection string (e.g. process.env.DATABASE_URL). */
  readonly connectionString?: string;
  /** Pre-configured pg.Pool instance for advanced use cases. */
  readonly pool?: PgPool;
  /** pg.Pool config overrides. Ignored if `pool` is provided. */
  readonly poolConfig?: PoolConfig;
  /** Auto-create table on first use. Defaults to true. */
  readonly autoMigrate?: boolean;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS actionfence_receipts (
  receipt_id     TEXT PRIMARY KEY,
  timestamp      TIMESTAMPTZ NOT NULL,
  agent_id       TEXT NOT NULL,
  owner_id       TEXT,
  action         TEXT NOT NULL,
  tool_name      TEXT NOT NULL,
  payload_json   TEXT NOT NULL,
  payload_json_hash   TEXT NOT NULL,
  payload_hash   TEXT NOT NULL,
  policy_ref     TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('PASSED', 'BLOCKED')),
  block_reason   TEXT,
  identity_tier  TEXT NOT NULL CHECK (identity_tier IN ('anonymous', 'token', 'verified')),
  spend_amount   DOUBLE PRECISION,
  prev_hash      TEXT NOT NULL,
  receipt_hash   TEXT NOT NULL UNIQUE,
  receipt_sig    TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_af_receipts_agent   ON actionfence_receipts (agent_id);
CREATE INDEX IF NOT EXISTS idx_af_receipts_action  ON actionfence_receipts (action);
CREATE INDEX IF NOT EXISTS idx_af_receipts_status  ON actionfence_receipts (status);
CREATE INDEX IF NOT EXISTS idx_af_receipts_created ON actionfence_receipts (created_at);
`;

/**
 * PostgresAdapter provides asynchronous, PostgreSQL-backed receipt storage.
 */
export class PostgresAdapter implements StorageAdapter {
  private constructor(
    private readonly pool: PgPool,
    private readonly ownsPool: boolean,
  ) {}

  /**
   * Factory method to create a PostgresAdapter instance.
   * Required because the dynamic import of `pg` and table migration are async.
   */
  static async create(options: PostgresAdapterOptions = {}): Promise<PostgresAdapter> {
    let pool: PgPool;
    let ownsPool: boolean;

    try {
      if (options.pool) {
        pool = options.pool;
        ownsPool = false;
      } else {
        const pgModule = await import('pg');
        const Pool = pgModule.default?.Pool ?? pgModule.Pool;

        if (!Pool) {
          throw new Error('Failed to resolve pg.Pool constructor.');
        }

        pool = new Pool({
          connectionString: options.connectionString,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
          ...options.poolConfig,
        });
        ownsPool = true;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `[actionfence] Failed to initialize Postgres storage. Ensure 'pg' is installed (npm install pg). Original error: ${sanitizeConnectionError(message)}`,
      );
    }

    const adapter = new PostgresAdapter(pool, ownsPool);
    if (options.autoMigrate !== false) {
      await adapter.migrate();
    }
    return adapter;
  }

  private async migrate(): Promise<void> {
    try {
      await this.pool.query(SCHEMA_SQL);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[actionfence] Postgres auto-migration failed: ${message}`, {
        cause: error,
      });
    }
  }

  async insert(receipt: ActionReceipt): Promise<void> {
    const text = `
      INSERT INTO actionfence_receipts (
        receipt_id, timestamp, agent_id, owner_id, action, tool_name,
        payload_json, payload_json_hash, payload_hash, policy_ref, status, block_reason,
        identity_tier, spend_amount, prev_hash, receipt_hash, receipt_sig
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17
      )
    `;

    const values = [
      receipt.receipt_id,
      receipt.timestamp,
      receipt.agent_id,
      receipt.owner_id,
      receipt.action,
      receipt.tool_name,
      receipt.payload_json,
      receipt.payload_json_hash,
      receipt.payload_hash,
      receipt.policy_ref,
      receipt.status,
      receipt.block_reason,
      receipt.identity_tier,
      receipt.spend_amount,
      receipt.prev_hash,
      receipt.receipt_hash,
      receipt.receipt_sig,
    ];

    try {
      await this.pool.query(text, values);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        const constraint = 'constraint' in error ? String(error.constraint) : '';
        if (constraint === 'actionfence_receipts_receipt_hash_key' || constraint.includes('receipt_hash')) {
          throw new Error(
            `[actionfence] Failed to insert receipt: Duplicate receipt_hash (${receipt.receipt_hash})`,
            { cause: error },
          );
        }
        if (constraint === 'actionfence_receipts_pkey' || constraint.includes('pkey')) {
          throw new Error(
            `[actionfence] Failed to insert receipt: Duplicate receipt_id (${receipt.receipt_id})`,
            { cause: error },
          );
        }
        throw new Error(
          `[actionfence] Failed to insert receipt: Unique constraint violation`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  async getLastHash(): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT receipt_hash FROM actionfence_receipts ORDER BY created_at DESC, receipt_id DESC LIMIT 1`,
    );
    return (rows[0]?.receipt_hash as string) ?? '';
  }

  async getById(receiptId: string): Promise<ActionReceipt | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM actionfence_receipts WHERE receipt_id = $1`,
      [receiptId],
    );
    return rows[0] ? rowToReceipt(rows[0]) : null;
  }

  async listByAgent(agentId: string): Promise<readonly ActionReceipt[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM actionfence_receipts WHERE agent_id = $1 ORDER BY created_at ASC, receipt_id ASC`,
      [agentId],
    );
    return Object.freeze(rows.map(rowToReceipt));
  }

  async count(filters?: ReceiptFilters): Promise<number> {
    const { sql, params } = buildFilterQuery(
      'SELECT COUNT(*) AS cnt FROM actionfence_receipts',
      filters,
    );
    const { rows } = await this.pool.query(sql, params);
    return parseInt(rows[0]?.cnt as string, 10) || 0;
  }

  async query(filters?: ReceiptFilters, limit?: number): Promise<readonly ActionReceipt[]> {
    const baseSql = 'SELECT * FROM actionfence_receipts';
    const { sql: filterSql, params } = buildFilterQuery(baseSql, filters);
    let sql = `${filterSql} ORDER BY created_at ASC, receipt_id ASC`;

    if (limit !== undefined && limit > 0) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(Math.floor(limit));
    }

    const { rows } = await this.pool.query(sql, params);
    return Object.freeze(rows.map(rowToReceipt));
  }

  async getAllOrdered(): Promise<readonly ActionReceipt[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM actionfence_receipts ORDER BY created_at ASC, receipt_id ASC`,
    );
    return Object.freeze(rows.map(rowToReceipt));
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToReceipt(row: Record<string, unknown>): ActionReceipt {
  return Object.freeze({
    receipt_id: row.receipt_id as string,
    timestamp: (row.timestamp as Date).toISOString(),
    agent_id: row.agent_id as string,
    owner_id: (row.owner_id as string) ?? null,
    action: row.action as string,
    tool_name: row.tool_name as string,
    payload_json: row.payload_json as string,
    payload_json_hash: row.payload_json_hash as string,
    payload_hash: row.payload_hash as string,
    policy_ref: row.policy_ref as string,
    status: row.status as 'PASSED' | 'BLOCKED',
    block_reason: (row.block_reason as string) ?? null,
    identity_tier: row.identity_tier as ActionReceipt['identity_tier'],
    spend_amount: (row.spend_amount as number) ?? null,
    prev_hash: row.prev_hash as string,
    receipt_hash: row.receipt_hash as string,
    receipt_sig: row.receipt_sig as string,
  });
}

function sanitizeConnectionError(message: string): string {
  return message.replace(/(postgres(?:ql)?:\/\/[^:\s]+:)([^@]+)(@)/gi, '$1***$3');
}

interface FilterQueryResult {
  sql: string;
  params: unknown[];
}

function buildFilterQuery(baseSql: string, filters?: ReceiptFilters): FilterQueryResult {
  if (!filters) {
    return { sql: baseSql, params: [] };
  }

  const clauses: string[] = [];
  const params: unknown[] = [];

  let paramIndex = 1;

  if (filters.agentId !== undefined) {
    clauses.push(`agent_id = $${paramIndex++}`);
    params.push(filters.agentId);
  }
  if (filters.action !== undefined) {
    clauses.push(`action = $${paramIndex++}`);
    params.push(filters.action);
  }
  if (filters.status !== undefined) {
    clauses.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }
  if (filters.since !== undefined) {
    clauses.push(`timestamp >= $${paramIndex++}`);
    params.push(filters.since.toISOString());
  }
  if (filters.until !== undefined) {
    clauses.push(`timestamp <= $${paramIndex++}`);
    params.push(filters.until.toISOString());
  }

  const sql = clauses.length > 0 ? `${baseSql} WHERE ${clauses.join(' AND ')}` : baseSql;

  return { sql, params };
}
