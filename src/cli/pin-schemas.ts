import { readFileSync, writeFileSync } from 'node:fs';
import chalk from 'chalk';
import type { ParsedArgs, CliContext } from './runner.js';
import { fetchMcpTools } from './mcp-client.js';
import type { McpTool } from './mcp-client.js';
import { SchemaValidator } from '../core/schema-validator.js';

export async function runPinSchemas(args: ParsedArgs, ctx: CliContext): Promise<number> {
  const filePath = args.positionals[0];
  const serverCommand = args.positionals[1];

  if (!filePath || !serverCommand) {
    ctx.stderr(
      `${chalk.red('x')} Missing policy file path or server command\n` +
        `\n` +
        `${chalk.yellow('Usage:')}\n` +
        `  actionfence pin-schemas <path> <server-command>\n` +
        `\n` +
        `${chalk.yellow('Example:')}\n` +
        `  actionfence pin-schemas guard-policy.json "node server.js"\n`,
    );
    return 1;
  }

  let policyContent: string;
  let policy: Record<string, unknown>;
  try {
    policyContent = readFileSync(filePath, 'utf-8');
    policy = JSON.parse(policyContent);
  } catch (error: unknown) {
    ctx.stderr(`${chalk.red('x')} Cannot load policy: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (!policy.actions || typeof policy.actions !== 'object') {
    ctx.stderr(`${chalk.red('x')} Policy has no actions defined.\n`);
    return 1;
  }

  let tools: McpTool[];
  try {
    ctx.stdout(`${chalk.blue('i')} Fetching tools from server...\n`);
    tools = await fetchMcpTools(serverCommand);
  } catch (error: unknown) {
    ctx.stderr(`${chalk.red('x')} Failed to fetch tools from server: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const actions = policy.actions as Record<string, { schema_hash?: string; [key: string]: unknown }>;

  let pinnedCount = 0;
  for (const tool of tools) {
    const actionDef = actions[tool.name];
    if (actionDef) {
      const hash = SchemaValidator.hashSchema(tool.inputSchema);
      if (actionDef.schema_hash !== hash) {
        actionDef.schema_hash = hash;
        pinnedCount++;
      }
    }
  }

  if (pinnedCount > 0) {
    writeFileSync(filePath, JSON.stringify(policy, null, 2) + '\n');
    ctx.stdout(`${chalk.green('ok')} Pinned schemas for ${pinnedCount} tools.\n`);
  } else {
    ctx.stdout(`${chalk.green('ok')} All schemas are already up to date.\n`);
  }

  return 0;
}
