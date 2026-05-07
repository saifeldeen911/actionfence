/**
 * @module cli/validate
 * `actionfence validate <path>` — validates a policy file against the JSON Schema.
 */

import chalk from 'chalk';
import { loadPolicy } from '../core/policy-loader.js';
import { PolicyLoadError, PolicyValidationError } from '../types/errors.js';
import type { GuardPolicy } from '../types/policy.js';
import type { ParsedArgs, CliContext } from './runner.js';

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------

/**
 * Validate a guard-policy.json file and print a summary.
 *
 * Usage:
 *   actionfence validate <policy-path>
 *
 * Exit codes:
 *   0 — policy is valid
 *   1 — policy is invalid or file cannot be loaded
 */
export function runValidate(args: ParsedArgs, ctx: CliContext): number {
  const filePath = args.positionals[0];

  if (!filePath) {
    ctx.stderr(
      `${chalk.red('✗')} Missing policy file path\n` +
      `\n` +
      `${chalk.yellow('Usage:')}\n` +
      `  actionfence validate <path>\n` +
      `\n` +
      `${chalk.yellow('Example:')}\n` +
      `  actionfence validate guard-policy.json\n`,
    );
    return 1;
  }

  let policy: GuardPolicy;
  try {
    policy = loadPolicy(filePath);
  } catch (error: unknown) {
    if (error instanceof PolicyValidationError) {
      ctx.stderr(
        `${chalk.red('✗')} Invalid policy: ${chalk.bold(filePath)}\n\n` +
        formatValidationErrors(error.validationErrors) + '\n',
      );
      return 1;
    }

    if (error instanceof PolicyLoadError) {
      ctx.stderr(`${chalk.red('✗')} Cannot load policy: ${error.message}\n`);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`${chalk.red('✗')} Unexpected error: ${message}\n`);
    return 1;
  }

  ctx.stdout(
    `${chalk.green('✓')} Valid policy: ${chalk.bold(filePath)}\n` +
    `\n` +
    formatPolicySummary(policy),
  );

  return 0;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatPolicySummary(policy: GuardPolicy): string {
  const actionCount = Object.keys(policy.actions).length;
  const rpmLabel = policy.rate_limits?.requests_per_minute ?? 'unlimited';
  const tpdLabel = policy.rate_limits?.transactions_per_day ?? 'unlimited';
  const regLabel = policy.regulations?.length
    ? policy.regulations.join(', ')
    : chalk.dim('none');

  const lines = [
    `  ${chalk.dim('Service:')}         ${policy.service}`,
    `  ${chalk.dim('Version:')}         ${policy.version}`,
    `  ${chalk.dim('Default rule:')}    ${policy.default_rule}`,
    `  ${chalk.dim('Actions:')}         ${actionCount} defined`,
    `  ${chalk.dim('Rate limits:')}     ${rpmLabel} req/min, ${tpdLabel} txn/day`,
    `  ${chalk.dim('Regulations:')}     ${regLabel}`,
  ];

  return lines.join('\n') + '\n';
}

function formatValidationErrors(errors: readonly string[]): string {
  return errors.map((err) => `  ${chalk.red('•')} ${err}`).join('\n');
}
