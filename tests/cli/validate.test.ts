import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runValidate } from '../../src/cli/validate.js';
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

function makeArgs(positionals: string[] = [], flags: Record<string, string | true> = {}): ParsedArgs {
  return { command: 'validate', positionals, flags };
}

const FIXTURES = resolve('tests', 'fixtures');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cli/validate', () => {
  it('validates a correct policy file (exit code 0)', () => {
    const ctx = createTestContext();
    const exitCode = runValidate(makeArgs([resolve(FIXTURES, 'valid-policy.json')]), ctx);

    expect(exitCode).toBe(0);
    const output = ctx.stdoutLines.join('');
    expect(output).toContain('Valid policy');
    expect(output).toContain('TestService');
  });

  it('reports validation errors for invalid policy (exit code 1)', () => {
    const ctx = createTestContext();
    const exitCode = runValidate(makeArgs([resolve(FIXTURES, 'missing-service.json')]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Invalid policy');
  });

  it('reports load error for missing file (exit code 1)', () => {
    const ctx = createTestContext();
    const exitCode = runValidate(makeArgs([resolve(FIXTURES, 'nonexistent.json')]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Cannot load policy');
  });

  it('reports parse error for malformed JSON (exit code 1)', () => {
    const ctx = createTestContext();
    const exitCode = runValidate(makeArgs([resolve(FIXTURES, 'malformed.json')]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Cannot load policy');
  });

  it('prints policy summary on success', () => {
    const ctx = createTestContext();
    runValidate(makeArgs([resolve(FIXTURES, 'valid-policy.json')]), ctx);

    const output = ctx.stdoutLines.join('');
    expect(output).toContain('4 defined');
    expect(output).toContain('30 req/min');
    expect(output).toContain('5 txn/day');
    expect(output).toContain('session 1000.00 USD');
    expect(output).toContain('daily 2500.75 USD');
    expect(output).toContain('EU_AI_Act_Art50');
  });

  it('returns exit code 1 when no path is provided', () => {
    const ctx = createTestContext();
    const exitCode = runValidate(makeArgs([]), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing policy file path');
  });
});
