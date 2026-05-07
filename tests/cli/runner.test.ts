import { describe, it, expect } from 'vitest';
import { parseArgs, run } from '../../src/cli/runner.js';
import type { CliContext } from '../../src/cli/runner.js';

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

// ---------------------------------------------------------------------------
// parseArgs tests
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  it('extracts the first non-flag token as the command', () => {
    const result = parseArgs(['validate', 'foo.json']);
    expect(result.command).toBe('validate');
    expect(result.positionals).toEqual(['foo.json']);
  });

  it('parses --key value flags', () => {
    const result = parseArgs(['init', '--service', 'MyAPI']);
    expect(result.flags['service']).toBe('MyAPI');
  });

  it('parses --key=value flags', () => {
    const result = parseArgs(['init', '--service=MyAPI']);
    expect(result.flags['service']).toBe('MyAPI');
  });

  it('parses boolean --flags', () => {
    const result = parseArgs(['--help']);
    expect(result.flags['help']).toBe(true);
  });

  it('parses short -f flags', () => {
    const result = parseArgs(['-h']);
    expect(result.flags['h']).toBe(true);
  });

  it('parses short -f value flags', () => {
    const result = parseArgs(['-o', 'output.json']);
    expect(result.flags['o']).toBe('output.json');
  });

  it('handles -- sentinel to stop flag parsing', () => {
    const result = parseArgs(['validate', '--', '--not-a-flag']);
    expect(result.command).toBe('validate');
    expect(result.positionals).toEqual(['--not-a-flag']);
    expect(result.flags).toEqual({});
  });

  it('returns undefined command when no tokens', () => {
    const result = parseArgs([]);
    expect(result.command).toBeUndefined();
    expect(result.positionals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// run() tests
// ---------------------------------------------------------------------------

describe('run', () => {
  it('returns exit code 0 for --help', async () => {
    const ctx = createTestContext();
    const exitCode = await run(['--help'], ctx);
    expect(exitCode).toBe(0);
    expect(ctx.stdoutLines.join('')).toContain('ActionFence');
  });

  it('returns exit code 0 for -h', async () => {
    const ctx = createTestContext();
    const exitCode = await run(['-h'], ctx);
    expect(exitCode).toBe(0);
  });

  it('returns exit code 0 for --version', async () => {
    const ctx = createTestContext();
    const exitCode = await run(['--version'], ctx);
    expect(exitCode).toBe(0);
    expect(ctx.stdoutLines.join('')).toContain('actionfence');
  });

  it('returns exit code 1 for unknown command', async () => {
    const ctx = createTestContext();
    const exitCode = await run(['foobar'], ctx);
    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Unknown command');
  });

  it('returns exit code 0 when no command (just shows help)', async () => {
    const ctx = createTestContext();
    const exitCode = await run([], ctx);
    expect(exitCode).toBe(0);
    expect(ctx.stdoutLines.join('')).toContain('ActionFence');
  });
});
