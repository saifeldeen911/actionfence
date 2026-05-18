# Changelog

All notable changes to ActionFence will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-05-10

### Added

- **Storage Adapter Layer**
  - New `StorageAdapter` interface (`src/storage/adapter.ts`) for pluggable receipt storage backends
  - `SQLiteAdapter` — extracted from the former monolithic `ReceiptStore`, same SQLite behavior
  - `PostgresAdapter` — new PostgreSQL adapter for horizontally-scaled deployments (`pg.Pool` based)
  - `MemoryAdapter` — lightweight in-memory adapter for tests and ephemeral use
  - New `ReceiptFilters` type for querying receipts by agent, action, status, and time range
  - New `count()` and `query()` methods on all adapters for introspection and dashboards
  - `AsyncMutex` in `ReceiptStore` to prevent hash-chain corruption from concurrent inserts
- **Rolling-Window Spend Caps**
  - New `spend_limits.window` policy field with `max_amount` and `duration_minutes`
  - Protects against fragmented small-amount spend exhaustion ("death by a thousand cuts")
  - Uses sliding window log with lazy eviction (same pattern as `RateLimiter`)
  - New `SpendWindowConfig` type and `WindowCheckResult` interface
  - `SpendTracker.checkWindow()` and `previewCheckWindow()` methods for enforcement and simulation
  - Integrated into `GuardEngine.enforceSpendLimits()` pipeline
  - Window totals included in `SpendSnapshot` (`windowTotal`, `windowResetMs`)
- **Global Circuit Breaker**
  - New `circuit_breaker` policy field with `global_max_spend` and `action` (`block_all` or `alert_only`)
  - Provides a single master kill-switch across ALL agents when total system spend exceeds a threshold
  - New `CircuitBreaker` core class evaluated before any per-action checks
- **Limit Introspection API**
  - New `getAgentStatus(agentId)` method on `GuardEngine` instances (returned by `withGuard` / `guard`)
  - Returns a passive, non-mutating `AgentStatus` snapshot containing spend totals, rate limit remaining, circuit breaker state, and allowed/blocked actions
- **Trust Model Documentation**
  - Added dedicated Trust Model section to README and LLM guides clarifying server-side enforcement
  - Added security warning to `actionfence init` CLI output regarding policy file placement
- **Wildcard Scope Matching**
  - Added support for prefix wildcard matching in policy action names (e.g., `book_*`)
  - Evaluates in deterministic order: exact matches first, then longest wildcard prefix, then default rule
- **Human Approval Webhook**
  - Added `onApprovalRequired` callback to `GuardOptions` to pause evaluation and await human-in-the-loop decisions dynamically
  - Added `approvalTimeoutMs` (default 30s) to securely time out and block requests if approval isn't received
  - Receipt logic updated to securely bind the early-generated `receiptId` to the final persisted receipt

- **Tool Schema Drift Detection**
  - Added support to hash and pin tool input schemas in the policy (`schema_hash`) to detect silent tool changes.
  - Added `schema_enforcement` policy field to configure mismatch behavior (`warn` or `block`).
  - New `actionfence pin-schemas` CLI command to automatically connect to an MCP server, hash schemas, and pin them in the policy.
  - Enhanced `actionfence validate` CLI command to verify current tool schemas against pinned hashes.
  - `GuardEngine` checks for schema drift at runtime (post-identity, pre-spend), preventing malicious payload injection from schema updates.

### Changed

- `ReceiptStore` refactored from a monolithic SQLite class into a thin facade over `StorageAdapter`
- All `ReceiptStore` public methods are now `async` (return `Promise<T>`)
- `GuardEngine.finalize()` is now async to support the async `ReceiptStore.insert()`
- Custom adapters can be injected via `ReceiptStoreOptions.adapter`
- `GuardEngine` uses lazy asynchronous initialization for its storage adapter, keeping top-level middleware calls (`withGuard`, `guard`) synchronous.
- **Breaking:** `RateLimiter.checkWindow()` is now async — callers must `await`
- **Breaking:** `SpendTracker` methods (`record()`, `previewRecord()`, `checkWindow()`, `previewCheckWindow()`, `getStatus()`) are now async — callers must `await`

