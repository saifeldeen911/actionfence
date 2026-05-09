import React from 'react';
import { Navbar } from '../src/components/navbar';
import { InstallBar } from '../src/components/install-bar';
import { CodeTabs } from '../src/components/code-tabs';
import { AiPrompt } from '../src/components/ai-prompt';
import { getGitHubRepoStats } from '../src/lib/github';
import { buildSoftwareSourceCodeJsonLd, buildFaqJsonLd, siteCopy } from '../src/lib/seo';

export default async function HomePage() {
  const { repoUrl } = await getGitHubRepoStats();
  const softwareJsonLd = buildSoftwareSourceCodeJsonLd();
  const faqJsonLd = buildFaqJsonLd();

  return (
    <>
      <Navbar />

      <div className="grid-bg" aria-hidden="true" />

      <main id="landing-root" className="relative z-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-5 pb-24 pt-16 sm:pt-24">
          {/* ── Hero ── */}
          <header className="flex flex-col items-center text-center">
            <div className="glow-orb" aria-hidden="true" />

            <div className="animate-fade-up stagger-1">
              <span
                className="badge"
                style={{ color: 'var(--color-green)', borderColor: 'rgba(34, 197, 94, 0.2)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <circle cx="5" cy="5" r="5" />
                </svg>
                Open-source · MIT licensed
              </span>
            </div>

            <h1
              className="animate-fade-up stagger-2 mt-8 text-5xl font-bold tracking-tighter sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
            >
              actionfence
            </h1>

            <p
              className="animate-fade-up stagger-3 mt-5 max-w-xl text-lg leading-relaxed sm:text-xl"
              style={{ color: 'var(--color-text-muted)' }}
            >
              AI action firewall for MCP servers and APIs.
              <br />
              Define what agents can do. Signed receipts for every decision.
            </p>

            <div className="animate-fade-up stagger-4 mt-10 w-full max-w-md">
              <InstallBar />
            </div>

            <div className="animate-fade-up stagger-5 mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary btn-github"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
              <a
                href={`${repoUrl}#readme`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Read the docs
              </a>
            </div>
          </header>

          {/* ── Features ── */}
          <section id="features" className="animate-fade-up stagger-4" aria-labelledby="features-title">
            <h2
              id="features-title"
              className="mb-6 text-sm font-medium"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              What it does
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <FeatureCard
                title="Policy Enforcement"
                description="JSON policy decides before your handler runs. Allow, deny, or flag for human approval."
                color="green"
              />
              <FeatureCard
                title="Identity & Spend"
                description="Verify JWTs via JWKS, enforce capability scopes, cap per-action and daily spend."
                color="amber"
              />
              <FeatureCard
                title="Signed Receipts"
                description="Hash-chained, HMAC-signed audit trail stored in SQLite. Tamper-evident by default."
                color="red"
              />
            </div>
          </section>

          {/* ── Quick facts ── */}
          <section className="animate-fade-up stagger-5" aria-label="Quick facts">
            <div
              className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-border)' }}
            >
              <QuickFact label="Runtime" value="Node 20+" />
              <QuickFact label="Surfaces" value="MCP + HTTP" />
              <QuickFact label="License" value="MIT" />
              <QuickFact label="Dry-run" value="Simulate" />
            </div>
          </section>

          {/* ── Code Examples ── */}
          <CodeTabs />

          {/* ── AI Assistant Prompt ── */}
          <AiPrompt />

          {/* ── Footer ── */}
          <footer
            className="animate-fade-in stagger-6 flex flex-col items-center gap-4 border-t pt-8 text-xs sm:flex-row sm:justify-between"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)' }}
          >
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              © {new Date().getFullYear()} ActionFence
            </span>
            <div className="flex gap-5">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/actionfence"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
              >
                npm
              </a>
              <a
                href={`${repoUrl}#readme`}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
              >
                Docs
              </a>
              <span>MIT License</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}

/* ── Feature Card ── */

const iconPaths: Record<string, React.ReactNode> = {
  green: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  amber: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  red: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  green: {
    bg: 'var(--color-green-muted)',
    text: 'var(--color-green)',
    border: 'rgba(34, 197, 94, 0.15)',
  },
  amber: {
    bg: 'var(--color-amber-muted)',
    text: 'var(--color-amber)',
    border: 'rgba(245, 158, 11, 0.15)',
  },
  red: {
    bg: 'var(--color-red-muted)',
    text: 'var(--color-red)',
    border: 'rgba(239, 68, 68, 0.15)',
  },
};

function FeatureCard({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: string;
}) {
  const c = colorMap[color];

  return (
    <article className="card p-5">
      <span
        className="feature-icon"
        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
      >
        {iconPaths[color]}
      </span>
      <h3
        className="mt-4 text-sm font-semibold"
        style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {description}
      </p>
    </article>
  );
}

/* ── Quick Fact ── */

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-4" style={{ background: 'var(--color-surface)' }}>
      <span
        className="text-xs"
        style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
      <span
        className="text-sm font-semibold"
        style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </span>
    </div>
  );
}
