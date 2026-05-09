'use client';

import { CopyButton } from './copy-button';

export function InstallBar() {
  return (
    <div id="install" className="install-bar group">
      <span className="flex-1 select-all" style={{ color: 'var(--color-text)' }}>
        npm install actionfence
      </span>
      <CopyButton text="npm install actionfence" size="sm" />
    </div>
  );
}
