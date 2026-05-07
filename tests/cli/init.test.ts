import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { runInit } from '../../src/cli/init.js';
import { loadPolicy } from '../../src/core/policy-loader.js';
import type { CliContext, ParsedArgs } from '../../src/cli/runner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempDir(): string {
  const dir = join(tmpdir(), `actionfence-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createTestContext(cwd: string): CliContext & { stdoutLines: string[]; stderrLines: string[] } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    cwd,
    stdoutLines,
    stderrLines,
  };
}

function makeArgs(flags: Record<string, string | true> = {}): ParsedArgs {
  return { command: 'init', positionals: [], flags };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cli/init', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a valid guard-policy.json with default service name', () => {
    const ctx = createTestContext(tempDir);
    const exitCode = runInit(makeArgs(), ctx);

    expect(exitCode).toBe(0);
    const filePath = join(tempDir, 'guard-policy.json');
    expect(existsSync(filePath)).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.service).toBe('my-service');
    expect(content.default_rule).toBe('deny');
    expect(content.spend_limits).toEqual({
      session_max: 1000,
      daily_max: 2500,
      currency: 'USD',
    });
    expect(content.$schema).toContain('guard-policy.schema.json');
    expect(ctx.stdoutLines.join('')).toContain('Created');
  });

  it('uses --service flag for custom service name', () => {
    const ctx = createTestContext(tempDir);
    const exitCode = runInit(makeArgs({ service: 'BookFlight.com' }), ctx);

    expect(exitCode).toBe(0);
    const filePath = join(tempDir, 'guard-policy.json');
    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.service).toBe('BookFlight.com');
  });

  it('uses --output flag for custom file path', () => {
    const ctx = createTestContext(tempDir);
    const outputPath = join('subfolder', 'custom-policy.json');
    mkdirSync(join(tempDir, 'subfolder'), { recursive: true });

    const exitCode = runInit(makeArgs({ output: outputPath }), ctx);

    expect(exitCode).toBe(0);
    expect(existsSync(resolve(tempDir, outputPath))).toBe(true);
  });

  it('aborts if file already exists (exit code 1)', () => {
    const ctx = createTestContext(tempDir);
    writeFileSync(join(tempDir, 'guard-policy.json'), '{}');

    const exitCode = runInit(makeArgs(), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('already exists');
  });

  it('generates a policy that passes loadPolicy() schema validation', () => {
    const ctx = createTestContext(tempDir);
    runInit(makeArgs({ service: 'ValidService' }), ctx);

    const filePath = join(tempDir, 'guard-policy.json');
    const policy = loadPolicy(filePath);

    expect(policy.service).toBe('ValidService');
    expect(policy.version).toBe('1.0');
    expect(policy.default_rule).toBe('deny');
    expect(Object.keys(policy.actions).length).toBeGreaterThan(0);
  });

  it('writes valid JSON that round-trips correctly', () => {
    const ctx = createTestContext(tempDir);
    runInit(makeArgs(), ctx);

    const filePath = join(tempDir, 'guard-policy.json');
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const re = JSON.stringify(parsed, null, 2) + '\n';

    expect(raw).toBe(re);
  });
});
