/**
 * @module core/receipt-store
 * Persistent append-only receipt storage backed by SQLite.
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { ReceiptSigner, type ReceiptSignerOptions } from './receipt-signer.js';
import type {
  ActionReceipt,
  CreateReceiptInput,
  ReceiptVerificationResult,
} from '../types/receipt.js';

/** Module-specific options for receipt storage. */
export interface ReceiptStoreOptions {
  readonly databasePath?: string;
  readonly signer?: ReceiptSigner;
  readonly signerOptions?: ReceiptSignerOptions;
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

const DEFAULT_DATABASE_PATH = resolve('.agentguard/receipts.db');

/**
 * ReceiptStore provides append-only persistence and chain verification.
 */
export class ReceiptStore {
  private readonly db: Database.Database;
  private readonly signer: ReceiptSigner;
  private readonly insertStatement: Database.Statement;
  private readonly getLastHashStatement: Database.Statement;
  private readonly getByIdStatement: Database.Statement;
  private readonly listByAgentStatement: Database.Statement;
  private readonly verifyListStatement: Database.Statement;
  private readonly insertTransaction: (input: CreateReceiptInput) => ActionReceipt;

  constructor(options: ReceiptStoreOptions = {}) {
    const databasePath = resolve(options.databasePath ?? DEFAULT_DATABASE_PATH);
    mkdirSync(dirname(databasePath), { recursive: true });

    this.signer = options.signer ?? new ReceiptSigner(options.signerOptions);
    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');

    this.initializeSchema();

    this.insertStatement = this.db.prepare(`
      INSERT INTO receipts (
        receipt_id,
        timestamp,
        agent_id,
        owner_id,
        action,
        tool_name,
        payload_json,
        payload_hash,
        policy_ref,
        status,
        block_reason,
        identity_tier,
        spend_amount,
        prev_hash,
        receipt_hash,
        receipt_sig,
        created_at
      ) VALUES (
        @receipt_id,
        @timestamp,
        @agent_id,
        @owner_id,
        @action,
        @tool_name,
        @payload_json,
        @payload_hash,
        @policy_ref,
        @status,
        @block_reason,
        @identity_tier,
        @spend_amount,
        @prev_hash,
        @receipt_hash,
        @receipt_sig,
        @timestamp
      )
    `);
    this.getLastHashStatement = this.db.prepare(`
      SELECT receipt_hash
      FROM receipts
      ORDER BY rowid DESC
      LIMIT 1
    `);
    this.getByIdStatement = this.db.prepare(`
      SELECT
        receipt_id,
        timestamp,
        agent_id,
        owner_id,
        action,
        tool_name,
        payload_json,
        payload_hash,
        policy_ref,
        status,
        block_reason,
        identity_tier,
        spend_amount,
        prev_hash,
        receipt_hash,
        receipt_sig
      FROM receipts
      WHERE receipt_id = ?
    `);
    this.listByAgentStatement = this.db.prepare(`
      SELECT
        receipt_id,
        timestamp,
        agent_id,
        owner_id,
        action,
        tool_name,
        payload_json,
        payload_hash,
        policy_ref,
        status,
        block_reason,
        identity_tier,
        spend_amount,
        prev_hash,
        receipt_hash,
        receipt_sig
      FROM receipts
      WHERE agent_id = ?
      ORDER BY rowid ASC
    `);
    this.verifyListStatement = this.db.prepare(`
      SELECT
        receipt_id,
        timestamp,
        agent_id,
        owner_id,
        action,
        tool_name,
        payload_json,
        payload_hash,
        policy_ref,
        status,
        block_reason,
        identity_tier,
        spend_amount,
        prev_hash,
        receipt_hash,
        receipt_sig
      FROM receipts
      ORDER BY rowid ASC
    `);

    this.insertTransaction = this.db.transaction((input: CreateReceiptInput): ActionReceipt => {
      const lastHash = this.getLastHash();
      const receipt = this.signer.createReceipt({
        ...input,
        prevHash: lastHash,
      });

      this.insertStatement.run(receipt);
      return receipt;
    });
  }

  /**
   * Insert a newly signed receipt atomically with its chain link.
   */
  insert(input: CreateReceiptInput): ActionReceipt {
    return this.insertTransaction(input);
  }

  /**
   * Return the last known receipt hash, or an empty string for an empty store.
   */
  getLastHash(): string {
    const row = this.getLastHashStatement.get() as { readonly receipt_hash?: string } | undefined;
    return row?.receipt_hash ?? '';
  }

  /**
   * Find a receipt by its id.
   */
  getById(receiptId: string): ActionReceipt | null {
    const row = this.getByIdStatement.get(receiptId) as ReceiptRow | undefined;
    return row ? freezeReceipt(row) : null;
  }

  /**
   * List all receipts for one agent in insertion order.
   */
  listByAgent(agentId: string): readonly ActionReceipt[] {
    const rows = this.listByAgentStatement.all(agentId) as ReceiptRow[];
    return Object.freeze(rows.map((row) => freezeReceipt(row)));
  }

  /**
   * Verify the full persisted receipt chain in insertion order.
   */
  verifyChain(): ReceiptVerificationResult {
    const rows = this.verifyListStatement.all() as ReceiptRow[];
    let previousHash = '';

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (!row) {
        continue;
      }
      const receipt = freezeReceipt(row);
      const checkedCount = index + 1;

      if (receipt.prev_hash !== previousHash) {
        return {
          valid: false,
          checkedCount,
          brokenReceiptId: receipt.receipt_id,
          reason: 'CHAIN_LINK_MISMATCH',
        };
      }

      const expectedPayloadHash = this.signer.hashCanonicalJson(receipt.payload_json);
      if (receipt.payload_hash !== expectedPayloadHash) {
        return {
          valid: false,
          checkedCount,
          brokenReceiptId: receipt.receipt_id,
          reason: 'PAYLOAD_HASH_MISMATCH',
        };
      }

      const expectedReceiptHash = this.signer.computeReceiptHash({
        receipt_id: receipt.receipt_id,
        timestamp: receipt.timestamp,
        agent_id: receipt.agent_id,
        owner_id: receipt.owner_id,
        action: receipt.action,
        tool_name: receipt.tool_name,
        payload_json: receipt.payload_json,
        payload_hash: receipt.payload_hash,
        policy_ref: receipt.policy_ref,
        status: receipt.status,
        block_reason: receipt.block_reason,
        identity_tier: receipt.identity_tier,
        spend_amount: receipt.spend_amount,
        prev_hash: receipt.prev_hash,
      });
      if (receipt.receipt_hash !== expectedReceiptHash) {
        return {
          valid: false,
          checkedCount,
          brokenReceiptId: receipt.receipt_id,
          reason: 'RECEIPT_HASH_MISMATCH',
        };
      }

      if (!this.signer.verifySignature(receipt)) {
        return {
          valid: false,
          checkedCount,
          brokenReceiptId: receipt.receipt_id,
          reason: 'SIGNATURE_MISMATCH',
        };
      }

      previousHash = receipt.receipt_hash;
    }

    return {
      valid: true,
      checkedCount: rows.length,
    };
  }

  /**
   * Close the underlying database handle.
   */
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
