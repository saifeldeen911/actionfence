# MCP Server Example

This example shows an MCP server protected by ActionFence.

## Tools

| Tool | Policy | Identity | Spend Cap |
| --- | --- | --- | --- |
| `search_flights` | Allowed | `token` | - |
| `book_flight` | Allowed | `verified` | `500.00 USD` |
| `check_status` | Allowed | `token` | - |
| `bulk_booking` | Blocked | - | - |

## Quick Start

```bash
cd examples/mcp-server
npm install
npx tsx src/index.ts
```

## Notes

- Unlisted tools are blocked by default.
- The policy enforces `30` requests/minute and `5` transactions/day.
- Global spend limits are configured in [`guard-policy.json`](./guard-policy.json).
- To allow `identity: "verified"` actions, configure `identityReaderOptions` in [`src/index.ts`](./src/index.ts).

## Simulation Mode

```ts
withGuard(server, {
  policy: './guard-policy.json',
  simulate: true,
});
```
