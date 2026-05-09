'use client';

import { CopyButton } from './copy-button';

const AI_PROMPT = `Install and integrate the "actionfence" npm package into my current project. Read the full integration guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt then: install the package, create a guard-policy.json for my use case, and wire up the middleware.`;

export function AiPrompt() {
  return (
    <section
      id="ai-setup"
      className="animate-fade-up stagger-6"
      aria-labelledby="ai-prompt-title"
    >
      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: 'rgba(245, 158, 11, 0.15)',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(245, 158, 11, 0.01))',
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <span
            className="feature-icon"
            style={{
              background: 'var(--color-amber-muted)',
              color: 'var(--color-amber)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1.5a2.5 2.5 0 0 1 0 5V21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-.5a2.5 2.5 0 0 1 0-5V14a3 3 0 0 1 3-3h3V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z" />
              <circle cx="9" cy="17" r="1" />
              <circle cx="15" cy="17" r="1" />
            </svg>
          </span>
          <div>
            <h2
              id="ai-prompt-title"
              className="text-base font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Using an AI Coding Assistant?
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Copy this prompt into Claude, Cursor, or Copilot and let it handle the setup.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="prompt-block pr-14">{AI_PROMPT}</div>
          <div className="absolute right-3 top-3">
            <CopyButton text={AI_PROMPT} size="md" />
          </div>
        </div>
      </div>
    </section>
  );
}
