#!/usr/bin/env node
/**
 * @module cli/index
 * CLI entry point for ActionFence.
 * Invoked via `npx actionfence <command>` or `actionfence <command>`.
 */

import { run } from './runner.js';

run(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  });
