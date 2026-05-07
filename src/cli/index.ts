#!/usr/bin/env node
/**
 * @module cli/index
 * CLI entry point for AgentGuard.
 * Invoked via `npx agentguard <command>` or `agentguard <command>`.
 */

import { run } from './runner.js';

run(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
