import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadPolicy } from '../../src/core/policy-loader.js';
import { PolicyLoadError, PolicyValidationError } from '../../src/types/errors.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');

describe('loadPolicy', () => {
  describe('from file path', () => {
    it('should load and return a valid policy', () => {
      const policy = loadPolicy(resolve(FIXTURES, 'valid-policy.json'));

      expect(policy.service).toBe('TestService');
      expect(policy.version).toBe('1.0');
      expect(policy.default_rule).toBe('deny');
      expect(policy.actions.search_flights).toEqual({
        allowed: true,
        identity: 'any',
      });
      expect(policy.actions.book_flight).toEqual({
        allowed: true,
        identity: 'verified',
        max_spend: 500,
        requires_human_approval: true,
      });
    });

    it('should freeze the returned policy object', () => {
      const policy = loadPolicy(resolve(FIXTURES, 'valid-policy.json'));
      expect(Object.isFrozen(policy)).toBe(true);
    });

    it('should load a policy with default_rule: allow', () => {
      const policy = loadPolicy(resolve(FIXTURES, 'allow-default-policy.json'));
      expect(policy.default_rule).toBe('allow');
    });

    it('should throw PolicyLoadError for non-existent file', () => {
      expect(() => loadPolicy('/does/not/exist.json')).toThrow(PolicyLoadError);
    });

    it('should throw PolicyLoadError for malformed JSON', () => {
      expect(() => loadPolicy(resolve(FIXTURES, 'malformed.json'))).toThrow(PolicyLoadError);
    });

    it('should throw PolicyValidationError for invalid default_rule', () => {
      expect(() => loadPolicy(resolve(FIXTURES, 'invalid-default-rule.json'))).toThrow(
        PolicyValidationError,
      );
    });

    it('should throw PolicyValidationError for missing required fields', () => {
      expect(() => loadPolicy(resolve(FIXTURES, 'missing-service.json'))).toThrow(
        PolicyValidationError,
      );
    });

    it('should include human-readable validation errors', () => {
      try {
        loadPolicy(resolve(FIXTURES, 'invalid-default-rule.json'));
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PolicyValidationError);
        const validationError = error as PolicyValidationError;
        expect(validationError.validationErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('from inline object', () => {
    it('should validate and return a valid inline policy', () => {
      const policy = loadPolicy({
        service: 'InlineService',
        version: '1.0',
        default_rule: 'deny',
        actions: {
          test_action: { allowed: true },
        },
      });

      expect(policy.service).toBe('InlineService');
      expect(policy.actions.test_action?.allowed).toBe(true);
    });

    it('should reject an inline policy with invalid schema', () => {
      expect(() =>
        loadPolicy({
          service: 'Test',
          version: '1.0',
          default_rule: 'invalid_value' as 'deny',
          actions: {},
        }),
      ).toThrow(PolicyValidationError);
    });
  });
});
