# ActionFence

AI Action Firewall for MCP servers and APIs.

One line of code. Signed receipts. Simulation mode.

[![CI](https://github.com/saifeldeen911/actionfence/actions/workflows/ci.yml/badge.svg)](https://github.com/saifeldeen911/actionfence/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

## Why ActionFence?

AI agents can now book flights, send emails, and delete records in your system — often without you knowing until the invoice arrives. ActionFence lets you define exactly what they're allowed to do, and proves every decision with a signed receipt.

It sits in front of your MCP tools or HTTP routes and decides whether an incoming agent action is allowed before your real handler runs.

It gives you:

- Policy enforcement from `guard-policy.json`
- Identity tiers: `anonymous`, `token`, `verified`
- Built-in verified JWT support via JWKS
- Capability scope checks from JWT `capabilities`
- Per-action spend caps plus session/day spend limits
- Request and transaction rate limiting
- Signed, hash-chained receipts in SQLite
- Simulation mode for dry-run previews

## Install

```bash
npm install actionfence
```

## Quick Start

### MCP Server

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
});
```

### Express / Fastify

```ts
import express from 'express';
import { guard } from 'actionfence';

const app = express();
app.use(express.json());

app.use(
  guard({
    policy: './guard-policy.json',
    identityReaderOptions: {
      jwksUri: 'https://issuer.example/.well-known/jwks.json',
      issuer: 'https://issuer.example',
      audience: 'bookflight-api',
    },
    actionResolver: (toolName) => {
      if (/^GET \/bookings\/[^/]+$/.test(toolName)) {
        return 'GET /bookings/:id';
      }
      return toolName;
    },
    spendExtractor: (params) => {
      const body = (params as { body?: { amount?: number } })?.body;
      return body?.amount ?? null;
    },
  }),
);
```

### CLI

```bash
npx actionfence init
npx actionfence validate guard-policy.json
npx actionfence simulate guard-policy.json --action book_flight --identity verified --spend 250
```

### Using an AI Coding Assistant?

Copy this prompt into Claude, Cursor, Copilot, or any LLM and let it handle the setup:

```
Install and integrate the "actionfence" npm package into my current project. Read the full integration guide at https://raw.githubusercontent.com/saifeldeen911/actionfence/main/llms-full.txt then: install the package, create a guard-policy.json for my use case, and wire up the middleware.
```

## Trust Model

ActionFence runs on **your server** as middleware. The agent communicates
with your server via MCP protocol or HTTP — it never has direct access
to the policy file or the enforcement engine.

This is server-side enforcement, not a client-side honor system.

- The agent **cannot** read `guard-policy.json` — it's a file on your server
- The agent **cannot** bypass the middleware — all tool calls pass through it
- The agent **cannot** tamper with receipts — they're signed with your secret key

> **Tip:** Keep `guard-policy.json` outside any tool-accessible directories.
> If your MCP server has a `read_file` tool, make sure it can't access
> the directory where your policy file lives.

## Storage

ActionFence stores signed receipts in SQLite by default (zero-config).
For serverless or horizontally-scaled deployments, use PostgreSQL:

### PostgreSQL Setup

1. Install the `pg` driver:

   ```bash
   npm install pg
   ```

2. Configure storage in your guard setup:
   ```typescript
   withGuard(server, {
     policy: './guard-policy.json',
     storage: {
       adapter: 'postgres',
       connectionString: process.env.DATABASE_URL,
     },
   });
   ```

ActionFence auto-creates the `actionfence_receipts` table on first use.

## Policy File

`guard-policy.json` defines what agents can do in your system.

```json
{
  "$schema": "https://raw.githubusercontent.com/saifeldeen911/actionfence/main/schemas/guard-policy.schema.json",
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
      "currency": "USD",
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
  "spend_limits": {
    "session_max": 1000,
    "daily_max": 2500,
    "window": {
      "max_amount": 500,
      "duration_minutes": 60
    },
    "currency": "USD"
  },
  "circuit_breaker": {
    "global_max_spend": 10000,
    "action": "block_all",
    "currency": "USD"
  },
  "regulations": ["EU_AI_Act_Art50"]
}
```

### Policy Reference

| Field          | Type                | Required | Notes                                           |
| -------------- | ------------------- | -------- | ----------------------------------------------- |
| `service`      | `string`            | Yes      | Service name                                    |
| `version`      | `string`            | Yes      | Policy version                                  |
| `default_rule` | `"allow" \| "deny"` | No       | Defaults to `"deny"`                            |
| `actions`      | `object`            | Yes      | Action rules keyed by action name               |
| `rate_limits`  | `object`            | No       | Request and transaction limits                  |
| `spend_limits` | `object`            | No       | Session, daily, and rolling-window spend limits |
| `circuit_breaker`| `object`          | No       | Global maximum spend kill-switch                |
| `regulations`  | `string[]`          | No       | Stored (persisted) in `v0.1.0` but not enforced |

### Action Rule Fields

| Field                     | Type                             | Default | Notes                                                                                                                                                                                  |
| ------------------------- | -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowed`                 | `boolean`                        | -       | Required                                                                                                                                                                               |
| `identity`                | `"any" \| "token" \| "verified"` | `"any"` | Minimum identity tier                                                                                                                                                                  |
| `max_spend`               | `number`                         | -       | Per-invocation cap in major units                                                                                                                                                      |
| `currency`                | `string`                         | -       | ISO 4217 currency code                                                                                                                                                                 |
| `requires_human_approval` | `boolean`                        | `false` | In `0.1.0`: flags the decision in the receipt and fires the `onDecision` callback so you can build your own approval flow. Built-in approval workflow is planned for a future release. |

