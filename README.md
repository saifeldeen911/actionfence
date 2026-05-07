# AgentGuard

> TypeScript policy engine and audit trail for AI agent action enforcement.

**Status:** 🚧 Under active development — not yet published to npm.

## What is AgentGuard?

AgentGuard is building toward an AI action firewall for MCP (Model Context Protocol) servers and APIs. The current repo already includes the core policy engine, identity reader, rate limiter, spend tracker, signed receipts, append-only SQLite storage, and a console reporter. Middleware adapters, simulation mode, and CLI tooling are planned next.

```typescript
import {
  IdentityReader,
  PolicyEvaluator,
  RateLimiter,
  ReceiptStore,
  loadPolicy,
} from 'agentguard';

const policy = loadPolicy('./guard-policy.json');
const evaluator = new PolicyEvaluator(policy);
const identityReader = new IdentityReader();
const rateLimiter = new RateLimiter(policy.rate_limits ?? {});
const receiptStore = new ReceiptStore();

// Middleware adapters such as withGuard() are not implemented yet.
```

## Implemented Today

- ✅ Allow/deny actions via policy file
- ✅ Identity tier checks (anonymous / token / verified)
- ✅ Rate limits (requests/min, transactions/day)
- ✅ Internal spend tracking (session and daily totals)
- ✅ Signed action receipts with hash chain (SQLite)
- ✅ Console reporter (colorized terminal output)

## Planned Next

- ⏳ MCP `withGuard()` wrapper
- ⏳ Express/Fastify middleware
- ⏳ Simulation mode
- ⏳ CLI tools

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
