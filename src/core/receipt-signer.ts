/**
 * @module core/receipt-signer
 * Creates and verifies signed action receipts.
 */

import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  ActionReceipt,
  CreateReceiptInput,
} from '../types/receipt.js';

/** Configuration for receipt signing secret resolution. */
export interface ReceiptSignerOptions {
  readonly secret?: string;
  readonly keyFilePath?: string;
}

type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | CanonicalJsonArray
  | CanonicalJsonObject;
type CanonicalJsonPrimitive = null | boolean | number | string;
type CanonicalJsonArray = readonly CanonicalJsonValue[];
interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}

const DEFAULT_KEY_PATH = resolve('.agentguard/key');

/**
 * ReceiptSigner signs and verifies immutable action receipts.
 */
export class ReceiptSigner {
  private readonly keyBytes: Uint8Array;
  readonly keyFilePath: string;

  constructor(options: ReceiptSignerOptions = {}) {
    this.keyFilePath = resolve(options.keyFilePath ?? DEFAULT_KEY_PATH);
    this.keyBytes = this.resolveSigningKey(options.secret);
  }

  /**
   * Create and sign a receipt from a decision and its request context.
   */
  createReceipt(input: CreateReceiptInput): ActionReceipt {
    const payloadJson = canonicalJsonStringify(input.params);
    const payloadHash = this.hashCanonicalJson(payloadJson);
    const receiptId = input.receiptId ?? randomUUID();
    const timestamp = input.timestamp ?? input.decision.timestamp;
    const prevHash = input.prevHash ?? '';

    const receiptBase = {
      receipt_id: receiptId,
      timestamp,
      agent_id: input.identity.agentId,
      owner_id: input.identity.ownerId,
      action: input.decision.action,
      tool_name: input.decision.toolName,
      payload_json: payloadJson,
      payload_hash: payloadHash,
      policy_ref: input.policyRef,
      status: input.decision.status,
      block_reason: input.decision.reason,
      identity_tier: input.identity.classification,
      spend_amount: input.decision.spendAmount,
      prev_hash: prevHash,
    } as const;

    const receiptHash = this.computeReceiptHash(receiptBase);
    const receiptSig = this.signHash(receiptHash);

    return Object.freeze({
      ...receiptBase,
      receipt_hash: receiptHash,
      receipt_sig: receiptSig,
    });
  }

  /**
   * Hash arbitrary request payload params using canonical JSON.
   */
  hashPayload(params: unknown): string {
    return this.hashCanonicalJson(canonicalJsonStringify(params));
  }

  /**
   * Hash a previously canonicalized JSON string.
   */
  hashCanonicalJson(payloadJson: string): string {
    return sha256Hex(payloadJson);
  }

  /**
   * Compute the stable receipt hash for a receipt or receipt draft.
   */
  computeReceiptHash(
    receipt: Omit<ActionReceipt, 'receipt_hash' | 'receipt_sig'>,
  ): string {
    const signable = canonicalJsonStringify({
      receipt_id: receipt.receipt_id,
      timestamp: receipt.timestamp,
      agent_id: receipt.agent_id,
      owner_id: receipt.owner_id,
      action: receipt.action,
      tool_name: receipt.tool_name,
      payload_hash: receipt.payload_hash,
      policy_ref: receipt.policy_ref,
      status: receipt.status,
      block_reason: receipt.block_reason,
      identity_tier: receipt.identity_tier,
      spend_amount: receipt.spend_amount,
      prev_hash: receipt.prev_hash,
    });

    return sha256Hex(signable);
  }

  /**
   * Verify a receipt signature using the currently resolved secret.
   */
  verifySignature(receipt: ActionReceipt): boolean {
    const expected = Buffer.from(this.signHash(receipt.receipt_hash), 'utf8');
    const actual = Buffer.from(receipt.receipt_sig, 'utf8');

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(expected, actual);
  }

  private resolveSigningKey(explicitSecret?: string): Uint8Array {
    if (explicitSecret !== undefined) {
      return parseSecretMaterial(explicitSecret, 'options.secret');
    }

    if (process.env.AGENTGUARD_SECRET) {
      return parseSecretMaterial(process.env.AGENTGUARD_SECRET, 'AGENTGUARD_SECRET');
    }

    if (existsSync(this.keyFilePath)) {
      const storedSecret = readFileSync(this.keyFilePath, 'utf8').trim();
      return parseSecretMaterial(storedSecret, this.keyFilePath);
    }

    const generatedSecret = randomBytes(32);
    persistGeneratedSecret(this.keyFilePath, generatedSecret);
    return generatedSecret;
  }

  private signHash(receiptHash: string): string {
    return createHmac('sha256', this.keyBytes)
      .update(receiptHash, 'utf8')
      .digest('hex');
  }
}

function parseSecretMaterial(value: string, source: string): Uint8Array {
  const trimmed = value.trim();

  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new TypeError(
      `Invalid receipt signing secret from ${source}. Expected an unpadded base64url string.`,
    );
  }

  const decoded = Buffer.from(trimmed, 'base64url');
  if (decoded.length === 0) {
    throw new TypeError(`Invalid receipt signing secret from ${source}. Secret cannot be empty.`);
  }

  return decoded;
}

function persistGeneratedSecret(filePath: string, secretBytes: Uint8Array): void {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  writeFileSync(
    filePath,
    Buffer.from(secretBytes).toString('base64url'),
    { encoding: 'utf8', mode: 0o600 },
  );
}

function sha256Hex(value: string): string {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

function canonicalJsonStringify(value: unknown): string {
  return stringifyCanonical(normalizeJsonValue(value));
}

function normalizeJsonValue(value: unknown): CanonicalJsonValue {
  try {
    return JSON.parse(JSON.stringify(value)) as CanonicalJsonValue;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TypeError(`Receipt payload must be JSON-serializable: ${message}`);
  }
}

function stringifyCanonical(value: CanonicalJsonValue): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyCanonical(item)).join(',')}]`;
  }

  const objectValue = value as CanonicalJsonObject;
  const keys = Object.keys(objectValue).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stringifyCanonical(objectValue[key] ?? null)}`,
  );
  return `{${entries.join(',')}}`;
}
