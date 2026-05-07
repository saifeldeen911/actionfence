/**
 * @module cli/init
 * `actionfence init` — scaffolds a starter guard-policy.json.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, resolve, sep } from 'node:path';
import chalk from 'chalk';
import type { ParsedArgs, CliContext } from './runner.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FILENAME = 'guard-policy.json';
const DEFAULT_SERVICE_NAME = 'my-service';

// ---------------------------------------------------------------------------
// Starter policy template
// ---------------------------------------------------------------------------

function createStarterPolicy(serviceName: string): string {
  const policy = {
    $schema: 'https://raw.githubusercontent.com/saifeldeen911/actionfence/main/schemas/guard-policy.schema.json',
    service: serviceName,
    version: '1.0',
    default_rule: 'deny',
    actions: {
      example_read: {
        allowed: true,
        identity: 'any',
      },
      example_write: {
        allowed: true,
        identity: 'verified',
        requires_human_approval: true,
      },
      example_blocked: {
        allowed: false,
      },
    },
    rate_limits: {
      requests_per_minute: 60,
      transactions_per_day: 10,
    },
  };

  return JSON.stringify(policy, null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------

/**
 * Generate a starter guard-policy.json in the working directory.
 *
 * Flags:
 *   --output <path>    Output file path (default: ./guard-policy.json)
 *   --service <name>   Service name to embed in the policy (default: my-service)
 */
export function runInit(args: ParsedArgs, ctx: CliContext): number {
  const outputFlag = typeof args.flags['output'] === 'string' ? args.flags['output'] : undefined;
  const serviceFlag = typeof args.flags['service'] === 'string' ? args.flags['service'] : undefined;

  const serviceName = serviceFlag ?? DEFAULT_SERVICE_NAME;
  const outputPath = resolve(ctx.cwd, outputFlag ?? DEFAULT_FILENAME);

  if (existsSync(outputPath)) {
    ctx.stderr(
      `${chalk.red('✗')} File already exists: ${outputPath}\n` +
        `  Remove it first or specify a different path with --output\n`,
    );
    return 1;
  }

  const content = createStarterPolicy(serviceName);

  try {
    writeFileSync(outputPath, content, { encoding: 'utf-8' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`${chalk.red('✗')} Failed to write file: ${message}\n`);
    return 1;
  }

  const filename = outputFlag ?? DEFAULT_FILENAME;
  const displayName = basename(filename);
  const examplePath =
    isAbsolute(filename) ||
    filename.includes(sep) ||
    filename.startsWith('./') ||
    filename.startsWith('../')
      ? filename
      : `./${filename}`;

  ctx.stdout(
    `${chalk.green('✓')} Created ${chalk.bold(displayName)}\n` +
      `\n` +
      `${chalk.yellow('Next steps:')}\n` +
      `  1. Edit the policy to match your tool names\n` +
      `  2. Add to your MCP server:\n` +
      `     ${chalk.cyan("import { withGuard } from 'actionfence';")}\n` +
      `     ${chalk.cyan(`withGuard(server, { policy: '${examplePath}' });`)}\n` +
      `  3. Validate: ${chalk.cyan(`npx actionfence validate ${examplePath}`)}\n`,
  );

  return 0;
}
