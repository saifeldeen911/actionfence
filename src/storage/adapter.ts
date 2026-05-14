/**
 * @module storage/adapter
 * Pluggable storage backend interface for receipt persistence.
 *
 * Adapters may be synchronous (SQLite, Memory) or asynchronous (PostgreSQL).
 * All methods declare `T | Promise<T>` return types so the ReceiptStore
 * facade can `await` uniformly regardless of backend.
 */

import type { ActionReceipt } from '../types/receipt.js';

/** Filters for querying stored receipts. */
export interface ReceiptFilters {
  readonly agentId?: string;
  readonly action?: string;
  readonly status?: 'PASSED' | 'BLOCKED';
  readonly since?: Date;
  readonly until?: Date;
}

/**
 * StorageAdapter defines the contract for receipt persistence backends.
 *
 * Implementations receive fully-signed {@link ActionReceipt} objects —
 * signing and chain-linking logic lives in ReceiptStore, not here.
 */
export interface StorageAdapter {
  /** Insert a fully-signed receipt into storage. */
  insert(receipt: ActionReceipt): void | Promise<void>;

  /**
   * Optionally insert a receipt atomically with its chain link.
   * Implementations that support cross-process atomic chain insertion can
   * build the receipt after reading the current tail hash in a transaction.
   */
  insertAtomic?(buildReceipt: (prevHash: string) => ActionReceipt): Promise<ActionReceipt>;

  /** Get the hash of the most recent receipt, or `''` for an empty store. */
  getLastHash(): string | Promise<string>;

  /** Retrieve a single receipt by ID, or `null` if not found. */
  getById(receiptId: string): ActionReceipt | null | Promise<ActionReceipt | null>;

  /** List receipts for one agent in insertion order. */
  listByAgent(agentId: string): readonly ActionReceipt[] | Promise<readonly ActionReceipt[]>;

  /** Count receipts matching optional filters. */
  count(filters?: ReceiptFilters): number | Promise<number>;

  /** Query receipts with filters and an optional row limit. Returns receipts in insertion order (oldest first). */
  query(
    filters?: ReceiptFilters,
    limit?: number,
  ): readonly ActionReceipt[] | Promise<readonly ActionReceipt[]>;

  /** Return every receipt in insertion order (used for chain verification). */
  getAllOrdered(): readonly ActionReceipt[] | Promise<readonly ActionReceipt[]>;

  /** Release resources (close DB handle, end connection pool, etc.). */
  close(): void | Promise<void>;
}
