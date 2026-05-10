import { describe, it, expect } from 'vitest';
import { PolicyEvaluator } from '../../src/core/policy-evaluator.js';
import type { GuardPolicy } from '../../src/types/policy.js';
import type { AgentIdentity } from '../../src/types/identity.js';

const TEST_POLICY: GuardPolicy = {
  service: 'TestService',
  version: '1.0',
  default_rule: 'deny',
  actions: {
    search_flights: { allowed: true, identity: 'any' },
    book_flight: {
      allowed: true,
      identity: 'verified',
      max_spend: 500,
      requires_human_approval: true,
    },
    read_prices: { allowed: true, identity: 'token' },
    bulk_booking: { allowed: false },
  },
  rate_limits: { requests_per_minute: 30, transactions_per_day: 5 },
};

const ALLOW_DEFAULT_POLICY: GuardPolicy = {
  service: 'TestService',
  version: '1.0',
  default_rule: 'allow',
  actions: {
    dangerous: { allowed: false },
  },
};

function makeIdentity(classification: 'anonymous' | 'token' | 'verified'): AgentIdentity {
  return {
    classification,
    agentId: classification === 'anonymous' ? 'anonymous' : 'agent-123',
    ownerId: classification === 'anonymous' ? null : 'owner-456',
    capabilities: [],
    rawToken: classification === 'anonymous' ? null : 'mock-token',
  };
}

describe('PolicyEvaluator', () => {
  const evaluator = new PolicyEvaluator(TEST_POLICY);

  describe('action lookup + default rule', () => {
    it('should block unlisted actions when default_rule is deny', () => {
      const decision = evaluator.evaluate(
        'unknown_action',
        'unknown_action',
        makeIdentity('verified'),
      );
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('not listed in the policy');
    });

    it('should allow unlisted actions when default_rule is allow', () => {
      const allowEvaluator = new PolicyEvaluator(ALLOW_DEFAULT_POLICY);
      const decision = allowEvaluator.evaluate(
        'any_action',
        'any_action',
        makeIdentity('anonymous'),
      );
      expect(decision.status).toBe('PASSED');
    });

    it('should fall back to deny for an invalid default_rule at evaluation time', () => {
      const invalidDefaultRulePolicy = {
        ...TEST_POLICY,
        default_rule: 'unexpected',
      } as unknown as GuardPolicy;

      const evaluator = new PolicyEvaluator(invalidDefaultRulePolicy);
      const decision = evaluator.evaluate(
        'unknown_action',
        'unknown_action',
        makeIdentity('verified'),
      );

      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('default: deny');
    });

    it('should block explicitly denied actions regardless of default_rule', () => {
      const allowEvaluator = new PolicyEvaluator(ALLOW_DEFAULT_POLICY);
      const decision = allowEvaluator.evaluate('dangerous', 'dangerous', makeIdentity('verified'));
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('explicitly denied');
    });
  });

  describe('identity tier checks', () => {
    it('should allow anonymous agents for identity: any', () => {
      const decision = evaluator.evaluate(
        'search_flights',
        'search_flights',
        makeIdentity('anonymous'),
      );
      expect(decision.status).toBe('PASSED');
    });

    it('should block anonymous agents for identity: token', () => {
      const decision = evaluator.evaluate('read_prices', 'read_prices', makeIdentity('anonymous'));
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('requires identity tier "token"');
    });

    it('should allow token agents for identity: token', () => {
      const decision = evaluator.evaluate('read_prices', 'read_prices', makeIdentity('token'));
      expect(decision.status).toBe('PASSED');
    });

    it('should allow verified agents for identity: token', () => {
      const decision = evaluator.evaluate('read_prices', 'read_prices', makeIdentity('verified'));
      expect(decision.status).toBe('PASSED');
    });

    it('should block anonymous agents for identity: verified', () => {
      const decision = evaluator.evaluate('book_flight', 'book_flight', makeIdentity('anonymous'));
      expect(decision.status).toBe('BLOCKED');
    });

    it('should block token agents for identity: verified', () => {
      const decision = evaluator.evaluate('book_flight', 'book_flight', makeIdentity('token'));
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('requires identity tier "verified"');
    });

    it('should allow verified agents for identity: verified', () => {
      const decision = evaluator.evaluate(
        'book_flight',
        'book_flight',
        makeIdentity('verified'),
        100,
      );
      expect(decision.status).toBe('PASSED');
    });
  });

  describe('spend cap checks', () => {
    it('should allow spend within cap', () => {
      const decision = evaluator.evaluate(
        'book_flight',
        'book_flight',
        makeIdentity('verified'),
        499,
      );
      expect(decision.status).toBe('PASSED');
    });

    it('should allow spend exactly at cap', () => {
      const decision = evaluator.evaluate(
        'book_flight',
        'book_flight',
        makeIdentity('verified'),
        500,
      );
      expect(decision.status).toBe('PASSED');
    });

    it('should block spend exceeding cap', () => {
      const decision = evaluator.evaluate(
        'book_flight',
        'book_flight',
        makeIdentity('verified'),
        501,
      );
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('exceeds cap');
    });

    it('should allow when no spend amount is provided', () => {
      const decision = evaluator.evaluate(
        'book_flight',
        'book_flight',
        makeIdentity('verified'),
        null,
      );
      expect(decision.status).toBe('PASSED');
    });
  });

  describe('requires_human_approval flag', () => {
    it('should set requiresHumanApproval when action has the flag', () => {
      const decision = evaluator.evaluate(
        'book_flight',
        'book_flight',
        makeIdentity('verified'),
        100,
      );
      expect(decision.requiresHumanApproval).toBe(true);
    });

    it('should not set requiresHumanApproval when flag is absent', () => {
      const decision = evaluator.evaluate(
        'search_flights',
        'search_flights',
        makeIdentity('anonymous'),
      );
      expect(decision.requiresHumanApproval).toBe(false);
    });
  });

  describe('decision metadata', () => {
    it('should include action and tool name', () => {
      const decision = evaluator.evaluate(
        'search_flights',
        'search_tool_v2',
        makeIdentity('anonymous'),
      );
      expect(decision.action).toBe('search_flights');
      expect(decision.toolName).toBe('search_tool_v2');
    });

    it('should include ISO timestamp', () => {
      const decision = evaluator.evaluate(
        'search_flights',
        'search_flights',
        makeIdentity('anonymous'),
      );
      expect(decision.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include duration in ms', () => {
      const decision = evaluator.evaluate(
        'search_flights',
        'search_flights',
        makeIdentity('anonymous'),
      );
      expect(decision.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updatePolicy', () => {
    it('should swap the active policy', () => {
      const mutableEvaluator = new PolicyEvaluator(TEST_POLICY);

      // Initially blocked (default: deny)
      let decision = mutableEvaluator.evaluate(
        'new_action',
        'new_action',
        makeIdentity('anonymous'),
      );
      expect(decision.status).toBe('BLOCKED');

      // Update to allow-default policy
      mutableEvaluator.updatePolicy(ALLOW_DEFAULT_POLICY);

      // Now passes
      decision = mutableEvaluator.evaluate('new_action', 'new_action', makeIdentity('anonymous'));
      expect(decision.status).toBe('PASSED');
    });
  });
});
