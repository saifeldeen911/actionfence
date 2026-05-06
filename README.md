# Agent Bouncer

> AI Action Firewall for MCP servers and APIs — policy enforcement, signed receipts, simulation mode.

**Status:** 🚧 Under active development — not yet published to npm.

## What is Agent Bouncer?

Agent Bouncer is a middleware layer that service providers install in front of their MCP servers and APIs. It intercepts every incoming AI agent request, checks it against a declared policy file, and either passes the request through with a signed receipt or blocks it with a logged reason.

```typescript
import { withBouncer } from 'agent-bouncer';

// One line. That's it.
withBouncer(server, { policy: './bouncer-policy.json' });
```

## Features (v1)

- ✅ Allow/deny actions via policy file
- ✅ Identity tier checks (anonymous / token / verified)
- ✅ Rate limits (requests/min, transactions/day)
- ✅ Spend caps (per-session, per-day thresholds)
- ✅ Signed action receipts with hash chain (SQLite)
- ✅ Simulation mode (dry-run preview)
- ✅ Console reporter (colorized terminal output)
- ✅ CLI tools (init, validate, simulate)

## Documentation

Full documentation coming soon.

## License

[MIT](LICENSE)
