# ActionFence Project Guidelines

## Code Style
- Use TypeScript with the existing strict compiler and ESLint setup.
- Prefer `import type` for type-only imports and add explicit return types to exported functions.
- Follow the local patterns in `src/` and `tests/`; keep formatting aligned with Prettier.
- Use `readonly` for values and fields that are not meant to change.

## Architecture
- Keep core policy, identity, rate-limit, spend, and receipt logic in `src/core/`.
- Keep transport adapters thin in `src/middleware/`; shared orchestration belongs in `src/middleware/engine.ts`.
- Keep CLI behavior in `src/cli/` and public exports centralized in `src/index.ts`.
- Treat `schemas/guard-policy.schema.json` as the source of truth for policy shape.
- The MCP SDK is an optional peer dependency; core package code should not require it.

## Build and Test
- Use Node.js 20+ and npm 10+.
- Common commands: `npm install`, `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`.
- Tests live under `tests/` and mirror the structure of `src/`.
- For behavior changes, prefer targeted tests near the touched module before widening scope.

## Conventions
- Link to existing docs instead of copying them: see [README.md](/README.md) and [CONTRIBUTING.md](/CONTRIBUTING.md).
- Keep example policy filenames and docs consistent with `guard-policy.json` and the current example layouts.
- Use isolated temp directories in tests that touch SQLite-backed receipt storage or other shared state.
- Keep policy validation eager and fail fast when schema loading or rule validation is invalid.