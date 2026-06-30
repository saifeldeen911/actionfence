import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { runGenerate } from '../../src/cli/generate.js';
import { loadPolicy } from '../../src/core/policy-loader.js';
import { SchemaValidator } from '../../src/core/schema-validator.js';
import type { CliContext, ParsedArgs } from '../../src/cli/runner.js';
import * as mcpClient from '../../src/cli/mcp-client.js';

function createTempDir(): string {
  const dir = join(tmpdir(), `actionfence-generate-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createTestContext(
  cwd: string,
): CliContext & { stdoutLines: string[]; stderrLines: string[] } {
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

function makeArgs(
  positionals: string[] = [],
  flags: Record<string, string | true> = {},
): ParsedArgs {
  return { command: 'generate', positionals, flags };
}

const MOCK_TOOLS = [
  {
    name: 'book_flight',
    description: 'Book a flight',
    inputSchema: {
      type: 'object',
      properties: {
        flightId: { type: 'string' },
      },
      required: ['flightId'],
    },
  },
  {
    name: 'search_flights',
    description: 'Search for flights',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
];

describe('cli/generate', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns exit code 1 when server command is missing', async () => {
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(makeArgs(), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Missing server command');
  });

  it('returns exit code 1 when discovery fails', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockRejectedValue(new Error('server crashed'));
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(makeArgs(['node server.js']), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Failed to fetch tools');
    expect(existsSync(join(tempDir, 'guard-policy.json'))).toBe(false);
  });

  it('returns exit code 1 when zero tools are discovered', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue([]);
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(makeArgs(['node server.js']), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('zero tools');
    expect(existsSync(join(tempDir, 'guard-policy.json'))).toBe(false);
  });

  it('returns exit code 1 when duplicate tool names are discovered', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue([
      MOCK_TOOLS[0],
      {
        name: MOCK_TOOLS[0].name,
        inputSchema: { type: 'object', properties: { duplicate: { type: 'boolean' } } },
      },
    ]);
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(makeArgs(['node server.js']), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('Duplicate tool names discovered');
    expect(ctx.stderrLines.join('')).toContain('"book_flight"');
    expect(existsSync(join(tempDir, 'guard-policy.json'))).toBe(false);
  });

  it('refuses to overwrite an existing output file before discovery', async () => {
    const spy = vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(MOCK_TOOLS);
    writeFileSync(join(tempDir, 'guard-policy.json'), '{}', 'utf-8');
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(makeArgs(['node server.js']), ctx);

    expect(exitCode).toBe(1);
    expect(ctx.stderrLines.join('')).toContain('already exists');
    expect(spy).not.toHaveBeenCalled();
  });

  it('generates default-deny actions that are all blocked', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(MOCK_TOOLS);
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(makeArgs(['node server.js']), ctx);

    expect(exitCode).toBe(0);
    const generated = JSON.parse(readFileSync(join(tempDir, 'guard-policy.json'), 'utf-8'));
    const policy = loadPolicy(generated);

    expect(policy.service).toBe('my-service');
    expect(policy.version).toBe('1.0');
    expect(policy.default_rule).toBe('deny');
    expect(Object.keys(policy.actions)).toEqual(['book_flight', 'search_flights']);
    expect(policy.actions.book_flight?.allowed).toBe(false);
    expect(policy.actions.search_flights?.allowed).toBe(false);
    expect(policy.actions.book_flight?.schema_hash).toBeUndefined();
    expect(ctx.stdoutLines.join('')).toContain('review starting point');
    expect(ctx.stdoutLines.join('')).toContain('allowed: false');
  });

  it('honors --service, --output, and --default-rule', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(MOCK_TOOLS);
    mkdirSync(join(tempDir, 'policies'), { recursive: true });
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(
      makeArgs(['node server.js'], {
        service: 'BookingAPI',
        output: join('policies', 'generated-policy.json'),
        'default-rule': 'allow',
      }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const generatedPath = join(tempDir, 'policies', 'generated-policy.json');
    const generated = JSON.parse(readFileSync(generatedPath, 'utf-8'));

    expect(generated.service).toBe('BookingAPI');
    expect(generated.default_rule).toBe('allow');
    expect(generated.actions.book_flight.allowed).toBe(false);
    expect(ctx.stdoutLines.join('')).toContain('default_rule: allow');
  });

  it('prints a shell-safe validate command for paths and commands with spaces or quotes', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(MOCK_TOOLS);
    mkdirSync(join(tempDir, 'policies with spaces'), { recursive: true });
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(
      makeArgs([`node "server file.js"`], {
        output: join('policies with spaces', `guard policy's.json`),
      }),
      ctx,
    );

    expect(exitCode).toBe(0);
    expect(ctx.stdoutLines.join('')).toContain(
      `actionfence validate 'policies with spaces\\guard policy'"'"'s.json' 'node "server file.js"'`,
    );
  });

  it('writes deterministic schema hashes when --pin-schemas is passed', async () => {
    vi.spyOn(mcpClient, 'fetchMcpTools').mockResolvedValue(MOCK_TOOLS);
    const ctx = createTestContext(tempDir);

    const exitCode = await runGenerate(
      makeArgs(['node server.js'], {
        'pin-schemas': true,
      }),
      ctx,
    );

    expect(exitCode).toBe(0);
    const generated = JSON.parse(readFileSync(join(tempDir, 'guard-policy.json'), 'utf-8'));

    expect(generated.actions.book_flight.schema_hash).toBe(
      SchemaValidator.hashSchema(MOCK_TOOLS[0].inputSchema),
    );
    expect(generated.actions.search_flights.schema_hash).toBe(
      SchemaValidator.hashSchema(MOCK_TOOLS[1].inputSchema),
    );
    expect(loadPolicy(generated).actions.book_flight?.schema_hash).toMatch(/^sha256:/);
  });
});
