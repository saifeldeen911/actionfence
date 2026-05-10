/**
 * @module storage/sqlite-adapter
 * SQLite-backed StorageAdapter using better-sqlite3.
 *
 * This is the default, zero-config storage backend.
 * All operations are synchronous — no interleaving is possible.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import type { ActionReceipt } from '../types/receipt.js';
import type { StorageAdapter, ReceiptFilters } from './adapter.js';

/** Configuration options for the SQLite storage adapter. */
export interface SQLiteAdapterOptions {
  /** Path to the SQLite database file. Defaults to `.actionfence/receipts.db`. */
  readonly databasePath?: string;
}

interface ReceiptRow {
  readonly receipt_id: string;
  readonly timestamp: string;
  readonly agent_id: string;
  readonly owner_id: string | null;
  readonly action: string;
  readonly tool_name: string;
  readonly payload_json: string;
  readonly payload_hash: string;
  readonly policy_ref: string;
  readonly status: 'PASSED' | 'BLOCKED';
  readonly block_reason: string | null;
  readonly identity_tier: 'anonymous' | 'token' | 'verified';
  readonly spend_amount: number | null;
  readonly prev_hash: string;
  readonly receipt_hash: string;
  readonly receipt_sig: string;
}

const DEFAULT_DATABASE_PATH = '.actionfence/receipts.db';
const LEGACY_DATABASE_PATH = '.agentguard/receipts.db';

/**
 * Resolve the database path, falling back to legacy paths for migration.
 */
function resolveDatabasePath(databasePath?: string): string {
  if (databasePath !== undefined) {
    return resolve(databasePath);
  }

  const resolvedDefaultPath = resolve(DEFAULT_DATABASE_PATH);
  const resolvedLegacyPath = resolve(LEGACY_DATABASE_PATH);
  const defaultExists = existsSync(resolvedDefaultPath);
  const legacyExists = existsSync(resolvedLegacyPath);

  if (defaultExists && legacyExists) {
    console.warn(
      `[actionfence] Found both ${resolvedDefaultPath} and legacy ${resolvedLegacyPath}; using ${resolvedDefaultPath}.`,
    );
    return resolvedDefaultPath;
  }

  if (!defaultExists && legacyExists) {
    console.warn(
      `[actionfence] Using legacy receipt database ${resolvedLegacyPath}; migrate to ${resolvedDefaultPath}.`,
    );
    return resolvedLegacyPath;
  }

  return resolvedDefaultPath;
}

/**
 * SQLiteAdapter provides synchronous, file-backed receipt storage.
 */
export class SQLiteAdapter implements StorageAdapter {
  private readonly db: Database.Database;
  private readonly insertStmt: Database.Statement;
  private readonly getLastHashStmt: Database.Statement;
  private readonly getByIdStmt: Database.Statement;
  private readonly listByAgentStmt: Database.Statement;
  private readonly getAllOrderedStmt: Database.Statement;

