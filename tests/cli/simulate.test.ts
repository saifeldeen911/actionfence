import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runSimulate } from '../../src/cli/simulate.js';
import type { CliContext, ParsedArgs } from '../../src/cli/runner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestContext(): CliContext & { stdoutLines: string[]; stderrLines: string[] } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    cwd: process.cwd(),
    stdoutLines,
    stderrLines,
  };
}

function makeArgs(
  positionals: string[],
  flags: Record<string, string | true> = {},
): ParsedArgs {
  return { command: 'simulate', positionals, flags };
}

const POLICY = resolve('tests', 'fixtures', 'valid-policy.json');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cli/simulate', () => {
  it('shows WOULD PASS for allowed action (exit code 0)', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(makeArgs([POLICY], { action: 'search_flights' }), ctx);

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('WOULD PASS');
    expect(output).toContain('search_flights');
  });

  it('shows WOULD BLOCK for denied action (exit code 1)', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(makeArgs([POLICY], { action: 'bulk_booking' }), ctx);

    expect(exitCode).toBe(1);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('WOULD BLOCK');
    expect(output).toContain('bulk_booking');
  });

  it('respects --identity flag (blocks when verified required but anonymous given)', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'anonymous' }),
      ctx,
    );

    expect(exitCode).toBe(1);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('WOULD BLOCK');
  });

  it('passes when --identity matches the required tier', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'verified', spend: '100' }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('WOULD PASS');
  });

  it('respects --spend flag (blocks when over max_spend)', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'verified', spend: '1000' }),
      ctx,
    );

    expect(exitCode).toBe(1);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('WOULD BLOCK');
    expect(output).toContain('spend');
  });

  it('defaults to anonymous identity when --identity is not specified', () => {
    const ctx = createTestContext();
    runSimulate(makeArgs([POLICY], { action: 'search_flights' }), ctx);

    const output = ctx.stdoutLines.join('');
    expect(output).toContain('anonymous');
  });

  it('errors on missing --action flag (exit code 1)', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(makeArgs([POLICY]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing required flag: --action');
  });

  it('errors on missing policy path (exit code 1)', () => {
    const ctx = createTestContext();
    const exitCode = runSimulate(makeArgs([]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing policy file path');
  });

  it('shows the correct tool name when --tool flag is provided', () => {
    const ctx = createTestContext();
    runSimulate(
      makeArgs([POLICY], { action: 'search_flights', tool: 'do_search_v2' }),
      ctx,
    );

    const output = ctx.stdoutLines.join('');
    expect(output).toContain('do_search_v2');
  });

  it('shows spend amount when --spend is provided and action passes', () => {
    const ctx = createTestContext();
    runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'verified', spend: '250' }),
      ctx,
    );

    const output = ctx.stdoutLines.join('');
    expect(output).toContain('$250.00');
  });
});
