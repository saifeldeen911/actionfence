/**
 * @module core/receipt-store
 * Thin facade over a {@link StorageAdapter} that handles receipt signing,
 * hash-chain linking, and chain verification.
 *
 * The adapter controls where receipts are persisted (SQLite, PostgreSQL,
 * memory, etc.). This class is adapter-agnostic.
 */

import { ReceiptSigner, type ReceiptSignerOptions } from './receipt-signer.js';
import { SQLiteAdapter } from '../storage/sqlite-adapter.js';
import type { StorageAdapter } from '../storage/adapter.js';
import type {
  ActionReceipt,
  CreateReceiptInput,
  ReceiptVerificationResult,
} from '../types/receipt.js';

/** Module-specific options for receipt storage. */
export interface ReceiptStoreOptions {
  /** Path to the SQLite database file. Only used when no custom adapter is provided. */
  readonly databasePath?: string;
  readonly signer?: ReceiptSigner;
  readonly signerOptions?: ReceiptSignerOptions;
  /** Custom storage adapter. When omitted, a SQLiteAdapter is created using `databasePath`. */
  readonly adapter?: StorageAdapter;
}

/**
 * Simple async mutex that serialises insert operations so the
 * getLastHash → createReceipt → insert sequence cannot interleave
 * across concurrent `evaluate()` calls.
 */
class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previous = this.tail;
    this.tail = gate;

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * ReceiptStore provides signed, append-only persistence and chain verification.
 *
 * Internally delegates to a {@link StorageAdapter} for actual I/O while
 * handling cryptographic signing and hash-chain linking.
 */
export class ReceiptStore {
  private readonly adapter: StorageAdapter;
  private readonly signer: ReceiptSigner;
  private readonly ownsAdapter: boolean;
  private readonly insertMutex = new AsyncMutex();

  constructor(options: ReceiptStoreOptions = {}) {
    this.signer = options.signer ?? new ReceiptSigner(options.signerOptions);

    if (options.adapter) {
      this.adapter = options.adapter;
      this.ownsAdapter = false;
    } else {
      this.adapter = new SQLiteAdapter({ databasePath: options.databasePath });
      this.ownsAdapter = true;
    }
  }

  /**
   * Insert a newly signed receipt atomically with its chain link.
   *
   * Uses a mutex to guarantee that concurrent calls cannot read the same
   * `prevHash`, which would break the hash chain.
   */
  async insert(input: CreateReceiptInput): Promise<ActionReceipt> {
    return this.insertMutex.runExclusive(async () => {
      const lastHash = await this.adapter.getLastHash();
      const receipt = this.signer.createReceipt({
        ...input,
        prevHash: lastHash,
      });
      await this.adapter.insert(receipt);
      return receipt;
    });
  }

  /**
   * Return the last known receipt hash, or an empty string for an empty store.
   */
  async getLastHash(): Promise<string> {
    return this.adapter.getLastHash();
  }

  /**
   * Find a receipt by its id.
   */
  async getById(receiptId: string): Promise<ActionReceipt | null> {
    return this.adapter.getById(receiptId);
  }

  /**
   * List all receipts for one agent in insertion order.
   */
  async listByAgent(agentId: string): Promise<readonly ActionReceipt[]> {
    return this.adapter.listByAgent(agentId);
  }

  /**
   * Verify the full persisted receipt chain in insertion order.
   */
  async verifyChain(): Promise<ReceiptVerificationResult> {
    const receipts = await this.adapter.getAllOrdered();
    let previousHash = '';

    for (let index = 0; index < receipts.length; index++) {
      const receipt = receipts[index];
      if (!receipt) {
        continue;
      }
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
      checkedCount: receipts.length,
    };
  }

  /**
   * Close the underlying storage adapter.
   */
  async close(): Promise<void> {
    if (this.ownsAdapter) {
      await this.adapter.close();
    }
  }

  /**
   * Access the underlying storage adapter (e.g. for introspection queries).
   */
  getAdapter(): StorageAdapter {
    return this.adapter;
  }
}
