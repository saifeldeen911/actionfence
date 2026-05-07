/**
 * Example MCP Server with AgentGuard
 *
 * Demonstrates how to protect an MCP server with AgentGuard's policy engine.
 * This example creates a flight booking MCP server with four tools:
 *   - search_flights: public, any identity
 *   - book_flight:    requires verified identity + spend cap
 *   - check_status:   requires token identity
 *   - bulk_booking:   explicitly blocked by policy
 *
 * Run with:
 *   npx tsx src/index.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { withGuard } from 'agentguard';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. Create the MCP server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'bookflight-mcp',
  version: '1.0.0',
});

// ---------------------------------------------------------------------------
// 2. Install AgentGuard — one line
// ---------------------------------------------------------------------------

const guard = withGuard(server, {
  policy: './guard-policy.json',
  // Uncomment to run in simulation mode (dry-run, no real actions):
  // simulate: true,
});

// ---------------------------------------------------------------------------
// 3. Register tools — AgentGuard intercepts automatically
// ---------------------------------------------------------------------------

server.registerTool(
  'search_flights',
  {
    description: 'Search available flights by route and date',
    inputSchema: {
      type: 'object' as const,
      properties: {
        origin: { type: 'string', description: 'Departure airport code (e.g. LAX)' },
        destination: { type: 'string', description: 'Arrival airport code (e.g. JFK)' },
        date: { type: 'string', description: 'Travel date (YYYY-MM-DD)' },
      },
      required: ['origin', 'destination', 'date'],
    },
  },
  async (params: { origin: string; destination: string; date: string }) => {
    // Mock flight search results
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          flights: [
            { id: 'FL-101', route: `${params.origin}→${params.destination}`, price: 299, time: '08:00' },
            { id: 'FL-202', route: `${params.origin}→${params.destination}`, price: 449, time: '14:30' },
          ],
          date: params.date,
        }),
      }],
    };
  },
);

server.registerTool(
  'book_flight',
  {
    description: 'Book a specific flight (requires verified identity)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        flight_id: { type: 'string', description: 'Flight ID from search results' },
        passengers: { type: 'number', description: 'Number of passengers' },
        amount: { type: 'number', description: 'Total booking amount in dollars' },
      },
      required: ['flight_id', 'passengers', 'amount'],
    },
  },
  async (params: { flight_id: string; passengers: number; amount: number }) => {
    // Mock booking confirmation
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          confirmation: `BK-${Date.now()}`,
          flight: params.flight_id,
          passengers: params.passengers,
          total: `$${params.amount}`,
          status: 'confirmed',
        }),
      }],
    };
  },
);

server.registerTool(
  'check_status',
  {
    description: 'Check the status of a booking',
    inputSchema: {
      type: 'object' as const,
      properties: {
        booking_id: { type: 'string', description: 'Booking confirmation number' },
      },
      required: ['booking_id'],
    },
  },
  async (params: { booking_id: string }) => {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          booking: params.booking_id,
          status: 'confirmed',
          departure: '2026-06-15T08:00:00Z',
        }),
      }],
    };
  },
);

server.registerTool(
  'bulk_booking',
  {
    description: 'Book multiple flights at once (blocked by policy)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        flights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of flight IDs to book',
        },
      },
      required: ['flights'],
    },
  },
  async (_params: { flights: string[] }) => {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ message: 'Bulk booking completed' }),
      }],
    };
  },
);

// ---------------------------------------------------------------------------
// 4. Connect transport and start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error('Server failed to start:', error);
  guard.dispose();
  process.exit(1);
});
