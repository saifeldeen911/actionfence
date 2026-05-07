/**
 * @module cli/simulate
 * `agentguard simulate <path>` — dry-run a single action against a policy file.
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import { loadPolicy } from '../core/policy-loader.js';
import { PolicyEvaluator } from '../core/policy-evaluator.js';
import { RateLimiter } from '../core/rate-limiter.js';
import type { AgentIdentity, IdentityClassification } from '../types/identity.js';
import type { EvaluationDecision } from '../types/decision.js';
import type { ParsedArgs, CliContext } from './runner.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_IDENTITY_TIERS: readonly IdentityClassification[] = [
  'anonymous',
  'token',
  'verified',
];

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------

/**
 * Dry-run a policy evaluation for a single action.
 *
 * Usage:
 *   agentguard simulate <policy-path> --action <name> [--identity <tier>] [--spend <amount>] [--tool <name>]
 *
 * Exit codes:
 *   0 — action would pass
 *   1 — action would be blocked, or invalid arguments
 */
export function runSimulate(args: ParsedArgs, ctx: CliContext): number {
  const filePath = args.positionals[0];
  const actionFlag = typeof args.flags['action'] === 'string' ? args.flags['action'] : undefined;
  const identityFlag = typeof args.flags['identity'] === 'string' ? args.flags['identity'] : undefined;
  const spendFlag = typeof args.flags['spend'] === 'string' ? args.flags['spend'] : undefined;
  const toolFlag = typeof args.flags['tool'] === 'string' ? args.flags['tool'] : undefined;

  // --- Validate required arguments ---

  if (!filePath) {
    ctx.stderr(
      `${chalk.red('✗')} Missing policy file path\n` +
      `\n` +
      `${chalk.yellow('Usage:')}\n` +
      `  agentguard simulate <path> --action <name> [--identity <tier>] [--spend <amount>]\n`,
    );
    return 1;
  }

  if (!actionFlag) {
    ctx.stderr(
      `${chalk.red('✗')} Missing required flag: --action\n` +
      `\n` +
      `${chalk.yellow('Usage:')}\n` +
      `  agentguard simulate ${filePath} --action <name>\n`,
    );
    return 1;
  }

  // --- Parse identity tier ---

  const identityTier: IdentityClassification = parseIdentityTier(identityFlag);
  if (identityFlag && !VALID_IDENTITY_TIERS.includes(identityTier)) {
    ctx.stderr(
      `${chalk.red('✗')} Invalid identity tier: "${identityFlag}"\n` +
      `  Valid values: ${VALID_IDENTITY_TIERS.join(', ')}\n`,
    );
    return 1;
  }

  // --- Parse spend amount ---

  let spendAmount: number | null = null;
  if (spendFlag !== undefined) {
    spendAmount = Number(spendFlag);
    if (!Number.isFinite(spendAmount) || spendAmount < 0) {
      ctx.stderr(`${chalk.red('✗')} Invalid spend amount: "${spendFlag}" — must be a non-negative number\n`);
      return 1;
    }
  }

  // --- Load policy and evaluate ---

  let decision: EvaluationDecision;
  try {
    const policy = loadPolicy(resolve(ctx.cwd, filePath));
    const evaluator = new PolicyEvaluator(policy);
    const rateLimiter = new RateLimiter(policy.rate_limits ?? {});

    const toolName = toolFlag ?? actionFlag;
    const identity = createMockIdentity(identityTier);

    decision = evaluator.evaluate(actionFlag, toolName, identity, spendAmount);

    // Also check rate limits for informational display
    const rateCheck = rateLimiter.previewRequestRate(identity.agentId);
    rateLimiter.dispose();

    printSimulationResult(ctx, {
      decision,
      identity,
      toolName,
      rateLimit: rateCheck,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`${chalk.red('✗')} Simulation failed: ${message}\n`);
    return 1;
  }

  return decision.status === 'PASSED' ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Identity helpers
// ---------------------------------------------------------------------------

function parseIdentityTier(value: string | undefined): IdentityClassification {
  if (!value) {
    return 'anonymous';
  }

  const normalized = value.toLowerCase().trim();
  if (VALID_IDENTITY_TIERS.includes(normalized as IdentityClassification)) {
    return normalized as IdentityClassification;
  }

  return 'anonymous';
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

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

interface SimulationDisplayInput {
  readonly decision: EvaluationDecision;
  readonly identity: AgentIdentity;
  readonly toolName: string;
  readonly rateLimit: { readonly limit: number; readonly remaining: number };
}

function printSimulationResult(ctx: CliContext, input: SimulationDisplayInput): void {
  const { decision, identity, rateLimit } = input;
  const passed = decision.status === 'PASSED';

  const header = chalk.bold.yellow('⚡ SIMULATION') + chalk.dim(' — agentguard');
  const statusLine = passed
    ? chalk.green('✓ WOULD PASS')
    : chalk.red('✗ WOULD BLOCK');

  const spendLabel = decision.spendAmount !== null
    ? `$${decision.spendAmount.toFixed(2)}`
    : chalk.dim('none');

  const approvalLabel = decision.requiresHumanApproval
    ? chalk.yellow('required')
    : chalk.dim('not required');

  const rateLimitLabel = rateLimit.limit === 0
    ? chalk.dim('unlimited')
    : `${rateLimit.remaining}/${rateLimit.limit} remaining`;

  const lines = [
    '',
    header,
    '',
    `  ${chalk.dim('Action:')}          ${decision.action}`,
    `  ${chalk.dim('Tool:')}            ${input.toolName}`,
    `  ${chalk.dim('Identity:')}        ${identity.classification}`,
    `  ${chalk.dim('Status:')}          ${statusLine}`,
  ];

  if (!passed && decision.reason) {
    lines.push(`  ${chalk.dim('Reason:')}          ${decision.reason}`);
  }

  lines.push(
    `  ${chalk.dim('Spend:')}           ${spendLabel}`,
    `  ${chalk.dim('Human approval:')}  ${approvalLabel}`,
    `  ${chalk.dim('Rate limit:')}      ${rateLimitLabel}`,
    '',
  );

  ctx.stdout(lines.join('\n'));
}
