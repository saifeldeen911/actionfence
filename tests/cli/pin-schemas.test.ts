import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runPinSchemas } from '../../src/cli/pin-schemas.js';
import type { CliContext, ParsedArgs } from '../../src/cli/runner.js';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

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

function makeArgs(...positionals: string[]): ParsedArgs {
  return { command: 'pin-schemas', positionals, flags: {} };
}

const FIXTURES = resolve('tests', 'fixtures');

// Create a temporary copy of the policy to mutate.
function _copyFixtureToTemp(fixtureName: string): string {
  const source = resolve(FIXTURES, fixtureName);
  const dest = resolve(FIXTURES, `temp-${fixtureName}`);
  const content = readFileSync(source, 'utf-8');
  writeFileSync(dest, content, 'utf-8');
  return dest;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cli/pin-schemas', () => {
  it('returns exit code 1 when path is missing', async () => {
    const ctx = createTestContext();
    const exitCode = await runPinSchemas(makeArgs(), ctx);
    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing policy file path');
  });

  it('returns exit code 1 when server command is missing', async () => {
    const ctx = createTestContext();
    const exitCode = await runPinSchemas(makeArgs('guard-policy.json'), ctx);
    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing policy');
  });

  it('returns exit code 1 when policy file cannot be loaded', async () => {
    const ctx = createTestContext();
    const exitCode = await runPinSchemas(makeArgs('nonexistent.json', 'node server.js'), ctx);
    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Cannot load policy');
  });

  it('returns exit code 1 when policy has no actions', async () => {
    const ctx = createTestContext();
    // Borrow a fixture that is valid JSON but missing the actions map.
    // We'll create a temporary file for this test.
    const tmpPath = resolve(FIXTURES, 'temp-no-actions.json');
    writeFileSync(tmpPath, JSON.stringify({ service: 'Test', version: '1.0.0', default_rule: 'deny' }), 'utf-8');

    try {
      const exitCode = await runPinSchemas(makeArgs(tmpPath, 'node server.js'), ctx);
      expect(exitCode).toBe(1);
      expect(ctx.stderrLines.join('')).toContain('no actions');
    } finally {
      unlinkSync(tmpPath);
    }
  });
});
