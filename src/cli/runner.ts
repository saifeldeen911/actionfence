/**
 * @module cli/runner
 * Command dispatcher and argument parser for the ActionFence CLI.
 * No external CLI framework — the surface is small enough for hand-rolled parsing.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { runInit } from './init.js';
import { runValidate } from './validate.js';
import { runSimulate } from './simulate.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Injectable I/O context for testability. */
export interface CliContext {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
  readonly cwd: string;
}

/** Result of parsing raw argv tokens. */
export interface ParsedArgs {
  readonly command: string | undefined;
  readonly positionals: readonly string[];
  readonly flags: Readonly<Record<string, string | true>>;
}

// ---------------------------------------------------------------------------
// Default context (production)
// ---------------------------------------------------------------------------

function defaultContext(): CliContext {
  return {
    stdout: (msg: string) => process.stdout.write(msg),
    stderr: (msg: string) => process.stderr.write(msg),
    cwd: process.cwd(),
  };
}

// ---------------------------------------------------------------------------
// Entry — exported for programmatic use and testing
// ---------------------------------------------------------------------------

/**
 * Run the ActionFence CLI with the given argv tokens.
 * Returns an exit code (0 = success, 1 = error).
 */
export async function run(argv: readonly string[], context?: Partial<CliContext>): Promise<number> {
  const ctx: CliContext = { ...defaultContext(), ...context };
  const args = parseArgs(argv);

  if (args.flags['help'] === true || args.flags['h'] === true) {
    printHelp(ctx);
    return 0;
  }

  if (args.flags['version'] === true || args.flags['v'] === true) {
    printVersion(ctx);
    return 0;
  }

  switch (args.command) {
    case 'init':
      return runInit(args, ctx);
    case 'validate':
      return runValidate(args, ctx);
    case 'simulate':
      return runSimulate(args, ctx);
    default:
      if (args.command) {
        ctx.stderr(`Unknown command: ${args.command}\n\n`);
      }
      printHelp(ctx);
      return args.command ? 1 : 0;
  }
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

/**
 * Parse argv tokens into a structured representation.
 *
 * Supports:
 * - `--flag value` and `--flag=value` for string flags
 * - `--flag` (no value) for boolean flags
 * - `-f value` and `-f` for short flags
 * - First non-flag token becomes the command
 * - Remaining non-flag tokens become positionals
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | true> = {};
  let command: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg === '--') {
      // Everything after -- is positional
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eqIndex = body.indexOf('=');

      if (eqIndex !== -1) {
        flags[body.slice(0, eqIndex)] = body.slice(eqIndex + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !isFlagToken(next)) {
          flags[body] = next;
          i++;
        } else {
          flags[body] = true;
        }
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !isFlagToken(next)) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (command === undefined) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  return Object.freeze({
    command,
    positionals: Object.freeze(positionals),
    flags: Object.freeze(flags),
  });
}

function isFlagToken(value: string): boolean {
  return /^-{1,2}[A-Za-z]/.test(value);
}

// ---------------------------------------------------------------------------
// Help & version
// ---------------------------------------------------------------------------

function printHelp(ctx: CliContext): void {
  const title = chalk.bold('ActionFence');
  const tagline = chalk.dim('AI Action Firewall for MCP servers and APIs');

  ctx.stdout(`
${title} — ${tagline}

${chalk.yellow('Usage:')}
  actionfence <command> [options]

${chalk.yellow('Commands:')}
  ${chalk.cyan('init')}                  Generate a starter guard-policy.json
  ${chalk.cyan('validate')} <path>       Validate a policy file against the schema
  ${chalk.cyan('simulate')} <path>       Dry-run a policy evaluation

${chalk.yellow('Options:')}
  --help, -h            Show this help message
  --version, -v         Show version number

${chalk.yellow('Examples:')}
  actionfence init --service MyAPI
  actionfence validate guard-policy.json
  actionfence simulate guard-policy.json --action book_flight --identity anonymous --tool do_search_v2

${chalk.dim('Documentation: README.md')}
`);
}

function printVersion(ctx: CliContext): void {
  ctx.stdout(`actionfence ${getVersion()}\n`);
}

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
