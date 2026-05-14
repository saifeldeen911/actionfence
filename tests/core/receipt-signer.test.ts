import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReceiptSigner } from '../../src/core/receipt-signer.js';
import type { AgentIdentity } from '../../src/types/identity.js';
import type { EvaluationDecision } from '../../src/types/decision.js';

const FIXED_SECRET = Buffer.alloc(32, 1).toString('base64url');
const MIN_SECRET = Buffer.alloc(16, 4).toString('base64url');
const SHORT_SECRET = Buffer.alloc(15, 5).toString('base64url');
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

function makeDecision(overrides: Partial<EvaluationDecision> = {}): EvaluationDecision {
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

  it('should keep original and stored payload hashes separate when originalParams are provided', () => {
    const signer = new ReceiptSigner({ secret: FIXED_SECRET });
    const storedParams = {
      itinerary: 'CAI-LHR',
      secret: '[redacted]',
    };
    const originalParams = {
      itinerary: 'CAI-LHR',
      secret: 'super-secret',
    };

    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: storedParams,
      originalParams,
      policyRef: 'policy v1',
      receiptId: 'receipt-redacted',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    expect(receipt.payload_json).toBe('{"itinerary":"CAI-LHR","secret":"[redacted]"}');
    expect(receipt.payload_hash).toBe(signer.hashPayload(originalParams));
    expect(receipt.payload_json_hash).toBe(signer.hashPayload(storedParams));
    expect(signer.verifySignature(receipt)).toBe(true);
  });

  it('should truncate oversized payloads to a marker payload', () => {
    const signer = new ReceiptSigner({ secret: FIXED_SECRET, maxPayloadBytes: 64 });
    const largeParams = {
      blob: 'x'.repeat(256),
      nested: { value: 'y'.repeat(128) },
    };

    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: largeParams,
      originalParams: largeParams,
      policyRef: 'policy v1',
      receiptId: 'receipt-truncated',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const payload = JSON.parse(receipt.payload_json) as {
      readonly _originalHash: string;
      readonly _truncated: boolean;
    };

    expect(payload._truncated).toBe(true);
    expect(payload._originalHash).toBe(receipt.payload_hash);
    expect(receipt.payload_json_hash).toBe(signer.hashPayload(payload));
    expect(signer.verifySignature(receipt)).toBe(true);
  });

  it('should prefer an explicit secret over env and file secrets', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
    const keyFilePath = join(tempDir, 'key');
    writeFileSync(keyFilePath, FILE_SECRET, 'utf8');
    vi.stubEnv('ACTIONFENCE_SECRET', ENV_SECRET);

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
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
    const keyFilePath = join(tempDir, 'key');
    writeFileSync(keyFilePath, FILE_SECRET, 'utf8');
    vi.stubEnv('ACTIONFENCE_SECRET', ENV_SECRET);

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

  it('should fall back to AGENTGUARD_SECRET when ACTIONFENCE_SECRET is missing', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
    const keyFilePath = join(tempDir, 'key');
    vi.stubEnv('ACTIONFENCE_SECRET', '');
    vi.stubEnv('AGENTGUARD_SECRET', ENV_SECRET);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const signer = new ReceiptSigner({ keyFilePath });
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-legacy-env',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const verifier = new ReceiptSigner({ secret: ENV_SECRET });

    expect(verifier.verifySignature(receipt)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[actionfence] AGENTGUARD_SECRET is deprecated; set ACTIONFENCE_SECRET instead.',
    );

    warnSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should migrate a legacy key file to the default location', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const legacyKeyPath = join(tempDir, '.agentguard', 'key');
    const migratedKeyPath = join(tempDir, '.actionfence', 'key');

    mkdirSync(join(tempDir, '.agentguard'), { recursive: true });
    writeFileSync(legacyKeyPath, FILE_SECRET, 'utf8');

    const signer = new ReceiptSigner();
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-legacy-file',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    const verifier = new ReceiptSigner({ secret: FILE_SECRET });

    expect(existsSync(migratedKeyPath)).toBe(true);
    expect(existsSync(legacyKeyPath)).toBe(false);
    expect(readFileSync(migratedKeyPath, 'utf8').trim()).toBe(FILE_SECRET);
    if (process.platform !== 'win32') {
      expect(statSync(migratedKeyPath).mode & 0o777).toBe(0o600);
    }
    expect(verifier.verifySignature(receipt)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      `[actionfence] Migrated legacy signing key from ${legacyKeyPath} to ${migratedKeyPath}`,
    );

    warnSpy.mockRestore();
    cwdSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should keep migrating when chmod is unavailable', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const legacyKeyPath = join(tempDir, '.agentguard', 'key');
    const migratedKeyPath = join(tempDir, '.actionfence', 'key');

    mkdirSync(join(tempDir, '.agentguard'), { recursive: true });
    writeFileSync(legacyKeyPath, FILE_SECRET, 'utf8');

    vi.resetModules();
    vi.doMock('node:fs', async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- dynamic import() type is required by vi.importActual
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return {
        ...actual,
        chmodSync: () => {
          throw new Error('chmod unavailable');
        },
      };
    });

    return import('../../src/core/receipt-signer.js')
      .then(({ ReceiptSigner: MockedReceiptSigner }) => {
        const signer = new MockedReceiptSigner();
        const receipt = signer.createReceipt({
          decision: makeDecision(),
          identity: makeIdentity(),
          params: { value: 1 },
          policyRef: 'policy v1',
          receiptId: 'receipt-legacy-chmod',
          timestamp: '2026-05-06T20:00:00.000Z',
        });

        const verifier = new ReceiptSigner({ secret: FILE_SECRET });

        expect(existsSync(migratedKeyPath)).toBe(true);
        expect(existsSync(legacyKeyPath)).toBe(false);
        expect(verifier.verifySignature(receipt)).toBe(true);
      })
      .finally(() => {
        vi.doUnmock('node:fs');
        vi.resetModules();
        warnSpy.mockRestore();
        cwdSpy.mockRestore();
        rmSync(tempDir, { recursive: true, force: true });
      });
  });

  it('should load the stored secret file when no explicit or env secret exists', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
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
    const tempDir = mkdtempSync(join(tmpdir(), 'actionfence-signer-'));
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

  it('should reject signing secrets shorter than 16 bytes', () => {
    expect(() => new ReceiptSigner({ secret: SHORT_SECRET })).toThrow(
      /Minimum 16 bytes required for HMAC-SHA256/,
    );
  });

  it('should accept signing secrets that are exactly 16 bytes long', () => {
    const signer = new ReceiptSigner({ secret: MIN_SECRET });
    const receipt = signer.createReceipt({
      decision: makeDecision(),
      identity: makeIdentity(),
      params: { value: 1 },
      policyRef: 'policy v1',
      receiptId: 'receipt-min-secret',
      timestamp: '2026-05-06T20:00:00.000Z',
    });

    expect(signer.verifySignature(receipt)).toBe(true);
  });
});
