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
        max_spend: 500.5,
        requires_human_approval: true,
      });
      expect(policy.spend_limits).toEqual({
        session_max: 1000,
        daily_max: 2500.75,
        currency: 'USD',
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

    it('should default missing default_rule to deny', () => {
      const policy = loadPolicy({
        service: 'InlineService',
        version: '1.0',
        actions: {
          test_action: { allowed: true },
        },
      } as never);

      expect(policy.default_rule).toBe('deny');
    });

    it('should normalize invalid default_rule to deny', () => {
      const policy = loadPolicy({
        service: 'InlineService',
        version: '1.0',
        default_rule: 'invalid_value',
        actions: {
          test_action: { allowed: true },
        },
      } as never);

      expect(policy.default_rule).toBe('deny');
    });

    it('should throw PolicyLoadError for non-existent file', () => {
      expect(() => loadPolicy('/does/not/exist.json')).toThrow(PolicyLoadError);
    });

    it('should throw PolicyLoadError for malformed JSON', () => {
      expect(() => loadPolicy(resolve(FIXTURES, 'malformed.json'))).toThrow(PolicyLoadError);
    });

    it('should normalize an invalid default_rule fixture to deny', () => {
      const policy = loadPolicy(resolve(FIXTURES, 'invalid-default-rule.json'));
      expect(policy.default_rule).toBe('deny');
    });

    it('should throw PolicyValidationError for missing required fields', () => {
      expect(() => loadPolicy(resolve(FIXTURES, 'missing-service.json'))).toThrow(
        PolicyValidationError,
      );
    });

    it('should include human-readable validation errors', () => {
      let caughtError: unknown;
      try {
        loadPolicy(resolve(FIXTURES, 'missing-service.json'));
      } catch (error) {
        caughtError = error;
      }
      expect(caughtError).toBeInstanceOf(PolicyValidationError);
      const validationError = caughtError as PolicyValidationError;
      expect(validationError.validationErrors.length).toBeGreaterThan(0);
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
          default_rule: 'deny',
          actions: {},
        }),
      ).toThrow(PolicyValidationError);
    });

    it('should reject an inline policy with invalid spend_limits schema', () => {
      expect(() =>
        loadPolicy({
          service: 'Test',
          version: '1.0',
          default_rule: 'deny',
          actions: {
            test_action: { allowed: true },
          },
          spend_limits: {
            session_max: -1,
          },
        } as never),
      ).toThrow(PolicyValidationError);
    });
  });
});
