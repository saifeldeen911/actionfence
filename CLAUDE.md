# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ActionFence** is an embeddable AI action firewall for MCP servers and APIs. It enforces policies, manages spend caps, rate limits, and generates signed receipts for all agent actions. The library supports both MCP and Express/HTTP middleware, with pluggable storage backends (SQLite, PostgreSQL, or in-memory).

**Requires Node.js >= 20.0.0**

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
- **identity-reader.ts**: Resolves agent identity from requests; supports JWT verification via JWKS. Exports `sanitizeIdentity()` to strip `rawToken` from `AgentIdentity` → `SafeAgentIdentity`
- **rate-limiter.ts**: Tracks request and transaction rates; enforces per-minute and per-day limits
- **spend-tracker.ts**: Tracks cumulative spend across sessions, days, and rolling windows; enforces spend caps. Supports idle-timeout session resets and hot-reload via `updateConfig()`
- **receipt-signer.ts**: Signs and hash-chains receipts using HMAC-SHA256
- **receipt-store.ts**: Persists and verifies receipts; delegates to storage adapters

### Utilities (`src/utils/`)

- **async-mutex.ts**: Simple async mutex for serializing concurrent operations. Tracks waiter count via `hasWaiters` so callers can safely evict the mutex from per-key pools without breaking queued waiters. Used by `GuardEngine` for per-agent evaluation serialization.

### Storage Adapters (`src/storage/`)

- **adapter.ts**: Abstract `StorageAdapter` interface and `ReceiptFilters` type for receipt queries
- **sqlite-adapter.ts**: Default SQLite backend (zero-config, single-instance)
- **postgres-adapter.ts**: PostgreSQL backend for multi-instance deployments
- **memory-adapter.ts**: In-memory storage for testing

### Middleware (`src/middleware/`)

- **engine.ts**: Core guard engine; orchestrates policy evaluation, rate limiting, spend tracking, and receipt signing. Uses per-agent `AsyncMutex` to prevent TOCTOU race conditions on concurrent evaluations
- **mcp.ts**: MCP server integration via `withGuard()`
- **express.ts**: Express/HTTP middleware via `guard()`
- **simulation.ts**: Dry-run mode that evaluates policies without executing handlers or storing receipts. Returns `SimulationPreview` objects

### CLI (`src/cli/`)

- **index.ts**: Entry point; routes to init, validate, or simulate commands
- **init.ts**: Scaffolds a new `guard-policy.json`
- **validate.ts**: Validates policy against schema
- **simulate.ts**: Runs policy evaluation in dry-run mode with CLI output

### Types (`src/types/`)

- **policy.ts**: Policy schema types (actions, rules, rate limits, spend limits including `session_timeout_minutes`)
- **identity.ts**: Identity classification, `AgentIdentity`, `SafeAgentIdentity` (without `rawToken`), and `IdentityReaderLike` interface
- **decision.ts**: `DecisionStatus` (`'PASSED' | 'BLOCKED'`) and `EvaluationDecision`
- **receipt.ts**: Receipt structure, verification types, and `ReceiptVerificationFailureReason` union
- **config.ts**: `GuardOptions` with DI hooks (`actionResolver`, `spendExtractor`, `transactionResolver`, `onDecision`, etc.) and `StorageConfig` union
- **spend.ts**: `SpendSnapshot` and `SpendRecordResult`
- **errors.ts**: `PolicyValidationError`, `PolicyLoadError`, `IdentityError` — each with a unique `code` property

### Reporters (`src/reporters/`)

- **console.ts**: Formats and logs decisions to console (used in CLI and optional in middleware)

## Key Concepts

### Policy Evaluation Flow

1. **Identity Resolution**: Extract and verify agent identity (anonymous → token → verified)
2. **Per-Agent Mutex**: Acquire an `AsyncMutex` keyed by `agentId` to serialize the remaining steps
3. **Capability Check**: If JWT includes `capabilities` claim, verify action is in the list
4. **Action Rule Check**: Look up action in policy; verify `allowed` flag and `identity` tier requirement
5. **Rate Limiting**: Check request/transaction counts against limits
6. **Spend Tracking**: Extract spend amount; check against per-action, session, daily, and rolling-window caps
7. **Receipt Generation**: Sign and store decision (unless in simulation mode)

### Concurrency & Lock Ordering

When both the per-agent mutex (`GuardEngine.evaluate()`) and the `ReceiptStore` insert mutex are needed, the agent mutex **MUST** be acquired first to prevent deadlocks. `ReceiptStore.insert()` acquires its internal mutex inside the agent-mutex critical section.

### Identity Tiers

