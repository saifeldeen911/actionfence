/**
 * @module cli/validate
 * `actionfence validate <path>` - validates a policy file against the JSON Schema.
 */

import chalk from 'chalk';
import { loadPolicy } from '../core/policy-loader.js';
import { PolicyLoadError, PolicyValidationError } from '../types/errors.js';
import type { GuardPolicy } from '../types/policy.js';
import type { ParsedArgs, CliContext } from './runner.js';
import { fetchMcpTools } from './mcp-client.js';
import { SchemaValidator } from '../core/schema-validator.js';

/**
 * Validate a guard-policy.json file and print a summary.
 *
 * Exit codes:
 *   0 - policy is valid
 *   1 - policy is invalid or file cannot be loaded
 */
export async function runValidate(args: ParsedArgs, ctx: CliContext): Promise<number> {
  const filePath = args.positionals[0];
  const serverCommand = args.positionals[1];

  if (!filePath) {
    ctx.stderr(
      `${chalk.red('x')} Missing policy file path\n` +
        `\n` +
        `${chalk.yellow('Usage:')}\n` +
        `  actionfence validate <path> [server-command]\n` +
        `\n` +
        `${chalk.yellow('Example:')}\n` +
        `  actionfence validate guard-policy.json "node server.js"\n`,
    );
    return 1;
  }

  let policy: GuardPolicy;
  try {
    policy = loadPolicy(filePath);
  } catch (error: unknown) {
    if (error instanceof PolicyValidationError) {
      ctx.stderr(
        `${chalk.red('x')} Invalid policy: ${chalk.bold(filePath)}\n\n` +
          formatValidationErrors(error.validationErrors) +
          '\n',
      );
      return 1;
    }

    if (error instanceof PolicyLoadError) {
      ctx.stderr(`${chalk.red('x')} Cannot load policy: ${error.message}\n`);
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`${chalk.red('x')} Unexpected error: ${message}\n`);
    return 1;
  }

  ctx.stdout(
    `${chalk.green('ok')} Valid policy: ${chalk.bold(filePath)}\n` +
      `\n` +
      formatPolicySummary(policy),
  );

  if (serverCommand) {
    try {
      ctx.stdout(`${chalk.blue('i')} Fetching tools from server...\n`);
      const tools = await fetchMcpTools(serverCommand);
      let driftCount = 0;

      for (const tool of tools) {
        const actionConfig = policy.actions[tool.name];
        if (actionConfig && actionConfig.schema_hash) {
          const currentHash = SchemaValidator.hashSchema(tool.inputSchema);
          if (currentHash !== actionConfig.schema_hash) {
            ctx.stderr(
              `${chalk.yellow('!')} Schema drift detected for tool "${tool.name}"\n` +
                `    Pinned:  ${actionConfig.schema_hash}\n` +
                `    Current: ${currentHash}\n`,
            );
            driftCount++;
          }
        }
      }

      if (driftCount === 0) {
        ctx.stdout(`${chalk.green('ok')} No schema drift detected.\n`);
      } else {
        ctx.stdout(`${chalk.yellow('!')} Total drifted schemas: ${driftCount}\n`);
      }
    } catch (error: unknown) {
      ctx.stderr(`${chalk.red('x')} Failed to fetch tools from server: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  return 0;
}

function formatPolicySummary(policy: GuardPolicy): string {
  const actionCount = Object.keys(policy.actions).length;
  const rpmLabel = policy.rate_limits?.requests_per_minute ?? 'unlimited';
  const tpdLabel = policy.rate_limits?.transactions_per_day ?? 'unlimited';
  const spendLabel = formatSpendLimits(policy);
  const regLabel = policy.regulations?.length ? policy.regulations.join(', ') : chalk.dim('none');

  const lines = [
    `  ${chalk.dim('Service:')}         ${policy.service}`,
    `  ${chalk.dim('Version:')}         ${policy.version}`,
    `  ${chalk.dim('Default rule:')}    ${policy.default_rule}`,
    `  ${chalk.dim('Actions:')}         ${actionCount} defined`,
    `  ${chalk.dim('Rate limits:')}     ${rpmLabel} req/min, ${tpdLabel} txn/day`,
    `  ${chalk.dim('Spend limits:')}    ${spendLabel}`,
    `  ${chalk.dim('Regulations:')}     ${regLabel}`,
  ];

  return lines.join('\n') + '\n';
}

function formatValidationErrors(errors: readonly string[]): string {
  return errors.map((error) => `  - ${error}`).join('\n');
}

function formatSpendLimits(policy: GuardPolicy): string {
  const sessionMax = policy.spend_limits?.session_max;
  const dailyMax = policy.spend_limits?.daily_max;
  const currency = policy.spend_limits?.currency;

  if (sessionMax === undefined && dailyMax === undefined) {
    return chalk.dim('unlimited');
  }

  const parts: string[] = [];
  if (sessionMax !== undefined) {
    parts.push(`session ${formatMoney(sessionMax, currency)}`);
  }
  if (dailyMax !== undefined) {
    parts.push(`daily ${formatMoney(dailyMax, currency)}`);
  }

  return parts.join(', ');
}

function formatMoney(amount: number, currency: string | undefined): string {
  return currency ? `${amount.toFixed(2)} ${currency}` : amount.toFixed(2);
}