  constructor(options: SQLiteAdapterOptions = {}) {
    let databasePath: string | undefined;
    try {
      databasePath = resolveDatabasePath(options.databasePath);
      mkdirSync(dirname(databasePath), { recursive: true });

      this.db = new Database(databasePath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = FULL');

      this.initializeSchema();

      this.insertStmt = this.db.prepare(`
        INSERT INTO receipts (
          receipt_id, timestamp, agent_id, owner_id, action, tool_name,
          payload_json, payload_hash, policy_ref, status, block_reason,
          identity_tier, spend_amount, prev_hash, receipt_hash, receipt_sig,
          created_at
        ) VALUES (
          @receipt_id, @timestamp, @agent_id, @owner_id, @action, @tool_name,
          @payload_json, @payload_hash, @policy_ref, @status, @block_reason,
          @identity_tier, @spend_amount, @prev_hash, @receipt_hash, @receipt_sig,
          @timestamp
        )
      `);

      this.getLastHashStmt = this.db.prepare(`
        SELECT receipt_hash FROM receipts ORDER BY rowid DESC LIMIT 1
      `);

      this.getByIdStmt = this.db.prepare(`
        SELECT receipt_id, timestamp, agent_id, owner_id, action, tool_name,
               payload_json, payload_hash, policy_ref, status, block_reason,
               identity_tier, spend_amount, prev_hash, receipt_hash, receipt_sig
        FROM receipts WHERE receipt_id = ?
      `);

      this.listByAgentStmt = this.db.prepare(`
        SELECT receipt_id, timestamp, agent_id, owner_id, action, tool_name,
               payload_json, payload_hash, policy_ref, status, block_reason,
               identity_tier, spend_amount, prev_hash, receipt_hash, receipt_sig
        FROM receipts WHERE agent_id = ? ORDER BY rowid ASC
      `);

      this.getAllOrderedStmt = this.db.prepare(`
        SELECT receipt_id, timestamp, agent_id, owner_id, action, tool_name,
               payload_json, payload_hash, policy_ref, status, block_reason,
               identity_tier, spend_amount, prev_hash, receipt_hash, receipt_sig
        FROM receipts ORDER BY rowid ASC
      `);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const pathInfo = databasePath ? ` at path "${databasePath}"` : '';
      throw new Error(`[actionfence] Failed to initialize SQLite storage${pathInfo}: ${message}`, { cause: error });
    }
  }

  insert(receipt: ActionReceipt): void {
    try {
      this.insertStmt.run(receipt);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          throw new Error(
            `[actionfence] Failed to insert receipt: Duplicate receipt_id (${receipt.receipt_id})`,
            { cause: error }
          );
        }
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          throw new Error(
            `[actionfence] Failed to insert receipt: Duplicate receipt_hash (${receipt.receipt_hash})`,
            { cause: error }
          );
        }
      }
      throw error;
    }
  }

  getLastHash(): string {
    const row = this.getLastHashStmt.get() as { readonly receipt_hash?: string } | undefined;
    return row?.receipt_hash ?? '';
  }

  getById(receiptId: string): ActionReceipt | null {
    const row = this.getByIdStmt.get(receiptId) as ReceiptRow | undefined;
    return row ? freezeReceipt(row) : null;
  }

  listByAgent(agentId: string): readonly ActionReceipt[] {
    const rows = this.listByAgentStmt.all(agentId) as ReceiptRow[];
    return Object.freeze(rows.map(freezeReceipt));
  }

  count(filters?: ReceiptFilters): number {
    const { sql, params } = buildFilterQuery('SELECT COUNT(*) AS cnt FROM receipts', filters);
    const row = this.db.prepare(sql).get(...params) as { readonly cnt: number } | undefined;
    return row?.cnt ?? 0;
  }

  query(filters?: ReceiptFilters, limit?: number): readonly ActionReceipt[] {
    const selectCols = `
      SELECT receipt_id, timestamp, agent_id, owner_id, action, tool_name,
             payload_json, payload_hash, policy_ref, status, block_reason,
             identity_tier, spend_amount, prev_hash, receipt_hash, receipt_sig
      FROM receipts`;
    const { sql: baseSql, params } = buildFilterQuery(selectCols, filters);
    let sql = `${baseSql} ORDER BY rowid ASC`;
    if (limit !== undefined && limit > 0) {
      sql += ` LIMIT ${Math.floor(limit)}`;
    }
    const rows = this.db.prepare(sql).all(...params) as ReceiptRow[];
    return Object.freeze(rows.map(freezeReceipt));
  }

  getAllOrdered(): readonly ActionReceipt[] {
    const rows = this.getAllOrderedStmt.all() as ReceiptRow[];
    return Object.freeze(rows.map(freezeReceipt));
  }

  close(): void {
    this.db.close();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS receipts (
        receipt_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        owner_id TEXT,
        action TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        policy_ref TEXT NOT NULL,
        status TEXT NOT NULL,
        block_reason TEXT,
        identity_tier TEXT NOT NULL,
        spend_amount REAL,
        prev_hash TEXT NOT NULL,
        receipt_hash TEXT NOT NULL UNIQUE,
        receipt_sig TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS receipts_timestamp_idx ON receipts (timestamp);
      CREATE INDEX IF NOT EXISTS receipts_agent_id_idx ON receipts (agent_id);
      CREATE INDEX IF NOT EXISTS receipts_action_idx ON receipts (action);
      CREATE INDEX IF NOT EXISTS receipts_status_idx ON receipts (status);
    `);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freezeReceipt(row: ReceiptRow): ActionReceipt {
  return Object.freeze({
    receipt_id: row.receipt_id,
    timestamp: row.timestamp,
    agent_id: row.agent_id,
    owner_id: row.owner_id,
    action: row.action,
    tool_name: row.tool_name,
    payload_json: row.payload_json,
    payload_hash: row.payload_hash,
    policy_ref: row.policy_ref,
    status: row.status,
    block_reason: row.block_reason,
    identity_tier: row.identity_tier,
    spend_amount: row.spend_amount,
    prev_hash: row.prev_hash,
    receipt_hash: row.receipt_hash,
    receipt_sig: row.receipt_sig,
  });
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

  if (filters.agentId !== undefined) {
    clauses.push('agent_id = ?');
    params.push(filters.agentId);
  }
  if (filters.action !== undefined) {
    clauses.push('action = ?');
    params.push(filters.action);
  }
  if (filters.status !== undefined) {
    clauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters.since !== undefined) {
    clauses.push('timestamp >= ?');
    params.push(filters.since.toISOString());
  }
  if (filters.until !== undefined) {
    clauses.push('timestamp <= ?');
    params.push(filters.until.toISOString());
  }

  const sql = clauses.length > 0
    ? `${baseSql} WHERE ${clauses.join(' AND ')}`
    : baseSql;

  return { sql, params };
}
