/**
 * Example Express API with ActionFence
 *
 * Demonstrates how to protect an Express REST API with ActionFence's
 * guard() middleware. This example creates a flight booking API with:
 *   - GET  /flights          — public search (any identity)
 *   - POST /bookings         — book a flight (verified identity, spend cap)
 *   - GET  /bookings/:id     — check booking status (token identity + ownership)
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
import { guard } from 'actionfence';
import type { Request } from 'express';

const app = express();
const PORT = 3000;
const bookings = new Map<
  string,
  {
    id: string;
    userId: string;
    flightId: string;
    amount: number;
    status: string;
    departure: string;
  }
>([
  [
    'BK-123',
    {
      id: 'BK-123',
      userId: 'user-123',
      flightId: 'FL-101',
      amount: 299,
      status: 'confirmed',
      departure: '2026-06-15T08:00:00Z',
    },
  ],
]);

// ---------------------------------------------------------------------------
// 1. Parse JSON bodies
// ---------------------------------------------------------------------------

app.use(express.json());

// ---------------------------------------------------------------------------
// 2. Install ActionFence middleware
// ---------------------------------------------------------------------------

const actionfence = guard({
  policy: './guard-policy.json',
  // Configure JWKS verification to allow actions that require `identity: "verified"`.
  // identityReaderOptions: {
  //   jwksUri: process.env.ACTIONFENCE_JWKS_URI!,
  //   issuer: 'https://issuer.example',
  //   audience: 'bookflight-api',
  // },

  // Map Express route patterns to policy action names.
  // The guard middleware provides `METHOD /route` as the default tool name.
  // actionResolver lets you map that to your policy's action keys.
  actionResolver: (toolName: string, _params: unknown) => {
    if (/^GET \/bookings\/[^/]+$/.test(toolName)) {
      return 'GET /bookings/:id';
    }

    if (/^DELETE \/bookings\/[^/]+$/.test(toolName)) {
      return 'DELETE /bookings/:id';
    }

    return toolName;
  },

  // Extract spend amount from request body for spend cap checks.
  spendExtractor: (params: unknown) => {
    const body = params as { body?: { amount?: unknown } } | undefined;
    const parsedAmount = parseBookingAmount(body?.body?.amount);
    if (parsedAmount !== null) {
      return parsedAmount;
    }
    return null;
  },

  // Uncomment to enable simulation mode:
  // simulate: true,
});

app.use(actionfence);

// ---------------------------------------------------------------------------
// 3. Define routes — ActionFence protects all of them
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
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Missing or invalid bearer token' });
    return;
  }

  const body = req.body as { flight_id?: unknown; amount?: unknown } | undefined;
  const flightId = typeof body?.flight_id === 'string' ? body.flight_id.trim() : '';
  const amount = parseBookingAmount(body?.amount);

  if (!flightId) {
    res.status(400).json({ error: 'Invalid flight_id: expected a non-empty string' });
    return;
  }

  if (amount === null) {
    res.status(400).json({ error: 'Invalid amount: expected a finite positive number' });
    return;
  }

  const confirmation = `BK-${Date.now()}`;
  bookings.set(confirmation, {
    id: confirmation,
    userId,
    flightId,
    amount,
    status: 'confirmed',
    departure: '2026-06-15T08:00:00Z',
  });

  res.status(201).json({
    confirmation,
    flight: flightId,
    total: `$${amount}`,
    status: 'confirmed',
  });
});

app.get('/bookings/:id', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Missing or invalid bearer token' });
    return;
  }

  const booking = bookings.get(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  if (booking.userId !== userId) {
    res.status(403).json({ error: 'Forbidden: booking ownership mismatch' });
    return;
  }

  res.json({
    booking: booking.id,
    status: booking.status,
    departure: booking.departure,
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
  console.log(`🛡️  ActionFence is protecting all routes\n`);
  console.log(`Try these commands:`);
  console.log(`  curl http://localhost:${PORT}/flights`);
  console.log(
    `  curl -X POST http://localhost:${PORT}/bookings -H "Content-Type: application/json" -d '{"flight_id":"FL-101","amount":299}'`,
  );
  console.log(`  curl -X DELETE http://localhost:${PORT}/bookings/BK-123   # ← will be blocked\n`);
});

// Cleanup on shutdown
process.on('SIGINT', () => {
  actionfence.dispose();
  process.exit(0);
});

function getAuthenticatedUserId(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const userId = authorization.slice('Bearer '.length).trim();
  return userId.length > 0 ? userId : null;
}

function parseBookingAmount(value: unknown): number | null {
  const numericAmount = typeof value === 'string' ? Number(value) : value;
  if (typeof numericAmount !== 'number' || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  return numericAmount;
}