### Fixed

- Fixed unhandled promise rejection during engine disposal when closing the receipt store
- Improved SQLite storage adapter error handling by preserving original stack traces and parsing constraint violations robustly

### Security

- **CRITICAL — JWT Algorithm Confusion:** Added explicit algorithm allowlist to `jwtVerify()` restricting to asymmetric algorithms only (RS256, RS384, RS512, ES256, ES384, ES512, EdDSA). Prevents algorithm confusion attacks (alg: none, HS256 with public key).
- **HIGH — TOCTOU Race Condition:** Added internal `AsyncMutex` to `RateLimiter` and `SpendTracker` for defense-in-depth protection. All public methods (`checkWindow()`, `record()`, `previewRecord()`, `previewCheckWindow()`, `getStatus()`) are now async. Prevents race conditions when shared instances are used across multiple engines.
- **HIGH — Symlink Path Traversal:** Used `realpathSync()` to resolve symlinks before path traversal check in `loadPolicy()`. Prevents attackers from bypassing cwd restriction via symbolic links.
- **HIGH — Spend/Receipt Non-Atomicity:** Reordered operations to record spend FIRST, then insert receipt with try-catch. Establishes spend as source of truth; receipt failures no longer cause inconsistent state.
- **HIGH — Mutex Map DoS:** Implemented LRU eviction with timestamp tracking for `GuardEngine.agentMutexes`. Triggers eviction at 50% capacity (5,000 entries), evicts mutexes idle for 5+ minutes without waiters. Prevents memory exhaustion from many distinct agent IDs.
- **H2 — Receipt payload PII retention:** Added `payloadRedactor` option to strip sensitive fields from tool params before receipt storage. Added `maxPayloadBytes` option (default 64 KB) to truncate oversized payloads. Receipt hash integrity uses the original params; only the stored view is redacted/truncated.
- **H3 — Weak HMAC key accepted:** `ReceiptSigner` now rejects signing secrets shorter than 16 bytes (128 bits) with a clear error at startup.
- **H5 — Postgres receipt chain fork:** `PostgresAdapter.insertAtomic()` uses `BEGIN` → `pg_advisory_xact_lock` → read last hash → insert → `COMMIT` to prevent concurrent writers from forking the hash chain. `ReceiptStore.insert()` auto-detects and prefers the atomic path.
- **H6 — Policy file path traversal:** `loadPolicy()` now rejects policy paths that resolve outside the working directory, preventing `../../` directory escapes.
- **H7 — Agent ID injection via JWT:** `agentId` and `ownerId` extracted from JWT claims are now sanitized: control characters stripped, length capped at 256, empty values default to `'unknown'`.
- **M3 — Spend/receipt atomicity:** In enforce mode, spend is now committed only after receipt insertion succeeds. If receipt insertion fails, spend totals are not advanced.
- **M5 — Unbounded map growth:** `SpendTracker`, `RateLimiter`, and `GuardEngine.agentMutexes` now enforce map size caps with periodic or on-access idle eviction to prevent memory exhaustion from many distinct agent IDs.
- **M7 — Weak migrated key permissions:** Legacy signing key migration now forces `0o600` file permissions (best-effort on non-POSIX platforms).
- **M8 — Postgres pool not closed:** `GuardEngine.dispose()` now explicitly closes any Postgres adapter it created, preventing connection pool leaks.
- **M9 — Postgres credentials in errors:** Connection failure error messages now mask passwords in `postgres://` connection strings.
- **L1 — SQLite LIMIT interpolation:** The `LIMIT` clause in `SQLiteAdapter.query()` is now parameterized instead of interpolated.
- **L2 — Canonical JSON limitations:** `canonicalJsonStringify()` now documents supported types, lossy conversions, and values that will throw. Tool authors should ensure params are JSON-serializable.

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

[0.2.0]: https://github.com/saifeldeen911/actionfence/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/saifeldeen911/actionfence/releases/tag/v0.1.2
[0.1.1]: https://github.com/saifeldeen911/actionfence/releases/tag/v0.1.1
[0.1.0]: https://github.com/saifeldeen911/actionfence/compare/e1f95c8...v0.1.1
