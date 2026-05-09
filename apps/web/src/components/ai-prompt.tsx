'use client';

import { CopyButton } from './copy-button';

const AI_PROMPT = `Install and integrate the "actionfence" npm package into my current project. Read the full integration guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt then: install the package, create a guard-policy.json for my use case, and wire up the middleware.`;

export function AiPrompt() {
  return (
    <section id="ai-setup" aria-labelledby="ai-prompt-title">
      <div
        style={{
          border: '1px solid rgba(240, 165, 0, 0.15)',
          background: 'rgba(240, 165, 0, 0.03)',
          borderRadius: '2px',
        }}
        className="p-6 sm:p-8"
      >
        <div className="mb-5">
          <h2
            id="ai-prompt-title"
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'var(--color-text)',
            }}
          >
            Using an AI coding assistant?
          </h2>
          <p
            className="mt-1"
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
            }}
          >
            Copy this prompt into Claude, Cursor, or Copilot.
          </p>
        </div>

        <div className="relative">
          <div className="prompt-block pr-14">{AI_PROMPT}</div>
          <div
            className="absolute"
            style={{ right: '12px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <CopyButton text={AI_PROMPT} size="md" />
          </div>
        </div>
      </div>
    </section>
  );
}
