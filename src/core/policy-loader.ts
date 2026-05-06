/**
 * @module core/policy-loader
 * Loads, validates, and optionally watches bouncer-policy.json files.
 */

import { readFileSync } from 'node:fs';
import { watch, type FSWatcher } from 'node:fs';
import { resolve } from 'node:path';
import { Ajv, type ErrorObject } from 'ajv';
import type { BouncerPolicy } from '../types/policy.js';
import { PolicyLoadError, PolicyValidationError } from '../types/errors.js';
import policySchema from '../../schemas/bouncer-policy.schema.json' with { type: 'json' };

// Compile the JSON Schema validator once at module load for performance.
const ajv = new Ajv({ allErrors: true, verbose: true });
const validateSchema = ajv.compile<BouncerPolicy>(policySchema);

/**
 * Load and validate a bouncer policy from a file path or inline object.
 *
 * @param pathOrObject - Absolute/relative file path to a JSON policy, or an inline policy object.
 * @returns The validated, frozen BouncerPolicy object.
 * @throws {PolicyLoadError} If the file cannot be read or contains invalid JSON.
 * @throws {PolicyValidationError} If the policy fails schema validation.
 */
export function loadPolicy(pathOrObject: string | BouncerPolicy): BouncerPolicy {
  const raw = typeof pathOrObject === 'string'
    ? readPolicyFile(pathOrObject)
    : pathOrObject;

  validatePolicyObject(raw);
  return Object.freeze(raw) as BouncerPolicy;
}

/**
 * Watch a policy file for changes and invoke a callback with the reloaded policy.
 * Uses a 300ms debounce to avoid rapid-fire reloads.
 *
 * @param filePath - Path to the bouncer-policy.json file.
 * @param callback - Called with the new policy on every valid change.
 * @returns A cleanup function that stops watching.
 */
export function watchPolicy(
  filePath: string,
  callback: (policy: BouncerPolicy) => void,
): () => void {
  const resolvedPath = resolve(filePath);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: FSWatcher | null = null;

  watcher = watch(resolvedPath, (_eventType) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      try {
        const policy = loadPolicy(resolvedPath);
        callback(policy);
      } catch (error: unknown) {
        // Log but don't crash — the old policy remains active.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[agent-bouncer] Policy reload failed: ${message}`);
      }
    }, 300);
  });

  watcher.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[agent-bouncer] Policy watcher error: ${message}`);
  });

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  };
}

/**
 * Read and parse a JSON policy file from disk.
 */
function readPolicyFile(filePath: string): unknown {
  const resolvedPath = resolve(filePath);

  let content: string;
  try {
    content = readFileSync(resolvedPath, 'utf-8');
  } catch (error: unknown) {
    const cause = error instanceof Error ? error : undefined;
    throw new PolicyLoadError(
      `Failed to read policy file: ${resolvedPath}`,
      resolvedPath,
      cause,
    );
  }

  try {
    return JSON.parse(content) as unknown;
  } catch (error: unknown) {
    const cause = error instanceof Error ? error : undefined;
    throw new PolicyLoadError(
      `Failed to parse policy file as JSON: ${resolvedPath}`,
      resolvedPath,
      cause,
    );
  }
}

/**
 * Validate a raw object against the bouncer-policy JSON Schema.
 */
function validatePolicyObject(data: unknown): asserts data is BouncerPolicy {
  const valid = validateSchema(data);

  if (!valid) {
    const errors = (validateSchema.errors ?? []).map((err: ErrorObject) => {
      const path = err.instancePath || '/';
      return `${path}: ${err.message ?? 'unknown error'}`;
    });

    throw new PolicyValidationError(
      `Invalid bouncer policy:\n  ${errors.join('\n  ')}`,
      errors,
    );
  }
}
