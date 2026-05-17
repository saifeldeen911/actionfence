import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { runPinSchemas } from '../../src/cli/pin-schemas.js';
import type { CliContext, ParsedArgs } from '../../src/cli/runner.js';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import * as mcpClient from '../../src/cli/mcp-client.js';

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
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  it('pins schemas for matching tools and writes updated policy', async () => {
    const tmpPath = resolve(FIXTURES, 'temp-pin-test.json');
    const source = resolve(FIXTURES, 'valid-policy.json');
    const content = readFileSync(source, 'utf-8');
    writeFileSync(tmpPath, content, 'utf-8');

    const mockTools = [
      {
        name: 'search_flights',
        description: 'Search for flights',
        inputSchema: { type: 'object', properties: { from: { type: 'string' } } },
      },
      {
        name: 'book_flight',
        description: 'Book a flight',
        inputSchema: { type: 'object', properties: { flightId: { type: 'string' } } },
      },
    ];

    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(mockTools);

    const ctx = createTestContext();
    const exitCode = await runPinSchemas(makeArgs(tmpPath, 'node server.js'), ctx);

    expect(exitCode).toBe(0);
    expect(ctx.stdoutLines.join('')).toContain('Pinned schemas for 2 tools');

    const updated = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(updated.actions.search_flights.schema_hash).toBeDefined();
    expect(updated.actions.book_flight.schema_hash).toBeDefined();

    unlinkSync(tmpPath);
  });

  it('reports when schemas are already up to date', async () => {
    const tmpPath = resolve(FIXTURES, 'temp-pin-uptodate.json');
    const source = resolve(FIXTURES, 'valid-policy.json');
    const content = readFileSync(source, 'utf-8');
    const policy = JSON.parse(content);

    const mockTools = [
      {
        name: 'search_flights',
        description: 'Search for flights',
        inputSchema: { type: 'object', properties: { from: { type: 'string' } } },
      },
    ];

    const { SchemaValidator } = await import('../../src/core/schema-validator.js');
    const hash = SchemaValidator.hashSchema(mockTools[0].inputSchema);
    policy.actions.search_flights.schema_hash = hash;

    writeFileSync(tmpPath, JSON.stringify(policy, null, 2) + '\n', 'utf-8');

    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(mockTools);

    const ctx = createTestContext();
    const exitCode = await runPinSchemas(makeArgs(tmpPath, 'node server.js'), ctx);

    expect(exitCode).toBe(0);
    expect(ctx.stdoutLines.join('')).toContain('All schemas are already up to date');

    unlinkSync(tmpPath);
  });
});
