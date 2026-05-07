# Express API Example — AgentGuard

A working Express REST API protected by AgentGuard. Demonstrates policy enforcement on HTTP routes with `actionResolver` mapping and `spendExtractor` for spend cap checks.

## Routes

| Route | Method | Policy | Identity | Spend Cap |
|-------|--------|--------|----------|-----------|
| `/flights` | GET | ✅ Allowed | `any` | — |
| `/bookings` | POST | ✅ Allowed | `verified` | $1,000 |
| `/bookings/:id` | GET | ✅ Allowed | `token` | — |
| `/bookings/:id` | DELETE | ❌ Blocked | — | — |

## Quick Start

```bash
cd examples/express-api
npm install
npx tsx src/index.ts
```

## Testing with curl

```bash
# Search flights (allowed for anyone)
curl http://localhost:3000/flights

# Book a flight (requires verified identity — will be blocked without auth)
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{"flight_id": "FL-101", "amount": 299}'

# Check booking status (requires token — will be blocked without auth)
curl http://localhost:3000/bookings/BK-123

# Cancel booking (blocked by policy — always denied)
curl -X DELETE http://localhost:3000/bookings/BK-123
```

## How It Works

AgentGuard's `guard()` middleware intercepts every request:

1. **Action Resolution** — Maps `METHOD /path` to a policy action name
2. **Identity Check** — Reads `Authorization` header for JWT/bearer tokens
3. **Spend Cap** — Extracts `amount` from request body via `spendExtractor`
4. **Rate Limiting** — Enforces 60 req/min and 10 txn/day per agent
5. **Decision** — PASS → continue to route handler, BLOCK → 403 response

## Simulation Mode

Enable simulation mode to preview all decisions without executing route handlers:

```typescript
const agentguard = guard({
  policy: './guard-policy.json',
  simulate: true,  // ← returns X-Agentguard-Simulation header
});
```
