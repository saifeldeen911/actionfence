# MCP Server Example — ActionFence

A working MCP server protected by ActionFence. Demonstrates policy enforcement, identity tier checks, spend caps, and rate limiting on a flight booking API.

## Tools

| Tool | Policy | Identity | Spend Cap |
|------|--------|----------|-----------|
| `search_flights` | ✅ Allowed | `any` | — |
| `book_flight` | ✅ Allowed | `verified` | $500 |
| `check_status` | ✅ Allowed | `token` | — |
| `bulk_booking` | ❌ Blocked | — | — |

## Quick Start

```bash
cd examples/mcp-server
npm install
npx tsx src/index.ts
```

## Policy File

The [`guard-policy.json`](./guard-policy.json) enforces:

- **Default deny** — any unlisted tool is blocked
- **Rate limits** — 30 requests/min, 5 transactions/day
- **Spend cap** — max $500 per booking action
- **Identity tiers** — public, token, and verified access levels

## Connecting with Claude Desktop

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "bookflight": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/path/to/examples/mcp-server"
    }
  }
}
```

## Simulation Mode

Enable simulation mode to preview decisions without executing actions:

```typescript
const guard = withGuard(server, {
  policy: './guard-policy.json',
  simulate: true,  // ← dry-run mode
});
```