### Identity Tiers

| Tier        | Meaning                                         |
| ----------- | ----------------------------------------------- |
| `anonymous` | No credentials presented                        |
| `token`     | Bearer token present but not signature-verified |
| `verified`  | JWT passed JWKS verification                    |

Verified identity is built in when you configure `identityReaderOptions.jwksUri` and JWKS lookup succeeds from cache or the remote endpoint. If JWKS retrieval or network access fails, ActionFence may fall back to `token` identity; invalid signatures, wrong issuers or audiences, unknown kids, and other cryptographic verification failures stay anonymous or rejected.

### Scope Enforcement

If a decoded or verified token includes a `capabilities` claim, ActionFence treats it as an exact allowlist of policy action names. A request that passes policy checks but is not listed in `capabilities` is blocked.

## Payload Processing

ActionFence canonicalizes tool params before hashing receipts. That keeps the receipt chain deterministic, but it also means tool payloads must stay JSON-friendly.

### Payload Redaction

By default, full tool params are stored in receipts. To strip sensitive fields (passwords, API keys, PII) before persistence, use `payloadRedactor`:

```ts
withGuard(server, {
  policy: './guard-policy.json',
  payloadRedactor: (params) => {
    const safe = { ...(params as Record<string, unknown>) };
    delete safe.password;
    delete safe.apiKey;
    return safe;
  },
  maxPayloadBytes: 32_768, // optional: truncate stored payloads above 32 KB
});
```

- The receipt hash is computed from the **original** params (integrity is preserved).
- Only the **stored** `payload_json` is redacted/truncated (privacy).
- `payloadRedactor` must return a sanitized copy — do not mutate the input.
- `maxPayloadBytes` defaults to 65 536 (64 KB). Payloads exceeding this are replaced with a truncation marker that includes the original hash.

### Payload Requirements

- `params` must be JSON-serializable.
- Unsupported values such as `BigInt`, `Symbols`, and circular references will fail before receipt creation.
- `undefined` values are omitted by canonicalization, and `NaN` or `Infinity` become `null`.
- Tool authors should validate their params are JSON-friendly before calling ActionFence-protected endpoints.

## Simulation Mode

Simulation mode runs the full policy pipeline without executing the handler or storing a receipt.

### MCP

```ts
withGuard(server, {
  policy: './guard-policy.json',
  simulate: true,
});
```

### Express

```ts
app.use(
  guard({
    policy: './guard-policy.json',
    simulate: true,
  }),
);
```

### CLI output

```bash
actionfence simulate guard-policy.json --action book_flight --identity verified --spend 250

SIMULATION - actionfence

  Action:          book_flight
  Tool:            book_flight
  Identity:        verified
  Status:          PASS
  Spend:           250.00
  Session total:   250.00
  Daily total:     250.00
  Human approval:  required
  Rate limit:      29/30 remaining
```

## Action Receipts

Every enforced decision stores a signed receipt in SQLite.

Stored payloads may be redacted or truncated before persistence. The receipt binds the original request hash and the stored payload-view hash so chain verification can still detect tampering.

```text
receipt_id:     a1b2c3d4-...
timestamp:      2026-05-07T14:02:11Z
agent_id:       agt_7x9f2k...
action:         book_flight
status:         PASSED
payload_hash:   0x8f3a...
prev_hash:      0x7e2d...
receipt_sig:    0x4f9b...
```

