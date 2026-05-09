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
      if (/^GET \/bookings\/[^/]+$/.test(toolName)) {
        return 'GET /bookings/:id';
      }
      return toolName;
    },
  }),
);`,
  },
];

export function CodeTabs() {
  const [activeId, setActiveId] = useState(samples[0].id);
  const activeSample = samples.find((s) => s.id === activeId) ?? samples[0];
  const lines = activeSample.code.split('\n');

  return (
    <section id="install" aria-labelledby="code-title">
      <div className="flex items-center gap-1 mb-4">
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

      <div className="code-block">
        <div className="code-header">
          <span
            className="h-2 w-2"
            style={{ background: 'var(--color-danger)', borderRadius: '50%' }}
          />
          <span
            className="h-2 w-2"
            style={{ background: 'var(--color-accent)', borderRadius: '50%' }}
          />
          <span
            className="h-2 w-2"
            style={{ background: 'var(--color-pass)', borderRadius: '50%' }}
          />
          <span
            className="ml-auto"
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {activeSample.id}.ts
          </span>
        </div>
        <div className="code-body">
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
