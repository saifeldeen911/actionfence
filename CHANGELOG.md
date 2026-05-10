# Changelog

All notable changes to ActionFence will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — Unreleased

### Added

- **Storage Adapter Layer**
  - New `StorageAdapter` interface (`src/storage/adapter.ts`) for pluggable receipt storage backends
  - `SQLiteAdapter` — extracted from the former monolithic `ReceiptStore`, same SQLite behavior
  - `MemoryAdapter` — lightweight in-memory adapter for tests and ephemeral use
  - New `ReceiptFilters` type for querying receipts by agent, action, status, and time range
  - New `count()` and `query()` methods on all adapters for introspection and dashboards
  - `AsyncMutex` in `ReceiptStore` to prevent hash-chain corruption from concurrent inserts

### Changed

- `ReceiptStore` refactored from a monolithic SQLite class into a thin facade over `StorageAdapter`
- All `ReceiptStore` public methods are now `async` (return `Promise<T>`)
- `GuardEngine.finalize()` is now async to support the async `ReceiptStore.insert()`
- Custom adapters can be injected via `ReceiptStoreOptions.adapter`

### Fixed

- Fixed unhandled promise rejection during engine disposal when closing the receipt store
- Improved SQLite storage adapter error handling by preserving original stack traces and parsing constraint violations robustly


## [0.1.2] — 2026-05-08

### Changed

- Relaxed `@modelcontextprotocol/sdk` peer dependency constraint from `>=2.0.0` to `>=1.0.0`

## [0.1.1] — 2026-05-08

### Changed

- Updated README documentation with improved usage examples and clarifications

## [0.1.0] — 2026-05-07

### Added

- **Core Policy Engine**
  - JSON Schema validation for `guard-policy.json`
  - Policy evaluator with allow/deny, identity tiers, spend caps, and human approval flags
  - Hot-reload policy file watching via `fs.watch`

- **Identity System**
  - Identity reader with JWT decode for bearer-token metadata
  - Built-in classification for `anonymous` and `token`
  - Custom identity reader hook for applications that need verified identities

- **Rate Limiting**
  - Sliding window rate limiter (requests/min, transactions/day)
  - Per-agent tracking with lazy eviction

- **Spend Tracking**
  - Per-action spend caps via `max_spend`
  - Session and daily spend totals with automatic midnight UTC reset

- **Action Receipts**
  - HMAC-SHA256 signed receipts with hash chain integrity
  - Append-only SQLite storage via `better-sqlite3`
  - Chain verification for tamper detection

- **MCP Middleware**
  - `withGuard(server, options)` — one-line protection for MCP servers
  - Monkey-patches `registerTool()` to intercept all tool calls
  - Simulation mode returns structured JSON preview

- **Express Middleware**
  - `guard(options)` — drop-in Express/Fastify-compatible middleware
  - `X-ActionFence-Simulation` header for HTTP simulation mode
  - Structured error responses with machine-readable error codes

- **Simulation Mode**
  - Dry-run evaluation across MCP, HTTP, and CLI
  - Full policy + rate limit + spend preview without executing actions

- **Console Reporter**
  - Colorized terminal output via `chalk`
  - ALLOW/BLOCK status with timing, receipt IDs, and spend totals

- **CLI Tools**
  - `actionfence init` — scaffold a starter `guard-policy.json`
  - `actionfence validate <path>` — validate policy against JSON Schema
  - `actionfence simulate <path> --action <name>` — dry-run policy evaluation

- **Examples**
  - MCP server example (flight booking with 4 tools)
  - Express API example (REST API with route-based policy)

- **Package**
  - ESM + CJS dual-format output via tsup
  - Full TypeScript declarations
  - Node.js 20+ target

[0.1.2]: https://github.com/saifeldeen911/actionfence/releases/tag/v0.1.2
[0.1.1]: https://github.com/saifeldeen911/actionfence/releases/tag/v0.1.1
[0.1.0]: https://github.com/saifeldeen911/actionfence/compare/e1f95c8...v0.1.1
