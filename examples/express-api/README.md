# Express API Example

This example shows an Express API protected by ActionFence.

## Routes

| Route | Method | Policy | Identity | Spend Cap |
| --- | --- | --- | --- | --- |
| `/flights` | `GET` | Allowed | `any` | - |
| `/bookings` | `POST` | Allowed | `verified` | `1000.00 USD` |
| `/bookings/:id` | `GET` | Allowed | `token` | - |
| `/bookings/:id` | `DELETE` | Blocked | - | - |

## Quick Start

```bash
cd examples/express-api
npm install
npx tsx src/index.ts
```

## Notes

- `actionResolver` maps concrete paths like `GET /bookings/BK-123` to policy actions like `GET /bookings/:id`.
- `spendExtractor` reads the booking amount from the request body.
- The policy includes request, transaction, session, and daily spend limits.
- To allow `identity: "verified"` actions, configure `identityReaderOptions` in [`src/index.ts`](./src/index.ts).

## Simulation Mode

```ts
guard({
  policy: './guard-policy.json',
  simulate: true,
});
```
