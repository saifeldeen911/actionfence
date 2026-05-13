# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ActionFence** is an embeddable AI action firewall for MCP servers and APIs. It enforces policies, manages spend caps, rate limits, and generates signed receipts for all agent actions. The library supports both MCP and Express/HTTP middleware, with pluggable storage backends (SQLite, PostgreSQL, or in-memory).

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Watch mode with tsup
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint check
npm run format          # Prettier format

# Testing
npm test                # Run all tests once
npm test:watch          # Watch mode for tests
npm test:coverage       # Coverage report

# Build
npm run build           # Build ESM and CJS bundles

# CLI tools
npx actionfence init                                    # Create guard-policy.json
npx actionfence validate guard-policy.json              # Validate policy
npx actionfence simulate guard-policy.json --action X   # Dry-run simulation
```

## Architecture

### Core Modules (`src/core/`)

- **policy-loader.ts**: Loads and validates `guard-policy.json` files; supports file watching for hot-reload
- **policy-evaluator.ts**: Evaluates whether an action is allowed based on policy rules, identity tier, and capabilities
- **identity-reader.ts**: Resolves agent identity from requests; supports JWT verification via JWKS
- **rate-limiter.ts**: Tracks request and transaction rates; enforces per-minute and per-day limits
- **spend-tracker.ts**: Tracks cumulative spend across sessions, days, and rolling windows; enforces spend caps
- **receipt-signer.ts**: Signs and hash-chains receipts using HMAC-SHA256
- **receipt-store.ts**: Persists and verifies receipts; delegates to storage adapters

### Storage Adapters (`src/storage/`)

- **adapter.ts**: Abstract interface for receipt storage
- **sqlite-adapter.ts**: Default SQLite backend (zero-config, single-instance)
- **postgres-adapter.ts**: PostgreSQL backend for multi-instance deployments
- **memory-adapter.ts**: In-memory storage for testing

### Middleware (`src/middleware/`)

- **engine.ts**: Core guard engine; orchestrates policy evaluation, rate limiting, spend tracking, and receipt signing
- **mcp.ts**: MCP server integration via `withGuard()`
- **express.ts**: Express/HTTP middleware via `guard()`
- **simulation.ts**: Dry-run mode that evaluates policies without executing handlers or storing receipts

### CLI (`src/cli/`)

- **index.ts**: Entry point; routes to init, validate, or simulate commands
- **init.ts**: Scaffolds a new `guard-policy.json`
- **validate.ts**: Validates policy against schema
- **simulate.ts**: Runs policy evaluation in dry-run mode with CLI output

### Types (`src/types/`)

- **policy.ts**: Policy schema types (actions, rules, rate limits, spend limits)
- **identity.ts**: Identity classification and JWT claims
- **decision.ts**: Policy evaluation results
- **receipt.ts**: Receipt structure and verification types
- **config.ts**: Guard configuration options
- **spend.ts**: Spend tracking snapshots
- **errors.ts**: Custom error classes

### Reporters (`src/reporters/`)

- **console.ts**: Formats and logs decisions to console (used in CLI and optional in middleware)

## Key Concepts

### Policy Evaluation Flow

1. **Identity Resolution**: Extract and verify agent identity (anonymous → token → verified)
2. **Capability Check**: If JWT includes `capabilities` claim, verify action is in the list
3. **Action Rule Check**: Look up action in policy; verify `allowed` flag and `identity` tier requirement
4. **Rate Limiting**: Check request/transaction counts against limits
5. **Spend Tracking**: Extract spend amount; check against per-action, session, daily, and rolling-window caps
6. **Receipt Generation**: Sign and store decision (unless in simulation mode)

### Identity Tiers

- **anonymous**: No credentials
- **token**: Bearer token present but not verified
- **verified**: JWT passed JWKS signature verification

### Storage Modes

- **SQLite** (default): Single-instance, zero-config, file-based (`.actionfence/receipts.db`)
- **PostgreSQL**: Multi-instance, requires `pg` driver and `DATABASE_URL`
- **Memory**: Testing only

## Testing

Tests are organized by module:

```
tests/
├── core/              # Policy evaluator, identity reader, rate limiter, spend tracker
├── middleware/        # MCP and Express integration
├── storage/           # Storage adapter tests
├── cli/               # CLI command tests
├── reporters/         # Console reporter tests
└── fixtures/          # Shared test data (policies, identities, receipts)
```

Run a single test file:
```bash
npm test -- tests/core/policy-evaluator.test.ts
```

## Common Tasks

### Adding a New Policy Rule Field

1. Update `src/types/policy.ts` to add the field to `ActionRule`
2. Update `schemas/guard-policy.schema.json` to include the field in the JSON schema
3. Update `src/core/policy-evaluator.ts` to evaluate the new field
4. Add tests in `tests/core/policy-evaluator.test.ts`
5. Update README.md with the new field in the Policy Reference table

### Adding a New Storage Adapter

1. Create `src/storage/my-adapter.ts` implementing `StorageAdapter` interface
2. Export from `src/storage/index.ts`
3. Add adapter type to `StorageConfig` union in `src/types/config.ts`
4. Add tests in `tests/storage/my-adapter.test.ts`
5. Update README.md with setup instructions

### Modifying Spend Tracking Logic

Spend tracking is split across:
- **spend-tracker.ts**: Accumulates spend across windows and enforces caps
- **policy-evaluator.ts**: Checks spend against policy limits
- **engine.ts**: Extracts spend from request via `spendExtractor` callback

Changes to spend logic should be tested in `tests/core/spend-tracker.test.ts` and `tests/middleware/engine.test.ts`.

## Build Output

- **dist/index.js**: ESM export (main library)
- **dist/index.cjs**: CommonJS export
- **dist/cli.js**: CLI entry point
- **dist/*.d.ts**: TypeScript declarations

The build is configured in `tsup.config.ts` to produce both formats with source maps and type definitions.

## Linting & Formatting

- **ESLint**: Strict TypeScript rules; no unused variables/parameters (unless prefixed with `_`)
- **Prettier**: Configured in `.prettierrc`
- **TypeScript**: Strict mode enabled; `noUnusedLocals` and `noUnusedParameters` enforced

Run before committing:
```bash
npm run format && npm run lint && npm run typecheck
```

## Dependencies

### Core
- **ajv**: JSON schema validation (for policy validation)
- **jose**: JWT verification and signing
- **chalk**: Colored console output (CLI)

### Optional (Peer)
- **@modelcontextprotocol/sdk**: For MCP server integration
- **pg**: For PostgreSQL storage adapter
- **better-sqlite3**: For SQLite storage (bundled in dist)

### Dev
- **vitest**: Test runner
- **typescript**: Type checking
- **eslint**: Linting
- **prettier**: Formatting
- **tsup**: Build tool

## Notes

- Receipts are hash-chained and HMAC-signed; verification is append-only and cryptographically sound
- SQLite storage is single-instance; use PostgreSQL for horizontally-scaled deployments
- Policy hot-reload is opt-in via `watchPolicy: true` in guard options
- Simulation mode runs the full pipeline without side effects (no handler execution, no receipt storage)
- The CLI is a separate entry point (`dist/cli.js`) and can be used standalone
