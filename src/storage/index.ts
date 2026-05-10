/**
 * @module storage
 * Barrel re-export of storage adapter interface and implementations.
 */

export type { StorageAdapter, ReceiptFilters } from './adapter.js';
export { SQLiteAdapter } from './sqlite-adapter.js';
export type { SQLiteAdapterOptions } from './sqlite-adapter.js';
export { PostgresAdapter } from './postgres-adapter.js';
export type { PostgresAdapterOptions } from './postgres-adapter.js';
export { MemoryAdapter } from './memory-adapter.js';
