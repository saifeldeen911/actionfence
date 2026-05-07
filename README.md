# AgentGuard

> TypeScript policy engine and audit trail for AI agent action enforcement.

**Status:** 🚧 Under active development — not yet published to npm.

## What is AgentGuard?

AgentGuard is building toward an AI action firewall for MCP (Model Context Protocol) servers and APIs. The current repo includes the core policy engine, identity reader, rate limiter, spend tracker, signed receipts, append-only SQLite storage, console reporter, MCP middleware, Express-compatible middleware, and simulation mode. CLI tooling is planned next.

```typescript
import { withGuard } from 'agentguard';

withGuard(server, { policy: './guard-policy.json' });
server.registerTool('search_flights', { inputSchema }, async (params) => {
  return { content: [{ type: 'text', text: 'ok' }] };
});
```

```typescript
import { guard } from 'agentguard';

app.use(guard({
  policy: './guard-policy.json',
  actionResolver: (requestName) => {
    if (requestName === 'POST /bookings') return 'book_flight';
    return requestName;
  },
}));
```

## Implemented Today

- ✅ Allow/deny actions via policy file
- ✅ Identity tier checks (anonymous / token / verified)
- ✅ Rate limits (requests/min, transactions/day)
- ✅ Internal spend tracking (session and daily totals)
- ✅ Signed action receipts with hash chain (SQLite)
- ✅ Console reporter (colorized terminal output)
- ✅ MCP `withGuard()` wrapper
- ✅ Express-compatible `guard()` middleware
- ✅ Simulation mode for MCP and HTTP

## Planned Next

- ⏳ CLI tools
- ⏳ Examples and expanded quickstart docs

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Documentation

The planning docs in [`readme-plans/`](readme-plans/) track the phased roadmap and implementation details.

## License

[MIT](LICENSE)
