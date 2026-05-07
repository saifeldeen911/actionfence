# AgentGuard

> **AI Action Firewall for MCP servers and APIs.**
> One line of code. Signed receipts. Simulation mode.

[![CI](https://github.com/saifeldeen911/agentguard/actions/workflows/ci.yml/badge.svg)](https://github.com/saifeldeen911/agentguard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

---

## Why AgentGuard?

AI agents can now browse, book, buy, and delete things on behalf of humans. But a rogue or misconfigured agent can book 200 hotel rooms, charge the wrong card, or bulk-delete records — with no way to catch it before it happens.

AgentGuard sits at your **service's door** and enforces what any incoming AI agent is allowed to do:

- 🛡️ **Policy enforcement** — Allow/deny actions via a simple JSON policy file
- 🔐 **Identity tiers** — Classify agents as `anonymous`, `token`, or `verified`
- 💰 **Spend caps** — Set per-action and daily spending limits
- ⏱️ **Rate limiting** — Sliding window request + transaction limits
- 📝 **Signed receipts** — HMAC-SHA256 hash-chained audit trail in SQLite
- ⚡ **Simulation mode** — See what would happen before it does
- 🎯 **Zero-config** — Works out of the box. No database to provision, no keys to manage.

---

## Quick Start

### Install

```bash
npm install agentguard
```

### MCP Server (one-liner)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withGuard } from 'agentguard';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// One line — all tools registered after this are protected
withGuard(server, { policy: './guard-policy.json' });

server.registerTool('search_flights', { /* schema */ }, async (params) => {
  // This handler only runs if AgentGuard allows it
  return { content: [{ type: 'text', text: 'results...' }] };
});
```

### Express / Fastify

```typescript
import express from 'express';
import { guard } from 'agentguard';

const app = express();

app.use(guard({
  policy: './guard-policy.json',
  actionResolver: (toolName) => toolName, // "GET /flights" → policy action
  spendExtractor: (params) => {
    const body = (params as { body?: { amount?: number } })?.body;
    return body?.amount ?? null;
  },
}));

app.get('/flights', (req, res) => { /* only reachable if allowed */ });
```

### CLI

```bash
# Scaffold a starter policy file
npx agentguard init

# Validate a policy against the schema
npx agentguard validate guard-policy.json

# Dry-run a single action
npx agentguard simulate guard-policy.json --action book_flight --identity anonymous
```

---

## Policy File

AgentGuard uses a `guard-policy.json` file to define what agents can do. Think of it as `robots.txt` for AI actions.

```json
{
  "$schema": "https://agentguard.dev/schema/v1/guard-policy.schema.json",
  "service": "BookFlight.com",
  "version": "1.0",
  "default_rule": "deny",
  "actions": {
    "search_flights": {
      "allowed": true,
      "identity": "any"
    },
    "book_flight": {
      "allowed": true,
      "identity": "verified",
      "max_spend": 500,
      "requires_human_approval": true
    },
    "bulk_booking": {
      "allowed": false
    }
  },
  "rate_limits": {
    "requests_per_minute": 30,
    "transactions_per_day": 5
  },
  "regulations": ["EU_AI_Act_Art50"]
}
```

### Policy Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service` | `string` | ✅ | Service name this policy belongs to |
| `version` | `string` | ✅ | Policy version string |
| `default_rule` | `"allow" \| "deny"` | No | Default behavior for unlisted actions. Defaults to `"deny"` |
| `actions` | `object` | ✅ | Map of action names to permission rules |
| `rate_limits` | `object` | No | Rate limiting configuration |
| `regulations` | `string[]` | No | Regulatory frameworks (stored only, not enforced in v1) |

### Action Rule Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `allowed` | `boolean` | — | Whether this action is permitted (required) |
| `identity` | `"any" \| "token" \| "verified"` | `"any"` | Minimum identity tier required |
| `max_spend` | `integer` | — | Maximum spend per invocation (smallest currency unit) |
| `requires_human_approval` | `boolean` | `false` | Informational flag for human-in-the-loop |

### Identity Tiers

| Tier | Meaning | How it's determined |
|------|---------|-------------------|
| `anonymous` | No credentials presented | No `Authorization` header |
| `token` | Bearer token present but unverified | `Authorization: Bearer <token>` present |
| `verified` | Valid JWT with signature verified | JWT passes `jose.jwtVerify()` with configured JWKS |

---

## Simulation Mode

Preview what AgentGuard would do without executing any actions:

### MCP Server

```typescript
withGuard(server, {
  policy: './guard-policy.json',
  simulate: true,
});
// Tool calls return a JSON preview instead of executing
```

### Express

```typescript
app.use(guard({
  policy: './guard-policy.json',
  simulate: true,
}));
// Returns 200 + X-Agentguard-Simulation: true + JSON preview
```

### CLI

```bash
npx agentguard simulate guard-policy.json --action book_flight --identity verified --spend 250

# ⚡ SIMULATION — agentguard
#
#   Action:          book_flight
#   Identity:        verified
#   Status:          ✓ WOULD PASS
#   Spend:           $250.00
#   Human approval:  required
#   Rate limit:      29/30 remaining
```

---

## Action Receipts

Every action (passed or blocked) generates a signed, tamper-proof receipt:

```
receipt_id:     a1b2c3d4-...
timestamp:      2026-05-07T14:02:11Z
agent_id:       agt_7x9f2k...
action:         book_flight
status:         PASSED
payload_hash:   0x8f3a...
prev_hash:      0x7e2d...     ← hash chain link
receipt_sig:    0x4f9b...     ← HMAC-SHA256 signature
```

Receipts are:
- **Hash-chained** — each receipt includes the hash of the previous one
- **Signed** — HMAC-SHA256 with a secret key
- **Append-only** — stored in SQLite, never updated or deleted
- **Verifiable** — `ReceiptStore.verifyChain()` detects any tampering

### Signing Key Resolution

1. `options.secret` (programmatic override)
2. `AGENTGUARD_SECRET` environment variable
3. `.agentguard/key` file (auto-generated on first run)

---

## API Reference

### `withGuard(server, options)` — MCP Middleware

```typescript
import { withGuard } from 'agentguard';

const guard = withGuard(server, {
  policy: './guard-policy.json',
  simulate: false,
  silent: false,
  secret: process.env.AGENTGUARD_SECRET,
  actionResolver: (toolName, params) => toolName,
  spendExtractor: (params) => null,
  onDecision: (decision) => { /* custom logging */ },
  watchPolicy: true,
});

// Later:
guard.dispose();
```

### `guard(options)` — Express Middleware

```typescript
import { guard } from 'agentguard';

const middleware = guard({
  policy: './guard-policy.json',
  actionResolver: (toolName) => toolName,
  spendExtractor: (params) => null,
});

app.use(middleware);

// Later:
middleware.dispose();
```

### `GuardOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `policy` | `string \| GuardPolicy` | — | Path to policy file or inline policy object (required) |
| `simulate` | `boolean` | `false` | Enable simulation mode |
| `silent` | `boolean` | `false` | Suppress console output |
| `secret` | `string` | — | HMAC signing secret override |
| `actionResolver` | `(toolName, params) => string` | — | Map tool names to policy action names |
| `spendExtractor` | `(params) => number \| null` | — | Extract spend amount from request params |
| `transactionResolver` | `(toolName, params, decision) => boolean` | — | Classify actions as transactions for daily limits |
| `onDecision` | `(decision) => void` | — | Callback fired after every evaluation |
| `watchPolicy` | `boolean` | `false` | Enable hot-reload on policy file changes |

---

## CLI Reference

### `agentguard init`

Scaffold a starter `guard-policy.json`:

```bash
agentguard init                        # Creates ./guard-policy.json
agentguard init --service MyAPI        # Custom service name
agentguard init --output ./policies/   # Custom output path
```

### `agentguard validate <path>`

Validate a policy file against the JSON Schema:

```bash
agentguard validate guard-policy.json
# ✓ Valid policy: guard-policy.json
#   Service:         BookFlight.com
#   Version:         1.0
#   Default rule:    deny
#   Actions:         4 defined
```

### `agentguard simulate <path>`

Dry-run a policy evaluation:

```bash
agentguard simulate guard-policy.json --action search_flights
agentguard simulate guard-policy.json --action book_flight --identity verified --spend 250
agentguard simulate guard-policy.json --action bulk_booking  # exits with code 1
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--action` | ✅ | — | Policy action name to evaluate |
| `--identity` | No | `anonymous` | Identity tier (`anonymous`, `token`, `verified`) |
| `--spend` | No | — | Spend amount for spend cap checks |
| `--tool` | No | Same as action | Original tool name (if different from action) |

---

## Examples

- **[MCP Server Example](examples/mcp-server/)** — Flight booking MCP server with 4 protected tools
- **[Express API Example](examples/express-api/)** — REST API with route-based policy enforcement

---

## Development

```bash
git clone https://github.com/saifeldeen911/agentguard.git
cd agentguard
npm install
npm run typecheck    # Type-check
npm run lint         # Lint
npm test             # Run tests
npm run build        # Build ESM + CJS + types
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guidelines.

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  Your MCP Server / Express API                        │
│                                                       │
│  withGuard(server, { policy: './guard-policy.json' }) │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  AgentGuard Pipeline (per tool call)          │    │
│  │                                               │    │
│  │  1. Identity Read  → anonymous/token/verified │    │
│  │  2. Policy Match   → allow/deny + reason      │    │
│  │  3. Rate Limit     → sliding window check     │    │
│  │  4. Spend Cap      → session/daily threshold  │    │
│  │  5. Receipt Sign   → HMAC-SHA256 + hash chain │    │
│  │  6. Receipt Store  → SQLite append-only       │    │
│  │  7. Console Report → colorized output         │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  PASS → signed receipt + handler executes             │
│  BLOCK → error response + receipt logged              │
└───────────────────────────────────────────────────────┘
```

---

## License

[MIT](LICENSE) © [Saifeldeen](https://github.com/saifeldeen911)
