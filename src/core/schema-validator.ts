import { createHash } from 'node:crypto';

export class SchemaValidator {
  private schemaHashes = new Map<string, string>();

  /**
   * Hash a tool's input schema deterministically.
   * Keys are sorted, JSON is minified.
   */
  static hashSchema(schema: Record<string, unknown>): string {
    const canonical = JSON.stringify(schema, Object.keys(schema).sort());
    return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Snapshot a single tool schema.
   * Called when a tool is registered or initialized.
   */
  snapshotSchema(toolName: string, inputSchema: Record<string, unknown>): void {
    this.schemaHashes.set(toolName, SchemaValidator.hashSchema(inputSchema));
  }

  /**
   * Check if a tool's current schema matches the pinned hash.
   * Returns { match: true } if no hash pinned (backward compatible).
   */
  check(
    toolName: string,
    pinnedHash: string | undefined,
  ): { match: boolean; currentHash: string; pinnedHash: string | undefined } {
    const currentHash = this.schemaHashes.get(toolName) ?? 'unknown';

    if (!pinnedHash) {
      return { match: true, currentHash, pinnedHash };
    }

    return {
      match: currentHash === pinnedHash,
      currentHash,
      pinnedHash,
    };
  }
}
