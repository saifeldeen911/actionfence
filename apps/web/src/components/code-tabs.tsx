'use client';

import { useState } from 'react';

interface CodeSample {
  id: string;
  label: string;
  code: string;
}

const samples: CodeSample[] = [
  {
    id: 'mcp',
    label: 'MCP Server',
    code: `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withGuard } from 'actionfence';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

withGuard(server, {
  policy: './guard-policy.json',
  identityReaderOptions: {
    jwksUri: 'https://issuer.example/.well-known/jwks.json',
    issuer: 'https://issuer.example',
    audience: 'bookflight-mcp',
  },
});

server.registerTool('search_flights', {}, async () => {
  return { content: [{ type: 'text', text: 'results...' }] };
});`,
  },
  {
    id: 'express',
    label: 'Express / Fastify',
    code: `import express from 'express';
import { guard } from 'actionfence';

const app = express();
app.use(express.json());

app.use(
  guard({
    policy: './guard-policy.json',
    identityReaderOptions: {
      jwksUri: 'https://issuer.example/.well-known/jwks.json',
    },
    actionResolver: (toolName) => {
      if (/^GET \\/bookings\\/[^/]+$/.test(toolName)) {
        return 'GET /bookings/:id';
      }
      return toolName;
    },
  }),
);`,
  },
  {
    id: 'cli',
    label: 'CLI',
    code: `npx actionfence init
npx actionfence validate guard-policy.json
npx actionfence simulate guard-policy.json \\
  --action book_flight \\
  --identity verified \\
  --spend 250`,
  },
];

export function CodeTabs() {
  const [activeId, setActiveId] = useState(samples[0].id);
  const activeSample = samples.find((s) => s.id === activeId) ?? samples[0];
  const lines = activeSample.code.split('\n');

  return (
    <section
      id="code"
      className="animate-fade-up stagger-5"
      aria-labelledby="code-title"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="code-title"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Integration
        </h2>
        <div className="flex gap-1">
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              className="tab-btn"
              data-active={s.id === activeId}
              onClick={() => setActiveId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="code-block">
        <div
          className="flex items-center gap-2 border-b px-4 py-2.5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-red)' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-amber)' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-green)' }} />
          <span
            className="ml-auto text-xs"
            style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
          >
            {activeSample.id === 'cli' ? 'terminal' : `${activeSample.id}.ts`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <pre>
            {lines.map((line, i) => (
              <div key={`${activeId}-${i}`} className="flex">
                <span className="line-number">{i + 1}</span>
                <code>{line || ' '}</code>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
