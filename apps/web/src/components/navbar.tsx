import { getGitHubRepoStats } from '../lib/github';

export async function Navbar() {
  const { repoUrl } = await getGitHubRepoStats();

  return (
    <nav
      id="navbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid #1f2424',
        background: '#0c0e0e',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        {/* Brand */}
        <a
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
          }}
        >
          actionfence
        </a>

        {/* Right links */}
        <div className="flex items-center gap-6">
          <a href={repoUrl} target="_blank" rel="noreferrer" className="ghost-link">
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/actionfence"
            target="_blank"
            rel="noreferrer"
            className="ghost-link"
          >
            npm
          </a>
          <a
            href={`${repoUrl}#readme`}
            target="_blank"
            rel="noreferrer"
            className="ghost-link"
          >
            Docs
          </a>
        </div>
      </div>
    </nav>
  );
}
