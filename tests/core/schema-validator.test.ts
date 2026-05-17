import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../../src/core/schema-validator.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('core/schema-validator', () => {
  describe('hashSchema', () => {
    it('produces a stable hash for the same schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };
      const h1 = SchemaValidator.hashSchema(schema);
      const h2 = SchemaValidator.hashSchema(schema);
      expect(h1).toBe(h2);
    });

    it('produces the same hash for differently-ordered keys at the top level', () => {
      const schemaA = {
        b: '2',
        a: '1',
      };
      const schemaB = {
        a: '1',
        b: '2',
      };
      expect(SchemaValidator.hashSchema(schemaA)).toBe(SchemaValidator.hashSchema(schemaB));
    });

    it('produces the same hash for differently-ordered keys at nested levels', () => {
      const schemaA = {
        type: 'object',
        properties: {
          z: { type: 'string', minLength: 1 },
          a: { type: 'number' },
        },
      };
      const schemaB = {
        type: 'object',
        properties: {
          a: { type: 'number' },
          z: { minLength: 1, type: 'string' },
        },
      };
      expect(SchemaValidator.hashSchema(schemaA)).toBe(SchemaValidator.hashSchema(schemaB));
    });

    it('prefixes hashes with sha256:', () => {
      const hash = SchemaValidator.hashSchema({ a: 1 });
      expect(hash).toMatch(/^sha256:/);
    });
  });

  describe('snapshotSchema / check', () => {
    it('returns match=true when no pin exists', () => {
      const validator = new SchemaValidator();
      validator.snapshotSchema('toolA', { type: 'string' });
      const result = validator.check('toolA', undefined);
      expect(result.match).toBe(true);
      expect(result.pinnedHash).toBeUndefined();
    });

    it('returns match=true when pinned hash matches', () => {
      const validator = new SchemaValidator();
      const schema = { type: 'object' };
      validator.snapshotSchema('toolA', schema);
      const hash = SchemaValidator.hashSchema(schema);
      const result = validator.check('toolA', hash);
      expect(result.match).toBe(true);
    });

    it('returns match=false when pinned hash differs', () => {
      const validator = new SchemaValidator();
      validator.snapshotSchema('toolA', { type: 'string' });
      const result = validator.check('toolA', 'sha256:deadbeef');
      expect(result.match).toBe(false);
    });

    it('returns currentHash=unknown when tool was never registered', () => {
      const validator = new SchemaValidator();
      const result = validator.check('unknownTool', 'sha256:abc');
      expect(result.currentHash).toBe('unknown');
      expect(result.match).toBe(false);
    });
  });
});
