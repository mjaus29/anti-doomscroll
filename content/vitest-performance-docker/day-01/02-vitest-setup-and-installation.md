# 2 — Vitest Setup and Installation

---

## T — TL;DR

Vitest is a Vite-native test runner with Jest-compatible APIs. Install it as a dev dependency, add scripts to `package.json`, and write your first test. No Babel, no complex transforms — Vitest uses Vite's pipeline natively so it understands TypeScript, ESM, and path aliases out of the box.

---

## K — Key Concepts

```bash
# ── Install Vitest ────────────────────────────────────────────────────────
npm install --save-dev vitest

# For TypeScript projects (usually already installed):
npm install --save-dev typescript

# Optional: UI dashboard
npm install --save-dev @vitest/ui

# Optional: coverage
npm install --save-dev @vitest/coverage-v8
```

```json
// package.json — add scripts
{
  "scripts": {
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:ui":       "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}

// vitest run  → run once (CI mode, exits when done)
// vitest      → watch mode (re-runs on file change, default)
// vitest --ui → open browser UI with test results
```

```typescript
// ── Your first test file — src/utils/math.test.ts ─────────────────────────

import { describe, it, expect } from 'vitest'

// Function under test (could be in a separate file — inline here for simplicity)
function add(a: number, b: number): number {
  return a + b
}

describe('add', () => {
  it('returns the sum of two positive numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('handles negative numbers', () => {
    expect(add(-1, 1)).toBe(0)
  })
})
```

```bash
# ── Run it ─────────────────────────────────────────────────────────────────
npm test

# Output:
# ✓ src/utils/math.test.ts (2)
#   ✓ add (2)
#     ✓ returns the sum of two positive numbers
#     ✓ handles negative numbers
#
# Test Files  1 passed (1)
# Tests       2 passed (2)
# Duration    312ms
```

```
── Why Vitest over Jest? ─────────────────────────────────────────────────────

Jest:    CommonJS-first, needs Babel for ESM/TypeScript, separate config
Vitest:  ESM-first, TypeScript native, shares vite.config.ts, 10-50× faster
         Compatible API: describe/it/expect/mock/spy all work the same
         Path alias resolution: same as your app (no duplicate config)

In a Vite or Next.js project → Vitest is the correct choice (2025+)
```

---

## W — Why It Matters

- Vitest shares your `vite.config.ts` — path aliases (`@/lib/...`), TypeScript config, and plugins all work in tests without any extra setup. With Jest you'd need `moduleNameMapper` and `babel.config.ts` to replicate the same aliases.
- `vitest run` vs `vitest` is the CI vs local distinction — CI scripts always use `vitest run` (exits with code 0/1 for pass/fail). Local development uses `vitest` (watch mode, instant re-run on save).
- Installing `@vitest/coverage-v8` is separate from vitest itself — coverage is expensive to compute and should only run in CI or on demand, not every watch cycle.

---

## I — Interview Q&A

### Q: Why would you choose Vitest over Jest for a TypeScript project using Vite or Next.js?

**A:** Vitest is built on Vite's transformation pipeline, so it natively understands TypeScript, ESM modules, and all Vite plugins without extra configuration. In a Vite or Next.js project, your path aliases (`@/components/...`) are defined in `vite.config.ts` or `tsconfig.json` — Vitest reads these automatically. With Jest you need to duplicate alias configuration in `jest.config.ts` via `moduleNameMapper` and often need `ts-jest` or Babel to transform TypeScript. Vitest is also significantly faster — it runs tests in parallel using Vite's worker threads and can share module transforms across test files. The API is Jest-compatible, so the migration cost is near zero.

---

## C — Common Pitfalls + Fix

### ❌ Using `vitest` (watch mode) in CI — hangs indefinitely

```json
// ❌ CI pipeline hangs waiting for file changes
{
  "scripts": {
    "test": "vitest"   // watch mode — never exits in CI ❌
  }
}
```

**Fix:** Use `vitest run` for CI:

```json
// ✅
{
  "scripts": {
    "test":       "vitest run",   // CI: run once, exit with pass/fail code
    "test:watch": "vitest"        // local dev: watch mode
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Install Vitest in a new project, add the correct `test` and `test:watch` scripts, create `src/utils/string.ts` with a `capitalize(str)` function, and write a test file with three test cases: capitalizes first letter, lowercases the rest, handles empty string.

### Solution

```bash
npm init -y
npm install --save-dev vitest typescript
```

```typescript
// src/utils/string.ts
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
```

```typescript
// src/utils/string.test.ts
import { describe, it, expect } from 'vitest'
import { capitalize }           from './string'

describe('capitalize', () => {
  it('capitalizes the first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('lowercases the rest of the string', () => {
    expect(capitalize('hELLO')).toBe('Hello')
  })

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('')
  })
})
```

```json
// package.json
{
  "scripts": {
    "test":       "vitest run",
    "test:watch": "vitest"
  }
}
```

---

---
