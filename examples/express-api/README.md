# Express API Example — ActionFence

A working Express REST API protected by ActionFence. Demonstrates policy enforcement on HTTP routes with `actionResolver` mapping and `spendExtractor` for spend cap checks.

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

# Book a flight (requires verified identity in this policy)
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer <verified-jwt-from-your-identity-reader>" \
  -H "Content-Type: application/json" \
  -d '{"flight_id": "FL-101", "amount": 299}'

# Check booking status (requires token — will be blocked without auth)
curl http://localhost:3000/bookings/BK-123

# Cancel booking (blocked by policy — always denied)
curl -X DELETE http://localhost:3000/bookings/BK-123
```

## How It Works

ActionFence's `guard()` middleware intercepts every request:

1. **Action Resolution** — Maps concrete paths like `DELETE /bookings/BK-123` to policy actions like `DELETE /bookings/:id`
2. **Identity Check** — Reads `Authorization` header for JWT/bearer tokens
3. **Spend Cap** — Extracts `amount` from request body via `spendExtractor`
4. **Rate Limiting** — Enforces 60 req/min and 10 txn/day per agent
5. **Decision** — PASS → continue to route handler, BLOCK → 403 response

ActionFence v0.1 decodes bearer JWTs but does not verify signatures by default. To satisfy `verified` policy actions in a real app, inject a custom `identityReader` that verifies your JWTs or identity provider tokens.

## Simulation Mode

Enable simulation mode to preview all decisions without executing route handlers:

```typescript
const actionfence = guard({
  policy: './guard-policy.json',
  simulate: true,  // ← returns X-ActionFence-Simulation header
});
```
