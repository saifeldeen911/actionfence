/**
 * @module types/receipt
 * Receipt types for signed, append-only audit records.
 */

import type { EvaluationDecision } from './decision.js';
import type { AgentIdentity, IdentityClassification } from './identity.js';

/** Machine-readable failure reasons returned by receipt verification. */
export type ReceiptVerificationFailureReason =
  | 'CHAIN_LINK_MISMATCH'
  | 'PAYLOAD_HASH_MISMATCH'
  | 'RECEIPT_HASH_MISMATCH'
  | 'SIGNATURE_MISMATCH';

/** A signed audit receipt for one evaluated action. */
export interface ActionReceipt {
  readonly receipt_id: string;
  readonly timestamp: string;
  readonly agent_id: string;
  readonly owner_id: string | null;
  readonly action: string;
  readonly tool_name: string;
  /** Canonical JSON payload captured for later verification. */
  readonly payload_json: string;
  readonly payload_hash: string;
  readonly policy_ref: string;
  readonly status: 'PASSED' | 'BLOCKED';
  readonly block_reason: string | null;
  readonly identity_tier: IdentityClassification;
  readonly spend_amount: number | null;
  readonly prev_hash: string;
  readonly receipt_hash: string;
  readonly receipt_sig: string;
}

/** Input shape used to create a signed receipt from an evaluation decision. */
export interface CreateReceiptInput {
  readonly decision: EvaluationDecision;
  readonly identity: AgentIdentity;
  readonly params: unknown;
  readonly policyRef: string;
  readonly prevHash?: string | null;
  /** Optional override for deterministic tests. */
  readonly receiptId?: string;
  /** Optional override for deterministic tests. */
  readonly timestamp?: string;
}

/** Successful receipt verification result. */
export interface ReceiptVerificationSuccess {
  readonly valid: true;
  readonly checkedCount: number;
}

/** Failed receipt verification result. */
export interface ReceiptVerificationFailure {
  readonly valid: false;
  readonly checkedCount: number;
  readonly brokenReceiptId: string;
  readonly reason: ReceiptVerificationFailureReason;
}

/** Result of verifying the persisted receipt chain. */
export type ReceiptVerificationResult = ReceiptVerificationSuccess | ReceiptVerificationFailure;
