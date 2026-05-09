'use client';

import { CopyButton } from './copy-button';

export function InstallBar() {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        border: '1px solid #f0a500',
        background: 'rgba(240, 165, 0, 0.06)',
        padding: '12px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        color: 'var(--color-accent)',
        letterSpacing: '0.02em',
        borderRadius: '2px',
      }}
    >
      <span style={{ userSelect: 'all', flex: 1 }}>
        npm install actionfence
      </span>
      <CopyButton text="npm install actionfence" size="sm" />
    </div>
  );
}
