/**
 * @module cli/generate
 * `actionfence generate` — discovers MCP tools and writes a conservative starter policy.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, resolve, sep } from 'node:path';
import chalk from 'chalk';
import { SchemaValidator } from '../core/schema-validator.js';
import type { DefaultRule, GuardPolicy } from '../types/policy.js';
import { fetchMcpTools } from './mcp-client.js';
import type { McpTool } from './mcp-client.js';
import type { ParsedArgs, CliContext } from './runner.js';

const DEFAULT_FILENAME = 'guard-policy.json';
const DEFAULT_SERVICE_NAME = 'my-service';
const POLICY_SCHEMA_URL =
  'https://raw.githubusercontent.com/saifeldeen911/actionfence/main/schemas/guard-policy.schema.json';

interface GeneratedActionRule {
  allowed: false;
  schema_hash?: string;
}

interface GenerateOptions {
  readonly serviceName: string;
  readonly defaultRule: DefaultRule;
  readonly pinSchemas: boolean;
}

export async function runGenerate(args: ParsedArgs, ctx: CliContext): Promise<number> {
  const serverCommand = args.positionals[0];

  if (!serverCommand) {
    ctx.stderr(
      `${chalk.red('x')} Missing server command\n` +
        `\n` +
        `${chalk.yellow('Usage:')}\n` +
        `  actionfence generate <server-command> [options]\n` +
        `\n` +
        `${chalk.yellow('Examples:')}\n` +
        `  actionfence generate "node server.js"\n` +
        `  actionfence generate "node server.js" --output guard-policy.json --pin-schemas\n`,
    );
    return 1;
  }

  const serviceFlag = args.flags['service'];
  if (serviceFlag === true) {
    ctx.stderr(`${chalk.red('x')} Missing value for --service\n`);
    return 1;
  }

  const outputFlag = args.flags['output'];
  if (outputFlag === true) {
    ctx.stderr(`${chalk.red('x')} Missing value for --output\n`);
    return 1;
  }

  const defaultRule = parseDefaultRule(args, ctx);
  if (!defaultRule) {
    return 1;
  }

  const outputName = outputFlag ?? DEFAULT_FILENAME;
  const outputPath = resolve(ctx.cwd, outputName);

  if (existsSync(outputPath)) {
    ctx.stderr(
      `${chalk.red('x')} File already exists: ${outputPath}\n` +
        `  Remove it first or specify a different path with --output\n`,
    );
    return 1;
  }

  let tools: McpTool[];
  try {
    ctx.stdout(`${chalk.blue('i')} Fetching tools from server...\n`);
    tools = await fetchMcpTools(serverCommand);
  } catch (error: unknown) {
    ctx.stderr(
      `${chalk.red('x')} Failed to fetch tools from server: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  if (tools.length === 0) {
    ctx.stderr(`${chalk.red('x')} Server returned zero tools; no policy generated.\n`);
    return 1;
  }

  const validatedTools = validateDiscoveredTools(tools, ctx);
  if (!validatedTools) {
    return 1;
  }

  const policy = createGeneratedPolicy(validatedTools, {
    serviceName: serviceFlag ?? DEFAULT_SERVICE_NAME,
    defaultRule,
    pinSchemas: args.flags['pin-schemas'] === true,
  });

  try {
    writeFileSync(outputPath, JSON.stringify(policy, null, 2) + '\n', {
      encoding: 'utf-8',
      flag: 'wx',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr(`${chalk.red('x')} Failed to write file: ${message}\n`);
    return 1;
  }

  const outputLabel = basename(outputName);
  const examplePath = formatExamplePath(outputName);
  const validateCommand = `actionfence validate ${quoteShellArg(examplePath)} ${quoteShellArg(serverCommand)}`;
  const defaultRuleWarning =
    defaultRule === 'allow'
      ? `  ${chalk.yellow('!')} You selected default_rule: allow; unknown actions will be allowed unless constrained elsewhere.\n`
      : '';

  ctx.stdout(
    `${chalk.green('ok')} Created ${chalk.bold(outputLabel)} with ${validatedTools.length} discovered tool${validatedTools.length === 1 ? '' : 's'}.\n` +
      `\n` +
      `${chalk.yellow('Review required:')}\n` +
      `  This generated policy is a review starting point, not a completed security review.\n` +
      `  Every discovered action is currently blocked with allowed: false.\n` +
      defaultRuleWarning +
      `\n` +
      `${chalk.yellow('Next steps:')}\n` +
      `  1. Review each action and explicitly allow only safe operations\n` +
      `  2. Add identity, approval, spend, and rate controls where needed\n` +
      `  3. Validate: ${chalk.cyan(validateCommand)}\n`,
  );

  return 0;
}

function parseDefaultRule(args: ParsedArgs, ctx: CliContext): DefaultRule | null {
  const flag = args.flags['default-rule'];
  if (flag === undefined) {
    return 'deny';
  }

  if (flag === 'allow' || flag === 'deny') {
    return flag;
  }

  ctx.stderr(`${chalk.red('x')} Invalid --default-rule value. Use "deny" or "allow".\n`);
  return null;
}

function validateDiscoveredTools(tools: readonly McpTool[], ctx: CliContext): readonly McpTool[] | null {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const tool of tools) {
    if (seen.has(tool.name)) {
      duplicates.add(tool.name);
    }
    seen.add(tool.name);
  }

  if (duplicates.size > 0) {
    const names = [...duplicates].sort().map((name) => `"${name}"`).join(', ');
    ctx.stderr(`${chalk.red('x')} Duplicate tool names discovered: ${names}. No policy generated.\n`);
    return null;
  }

  return tools;
}

function createGeneratedPolicy(tools: readonly McpTool[], options: GenerateOptions): GuardPolicy {
  const actions: Record<string, GeneratedActionRule> = {};

  for (const tool of [...tools].sort((left, right) => left.name.localeCompare(right.name))) {
    const action: GeneratedActionRule = { allowed: false };
    if (options.pinSchemas) {
      action.schema_hash = SchemaValidator.hashSchema(tool.inputSchema);
    }
    actions[tool.name] = action;
  }

  return {
    $schema: POLICY_SCHEMA_URL,
    service: options.serviceName,
    version: '1.0',
    default_rule: options.defaultRule,
    actions,
  };
}

function formatExamplePath(outputName: string): string {
  if (
    isAbsolute(outputName) ||
    outputName.includes(sep) ||
    outputName.includes('/') ||
    outputName.includes('\\') ||
    outputName.startsWith('./') ||
    outputName.startsWith('../')
  ) {
    return outputName;
  }

  return `./${outputName}`;
}

function quoteShellArg(value: string): string {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
