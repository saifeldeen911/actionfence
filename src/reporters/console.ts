/**
 * @module reporters/console
 * Small, testable console reporter for evaluation decisions.
 */

import chalk, { Chalk } from 'chalk';
import type { EvaluationDecision } from '../types/decision.js';
import type { SpendSnapshot } from '../types/spend.js';

/** Input accepted by ConsoleReporter.report(). */
export interface ConsoleReportInput {
  readonly decision: EvaluationDecision;
  readonly receiptId?: string;
  readonly spendSnapshot?: SpendSnapshot;
}

/** Options for the console reporter. */
export interface ConsoleReporterOptions {
  readonly silent?: boolean;
  readonly useColors?: boolean;
  readonly writer?: (message: string) => void;
}

/**
 * ConsoleReporter formats and optionally writes one-line decision summaries.
 */
export class ConsoleReporter {
  private readonly silent: boolean;
  private readonly writer: (message: string) => void;
  private readonly colors: typeof chalk;

  constructor(options: ConsoleReporterOptions = {}) {
    this.silent = options.silent ?? false;
    this.writer = options.writer ?? ((message: string) => process.stdout.write(`${message}\n`));
    this.colors = options.useColors === false ? new Chalk({ level: 0 }) : chalk;
  }

  /**
   * Format a decision and write it unless the reporter is silent.
   */
  report(input: ConsoleReportInput): string {
    const formatted = this.format(input);
    if (!this.silent) {
      this.writer(formatted);
    }
    return formatted;
  }

  /**
   * Format a decision without writing it.
   */
  format(input: ConsoleReportInput): string {
    const baseParts = [
      this.formatStatus(input.decision.status),
      input.decision.action,
      `[${input.decision.identityTier}]`,
      `${input.decision.durationMs.toFixed(2)}ms`,
    ];

    if (input.receiptId) {
      baseParts.push(`receipt=${input.receiptId}`);
    }

    if (input.spendSnapshot) {
      baseParts.push(
        `session=${input.spendSnapshot.sessionTotal.toFixed(2)} units`,
        `daily=${input.spendSnapshot.dailyTotal.toFixed(2)} units`,
      );
    }

    if (input.decision.status === 'BLOCKED' && input.decision.reason) {
      baseParts.push(`reason=${input.decision.reason}`);
    }

    return baseParts.join(' | ');
  }

  private formatStatus(status: EvaluationDecision['status']): string {
    if (status === 'PASSED') {
      return this.colors.green('ALLOW');
    }

    return this.colors.red('BLOCK');
  }
}
