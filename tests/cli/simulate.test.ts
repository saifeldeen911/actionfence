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

function makeArgs(positionals: string[], flags: Record<string, string | true> = {}): ParsedArgs {
  return { command: 'simulate', positionals, flags };
}

const POLICY = resolve('tests', 'fixtures', 'valid-policy.json');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cli/simulate', () => {
  it('shows PASS for allowed action (exit code 0)', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(makeArgs([POLICY], { action: 'search_flights' }), ctx);

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('PASS');
    expect(output).toContain('search_flights');
  });

  it('shows BLOCK for denied action (exit code 1)', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(makeArgs([POLICY], { action: 'bulk_booking' }), ctx);

    expect(exitCode).toBe(1);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('BLOCK');
    expect(output).toContain('bulk_booking');
  });

  it('respects --identity flag (blocks when verified required but anonymous given)', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'anonymous' }),
      ctx,
    );

    expect(exitCode).toBe(1);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('BLOCK');
  });

  it('passes when --identity matches the required tier', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'verified', spend: '100' }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('PASS');
  });

  it('accepts uppercase identity tiers', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'VERIFIED', spend: '100' }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('PASS');
  });

  it('respects --spend flag (blocks when over max_spend)', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'verified', spend: '1000' }),
      ctx,
    );

    expect(exitCode).toBe(1);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('BLOCK');
    expect(output).toContain('spend');
  });

  it('defaults to anonymous identity when --identity is not specified', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(makeArgs([POLICY], { action: 'search_flights' }), ctx);

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('anonymous');
  });

  it('errors on missing --action flag (exit code 1)', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(makeArgs([POLICY]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing required flag: --action');
  });

  it('errors on missing policy path (exit code 1)', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(makeArgs([]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing policy file path');
  });

  it('shows the correct tool name when --tool flag is provided', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(
      makeArgs([POLICY], { action: 'search_flights', tool: 'do_search_v2' }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('do_search_v2');
  });

  it('shows spend amount when --spend is provided and action passes', async () => {
    const ctx = createTestContext();
    const exitCode = await runSimulate(
      makeArgs([POLICY], { action: 'book_flight', identity: 'verified', spend: '250' }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toMatch(/Session total:\s+250\.00\s+USD/);
  });
});
