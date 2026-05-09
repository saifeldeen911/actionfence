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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Navbar />

      <main id="landing-root">
        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ borderBottom: '1px solid #1f2424' }}
        >
          {/* Dot grid background */}
          <div
            className="dot-grid absolute inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
          />

          <div
            className="relative mx-auto flex max-w-5xl flex-col gap-12 px-5 py-20 sm:py-28"
            style={{ zIndex: 1 }}
          >
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-start sm:justify-between">
              {/* Left: headline + CTA */}
              <div className="flex max-w-md flex-col gap-6">
                <h1
                  className="animate-fade-up stagger-1"
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
                    lineHeight: 1.15,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Your AI agents act.
                  <br />
                  ActionFence decides
                  <br />
                  if they should.
                </h1>

                <p
                  className="animate-fade-up stagger-2"
                  style={{
                    fontSize: '0.92rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                    maxWidth: '400px',
                  }}
                >
                  A policy firewall for MCP servers and APIs.
                  <br />
                  Identity tiers. Spend caps. Signed receipts.
                  <br />
                  One line of code.
                </p>

                <div className="animate-fade-up stagger-3 flex flex-wrap items-center gap-4 pt-2">
                  <InstallBar />
                  <a
                    href={`${repoUrl}#readme`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-mono-secondary"
                  >
                    Read the docs →
                  </a>
                </div>
              </div>

              {/* Right: Terminal simulation */}
              <div className="animate-fade-up stagger-3 w-full max-w-lg flex-1">
                <div className="terminal-block" style={{ borderRadius: '2px' }}>
                  <div className="terminal-header">
                    <span
                      className="h-2.5 w-2.5"
                      style={{
                        background: 'var(--color-danger)',
                        borderRadius: '50%',
                      }}
                    />
                    <span
                      className="h-2.5 w-2.5"
                      style={{
                        background: 'var(--color-accent)',
                        borderRadius: '50%',
                      }}
                    />
                    <span
                      className="h-2.5 w-2.5"
                      style={{
                        background: '#22c55e',
                        borderRadius: '50%',
                      }}
                    />
                    <span
                      className="ml-auto"
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-text-dim)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      zsh
                    </span>
                  </div>
                  <div
                    className="terminal-body"
                    style={{
                      fontSize: '0.78rem',
                      lineHeight: 1.85,
                    }}
                  >
                    <span className="term-prompt">$</span>
                    <span style={{ color: 'var(--color-text)' }}>
                      actionfence simulate guard-policy.json \
                    </span>
                    <br />
                    <span style={{ display: 'inline-block', marginLeft: '18px' }}>
                      --action book_flight --identity verified --spend 250
                    </span>
                    <br />
                    <br />
                    <span
                      style={{
                        color: 'var(--color-accent)',
                        fontWeight: 600,
                      }}
                    >
                      SIMULATION - actionfence
                    </span>
                    <br />
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Action:         '}
                    </span>
                    <span style={{ color: 'var(--color-text)' }}>book_flight</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Identity:       '}
                    </span>
                    <span style={{ color: 'var(--color-text)' }}>verified</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Status:         '}
                    </span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                      PASS
                    </span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Spend:          '}
                    </span>
                    <span style={{ color: 'var(--color-text)' }}>250.00</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Session total:  '}
                    </span>
                    <span style={{ color: 'var(--color-text)' }}>250.00</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Human approval: '}
                    </span>
                    <span style={{ color: 'var(--color-text)' }}>required</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Rate limit:     '}
                    </span>
                    <span style={{ color: 'var(--color-text)' }}>
                      29/30 remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ THE PROBLEM ═══════════════════ */}
        <section
          style={{
            borderBottom: '1px solid #1f2424',
          }}
        >
          <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
            <div className="animate-fade-up stagger-1">
              <h2
                style={{
                  fontFamily: 'var(--font-head)',
                  fontWeight: 700,
                  fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                  lineHeight: 1.25,
                  color: 'var(--color-text)',
                  letterSpacing: '-0.02em',
                }}
              >
                AI agents are powerful.
                <br />
                That's exactly the problem.
              </h2>

              <p
                className="mt-5 max-w-xl"
                style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  color: 'var(--color-text-muted)',
                }}
              >
                Agents call tools, transfer funds, book flights,
                and delete records — autonomously, at scale.
                Without a gate, every tool call is a trust decision
                you've already made for them.
              </p>
            </div>

            {/* Two columns: Without vs With */}
            <div className="animate-fade-up stagger-2 mt-12 grid gap-6 sm:grid-cols-2">
              {/* Without */}
              <div
                className="terminal-block"
                style={{ borderRadius: '2px' }}
              >
                <div
                  className="terminal-header"
                  style={{
                    borderRadius: '2px 2px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Without ActionFence
                  </span>
                  <span className="badge badge-red">DENIED</span>
                </div>
                <div
                  className="terminal-body"
                  style={{
                    padding: '20px',
                    fontSize: '0.76rem',
                    lineHeight: 1.85,
                    color: 'var(--color-text-dim)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:11]
                  </span>{' '}
                  agent-tool invoked: book_flight
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:11]
                  </span>{' '}
                  handler executed — no identity check
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:12]
                  </span>{' '}
                  $250.00 charged to card ending in 4242
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:12]
                  </span>{' '}
                  no receipt. no audit trail.
                </div>
              </div>

              {/* With */}
              <div
                className="terminal-block"
                style={{ borderRadius: '2px' }}
              >
                <div
                  className="terminal-header"
                  style={{
                    borderRadius: '2px 2px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    With ActionFence
                  </span>
                  <span className="badge badge-amber">PASS</span>
                </div>
                <div
                  className="terminal-body"
                  style={{
                    padding: '20px',
                    fontSize: '0.76rem',
                    lineHeight: 1.85,
                    color: 'var(--color-text-dim)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:11]
                  </span>{' '}
                  action intercepted: book_flight
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:11]
                  </span>{' '}
                  identity verified (tier: verified)
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:11]
                  </span>{' '}
                  spend cap: $250.00 / $500.00 OK
                  <br />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    [14:02:11]
                  </span>
                  <span style={{ color: 'var(--color-accent)' }}>PASSED</span>{' '}
                  — receipt_id:{' '}
                  <span style={{ color: 'var(--color-text)' }}>a1b2...d4e6</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
        <section
          style={{
            borderBottom: '1px solid #1f2424',
          }}
        >
          <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
            <h2
              className="animate-fade-up stagger-1"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-text-dim)',
                marginBottom: '40px',
              }}
            >
              How it works
            </h2>

            <div className="grid gap-10 sm:grid-cols-3">
              <div className="animate-fade-up stagger-2">
                <span className="step-num">01</span>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                  }}
                >
                  Define the policy
                </h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Write guard-policy.json. What's allowed,
                  who can do it, how much they can spend.
                  Default rule: deny.
                </p>
              </div>

              <div className="animate-fade-up stagger-3">
                <span className="step-num">02</span>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                  }}
                >
                  Wrap your server
                </h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  withGuard(server, {'{'} policy: './guard-policy.json' {'}'})<br />
                  One function call. Works with MCP and Express.
                </p>
              </div>

              <div className="animate-fade-up stagger-4">
                <span className="step-num">03</span>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                  }}
                >
                  Every action is audited
                </h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Identity verified. Spend tracked. Decision signed
                  and chained in SQLite. You have the receipts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FEATURES ═══════════════════ */}
        <section
          style={{
            borderBottom: '1px solid #1f2424',
          }}
        >
          <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
            <h2
              className="animate-fade-up stagger-1"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-text-dim)',
                marginBottom: '40px',
              }}
            >
              Features
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Policy Enforcement */}
              <div className="animate-fade-up stagger-2 card" style={{ padding: '24px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--color-text)',
                    marginBottom: '12px',
                  }}
                >
                  Policy Enforcement
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                    marginBottom: '16px',
                  }}
                >
                  Define exact rules per action. Verified identity,
                  spend caps, rate limits, capability scopes.
                </p>
                <div className="code-block" style={{ fontSize: '0.72rem' }}>
                  <div className="code-header">
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                      guard-policy.json
                    </span>
                  </div>
                  <div className="code-body" style={{ padding: '12px 16px' }}>
                    <pre style={{ lineHeight: 1.8 }}>
                      <span style={{ color: 'var(--color-text-dim)' }}>{'{'}</span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>{'  "default_rule": "deny",'}</span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>{'  "actions": {'}</span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>
                        {'    "book_flight": {'}
                      </span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>
                        {'      "allowed": true,'}
                      </span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>
                        {'      "max_spend": 500'}
                      </span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>{'    }'}</span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>{'  }'}</span>
                      <br />
                      <span style={{ color: 'var(--color-text-dim)' }}>{'}'}</span>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Identity Tiers */}
              <div className="animate-fade-up stagger-3 card" style={{ padding: '24px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--color-text)',
                    marginBottom: '12px',
                  }}
                >
                  Identity Tiers
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                    marginBottom: '16px',
                  }}
                >
                  anonymous → token → verified.
                  Built-in JWKS support or bring your own resolver.
                </p>
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '2px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    lineHeight: 1.8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ padding: '8px 14px', color: 'var(--color-text-dim)' }}>anonymous</div>
                    <div style={{ padding: '8px 14px', color: 'var(--color-text-muted)' }}>No credentials</div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ padding: '8px 14px', color: 'var(--color-text-dim)' }}>token</div>
                    <div style={{ padding: '8px 14px', color: 'var(--color-text-muted)' }}>
                      Bearer present
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                    }}
                  >
                    <div style={{ padding: '8px 14px', color: 'var(--color-accent)' }}>verified</div>
                    <div style={{ padding: '8px 14px', color: 'var(--color-text-muted)' }}>
                      JWKS verified
                    </div>
                  </div>
                </div>
              </div>

              {/* Signed Receipts */}
              <div className="animate-fade-up stagger-4 card" style={{ padding: '24px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--color-text)',
                    marginBottom: '12px',
                  }}
                >
                  Signed Receipts
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                    marginBottom: '16px',
                  }}
                >
                  Hash-chained, HMAC-SHA256, append-only.
                  Verifiable with ReceiptStore.verifyChain().
                </p>
                <div className="receipt-block" style={{ fontSize: '0.74rem' }}>
                  <div>
                    <span className="receipt-label">receipt_id:</span>
                    <span className="receipt-value">a1b2c3d4-...</span>
                  </div>
                  <div>
                    <span className="receipt-label">timestamp:</span>
                    <span className="receipt-value">2026-05-07T14:02:11Z</span>
                  </div>
                  <div>
                    <span className="receipt-label">agent_id:</span>
                    <span className="receipt-value">agt_7x9f2k...</span>
                  </div>
                  <div>
                    <span className="receipt-label">action:</span>
                    <span className="receipt-value">book_flight</span>
                  </div>
                  <div>
                    <span className="receipt-label">status:</span>
                    <span className="receipt-accent">PASSED</span>
                  </div>
                  <div>
                    <span className="receipt-label">payload_hash:</span>
                    <span className="receipt-hash">0x8f3a...</span>
                  </div>
                  <div>
                    <span className="receipt-label">prev_hash:</span>
                    <span className="receipt-hash">0x7e2d...</span>
                  </div>
                  <div>
                    <span className="receipt-label">receipt_sig:</span>
                    <span className="receipt-hash">0x4f9b...</span>
                  </div>
                </div>
              </div>

              {/* Simulation Mode */}
              <div className="animate-fade-up stagger-5 card" style={{ padding: '24px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--color-text)',
                    marginBottom: '12px',
                  }}
                >
                  Simulation Mode
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-muted)',
                    marginBottom: '16px',
                  }}
                >
                  Test your policy before it goes live.
                  Full pipeline, no handler, no stored receipt.
                </p>
                <div className="terminal-block" style={{ fontSize: '0.72rem' }}>
                  <div
                    className="terminal-body"
                    style={{ padding: '16px', lineHeight: 1.85 }}
                  >
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      $ actionfence simulate guard-policy.json
                    </span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>{'  '}</span>
                    <span style={{ color: 'var(--color-accent)' }}>--action</span>
                    <span style={{ color: 'var(--color-text)' }}> book_flight</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>{'  '}</span>
                    <span style={{ color: 'var(--color-accent)' }}>--identity</span>
                    <span style={{ color: 'var(--color-text)' }}> verified</span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>{'  '}</span>
                    <span style={{ color: 'var(--color-accent)' }}>--spend</span>
                    <span style={{ color: 'var(--color-text)' }}> 250</span>
                    <br />
                    <br />
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                      SIMULATION - actionfence
                    </span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Status: PASS'}
                    </span>
                    <br />
                    <span style={{ color: 'var(--color-text-dim)' }}>
                      {'  Spend:  250.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ QUICK INSTALL ═══════════════════ */}
        <section
          style={{
            borderBottom: '1px solid #1f2424',
          }}
        >
          <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
            <h2
              className="animate-fade-up stagger-1"
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                lineHeight: 1.25,
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}
            >
              One line of protection.
            </h2>
            <p
              className="animate-fade-up stagger-2 mt-4"
              style={{
                fontSize: '0.9rem',
                lineHeight: 1.65,
                color: 'var(--color-text-muted)',
                maxWidth: '460px',
                marginBottom: '32px',
              }}
            >
              Wrap your server in one call. ActionFence intercepts every tool
              invocation, enforces your policy, and stores a signed receipt.
            </p>

            <div className="animate-fade-up stagger-3">
              <CodeTabs />
            </div>

            <div className="animate-fade-up stagger-4 mt-6">
              <a
                href={`${repoUrl}#readme`}
                target="_blank"
                rel="noreferrer"
                className="btn-mono-secondary"
              >
                See full API reference →
              </a>
            </div>
          </div>
        </section>

        {/* ═════════════════ COMPLIANCE NOTE ═════════════════ */}
        <section
          style={{
            borderBottom: '1px solid #1f2424',
          }}
        >
          <div className="mx-auto max-w-5xl px-5 py-14">
            <div className="animate-fade-up stagger-1">
              <p
                style={{
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                  color: 'var(--color-text-muted)',
                  maxWidth: '600px',
                  fontStyle: 'italic',
                }}
              >
                ActionFence stores regulation tags (EU_AI_Act_Art50 and others) in
                every receipt. Not a compliance platform — a foundation to build on.
              </p>
            </div>
          </div>
        </section>

        {/* ═════════════════ AI PROMPT ═════════════════ */}
        <section
          style={{
            borderBottom: '1px solid #1f2424',
          }}
        >
          <div className="mx-auto max-w-5xl px-5 py-14">
            <div className="animate-fade-up stagger-1">
              <AiPrompt />
            </div>
          </div>
        </section>

        {/* ═════════════════ FOOTER ═════════════════ */}
        <footer>
          <div className="mx-auto max-w-5xl px-5 py-8">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              className="sm:flex-row"
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  color: 'var(--color-text-dim)',
                  letterSpacing: '-0.01em',
                }}
              >
                actionfence — MIT License
              </span>

              <div className="flex items-center gap-5">
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ghost-link"
                >
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
                  href={`${repoUrl}/blob/main/CHANGELOG.md`}
                  target="_blank"
                  rel="noreferrer"
                  className="ghost-link"
                >
                  CHANGELOG
                </a>
              </div>
            </div>

            <div
              className="mt-6 pt-6"
              style={{
                borderTop: '1px solid var(--color-border)',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--color-text-dim)',
                }}
              >
                Built by{' '}
                <a
                  href="https://github.com/saifeldeen911"
                  target="_blank"
                  rel="noreferrer"
                  className="ghost-link"
                  style={{ fontSize: '0.74rem' }}
                >
                  Saifeldeen
                </a>
              </span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