- **anonymous**: No credentials
- **token**: Bearer token present but not verified
- **verified**: JWT passed JWKS signature verification

### SafeAgentIdentity

`AgentIdentity` contains a `rawToken` field with the bearer JWT. `SafeAgentIdentity` is `Omit<AgentIdentity, 'rawToken'>` — used in `GuardEvaluationResult.identity` so callers never see raw credentials. Use `sanitizeIdentity()` from `identity-reader.ts` to convert.

### Session Idle Timeout

`SpendTracker` supports idle-timeout-based session resets via `session_timeout_minutes` in `SpendLimitsConfig`:
- When `session_max` is configured but `session_timeout_minutes` is omitted → defaults to 60 minutes
- When `session_timeout_minutes` is explicitly `0` → idle timeout is disabled
- When neither is configured → no timeout
- `updateConfig()` supports hot-reload of the timeout value without resetting tracked state

### Storage Modes

- **SQLite** (default): Single-instance, zero-config, file-based (`.actionfence/receipts.db`)
- **PostgreSQL**: Multi-instance, requires `pg` driver and `DATABASE_URL`
- **Memory**: Testing only

### GuardOptions Callbacks

- **`actionResolver(toolName, params)`**: Map a tool name + params to a policy action name. Defaults to using `toolName` directly
- **`spendExtractor(params)`**: Extract a spend amount from tool parameters. Return `null` for no spend
- **`transactionResolver(toolName, params, decision)`**: Override whether a passed action counts toward the transaction-per-day limit. Defaults to `true` when `spendAmount !== null || requiresHumanApproval`
- **`onDecision(decision)`**: Callback fired after every evaluation decision (for telemetry, logging, etc.)

## Testing

Tests are organized by module:

```
tests/
├── core/              # Policy evaluator, identity reader, rate limiter, spend tracker
├── middleware/        # MCP and Express integration, engine concurrency tests
├── storage/           # Storage adapter tests
├── cli/               # CLI command tests
├── reporters/         # Console reporter tests
└── fixtures/          # Shared test data (policies, identities, receipts)
```

Run a single test file:
```bash
npm test -- tests/core/policy-evaluator.test.ts
```

### Test Patterns

- **Fake timers**: Use `vi.useFakeTimers()` / `vi.setSystemTime()` for time-sensitive spend-tracker and rate-limiter tests
- **Inline helpers**: Tests use local factory functions (e.g., `makeIdentity()`) rather than centralized utilities
- **Concurrency tests**: Use `Promise.all()` with controlled async barriers to verify mutex behavior

## Common Tasks

### Adding a New Policy Rule Field

1. Update `src/types/policy.ts` to add the field to `ActionRule`
2. Update `schemas/guard-policy.schema.json` to include the field in the JSON schema
3. Update `src/core/policy-evaluator.ts` to evaluate the new field
4. Add tests in `tests/core/policy-evaluator.test.ts`
5. Update README.md with the new field in the Policy Reference table

### Adding a New Spend Limits Field

1. Update `SpendLimitsConfig` in `src/types/policy.ts`
2. Update `schemas/guard-policy.schema.json` under `spend_limits.properties`
3. Update `src/core/spend-tracker.ts` to enforce/track the new field
4. If the field affects evaluation, update `resolveSpendLimitReason()` in `src/middleware/engine.ts`
5. Add tests in `tests/core/spend-tracker.test.ts` and `tests/middleware/engine.test.ts`

### Adding a New Storage Adapter

1. Create `src/storage/my-adapter.ts` implementing `StorageAdapter` interface
2. Export from `src/storage/index.ts`
3. Add adapter type to `StorageConfig` union in `src/types/config.ts`
4. Add tests in `tests/storage/my-adapter.test.ts`
5. Update README.md with setup instructions

### Modifying Spend Tracking Logic

Spend tracking is split across:
- **spend-tracker.ts**: Accumulates spend across windows and enforces caps; manages idle-timeout session resets
- **policy-evaluator.ts**: Checks spend against policy limits
- **engine.ts**: Extracts spend from request via `spendExtractor` callback; calls `spendTracker.updateConfig()` on hot-reload

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
- **better-sqlite3**: SQLite storage backend (bundled in dist)

### Optional (Peer)
- **@modelcontextprotocol/sdk**: For MCP server integration
- **pg**: For PostgreSQL storage adapter

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
- JWKS verification fails closed: any error (network, DNS, OOM) returns `ANONYMOUS_IDENTITY` — never falls back to `token` tier
- Per-agent mutex in `GuardEngine` prevents TOCTOU race conditions on concurrent spend/rate-limit checks
