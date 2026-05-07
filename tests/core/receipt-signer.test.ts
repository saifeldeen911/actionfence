import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptSigner } from '../../src/core/receipt-signer.js';
import type { AgentIdentity } from '../../src/types/identity.js';
import type { EvaluationDecision } from '../../src/types/decision.js';

const FIXED_SECRET = Buffer.alloc(32, 1).toString('base64url');
const ENV_SECRET = Buffer.alloc(32, 2).toString('base64url');
const FILE_SECRET = Buffer.alloc(32, 3).toString('base64url');

function makeIdentity(): AgentIdentity {
  return {
    classification: 'verified',
    agentId: 'agent-123',
    ownerId: 'owner-456',
    capabilities: ['book_flight'],
    rawToken: 'token',
  };
}

function makeDecision(
  overrides: Partial<EvaluationDecision> = {},
): EvaluationDecision {
  return {
    status: 'PASSED',
    action: 'book_flight',
    toolName: 'book_flight',
    identityTier: 'verified',
    reason: null,
    spendAmount: 199.99,
    requiresHumanApproval: false,
    timestamp: '2026-05-06T20:00:00.000Z',
    durationMs: 1.25,
    ...overrides,
  };
}

describe('ReceiptSigner', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create a signed receipt for passed decisions', () => {
    const signer = new ReceiptSigner({ secret: FIXED_SECRET });
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR', seats: 2 },
      policyRef: 'guard-policy.json v1.0',
      receiptId: 'receipt-1',
      timestamp: '2026-05-06T20:00:00.000Z',
      prevHash: '',
    });

    expect(receipt.status).toBe('PASSED');
    expect(receipt.block_reason).toBeNull();
    expect(receipt.receipt_id).toBe('receipt-1');
    expect(receipt.payload_json).toBe('{"itinerary":"CAI-LHR","seats":2}');
    expect(receipt.receipt_hash).toHaveLength(64);
    expect(receipt.receipt_sig).toHaveLength(64);
    expect(signer.verifySignature(receipt)).toBe(true);
  });

  it('should create a signed receipt for blocked decisions', () => {
    const signer = new ReceiptSigner({ secret: FIXED_SECRET });
    const receipt = signer.createReceipt({
      decision: makeDecision({
        status: 'BLOCKED',
        reason: 'Action "book_flight" requires identity tier "verified"',
        spendAmount: null,
      }),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR' },
      policyRef: 'guard-policy.json v1.0',
      receiptId: 'receipt-2',
      timestamp: '2026-05-06T20:00:00.000Z',
      prevHash: 'prev-hash',
    });

    expect(receipt.status).toBe('BLOCKED');
    expect(receipt.block_reason).toContain('requires identity tier');
    expect(receipt.prev_hash).toBe('prev-hash');
    expect(signer.verifySignature(receipt)).toBe(true);
  });

  it('should produce deterministic receipt hashes for fixed input', () => {
    const signer = new ReceiptSigner({ secret: FIXED_SECRET });
    const input = {
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { itinerary: 'CAI-LHR', meta: { seats: 2, cabin: 'economy' } },
      policyRef: 'guard-policy.json v1.0',
      receiptId: 'receipt-fixed',
      timestamp: '2026-05-06T20:00:00.000Z',
      prevHash: 'prev-fixed',
    } as const;

    const receiptA = signer.createReceipt(input);
    const receiptB = signer.createReceipt(input);

    expect(receiptA.payload_hash).toBe(receiptB.payload_hash);
    expect(receiptA.receipt_hash).toBe(receiptB.receipt_hash);
    expect(receiptA.receipt_sig).toBe(receiptB.receipt_sig);
  });

  it('should hash logically identical payloads the same regardless of key order', () => {
    const signer = new ReceiptSigner({ secret: FIXED_SECRET });

    const hashA = signer.hashPayload({
      action: 'book_flight',
      meta: { cabin: 'economy', seats: 2 },
    });
    const hashB = signer.hashPayload({
      meta: { seats: 2, cabin: 'economy' },
      action: 'book_flight',
    });

    expect(hashA).toBe(hashB);
  });

  it('should prefer an explicit secret over env and file secrets', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'agentguard-signer-'));
    const keyFilePath = join(tempDir, 'key');
    writeFileSync(keyFilePath, FILE_SECRET, 'utf8');
    vi.stubEnv('AGENTGUARD_SECRET', ENV_SECRET);

    const signer = new ReceiptSigner({
      secret: FIXED_SECRET,
      keyFilePath,
    });
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-explicit',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const verifier = new ReceiptSigner({ secret: FIXED_SECRET });

    expect(verifier.verifySignature(receipt)).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should prefer the env secret over the stored key file', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'agentguard-signer-'));
    const keyFilePath = join(tempDir, 'key');
    writeFileSync(keyFilePath, FILE_SECRET, 'utf8');
    vi.stubEnv('AGENTGUARD_SECRET', ENV_SECRET);

    const signer = new ReceiptSigner({ keyFilePath });
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-env',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const verifier = new ReceiptSigner();

    expect(verifier.verifySignature(receipt)).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load the stored secret file when no explicit or env secret exists', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'agentguard-signer-'));
    const keyFilePath = join(tempDir, 'key');
    writeFileSync(keyFilePath, FILE_SECRET, 'utf8');

    const signer = new ReceiptSigner({ keyFilePath });
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-file',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const verifier = new ReceiptSigner({ keyFilePath });

    expect(verifier.verifySignature(receipt)).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate and persist a new secret when none exists', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'agentguard-signer-'));
    const keyFilePath = join(tempDir, 'key');

    const signer = new ReceiptSigner({ keyFilePath });

    expect(existsSync(keyFilePath)).toBe(true);
    const persisted = readFileSync(keyFilePath, 'utf8').trim();
    expect(persisted).toMatch(/^[A-Za-z0-9_-]+$/);

    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-generated',
      timestamp: '2026-05-06T20:00:00.000Z',
    });
    expect(signer.verifySignature(receipt)).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should fail fast for invalid secret material', () => {
    expect(() => new ReceiptSigner({ secret: 'not valid!' })).toThrow(
      /Expected an unpadded base64url string/,
    );
  });
});
