# AGENTS.md — ActionFence

> High-signal guidance for future OpenCode sessions working in this repo.

## Project Overview

- **ActionFence** (`actionfence`): AI Action Firewall for MCP servers and APIs.
- **Node.js ≥20** required (`"type": "module"`).
- This repo is a **Node.js library** with an optional Next.js web app under `apps/web/`, plus two examples under `examples/`.

## Developer Commands (verified)

Run from the **root** unless noted:

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` (root `tsconfig.json` covers `src/`) |
| `npm run lint` | ESLint over `src/` and `tests/` |
| `npm test` | Vitest run (all suites, Node env) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with v8 coverage |
| `npm run build` | `tsup` — builds `src/index.ts` and `src/cli/index.ts` into `dist/` |
| `npm run dev` | `tsup --watch` |
| `npm run format` | `prettier --write .` |

CI order: **typecheck → lint → test → build**

## Testing & Running a Single File

- Run a **single test file**: `npx vitest run tests/core/policy-evaluator.test.ts`
- Tests are in `tests/` using **Vitest** with Node environment and globals enabled.
- Coverage is configured in `vitest.config.ts` to include `src/**/*.ts` and exclude `src/types/**/*.ts` + `src/index.ts`.

## Monorepo Boundaries

| Package | Path | Type | Build tool |
| --- | --- | --- | --- |
| `actionfence` (library) | Root | ESM + CJS library | `tsup` |
| `@actionfence/web` | `apps/web` | Next.js 16 app (website) | `next` |
| `actionfence-mcp-example` | `examples/mcp-server` | Example MCP server | `tsx` |
| `actionfence-express-example` | `examples/express-api` | Example Express API | `tsx` |

- The root build produces `dist/` (library + CLI). Do **not** edit `dist/`. It is gitignored.
- The web app does not share the root `tsconfig`.

## Architecture & Key Entry Points

- **Library public API**: `src/index.ts` (the `exports` map in root `package.json` points to `dist/index.js` / `dist/index.d.ts`).
- **CLI entry**: `src/cli/index.ts` → bundled as `dist/cli.js`. The CLI exposes `init`, `validate`, `simulate`.
- **`tsup.config.ts`**:
  - Entry points: `index` and `cli`
  - Outputs: ESM + CJS
  - Target: `node20`
  - `external`: `@modelcontextprotocol/sdk`, `better-sqlite3`

## Codegen / Build Artifacts

- `tsup` is used for bundling. No separate `tsc` build to `dist/`. No special codegen needed.
- The web app does not affect the library build. Building should be done in the root for the library, or in `apps/web` for the site.

## Style & Lint Rules (non-defaults)

- **Prettier**: `singleQuote`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: "always"`, `endOfLine: "lf"`.
- **ESLint**: strict TypeScript rules enabled by `typescript-eslint`. Key overrides from defaults:
  - `@typescript-eslint/consistent-type-imports`: `error`
  - `@typescript-eslint/no-unused-vars`: allows `_`-prefixed names
  - `@typescript-eslint/explicit-function-return-type`: `warn` (expressions allowed)
  - `no-console`: `warn` (only `console.warn` / `console.error` allowed—no bare `console.log`)

## Toolchain Quirks

- **Better-sqlite3** is an external dependency. Ensure a Node.js 20 environment where native SQLite bindings can compile if not prebuilt.
- **Peer dependency**: `@modelcontextprotocol/sdk` (optional). If working on MCP features, install it.
- The library uses `NodeNext` module resolution and `isolatedModules`. Do not add circular re-exports.

## CI Pipeline (`.github/workflows/ci.yml`)

Exact steps:
1. Install (`npm ci`)
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`

Fails a PR if any of these fail. Keep it green.

## Pre-Publish Checklist

Root `package.json` already encodes this in `prepublishOnly`:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Publish should only happen after this passes.
