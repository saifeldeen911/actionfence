import { createHash } from 'node:crypto';

export class SchemaValidator {
  private schemaHashes = new Map<string, string>();

  /**
   * Hash a tool's input schema deterministically.
   * Keys are sorted recursively, JSON is minified.
   */
  static hashSchema(schema: Record<string, unknown>): string {
    try {
      const canonical = JSON.stringify(schema, sortKeysReplacer());
      return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('circular')) {
        throw new TypeError('Cannot hash schema with circular reference');
      }
      throw err;
    }
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
    const currentHash = this.schemaHashes.get(toolName) ?? null;

    // If the tool hasn't been registered, report null rather than 'unknown'.
    const currentHashLabel = currentHash ?? 'unknown';

    if (!pinnedHash) {
      return { match: true, currentHash: currentHashLabel, pinnedHash };
    }

    return {
      match: currentHash === pinnedHash,
      currentHash: currentHashLabel,
      pinnedHash,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortKeysReplacer(): (key: string, value: unknown) => unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seen = new WeakSet<any>();

  return function (_key: string, value: unknown): unknown {
    if (value && typeof value === 'object') {
      if (seen.has(value)) {
        // Circular reference — preserve as-is to avoid infinite recursion.
        return value;
      }
      seen.add(value);

      if (Array.isArray(value)) {
        // Arrays keep their original order but their elements are recursively
        // visited by JSON.stringify, so do nothing here.
        return value;
      }

      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value).sort()) {
        sorted[key] = (value as Record<string, unknown>)[key];
      }
      return sorted;
    }
    return value;
  };
}