Receipts are:

- Hash-chained
- HMAC-SHA256 signed
- Append-only
- Verifiable with `ReceiptStore.verifyChain()`

> **Note:** Receipts are stored in a local SQLite file (`.actionfence/receipts.db`) by default. This works perfectly for single-instance deployments. If you run multiple server instances, use the `postgres` storage adapter to maintain a single global receipt chain.

Signing key resolution order:

1. `options.secret`
2. `ACTIONFENCE_SECRET`
3. `.actionfence/key`

## API Reference

### `withGuard(server, options)`

```ts
const guardInstance = withGuard(server, {
  policy: './guard-policy.json',
  simulate: false,
  silent: false,
  secret: process.env.ACTIONFENCE_SECRET,
  identityReaderOptions: {
    jwksUri: 'https://issuer.example/.well-known/jwks.json',
    issuer: 'https://issuer.example',
    audience: 'bookflight-mcp',
  },
  actionResolver: (toolName, params) => toolName,
  spendExtractor: (params) => null,
  onDecision: (decision) => {},
  watchPolicy: true,
});

const status = guardInstance.getAgentStatus('agt_7x9f2k');
console.log(`Allowed actions:`, status.allowedActions);

guardInstance.dispose();
```

### `guard(options)`

```ts
const middleware = guard({
  policy: './guard-policy.json',
  identityReaderOptions: {
    jwksUri: 'https://issuer.example/.well-known/jwks.json',
  },
});
```

### `GuardOptions`

| Option                  | Type                                      | Default | Notes                                    |
| ----------------------- | ----------------------------------------- | ------- | ---------------------------------------- |
| `policy`                | `string \| GuardPolicy`                   | -       | Required                                 |
| `simulate`              | `boolean`                                 | `false` | Dry-run mode                             |
| `silent`                | `boolean`                                 | `false` | Suppress console output                  |
| `secret`                | `string`                                  | -       | HMAC secret override                     |
| `identityReaderOptions` | `IdentityReaderOptions`                   | -       | Built-in JWKS verification config        |
| `identityReader`        | `IdentityReaderLike`                      | -       | Full custom identity resolution override |
| `actionResolver`        | `(toolName, params) => string`            | -       | Map tool names to policy actions         |
| `spendExtractor`        | `(params) => number \| null`              | -       | Extract spend in major units             |
| `transactionResolver`   | `(toolName, params, decision) => boolean` | -       | Override transaction classification      |
| `onDecision`            | `(decision) => void`                      | -       | Metrics, logging, hooks                  |
| `watchPolicy`           | `boolean`                                 | `false` | Hot-reload file-backed policies          |
| `storage`               | `StorageConfig`                           | -       | Storage backend (SQLite/PostgreSQL)      |
| `payloadRedactor`       | `(params: unknown) => unknown`            | -       | Strip sensitive fields before receipt storage |
| `maxPayloadBytes`       | `number`                                  | `65536` | Max stored `payload_json` size; larger payloads are truncated |

### `IdentityReaderOptions`

| Field      | Type                 | Notes                   |
| ---------- | -------------------- | ----------------------- |
| `jwksUri`  | `string`             | Remote JWKS endpoint    |
| `issuer`   | `string \| string[]` | Optional issuer check   |
| `audience` | `string \| string[]` | Optional audience check |

## Current Limitations

- Capability checks are exact string matches only
- No APoP / LAS-WG adapters yet
- No path-policy DSL
- `requires_human_approval` flags the receipt and fires `onDecision` — no built-in approval workflow yet (use the callback to build your own)
- Money is major-unit only; mixed-currency accounting is out of scope for one policy
- SQLite storage is single-instance only (use the `postgres` adapter for multi-instance deployments)

## CLI Reference

### `actionfence init`

```bash
actionfence init
actionfence init --service MyAPI
actionfence init --output ./policies/guard-policy.json
```

### `actionfence validate <path>`

```bash
actionfence validate guard-policy.json
```

### `actionfence simulate <path>`

```bash
actionfence simulate guard-policy.json --action search_flights
actionfence simulate guard-policy.json --action book_flight --identity verified --spend 250
```

## Examples

- [MCP Server Example](examples/mcp-server/)
- [Express API Example](examples/express-api/)

## Development

```bash
git clone https://github.com/saifeldeen911/actionfence.git
cd actionfence
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## License

[MIT](LICENSE) (c) [Saifeldeen](https://github.com/saifeldeen911)
