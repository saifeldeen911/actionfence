/**
 * @module storage/memory-adapter
 * In-memory StorageAdapter for tests and ephemeral use.
 *
 * All data is lost when the process exits.
 * Useful for unit tests where filesystem access is undesirable.
 */

import type { ActionReceipt } from '../types/receipt.js';
import type { StorageAdapter, ReceiptFilters } from './adapter.js';

/**
 * MemoryAdapter stores receipts in a plain array.
 * Thread-safe by virtue of Node.js single-threaded execution.
 */
export class MemoryAdapter implements StorageAdapter {
  private readonly receipts: ActionReceipt[] = [];
  private readonly byId = new Map<string, ActionReceipt>();

  insert(receipt: ActionReceipt): void {
    if (this.byId.has(receipt.receipt_id)) {
      throw new Error(`Duplicate receipt_id: ${receipt.receipt_id}`);
    }
    const frozen = deepFreeze({ ...receipt });
    this.receipts.push(frozen);
    this.byId.set(frozen.receipt_id, frozen);
  }

  getLastHash(): string {
    const last = this.receipts[this.receipts.length - 1];
    return last?.receipt_hash ?? '';
  }

  getById(receiptId: string): ActionReceipt | null {
    return this.byId.get(receiptId) ?? null;
  }

  listByAgent(agentId: string): readonly ActionReceipt[] {
    return Object.freeze(this.receipts.filter((r) => r.agent_id === agentId));
  }

  count(filters?: ReceiptFilters): number {
    return applyFilters(this.receipts, filters).length;
  }

  query(filters?: ReceiptFilters, limit?: number): readonly ActionReceipt[] {
    let result = applyFilters(this.receipts, filters);
    if (limit !== undefined && limit > 0) {
      result = result.slice(0, limit);
    }
    return Object.freeze(result);
  }

  getAllOrdered(): readonly ActionReceipt[] {
    return Object.freeze([...this.receipts]);
  }

  close(): void {
    // No-op — nothing to release.
  }

  /** Test helper: clear all stored receipts. */
  clear(): void {
    this.receipts.length = 0;
    this.byId.clear();
  }

  /** Test helper: number of stored receipts. */
  get size(): number {
    return this.receipts.length;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyFilters(
  receipts: readonly ActionReceipt[],
  filters?: ReceiptFilters,
): ActionReceipt[] {
  if (!filters) {
    return [...receipts];
  }

  return receipts.filter((r) => {
    if (filters.agentId !== undefined && r.agent_id !== filters.agentId) return false;
    if (filters.action !== undefined && r.action !== filters.action) return false;
    if (filters.status !== undefined && r.status !== filters.status) return false;
    if (filters.since !== undefined && r.timestamp < filters.since.toISOString()) return false;
    if (filters.until !== undefined && r.timestamp > filters.until.toISOString()) return false;
    return true;
  });
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  
  return Object.freeze(obj);
}
