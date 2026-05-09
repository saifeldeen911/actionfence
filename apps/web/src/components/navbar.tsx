import { getGitHubRepoStats } from '../lib/github';

export async function Navbar() {
  const { stars, repoUrl } = await getGitHubRepoStats();

  return (
    <nav
      id="navbar"
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'rgba(10, 10, 11, 0.82)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2.5 group" aria-label="ActionFence home">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: 'var(--color-green-muted)',
              color: 'var(--color-green)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            AF
          </span>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
          >
            actionfence
          </span>
        </a>

        {/* Center nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <a
            href="#features"
            className="text-xs tracking-wide transition-colors hover:text-white"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Features
          </a>
          <a
            href="#install"
            className="text-xs tracking-wide transition-colors hover:text-white"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Install
          </a>
          <a
            href="https://github.com/saifeldeen911/actionfence#readme"
            target="_blank"
            rel="noreferrer"
            className="text-xs tracking-wide transition-colors hover:text-white"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Docs
          </a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {stars !== null && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="badge hidden transition-colors hover:border-white/20 sm:inline-flex"
              aria-label={`${stars} GitHub stars`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-amber)' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{stars}</span>
            </a>
          )}
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-white/20 hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            aria-label="View on GitHub"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}
