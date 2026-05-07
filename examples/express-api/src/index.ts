/**
 * Example Express API with AgentGuard
 *
 * Demonstrates how to protect an Express REST API with AgentGuard's
 * guard() middleware. This example creates a flight booking API with:
 *   - GET  /flights          — public search (any identity)
 *   - POST /bookings         — book a flight (verified identity, spend cap)
 *   - GET  /bookings/:id     — check booking status (token identity)
 *   - DELETE /bookings/:id   — cancel booking (blocked by policy)
 *
 * Run with:
 *   npx tsx src/index.ts
 *
 * Test with:
 *   curl http://localhost:3000/flights
 *   curl -X POST http://localhost:3000/bookings \
 *     -H "Content-Type: application/json" \
 *     -d '{"flight_id": "FL-101", "amount": 299}'
 */

import express from 'express';
import { guard } from 'agentguard';

const app = express();
const PORT = 3000;

// ---------------------------------------------------------------------------
// 1. Parse JSON bodies
// ---------------------------------------------------------------------------

app.use(express.json());

// ---------------------------------------------------------------------------
// 2. Install AgentGuard middleware
// ---------------------------------------------------------------------------

const agentguard = guard({
  policy: './guard-policy.json',

  // Map Express route patterns to policy action names.
  // The guard middleware provides `METHOD /route` as the default tool name.
  // actionResolver lets you map that to your policy's action keys.
  actionResolver: (toolName: string, _params: unknown) => {
    // toolName is "GET /flights", "POST /bookings", etc.
    // Our policy uses the same format, so pass through as-is.
    return toolName;
  },

  // Extract spend amount from request body for spend cap checks.
  spendExtractor: (params: unknown) => {
    const body = params as { body?: { amount?: number } } | undefined;
    if (body?.body?.amount !== undefined) {
      return body.body.amount;
    }
    return null;
  },

  // Uncomment to enable simulation mode:
  // simulate: true,
});

app.use(agentguard);

// ---------------------------------------------------------------------------
// 3. Define routes — AgentGuard protects all of them
// ---------------------------------------------------------------------------

app.get('/flights', (_req, res) => {
  res.json({
    flights: [
      { id: 'FL-101', route: 'LAX→JFK', price: 299, departure: '08:00' },
      { id: 'FL-202', route: 'LAX→JFK', price: 449, departure: '14:30' },
      { id: 'FL-303', route: 'SFO→ORD', price: 199, departure: '11:15' },
    ],
  });
});

app.post('/bookings', (req, res) => {
  const { flight_id, amount } = req.body as { flight_id: string; amount: number };
  res.status(201).json({
    confirmation: `BK-${Date.now()}`,
    flight: flight_id,
    total: `$${amount}`,
    status: 'confirmed',
  });
});

app.get('/bookings/:id', (req, res) => {
  res.json({
    booking: req.params.id,
    status: 'confirmed',
    departure: '2026-06-15T08:00:00Z',
  });
});

app.delete('/bookings/:id', (req, res) => {
  // This should never be reached — blocked by policy
  res.json({
    booking: req.params.id,
    status: 'cancelled',
  });
});

// ---------------------------------------------------------------------------
// 4. Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n🛫 BookFlight.com API running at http://localhost:${PORT}`);
  console.log(`🛡️  AgentGuard is protecting all routes\n`);
  console.log(`Try these commands:`);
  console.log(`  curl http://localhost:${PORT}/flights`);
  console.log(`  curl -X POST http://localhost:${PORT}/bookings -H "Content-Type: application/json" -d '{"flight_id":"FL-101","amount":299}'`);
  console.log(`  curl -X DELETE http://localhost:${PORT}/bookings/BK-123   # ← will be blocked\n`);
});

// Cleanup on shutdown
process.on('SIGINT', () => {
  agentguard.dispose();
  process.exit(0);
});
