/**
 * @module cli/simulate
 * `actionfence simulate <path>` - dry-run a single action against a policy file.
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import { loadPolicy } from '../core/policy-loader.js';
import { GuardEngine } from '../middleware/engine.js';
import type { SimulationPreview } from '../middleware/simulation.js';
import type {
  AgentIdentity,
  IdentityClassification,
  IdentityReaderLike,
} from '../types/identity.js';
import type { ParsedArgs, CliContext } from './runner.js';

const VALID_IDENTITY_TIERS: readonly IdentityClassification[] = ['anonymous', 'token', 'verified'];

/**
 * Dry-run a policy evaluation for a single action.
 *
 * Exit codes:
 *   0 - action would pass
 *   1 - action would be blocked, or invalid arguments
 */
export async function runSimulate(args: ParsedArgs, ctx: CliContext): Promise<number> {
  const filePath = args.positionals[0];
  const actionFlag = typeof args.flags.action === 'string' ? args.flags.action : undefined;
  const identityFlag = typeof args.flags.identity === 'string' ? args.flags.identity : undefined;
  const spendFlag = typeof args.flags.spend === 'string' ? args.flags.spend : undefined;
  const toolFlag = typeof args.flags.tool === 'string' ? args.flags.tool : undefined;

  if (!filePath) {
    ctx.stderr(
      `${chalk.red('x')} Missing policy file path\n` +
        `\n` +
        `${chalk.yellow('Usage:')}\n` +
        `  actionfence simulate <path> --action <name> [--identity <tier>] [--spend <amount>] [--tool <name>]\n`,
    );
    return 1;
  }

  if (!actionFlag) {
    ctx.stderr(
      `${chalk.red('x')} Missing required flag: --action\n` +
        `\n` +
        `${chalk.yellow('Usage:')}\n` +
        `  actionfence simulate ${filePath} --action <name> [--identity <tier>] [--spend <amount>] [--tool <name>]\n`,
    );
    return 1;
  }

  const normalizedIdentityFlag = identityFlag?.toLowerCase().trim();
  if (
    identityFlag &&
    !VALID_IDENTITY_TIERS.includes(normalizedIdentityFlag as IdentityClassification)
  ) {
    ctx.stderr(
      `${chalk.red('x')} Invalid identity tier: "${normalizedIdentityFlag}"\n` +
        `  Valid values: ${VALID_IDENTITY_TIERS.join(', ')}\n`,
    );
    return 1;
  }

  const identityTier = parseIdentityTier(normalizedIdentityFlag);
  const spendAmount = parseSpendAmount(spendFlag, ctx);
  if (spendAmount === undefined) {
    return 1;
  }

  let engine: GuardEngine | null = null;
  try {
    const policy = loadPolicy(resolve(ctx.cwd, filePath));
    const toolName = toolFlag ?? actionFlag;
    const identity = createMockIdentity(identityTier);
    const identityReader: IdentityReaderLike = {
      readIdentity: async () => identity,
    };

    engine = new GuardEngine({
      policy,
      identityReader,
      silent: true,
      spendExtractor: () => spendAmount,
      actionResolver: () => actionFlag,
    });

    const result = await engine.evaluate({
      toolName,
      params: {
        action: actionFlag,
        tool: toolName,
        spend: spendAmount,
      },
      mode: 'simulate',
    });

    printSimulationResult(ctx, result.preview, policy.spend_limits?.currency);
    return result.allowed ? 0 : 1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`${chalk.red('x')} Simulation failed: ${message}\n`);
    return 1;
  } finally {
    engine?.dispose();
  }
}

function parseIdentityTier(value: string | undefined): IdentityClassification {
  if (!value) {
    return 'anonymous';
  }

  const normalized = value.toLowerCase().trim();
  return VALID_IDENTITY_TIERS.includes(normalized as IdentityClassification)
    ? (normalized as IdentityClassification)
    : 'anonymous';
}

function parseSpendAmount(value: string | undefined, ctx: CliContext): number | null | undefined {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    ctx.stderr(
      `${chalk.red('x')} Invalid spend amount: "${value}" - must be a non-negative number\n`,
    );
    return undefined;
  }

  return parsed;
}

function createMockIdentity(tier: IdentityClassification): AgentIdentity {
  return Object.freeze({
    classification: tier,
    agentId: `cli-${tier}`,
    ownerId: null,
    capabilities: [],
    rawToken: null,
  });
}

function printSimulationResult(
  ctx: CliContext,
  preview: SimulationPreview | null,
  currency: string | undefined,
): void {
  if (!preview) {
    ctx.stdout(`${chalk.red('x')} No simulation preview was produced\n`);
    return;
  }

  const passed = preview.status === 'PASSED';
  const header = chalk.bold.yellow('SIMULATION') + chalk.dim(' - actionfence');
  const statusLine = passed ? chalk.green('PASS') : chalk.red('BLOCK');
  const spendLabel =
    preview.spendAmount !== null ? formatMoney(preview.spendAmount, currency) : chalk.dim('none');
  const approvalLabel = preview.requiresHumanApproval
    ? chalk.yellow('required')
    : chalk.dim('not required');
  const rateLimitLabel = preview.rateLimit
    ? `${preview.rateLimit.remaining}/${preview.rateLimit.limit} remaining`
    : chalk.dim('unlimited');
  const sessionLabel = preview.spendSnapshot
    ? formatMoney(preview.spendSnapshot.sessionTotal, currency)
    : chalk.dim('n/a');
  const dailyLabel = preview.spendSnapshot
    ? formatMoney(preview.spendSnapshot.dailyTotal, currency)
    : chalk.dim('n/a');

  const lines = [
    '',
    header,
    '',
    `  ${chalk.dim('Action:')}          ${preview.action}`,
    `  ${chalk.dim('Tool:')}            ${preview.toolName}`,
    `  ${chalk.dim('Identity:')}        ${preview.identityTier}`,
    `  ${chalk.dim('Status:')}          ${statusLine}`,
  ];

  if (!passed && preview.reason) {
    lines.push(`  ${chalk.dim('Reason:')}          ${preview.reason}`);
  }

  lines.push(
    `  ${chalk.dim('Spend:')}           ${spendLabel}`,
    `  ${chalk.dim('Session total:')}   ${sessionLabel}`,
    `  ${chalk.dim('Daily total:')}     ${dailyLabel}`,
    `  ${chalk.dim('Human approval:')}  ${approvalLabel}`,
    `  ${chalk.dim('Rate limit:')}      ${rateLimitLabel}`,
    '',
  );

  ctx.stdout(lines.join('\n'));
}

function formatMoney(amount: number, currency: string | undefined): string {
  return currency ? `${amount.toFixed(2)} ${currency}` : amount.toFixed(2);
}
