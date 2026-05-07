import { describe, expect, it, vi } from 'vitest';
import { ConsoleReporter } from '../../src/reporters/console.js';
import type { EvaluationDecision } from '../../src/types/decision.js';

function makeDecision(
  overrides: Partial<EvaluationDecision> = {},
): EvaluationDecision {
  return {
    status: 'PASSED',
    action: 'search_flights',
    toolName: 'search_flights',
    identityTier: 'anonymous',
    reason: null,
    spendAmount: null,
    requiresHumanApproval: false,
    timestamp: '2026-05-06T20:00:00.000Z',
    durationMs: 1.5,
    ...overrides,
  };
}

describe('ConsoleReporter', () => {
  it('should format allowed decisions', () => {
    const writer = vi.fn();
    const reporter = new ConsoleReporter({ writer, useColors: false });

    const message = reporter.report({
      decision: makeDecision(),
      receiptId: 'receipt-1',
      spendSnapshot: {
        agentId: 'agent-1',
        sessionTotal: 10,
        dailyTotal: 10,
        dayKeyUtc: '2026-05-06',
      },
    });

    expect(message).toContain('ALLOW');
    expect(message).toContain('search_flights');
    expect(message).toContain('receipt=receipt-1');
    expect(message).toContain('session=10.00 units');
    expect(message).toContain('daily=10.00 units');
    expect(writer).toHaveBeenCalledWith(message);
  });

  it('should format blocked decisions with a reason', () => {
    const writer = vi.fn();
    const reporter = new ConsoleReporter({ writer, useColors: false });

    const message = reporter.report({
      decision: makeDecision({
        status: 'BLOCKED',
        action: 'bulk_booking',
        toolName: 'bulk_booking',
        identityTier: 'token',
        reason: 'Action "bulk_booking" is explicitly denied by policy',
      }),
    });

    expect(message).toContain('BLOCK');
    expect(message).toContain('bulk_booking');
    expect(message).toContain('reason=Action "bulk_booking" is explicitly denied by policy');
    expect(writer).toHaveBeenCalledWith(message);
  });

  it('should not write output when silent mode is enabled', () => {
    const writer = vi.fn();
    const reporter = new ConsoleReporter({ writer, silent: true, useColors: false });

    const message = reporter.report({
      decision: makeDecision(),
    });

    expect(message).toContain('ALLOW');
    expect(writer).not.toHaveBeenCalled();
  });
});
