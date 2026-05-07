# Contributing to AgentGuard

Thank you for your interest in contributing to AgentGuard! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0

### Getting Started

```bash
# Clone the repository
git clone https://github.com/saifeldeen911/agentguard.git
cd agentguard

# Install dependencies
npm install

# Run tests
npm test

# Type-check
npm run typecheck

# Build
npm run build
```

## Development Workflow

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build ESM + CJS output via tsup |
| `npm run dev` | Watch mode for development |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check via tsc (no emit) |
| `npm run lint` | Lint source and test files |
| `npm run format` | Format all files with Prettier |

### Code Style

- **TypeScript** with strict mode enabled
- **Prettier** for formatting (runs automatically on save if configured)
- **ESLint** with typescript-eslint strict + stylistic rules
- Use `readonly` on interface properties where mutation is not needed
- Use consistent type imports (`import type { ... }`)
- Explicit return types on exported functions

### Testing

- Tests live in `tests/` mirroring the `src/` structure
- Use **Vitest** as the test runner
- Aim for comprehensive coverage of edge cases
- Use `vi.useFakeTimers()` for time-dependent tests

## Pull Request Process

1. Fork the repository and create a feature branch from `main`
2. Write tests for your changes
3. Ensure all tests pass: `npm test`
4. Ensure type-checking passes: `npm run typecheck`
5. Ensure linting passes: `npm run lint`
6. Write clear commit messages following [Conventional Commits](https://www.conventionalcommits.org/)
7. Open a pull request with a clear description of changes

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
- `feat(core): add spend cap evaluation to policy evaluator`
- `fix(rate-limiter): prevent memory leak on idle keys`
- `test(identity): add test for malformed JWT fallback`

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Include your Node.js version and OS

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
