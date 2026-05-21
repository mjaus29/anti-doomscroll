
# 📅 Day 1 — Vitest Fundamentals

> **Goal:** Understand why testing exists, wire Vitest into a TypeScript project, and write clean, confident unit tests from scratch.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Vitest 4.x · TypeScript 6 · Node.js

---

## 📋 Day 1 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Testing Purpose and the Test Pyramid | 8 min |
| 2 | Vitest Setup and Installation | 10 min |
| 3 | Config File Basics — vitest.config.ts | 10 min |
| 4 | Test File Naming Conventions | 8 min |
| 5 | describe → it/test → expect Flow | 12 min |
| 6 | Assertion Patterns — expect Matchers | 12 min |
| 7 | Watch Mode and Filtering Tests | 8 min |
| 8 | Setup Files and Global Hooks | 10 min |
| 9 | Project Structure for Tests | 8 min |
| 10 | Node Environment Configuration | 8 min |
| 11 | Coverage Introduction | 10 min |
| 12 | Writing First Clean Unit Tests | 12 min |

---

---

# 1 — Testing Purpose and the Test Pyramid

---

## T — TL;DR

Tests are automated checks that your code does what you think it does — now and after every future change. The test pyramid has three layers: unit tests (many, fast, isolated), integration tests (fewer, test real connections), and end-to-end tests (fewest, test full flows). Write mostly unit tests. They catch bugs in milliseconds, not minutes.

---

## K — Key Concepts

```
── The Test Pyramid ──────────────────────────────────────────────────────────

           /▲\
          / E2E \          ← fewest (5–10%)
         /───────\           Playwright, Cypress
        / Integr. \        ← moderate (20–30%)
       /────────────\        DB queries, HTTP handlers
      /  Unit Tests  \     ← most (60–70%)
     /────────────────\      pure functions, utils, services

── Each layer defined ────────────────────────────────────────────────────────

Unit Test
  - Tests ONE function or class in isolation
  - No real DB, no real network, no file system
  - Fast: < 5ms per test
  - Deterministic: same input → same output every run
  - Example: "does formatCurrency(1999) return '$19.99'?"

Integration Test
  - Tests multiple real units working together
  - May use a real (test) database or real HTTP calls
  - Slower: 50–500ms per test
  - Example: "does createOrder() write the right rows to the DB?"

End-to-End (E2E) Test
  - Tests a full user flow through the real UI
  - Requires a running app, browser, and DB
  - Slowest: 2–30 seconds per test
  - Example: "can a user sign up, add to cart, and check out?"

── Why this pyramid shape? ───────────────────────────────────────────────────

Unit tests are cheap to write and run.
E2E tests are expensive to write, maintain, and run.
A pyramid base of unit tests gives maximum feedback speed.
Inverting the pyramid (mostly E2E) = slow CI and flaky tests.
```

```typescript
// ── What a test actually is (pseudocode) ──────────────────────────────────

// Function under test:
function add(a: number, b: number): number {
  return a + b
}

// The test:
// Given: a = 2, b = 3
// When:  I call add(2, 3)
// Then:  the result should be 5

// This is the Given-When-Then pattern — every test has all three parts.
// "it should…" is the natural English version: "it should add two numbers"
```

```
── What tests protect ────────────────────────────────────────────────────────

Regression protection  → a bug fixed once never returns (if you write the test)
Refactoring confidence → change internals, tests still pass = behaviour unchanged
Documentation          → tests show how functions are meant to be called
Design pressure        → hard-to-test code = poorly designed code (tight coupling)
```

---

## W — Why It Matters

- Without tests, every code change is a guess — you push and hope. With unit tests, you know immediately if a function broke. In a TypeScript codebase, types catch type errors; tests catch logic errors. Both are necessary.
- The pyramid shape is a cost decision — E2E tests take 10 minutes to run, unit tests take 3 seconds. If your full CI suite is fast, you get feedback before coffee cools. If it's slow, developers stop running it locally.
- "Writing tests slows me down" is true for the first week and false for the rest of the project — tests slow initial writing by ~20% and save debugging time by ~80%. The ROI turns positive within 2–3 sprints.

---

## I — Interview Q&A

### Q: What is the test pyramid and why does the shape matter?

**A:** The test pyramid is a model for the ideal distribution of automated tests. The base — the widest layer — is unit tests: many, fast, isolated tests of individual functions. The middle is integration tests: fewer tests that verify multiple components working together with real dependencies like databases. The top is end-to-end tests: the fewest, slowest tests that drive a real UI through full user flows. The pyramid shape matters because test cost scales with proximity to production. Unit tests run in milliseconds and can number in the hundreds with no CI impact. E2E tests take seconds to minutes each and become the bottleneck. Inverting the pyramid — few unit tests, many E2E — results in slow, flaky CI that developers stop trusting.

---

## C — Common Pitfalls + Fix

### ❌ Testing implementation details — tests break on refactor

```typescript
// ❌ Tests the internal variable name — breaks if you rename it
expect(cart._internalItems.length).toBe(2)
// This test passes if items = 2, fails if you rename _internalItems ❌
```

**Fix:** Test observable behaviour — inputs and outputs, not internals:

```typescript
// ✅ Tests what the user cares about
expect(cart.getItemCount()).toBe(2)
// Rename internals freely — test still passes ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Classify each of these as unit, integration, or E2E tests and explain why: (1) calling `formatPrice(1999)` and checking it returns `"$19.99"`; (2) calling `POST /api/orders` and checking the database has a new row; (3) opening a browser, logging in, adding an item, and checking the order confirmation page.

### Solution

```
1. Unit test
   - Tests one pure function (formatPrice) in isolation
   - No DB, no network, no side effects
   - Input → output only

2. Integration test
   - Tests an HTTP handler + a real database together
   - Uses real connections (HTTP + PostgreSQL)
   - Multiple real layers working together

3. End-to-end test
   - Tests a complete user journey through a real browser
   - Requires running frontend, backend, and database
   - Simulates actual user behaviour
```

---

---

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

# 3 — Config File Basics — vitest.config.ts

---

## T — TL;DR

`vitest.config.ts` is where you configure the test environment, globals, file patterns, timeouts, setup files, and coverage. For projects with a `vite.config.ts`, you can add a `test` key directly to it. For projects without Vite (Next.js, plain Node), use a standalone `vitest.config.ts`. Most defaults are sensible — you mainly configure `environment`, `globals`, and `setupFiles`.

---

## K — Key Concepts

```typescript
// vitest.config.ts — standalone (Next.js / plain Node) ────────────────────
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'  // npm i -D vite-tsconfig-paths

export default defineConfig({
  plugins: [tsconfigPaths()],  // resolves @/ aliases from tsconfig.json

  test: {
    // ── Environment ────────────────────────────────────────────────────────
    // 'node'   → Node.js globals (default — use for API/server code)
    // 'jsdom'  → browser globals (document, window — use for React components)
    // 'happy-dom' → faster jsdom alternative
    environment: 'node',

    // ── Globals ────────────────────────────────────────────────────────────
    // When true: describe/it/expect available without import
    // When false (default): must import from 'vitest'
    globals: false,   // explicit imports = better DX (IDE auto-complete works)

    // ── Test file patterns ─────────────────────────────────────────────────
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
    ],

    // ── Setup files — run before each test file ────────────────────────────
    setupFiles: ['./src/test/setup.ts'],

    // ── Timeouts ──────────────────────────────────────────────────────────
    testTimeout:  5_000,   // ms — fail if a test takes longer than 5s
    hookTimeout:  10_000,  // ms — for beforeAll/afterAll with DB setup

    // ── Reporter ──────────────────────────────────────────────────────────
    reporter: 'verbose',  // show each individual test name

    // ── Coverage (only active with --coverage flag) ────────────────────────
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'html', 'json'],
      include:    ['src/**/*.ts'],
      exclude:    ['src/**/*.test.ts', 'src/test/**'],
      thresholds: {
        lines:     80,
        functions: 80,
        branches:  70,
        statements: 80,
      },
    },
  },
})
```

```typescript
// ── Extending from vite.config.ts (Vite projects) ────────────────────────
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig                    from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      setupFiles:  ['./src/test/setup.ts'],
    },
  })
)
// Inherits all plugins, aliases, and transforms from vite.config.ts ✅
```

```typescript
// ── Per-file environment override ─────────────────────────────────────────
// At the top of a test file — overrides vitest.config.ts for this file only
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
// document, window etc. available here ✅

// Use when: the global environment is 'node' but one file needs 'jsdom'
```

```typescript
// ── Workspace config — multiple environments in one project ───────────────
// vitest.workspace.ts (Vitest 1.1+)
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name:        'unit',
      environment: 'node',
      include:     ['src/**/*.test.ts'],
    },
  },
  {
    test: {
      name:        'components',
      environment: 'jsdom',
      include:     ['src/**/*.test.tsx'],
    },
  },
])
// Run specific workspace: vitest --project unit
```

---

## W — Why It Matters

- `vite-tsconfig-paths` in the config is not optional for projects using `@/` path aliases — without it, `import { prisma } from '@/lib/prisma'` inside a test file throws `Cannot find module '@/lib/prisma'` even though it works in the app. One plugin import fixes it for all test files.
- `globals: false` (the default) is the better choice despite being more verbose — when globals are true, `describe` and `expect` come from nowhere and TypeScript may not know their types without a special `types` config. Explicit imports (`import { it } from 'vitest'`) give perfect IDE auto-complete and make the test file self-documenting.
- `testTimeout: 5000` is a safety net — a test that awaits a Promise that never resolves will otherwise hang the test suite. A 5-second timeout surfaces these issues as a clear test failure instead of a silent hang.

---

## I — Interview Q&A

### Q: What is the difference between the `environment` option values `'node'` and `'jsdom'` in Vitest?

**A:** `environment: 'node'` runs tests in a Node.js context — `process`, `Buffer`, `require` are available but `document`, `window`, and `localStorage` are not. This is correct for testing backend code: API handlers, database services, utility functions. `environment: 'jsdom'` simulates a browser DOM using the jsdom library — `document.querySelector`, `window.location`, and event listeners are available. Use this for testing React components, DOM manipulation, or any code that expects browser globals. Mixing them up causes confusing errors: `ReferenceError: document is not defined` in a node environment, or missing `process.env` in jsdom. You can override per file with `// @vitest-environment jsdom` at the top of any test file, or use a workspace config to define separate environments for different test directories.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `vite-tsconfig-paths` — path aliases fail in tests

```bash
# ❌ Error: Cannot find module '@/lib/utils'
# Your tsconfig.json has: "paths": { "@/*": ["./src/*"] }
# But vitest.config.ts doesn't know about it
```

**Fix:**

```bash
npm install --save-dev vite-tsconfig-paths
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],   // ✅ reads tsconfig paths automatically
  test: { environment: 'node' },
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `vitest.config.ts` for a Next.js project that: (1) resolves `@/` path aliases; (2) runs in `node` environment; (3) includes `src/**/*.test.ts` only; (4) uses setup file at `src/test/setup.ts`; (5) sets 5s test timeout; (6) configures coverage for `src/**/*.ts` excluding test files, with 80% line threshold.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    environment: 'node',
    globals:     false,

    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],

    setupFiles: ['./src/test/setup.ts'],

    testTimeout: 5_000,

    coverage: {
      provider:  'v8',
      reporter:  ['text', 'html'],
      include:   ['src/**/*.ts'],
      exclude:   ['src/**/*.test.ts', 'src/test/**', 'src/**/*.d.ts'],
      thresholds: { lines: 80 },
    },
  },
})
```

---

---

# 4 — Test File Naming Conventions

---

## T — TL;DR

Vitest finds test files by pattern. The two conventions are co-location (`auth.test.ts` next to `auth.ts`) and a dedicated `__tests__` folder. Co-location is the modern standard — the test file lives next to what it tests, is easy to find, and is deleted automatically when the source file is deleted. Use `.test.ts` for unit tests and `.spec.ts` for integration/feature specs.

---

## K — Key Concepts

```
── Co-location pattern (recommended) ─────────────────────────────────────────

src/
  utils/
    format.ts
    format.test.ts      ← lives next to what it tests
  services/
    order.service.ts
    order.service.test.ts
  lib/
    prisma.ts
    prisma.test.ts      ← only if prisma.ts has testable logic

── __tests__ folder pattern (alternative) ────────────────────────────────────

src/
  utils/
    format.ts
  services/
    order.service.ts
  __tests__/
    utils/
      format.test.ts    ← mirrors src/ structure
    services/
      order.service.test.ts

── Which to use? ─────────────────────────────────────────────────────────────

Co-location pros:
  ✅ Test is right next to the source — fast to navigate
  ✅ Deleting the source reminds you to delete the test
  ✅ Standard in Vitest, React Testing Library, and modern TS projects
  ✅ No need to mirror directory structure manually

__tests__ pros:
  ✅ Clean src/ folder without test files
  ✅ Easier to exclude from production build by folder

Recommendation: co-location for unit tests, __tests__ for integration tests
```

```
── File name conventions ──────────────────────────────────────────────────────

[filename].test.ts      → unit test for [filename].ts
[filename].spec.ts      → integration or feature spec (both work with Vitest)
[filename].test.tsx     → unit test for a React component
setup.ts                → not a test file — global setup (in src/test/ or vitest.setup.ts)

Examples:
  formatPrice.test.ts
  user.service.test.ts
  createOrder.test.ts
  Button.test.tsx
  auth.integration.test.ts    ← some teams use .integration. to separate types

── Vitest include patterns ────────────────────────────────────────────────────

Default (without config):
  **/*.{test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}
  **/__tests__/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}

Restrict to .test.ts only:
  include: ['**/*.test.ts', '**/*.test.tsx']

Separate integration tests:
  include: ['**/*.test.ts']       ← unit (default test run)
  include: ['**/*.int.test.ts']   ← integration (separate npm script)
```

```json
// package.json — separate scripts for unit vs integration
{
  "scripts": {
    "test":            "vitest run --exclude '**/*.int.test.ts'",
    "test:int":        "vitest run --include '**/*.int.test.ts'",
    "test:all":        "vitest run",
    "test:watch":      "vitest --exclude '**/*.int.test.ts'"
  }
}
```

---

## W — Why It Matters

- Co-location makes "delete the file you deleted" obvious — when you remove `format.ts`, `format.test.ts` shows up as an orphan immediately. With `__tests__`, the test file silently remains, testing a function that no longer exists or was moved, passing vacuously.
- The `.test.ts` vs `.spec.ts` distinction is team convention, not Vitest-enforced — pick one and stick with it. Mixing both patterns in one project creates confusion about which suffix means what.
- Separating unit from integration tests via filename (`.int.test.ts`) lets you run `npm test` in under 1 second locally (unit only) and reserve the slower integration tests for CI, keeping the fast-feedback loop intact.

---

## I — Interview Q&A

### Q: What is the advantage of co-locating test files next to source files instead of using a `__tests__` directory?

**A:** Co-location ties the test lifecycle to the source file lifecycle. When you open `order.service.ts`, you immediately see `order.service.test.ts` in the same directory — no searching required. When you delete or move `order.service.ts`, the test file is obviously orphaned or needs moving too. With a mirrored `__tests__` structure, it's easy for test files to persist after their source is removed, or to be forgotten when source files are moved. Co-location also scales better — in large projects with hundreds of files, navigating to `src/__tests__/services/order.service.test.ts` requires knowing the full mirror path, whereas the co-located test is always adjacent to the source in any file explorer.

---

## C — Common Pitfalls + Fix

### ❌ Naming test files without the `.test.` or `.spec.` suffix — Vitest ignores them

```
src/utils/formatTests.ts      ← ❌ Vitest won't pick this up
src/utils/format_test.ts      ← ❌ underscore, not dot — won't be found
src/utils/testFormat.ts       ← ❌ wrong pattern
```

**Fix:** Always use `.test.ts` or `.spec.ts`:

```
src/utils/format.test.ts      ← ✅ Vitest finds this
src/utils/format.spec.ts      ← ✅ also found
```

---

## K — Coding Challenge + Solution

### Challenge

Given this file structure, identify which files Vitest will automatically pick up as test files with the default config, and which it won't. Then rename the incorrect ones.

```
src/utils/format.ts
src/utils/format.test.ts
src/utils/formatHelper.test
src/services/orderTests.ts
src/services/order.service.spec.ts
src/__tests__/auth.test.ts
src/test/setup.ts
```

### Solution

```
✅ Picked up:
  src/utils/format.test.ts           → .test.ts pattern ✅
  src/services/order.service.spec.ts → .spec.ts pattern ✅
  src/__tests__/auth.test.ts         → __tests__ folder + .test.ts ✅

❌ NOT picked up:
  src/utils/formatHelper.test        → missing .ts extension
  src/services/orderTests.ts         → no .test. or .spec. in name
  src/test/setup.ts                  → no .test. or .spec. — correct (setup file)
  src/utils/format.ts                → source file, not a test

Renames:
  formatHelper.test     → formatHelper.test.ts
  orderTests.ts         → order.test.ts  (or order.service.test.ts)
```

---

---

# 5 — describe → it/test → expect Flow

---

## T — TL;DR

Every Vitest test follows the same three-level structure: `describe` groups related tests, `it`/`test` defines a single test case, and `expect` makes the assertion. `it` and `test` are identical — `it` reads as natural English ("it returns the sum"), `test` reads as a statement ("test: add function"). Use whichever your team prefers, but be consistent.

---

## K — Key Concepts

```typescript
// ── The three-level structure ─────────────────────────────────────────────
import { describe, it, test, expect } from 'vitest'

// describe — a named group of related tests
// Usually named after the module, function, or class being tested
describe('formatPrice', () => {

  // it — one test case, one behaviour
  // "it [verb] [expected outcome]" — reads as a sentence
  it('formats cents as a dollar string', () => {
    expect(formatPrice(1999)).toBe('$19.99')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })

  // test — identical to it, just different wording preference
  test('throws for negative values', () => {
    expect(() => formatPrice(-1)).toThrow('Price cannot be negative')
  })
})
```

```typescript
// ── Nesting describe blocks ────────────────────────────────────────────────
describe('UserService', () => {

  describe('createUser', () => {
    it('creates a user with valid data', () => { /* ... */ })
    it('throws if email already exists', () => { /* ... */ })
    it('hashes the password', () => { /* ... */ })
  })

  describe('findUser', () => {
    it('returns the user by id', () => { /* ... */ })
    it('returns null if not found', () => { /* ... */ })
  })
})

// Output in terminal:
// ✓ UserService
//   ✓ createUser
//     ✓ creates a user with valid data
//     ✓ throws if email already exists
//     ✓ hashes the password
//   ✓ findUser
//     ✓ returns the user by id
//     ✓ returns null if not found
```

```typescript
// ── The Arrange-Act-Assert (AAA) pattern ──────────────────────────────────
it('calculates the order total', () => {
  // Arrange: set up the data / state
  const items = [
    { price: 1000, quantity: 2 },
    { price: 500,  quantity: 1 },
  ]

  // Act: call the function under test
  const total = calculateTotal(items)

  // Assert: verify the result
  expect(total).toBe(2500)
})

// AAA makes tests readable and shows intent clearly:
// What is the input? (Arrange)
// What is being called? (Act)
// What should the result be? (Assert)
```

```typescript
// ── skip and only — focus testing ─────────────────────────────────────────

// Skip a test temporarily (marked as skipped, not failed)
it.skip('handles unicode names', () => {
  // TODO: implement unicode support
  expect(formatName('José')).toBe('José')
})

// Run ONLY this test — skip all others in this file
it.only('urgent regression test', () => {
  expect(criticalFunction()).toBe(true)
})
// ⚠️ Never commit .only — it hides failures in all other tests

// Nested describe with only:
describe.only('createUser', () => {
  // only this describe block runs
})

// Pending test — placeholder, marked as todo
it.todo('handle unicode email addresses')
// Appears in output as "todo" — not a failure, a reminder
```

```typescript
// ── each — data-driven tests ──────────────────────────────────────────────
import { describe, it, expect } from 'vitest'

describe('formatPrice', () => {
  it.each([
    [0,    '$0.00'],
    [100,  '$1.00'],
    [1999, '$19.99'],
    [5000, '$50.00'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatPrice(cents)).toBe(expected)
  })
})

// Named object form (cleaner):
it.each([
  { cents: 0,    expected: '$0.00'  },
  { cents: 1999, expected: '$19.99' },
])('formats $cents as $expected', ({ cents, expected }) => {
  expect(formatPrice(cents)).toBe(expected)
})
```

---

## W — Why It Matters

- The `describe` → `it` → `expect` nesting creates readable test output — when a test fails, you read `UserService > createUser > throws if email already exists` and immediately know what broke and where. A flat list of test names without grouping is much harder to parse in a 200-test suite.
- `it.each` eliminates duplicated test code — instead of writing 6 identical tests with different inputs, one `it.each` table covers all cases. Adding a new case is one line. Without `it.each`, you're likely to copy-paste tests and forget to update the assertion in one of them.
- `.only` in committed code is one of the most dangerous testing mistakes — it silently disables all other tests in the file. A CI run that passes with `.only` committed may be passing because 90% of tests were skipped. Enable lint rules to ban `it.only` and `describe.only` in committed files.

---

## I — Interview Q&A

### Q: What is the difference between `it` and `test` in Vitest, and when would you use each?

**A:** `it` and `test` are aliases — they are functionally identical. The distinction is stylistic. `it` reads as the beginning of a natural English sentence: "it returns the sum", "it throws for negative values". This follows the RSpec/BDD convention from Ruby where the test description completes the sentence "it [description]". `test` reads as a direct statement: "test: add returns sum". Some teams prefer `test` for clarity that this is a test function, especially when test names are longer or more complex. Most Vitest and Jest projects use `it` inside `describe` blocks (because the `describe` name provides context) and `test` at the top level (without a describe). Both are valid — pick one convention and apply it consistently across the codebase.

---

## C — Common Pitfalls + Fix

### ❌ Multiple assertions testing multiple behaviours in one `it` — hard to diagnose failures

```typescript
// ❌ Three different behaviours in one test — which one failed?
it('formatPrice works', () => {
  expect(formatPrice(0)).toBe('$0.00')
  expect(formatPrice(1999)).toBe('$19.99')
  expect(formatPrice(-1)).toThrow()  // ← if this fails, the name gives no info
})
```

**Fix:** One behaviour per `it`, or use `it.each` for multiple inputs of the same behaviour:

```typescript
// ✅ One concern per test
it('formats zero as $0.00', () => {
  expect(formatPrice(0)).toBe('$0.00')
})

it('formats 1999 cents as $19.99', () => {
  expect(formatPrice(1999)).toBe('$19.99')
})

it('throws for negative values', () => {
  expect(() => formatPrice(-1)).toThrow()
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `describe` block for a `clamp(value, min, max)` function (returns value clamped between min and max). Include: correct clamping, clamping at min boundary, clamping at max boundary, returning value when within bounds. Use AAA pattern. Add one `it.todo` for a planned case.

### Solution

```typescript
// src/utils/clamp.ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// src/utils/clamp.test.ts
import { describe, it, expect } from 'vitest'
import { clamp }                from './clamp'

describe('clamp', () => {
  it('returns min when value is below min', () => {
    // Arrange
    const value = -5, min = 0, max = 10

    // Act
    const result = clamp(value, min, max)

    // Assert
    expect(result).toBe(0)
  })

  it('returns max when value is above max', () => {
    expect(clamp(20, 0, 10)).toBe(10)
  })

  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when value equals min (boundary)', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('returns max when value equals max (boundary)', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it.todo('handles float values')
})
```

---

---

# 6 — Assertion Patterns — expect Matchers

---

## T — TL;DR

`expect(value).matcher()` is how you assert. Vitest ships with 50+ matchers covering equality, truthiness, numbers, strings, arrays, objects, errors, and async values. Know the ten most common matchers deeply — they cover 95% of all assertions. Use the right matcher for the job: `toBe` for primitives, `toEqual` for objects, `toContain` for arrays/strings.

---

## K — Key Concepts

```typescript
import { expect } from 'vitest'

// ── Equality ──────────────────────────────────────────────────────────────

// toBe — strict equality (===) — use for primitives
expect(2 + 2).toBe(4)
expect('hello').toBe('hello')
expect(null).toBe(null)

// toEqual — deep equality — use for objects and arrays
expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })      // ✅ deep equal
expect({ a: 1, b: 2 }).toBe({ a: 1, b: 2 })          // ❌ fails — different references

// toStrictEqual — deep equal + checks undefined properties + class type
expect({ a: 1, b: undefined }).toEqual({ a: 1 })       // ✅ passes (toEqual ignores undefined)
expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 }) // ❌ fails (toStrictEqual catches it)

// toMatchObject — partial object match (subset check)
expect({ id: 1, name: 'Mark', role: 'admin' }).toMatchObject({ name: 'Mark' })
// Passes even though id and role are not in the expected object ✅
```

```typescript
// ── Truthiness ────────────────────────────────────────────────────────────
expect(true).toBeTruthy()        // truthy: true, 1, 'str', {}
expect(false).toBeFalsy()        // falsy: false, 0, '', null, undefined, NaN
expect(value).toBeNull()         // strictly null
expect(value).toBeUndefined()    // strictly undefined
expect(value).toBeDefined()      // not undefined
expect(value).not.toBeNull()     // negation with .not

// ── Numbers ───────────────────────────────────────────────────────────────
expect(5).toBeGreaterThan(4)
expect(5).toBeGreaterThanOrEqual(5)
expect(3).toBeLessThan(4)
expect(3).toBeLessThanOrEqual(3)
expect(0.1 + 0.2).toBeCloseTo(0.3, 5)  // floating point: 5 decimal places precision

// ── Strings ───────────────────────────────────────────────────────────────
expect('hello world').toContain('world')
expect('hello').toMatch(/^hel/)                    // regex
expect('hello').toMatch('ell')                     // substring
expect('hello').toHaveLength(5)
expect(' trimmed ').not.toBe('trimmed')            // leading/trailing space

// ── Arrays ────────────────────────────────────────────────────────────────
expect([1, 2, 3]).toContain(2)               // contains element
expect([1, 2, 3]).toHaveLength(3)
expect([1, 2, 3]).toEqual(expect.arrayContaining([3, 1]))  // contains these (any order)

// ── Objects ───────────────────────────────────────────────────────────────
expect({ a: 1 }).toHaveProperty('a')          // key exists
expect({ a: 1 }).toHaveProperty('a', 1)       // key exists with value
expect({ a: { b: 2 } }).toHaveProperty('a.b', 2)  // nested path
```

```typescript
// ── Errors ────────────────────────────────────────────────────────────────
function riskyFunction() {
  throw new Error('Something went wrong')
}

// Wrap in arrow function — never call directly in expect()
expect(() => riskyFunction()).toThrow()
expect(() => riskyFunction()).toThrow('Something went wrong')  // message match
expect(() => riskyFunction()).toThrow(Error)                   // class match
expect(() => riskyFunction()).toThrow(/went wrong/i)           // regex match

// ❌ Wrong — calling directly, error not caught by expect
// expect(riskyFunction()).toThrow()  ← the throw happens before expect sees it

// Async errors:
await expect(async () => {
  await fetchUser('nonexistent')
}).rejects.toThrow('User not found')

// Or:
await expect(fetchUser('nonexistent')).rejects.toThrow('User not found')
```

```typescript
// ── Async assertions ──────────────────────────────────────────────────────
// Always await async assertions — forgot await = test passes vacuously ❌

// resolves — the promise resolves with a value
await expect(Promise.resolve(42)).resolves.toBe(42)
await expect(fetchUser('u1')).resolves.toMatchObject({ id: 'u1' })

// rejects — the promise rejects
await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail')
await expect(fetchUser('missing')).rejects.toThrow()

// Both require await — the assertion itself is a Promise ✅
```

```typescript
// ── expect.objectContaining / expect.arrayContaining ──────────────────────
// Use inside toEqual to do partial matching within deep equality

const user = { id: 1, name: 'Mark', createdAt: new Date() }

// Check only what matters — ignore createdAt
expect(user).toEqual(
  expect.objectContaining({ id: 1, name: 'Mark' })
)

// Array of objects — check specific properties
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob',   role: 'user' },
]
expect(users).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: 'Alice', role: 'admin' })
  ])
)
```

---

## W — Why It Matters

- `toBe` vs `toEqual` is the most common source of test confusion — `toBe` uses `===`, so two objects with the same properties fail (`{}` !== `{}`). Always use `toEqual` for objects and arrays. Use `toBe` for strings, numbers, booleans, and null.
- `toThrow()` requires wrapping in a function — this is a consistent gotcha. `expect(fn()).toThrow()` calls `fn()` first, the error propagates before `expect` can catch it, and the test itself throws. `expect(() => fn()).toThrow()` wraps the call so `expect` catches it.
- Missing `await` on async assertions is a silent test failure — `expect(fetchUser()).resolves.toBe(...)` without `await` creates a floating Promise. The assertion may not run before the test ends, so the test passes even if the assertion would fail. Always `await expect(...)`.

---

## I — Interview Q&A

### Q: When would you use `toEqual` vs `toStrictEqual` vs `toMatchObject`?

**A:** `toEqual` performs deep equality ignoring `undefined` properties — `{ a: 1, b: undefined }` equals `{ a: 1 }` with `toEqual`. Use it for most object comparisons when you own both objects. `toStrictEqual` is stricter — it checks that `undefined` properties are explicitly present, and that objects created from different classes are not considered equal. Use it when the distinction between `undefined` being present and absent matters. `toMatchObject` checks that the received object contains at least the expected properties — extra properties in the received object are allowed. Use it when testing a subset of an object's properties (e.g. checking an API response has the right `id` and `name` without caring about `createdAt` or `updatedAt`). For most unit tests, `toEqual` and `toMatchObject` cover the majority of cases.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `await` on async `resolves`/`rejects` assertions

```typescript
// ❌ Test passes even if assertion fails — floating promise
it('fetches user', () => {
  expect(getUser('1')).resolves.toEqual({ id: '1' })  // no await ❌
})
```

**Fix:** Always `await` async assertions:

```typescript
// ✅
it('fetches user', async () => {
  await expect(getUser('1')).resolves.toEqual({ id: '1' })
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write tests for a `parseUserInput` function that: (1) returns `{ name: string, age: number }` for valid input; (2) throws `ValidationError` with message "Name required" if name is empty; (3) throws "Age must be positive" if age ≤ 0; (4) the returned object's `name` is trimmed. Use the correct matcher for each case.

### Solution

```typescript
// src/utils/parse-user-input.ts
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function parseUserInput(input: { name: string; age: number }) {
  if (!input.name.trim()) throw new ValidationError('Name required')
  if (input.age <= 0)     throw new ValidationError('Age must be positive')
  return { name: input.name.trim(), age: input.age }
}

// src/utils/parse-user-input.test.ts
import { describe, it, expect } from 'vitest'
import { parseUserInput }       from './parse-user-input'

describe('parseUserInput', () => {
  it('returns parsed object for valid input', () => {
    const result = parseUserInput({ name: 'Mark', age: 25 })
    expect(result).toEqual({ name: 'Mark', age: 25 })
  })

  it('trims whitespace from name', () => {
    const result = parseUserInput({ name: '  Mark  ', age: 25 })
    expect(result.name).toBe('Mark')
  })

  it('throws ValidationError when name is empty', () => {
    expect(() => parseUserInput({ name: '', age: 25 }))
      .toThrow('Name required')
  })

  it('throws ValidationError class for empty name', () => {
    expect(() => parseUserInput({ name: '   ', age: 25 }))
      .toThrow(ValidationError)
  })

  it('throws for age of zero', () => {
    expect(() => parseUserInput({ name: 'Mark', age: 0 }))
      .toThrow('Age must be positive')
  })

  it('throws for negative age', () => {
    expect(() => parseUserInput({ name: 'Mark', age: -1 }))
      .toThrow('Age must be positive')
  })
})
```

---

---

# 7 — Watch Mode and Filtering Tests

---

## T — TL;DR

`vitest` (no flags) runs in watch mode — it re-runs affected tests whenever a file changes. It also has an interactive terminal UI where you can filter by filename, test name, or run only failed tests. Mastering watch mode filters makes the feedback loop near-instant — you see red or green within 200ms of saving.

---

## K — Key Concepts

```bash
# ── Starting watch mode ────────────────────────────────────────────────────
npx vitest
# or:
npm run test:watch

# Watch mode re-runs tests for files that changed (smart — not all tests)
# Press h in the terminal for interactive help:

# Interactive keyboard shortcuts (in watch mode):
# a → run all tests
# f → run only failed tests
# p → filter by filename pattern (type to search)
# t → filter by test name pattern (type to search)
# r → re-run current pattern
# u → update snapshots
# q → quit watch mode
```

```bash
# ── CLI filtering — running specific tests ────────────────────────────────

# Run tests matching a file pattern
npx vitest run formatPrice    # runs files with 'formatPrice' in the path

# Run tests matching a test name pattern
npx vitest run -t "adds two numbers"    # runs tests whose name matches

# Run a specific file
npx vitest run src/utils/format.test.ts

# Run a directory
npx vitest run src/utils/

# Run multiple patterns
npx vitest run formatPrice priceUtils

# Combine file + test name filter
npx vitest run format -t "handles zero"
```

```bash
# ── Useful watch mode workflows ────────────────────────────────────────────

# Scenario 1: Working on one file
# Start watch mode, press 'p', type 'order.service'
# → Only order.service.test.ts runs on every save
# → Fast feedback, no noise from unrelated tests

# Scenario 2: Fix the last failure
# Press 'f' → runs only the test that was failing
# Fix the bug → save → test turns green → press 'a' to run all

# Scenario 3: Run tests for a specific feature
# npx vitest --reporter=verbose -t "createOrder"
# → Shows only tests with "createOrder" in the name, verbose output
```

```bash
# ── Reporter options ───────────────────────────────────────────────────────
npx vitest run --reporter=verbose    # show each individual test name
npx vitest run --reporter=dot        # one dot per test (compact)
npx vitest run --reporter=json       # machine-readable JSON output (CI)
npx vitest run --reporter=junit      # JUnit XML (for CI test reporting dashboards)
npx vitest run --reporter=html       # HTML report (saved to file)

# Multiple reporters:
npx vitest run --reporter=verbose --reporter=json
```

---

## W — Why It Matters

- Watch mode with file filtering is the core of a fast TDD loop — you write a failing test for `order.service.ts`, press `p`, type `order.service`, and only that file's tests run on every save. The feedback is under 200ms. Without filtering, the entire test suite runs on every keystroke in large projects.
- The `f` (failed only) shortcut is the fastest debugging tool — when you have 5 failing tests in a 300-test suite, pressing `f` isolates them immediately. Fix one, save, watch it turn green, repeat. No configuration needed.
- `--reporter=junit` in CI generates XML test reports that GitHub Actions, Jenkins, and GitLab CI can parse to display per-test pass/fail status in the PR interface — worth adding even if the text output is sufficient for debugging.

---

## I — Interview Q&A

### Q: How do you run only a subset of tests without modifying test files?

**A:** Vitest provides several ways to filter without touching test files. Via the CLI: `vitest run -t "pattern"` runs only tests whose name matches the pattern; `vitest run path/to/file` runs a specific file; `vitest run directoryName` runs all tests in a directory. In interactive watch mode: press `p` to filter by filename, press `t` to filter by test name — both accept live-typed patterns. This is preferable to using `it.only` or `describe.only` because those modifications must be reverted before committing, whereas CLI filters are transient. For recurring subsets (unit vs integration), use separate npm scripts with different `--include` patterns in `package.json`.

---

## C — Common Pitfalls + Fix

### ❌ Committing `it.only` or `describe.only` — silently hides failures

```typescript
// ❌ Committed to git — all other tests in this file are skipped in CI
it.only('the one test I was debugging', () => {
  expect(true).toBe(true)
})
// CI passes because the only test that ran passed ❌
```

**Fix:** Use ESLint to ban `.only` in committed code:

```bash
npm install --save-dev eslint-plugin-vitest
```

```json
// .eslintrc or eslint.config.js
{
  "plugins": ["vitest"],
  "rules": {
    "vitest/no-focused-tests": "error",   // bans .only
    "vitest/no-disabled-tests": "warn"    // warns on .skip
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the `package.json` scripts section for a project with: (1) `test` — run all unit tests once (CI); (2) `test:watch` — watch mode; (3) `test:int` — run only `*.int.test.ts` files; (4) `test:ui` — open Vitest UI; (5) `test:coverage` — run with coverage. Then show the terminal command to run only tests with "formatPrice" in the test name in watch mode.

### Solution

```json
{
  "scripts": {
    "test":          "vitest run --exclude '**/*.int.test.ts'",
    "test:watch":    "vitest --exclude '**/*.int.test.ts'",
    "test:int":      "vitest run --include '**/*.int.test.ts'",
    "test:ui":       "vitest --ui",
    "test:coverage": "vitest run --coverage --exclude '**/*.int.test.ts'"
  }
}
```

```bash
# Run only tests matching 'formatPrice' in watch mode:
npx vitest -t "formatPrice"

# Or: start watch mode, then press 't' and type 'formatPrice'
npx vitest
# [interactive] t → formatPrice
```

---

---

# 8 — Setup Files and Global Hooks

---

## T — TL;DR

Setup files run once before test files and configure the global test environment — import polyfills, set env vars, mock global objects. `beforeAll` / `afterAll` run once per `describe` block. `beforeEach` / `afterEach` run before/after every single test. Use `beforeEach` to reset state between tests and prevent test pollution.

---

## K — Key Concepts

```typescript
// ── src/test/setup.ts — global setup file ────────────────────────────────
// Referenced in vitest.config.ts: setupFiles: ['./src/test/setup.ts']
// Runs ONCE per test file (not once globally)

import { vi }         from 'vitest'

// Set environment variables for all tests
process.env.NODE_ENV   = 'test'
process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb'
process.env.JWT_SECRET   = 'test-secret-not-real'

// Mock global objects
vi.stubGlobal('fetch', vi.fn())  // prevent accidental real network calls in unit tests

// Suppress specific console noise in tests
// (only if it clutters test output — don't silence errors)
// vi.spyOn(console, 'warn').mockImplementation(() => {})
```

```typescript
// ── beforeAll / afterAll — once per describe block ────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('UserService', () => {
  let service: UserService

  beforeAll(() => {
    // Runs ONCE before all tests in this describe
    // Use for: expensive setup (DB connection, reading large files)
    service = new UserService({ dbUrl: process.env.DATABASE_URL })
  })

  afterAll(async () => {
    // Runs ONCE after all tests in this describe
    // Use for: cleanup (close DB connection, delete test files)
    await service.close()
  })

  it('creates a user', () => { /* ... */ })
  it('finds a user', () => { /* ... */ })
})
```

```typescript
// ── beforeEach / afterEach — before/after EVERY test ──────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('OrderService', () => {
  let mockPrisma: MockPrismaClient

  beforeEach(() => {
    // Runs before EACH test — creates a fresh mock every time
    // Prevents state leaking from one test to the next
    mockPrisma = createMockPrisma()
    vi.clearAllMocks()  // reset all mock call counts and implementations
  })

  afterEach(() => {
    // Runs after EACH test — cleanup
    vi.restoreAllMocks()  // restore any spied-on functions to originals
  })

  it('creates an order', () => {
    // mockPrisma is fresh — no leftover state from previous tests ✅
  })
})
```

```typescript
// ── Hook execution order ──────────────────────────────────────────────────
// For a describe block with 3 tests:
//
// beforeAll        (1×)
//   beforeEach     (1×)
//     test 1
//   afterEach      (1×)
//   beforeEach     (1×)
//     test 2
//   afterEach      (1×)
//   beforeEach     (1×)
//     test 3
//   afterEach      (1×)
// afterAll         (1×)

// Nested describe hooks run outer-to-inner on setup, inner-to-outer on teardown:
// outer beforeAll → inner beforeAll → outer beforeEach → inner beforeEach → test
// → inner afterEach → outer afterEach → ... → inner afterAll → outer afterAll
```

```typescript
// ── vi.clearAllMocks vs vi.resetAllMocks vs vi.restoreAllMocks ────────────

vi.clearAllMocks()
// Clears: mock.calls, mock.instances, mock.results
// Does NOT reset: implementation (mockReturnValue still returns the same value)
// Use: in beforeEach to reset call tracking between tests

vi.resetAllMocks()
// Clears call tracking + resets implementation to undefined
// After reset: vi.fn() returns undefined again
// Use: when you want each test to start with a blank mock

vi.restoreAllMocks()
// Restores: vi.spyOn() mocks back to original implementation
// Does NOT restore: vi.fn() (not a spy, has no original)
// Use: in afterEach to undo spy wrapping
```

---

## W — Why It Matters

- `beforeEach` + `vi.clearAllMocks()` is the correct pattern to prevent test pollution — if test A sets a mock return value and test B doesn't override it, test B may pass for the wrong reason (using test A's setup). Fresh state in `beforeEach` guarantees each test is self-contained.
- Global setup files are the right place for env vars, not individual test files — if every test file sets `process.env.DATABASE_URL = 'testdb'`, changing the test DB URL requires editing 30 files. One `setup.ts` = one change.
- `afterAll` for cleanup is critical in integration tests — if a test opens a database connection or starts an HTTP server and doesn't close it, Vitest may hang after tests complete, waiting for the open handles to close. Always close resources in `afterAll`.

---

## I — Interview Q&A

### Q: When should you use `beforeAll` vs `beforeEach`?

**A:** `beforeAll` runs once per describe block — use it for setup that is expensive and produces no shared mutable state. Creating a test database schema, initialising a large data structure, or spinning up a server are `beforeAll` candidates — these take time and don't need to be recreated for every test. `beforeEach` runs before every individual test — use it for any state that must be fresh per test. Creating mocks, seeding a small amount of test data, resetting counters, and calling `vi.clearAllMocks()` belong in `beforeEach`. The rule: if two tests sharing setup state could interfere with each other (test A modifies what test B reads), use `beforeEach`. If the setup is read-only and expensive, use `beforeAll`.

---

## C — Common Pitfalls + Fix

### ❌ Mutating shared state in `beforeAll` — test order dependency

```typescript
// ❌ users is shared — test 2 sees test 1's mutation
const users: User[] = []

beforeAll(() => {
  users.push({ id: 1, name: 'Alice' })  // populated once
})

it('test 1', () => {
  users.push({ id: 2, name: 'Bob' })    // mutates shared array ❌
  expect(users).toHaveLength(2)
})

it('test 2', () => {
  expect(users).toHaveLength(1)         // ❌ fails — test 1 left Bob in there
})
```

**Fix:** Use `beforeEach` to reset mutable state:

```typescript
// ✅ Fresh copy per test
let users: User[]

beforeEach(() => {
  users = [{ id: 1, name: 'Alice' }]  // reset every time
})

it('test 1', () => {
  users.push({ id: 2, name: 'Bob' })
  expect(users).toHaveLength(2)        // ✅
})
it('test 2', () => {
  expect(users).toHaveLength(1)        // ✅ — fresh array
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `src/test/setup.ts` that: (1) sets `NODE_ENV=test` and a dummy `DATABASE_URL`; (2) globally stubs `fetch` as a mock fn; (3) clears all mocks after each test using Vitest's global hooks. Also write a describe block showing `beforeAll` and `beforeEach` used correctly for an `EmailService`.

### Solution

```typescript
// src/test/setup.ts
import { vi, afterEach } from 'vitest'

// Environment setup
process.env.NODE_ENV    = 'test'
process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb'
process.env.JWT_SECRET   = 'test-only-secret-32-chars-padding!!'

// Prevent accidental real network calls
vi.stubGlobal('fetch', vi.fn())

// Reset all mocks between tests — prevents test pollution
afterEach(() => {
  vi.clearAllMocks()
})
```

```typescript
// src/services/email.service.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

class EmailService {
  private transporter: { send: (opts: object) => Promise<void> }
  constructor(transporter: { send: (opts: object) => Promise<void> }) {
    this.transporter = transporter
  }
  async sendWelcome(email: string) {
    await this.transporter.send({ to: email, subject: 'Welcome!' })
  }
}

describe('EmailService', () => {
  let service: EmailService
  let mockSend: ReturnType<typeof vi.fn>

  beforeAll(() => {
    // Create the service once — expensive init (auth, TLS handshake in prod)
    mockSend = vi.fn()
    service  = new EmailService({ send: mockSend })
  })

  beforeEach(() => {
    // Reset call tracking before each test — not the implementation
    mockSend.mockClear()
  })

  it('calls send with the correct email', async () => {
    await service.sendWelcome('mark@example.com')
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith({
      to:      'mark@example.com',
      subject: 'Welcome!',
    })
  })

  it('calls send again for a different email', async () => {
    await service.sendWelcome('alice@example.com')
    expect(mockSend).toHaveBeenCalledOnce()  // ✅ mockClear reset previous call ✅
  })
})
```

---

---

# 9 — Project Structure for Tests

---

## T — TL;DR

A consistent test folder structure prevents chaos as the project grows. Use co-located `.test.ts` files for unit tests. Use `src/test/` for shared test utilities, factories, and the global setup file. Use `src/__tests__/` or `tests/` for integration tests that don't belong next to a single source file. The goal: any developer can find the test for any file in under 5 seconds.

---

## K — Key Concepts

```
── Recommended structure for a full-stack Next.js + Prisma + tRPC project ────

src/
│
├── lib/
│   ├── prisma.ts
│   └── prisma.test.ts          ← unit test for any testable prisma utilities
│
├── utils/
│   ├── format.ts
│   ├── format.test.ts          ← unit: co-located
│   ├── validate.ts
│   └── validate.test.ts
│
├── services/
│   ├── order.service.ts
│   ├── order.service.test.ts   ← unit: service logic with mocked Prisma
│   ├── email.service.ts
│   └── email.service.test.ts
│
├── server/
│   ├── routers/
│   │   ├── order.ts
│   │   └── order.test.ts       ← unit: tRPC router with mocked ctx
│
├── test/                       ← shared test infrastructure (NOT test files)
│   ├── setup.ts                ← global setup (setupFiles in config)
│   ├── factories/
│   │   ├── user.factory.ts     ← test data factories
│   │   └── order.factory.ts
│   ├── mocks/
│   │   ├── prisma.mock.ts      ← reusable Prisma mock
│   │   └── auth.mock.ts
│   └── helpers/
│       └── create-caller.ts    ← tRPC test caller helper
│
└── __tests__/                  ← integration tests (cross-cutting)
    ├── api/
    │   └── order.int.test.ts   ← calls real DB, real HTTP
    └── auth/
        └── session.int.test.ts

vitest.config.ts
prisma/
  schema.prisma
  migrations/
```

```typescript
// ── src/test/factories/user.factory.ts — test data factory ───────────────
// Factories create realistic test data with sensible defaults
// Override only what the test cares about

import type { User } from '@prisma/client'

let seq = 0  // sequence counter for unique values

export function createUser(overrides: Partial<User> = {}): User {
  seq++
  return {
    id:           `user-${seq}`,
    email:        `user${seq}@example.com`,
    name:         `Test User ${seq}`,
    role:         'user',
    passwordHash: '$2b$10$hashed',
    createdAt:    new Date('2025-01-01'),
    updatedAt:    new Date('2025-01-01'),
    ...overrides,
  }
}

// Usage in tests:
// const user = createUser()                      → unique defaults
// const admin = createUser({ role: 'admin' })   → only override what matters
// const user2 = createUser({ email: 'specific@test.com' })
```

```typescript
// ── src/test/mocks/prisma.mock.ts — reusable Prisma mock ────────────────
import { vi } from 'vitest'

// Minimal Prisma Client mock — add methods as needed
export function createMockPrisma() {
  return {
    user: {
      findUnique:    vi.fn(),
      findMany:      vi.fn(),
      create:        vi.fn(),
      update:        vi.fn(),
      delete:        vi.fn(),
    },
    order: {
      findUnique:    vi.fn(),
      create:        vi.fn(),
      update:        vi.fn(),
    },
    $transaction:    vi.fn((fn: Function) => fn({
      user:  { create: vi.fn(), update: vi.fn() },
      order: { create: vi.fn() },
    })),
  }
}

export type MockPrisma = ReturnType<typeof createMockPrisma>
```

---

## W — Why It Matters

- `src/test/factories/` is the single most impactful test infrastructure investment — without factories, every test file builds its own user objects with slightly different fields. When the `User` model gains a new required field, you update one factory instead of 40 test files.
- Separating `src/test/` (utilities, never run as tests) from co-located `.test.ts` files (run as tests) prevents accidental test discovery. The setup file, factories, and mock helpers should never appear in test output as test files.
- The `__tests__/` folder for integration tests (cross-cutting tests that involve multiple services) is the right compromise — these tests don't belong next to a single source file because they test multiple files working together. A dedicated integration folder makes the distinction explicit.

---

## I — Interview Q&A

### Q: What is a test factory and why is it better than creating test data inline in each test?

**A:** A test factory is a function that creates a valid object with sensible defaults, accepting optional overrides for specific properties. For example, `createUser({ role: 'admin' })` returns a complete valid user object where only `role` differs from the default. The advantages over inline object literals: (1) When the data model changes (e.g. a new required field is added to `User`), you update one factory function and all tests automatically get the update — without a factory, you'd update dozens of inline objects. (2) Factories ensure test data is always valid by construction — no more tests failing because someone forgot a required field in their inline object. (3) Tests express intent — `createUser({ role: 'admin' })` communicates "I need an admin user" without noise from the 10 other fields that don't matter for this test.

---

## C — Common Pitfalls + Fix

### ❌ Importing test utilities from `src/test/setup.ts` in test files — coupling to setup

```typescript
// ❌ setup.ts is a side-effect file, not an import module
import { mockFetch } from '../test/setup'  // ← setup.ts doesn't export anything ❌
```

**Fix:** Keep `setup.ts` as a side-effect file. Extract reusable utilities to dedicated files:

```typescript
// src/test/mocks/fetch.mock.ts — importable utility
export function createFetchMock() {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify({})))
}

// In test:
import { createFetchMock } from '@/test/mocks/fetch.mock'
const fetchMock = createFetchMock()
vi.stubGlobal('fetch', fetchMock)
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `createOrder` factory function for a test suite. Order fields: `id` (string), `customerId` (string), `status` ('pending'|'confirmed'|'delivered'|'cancelled'), `total` (number), `createdAt` (Date). Include a sequence counter for unique IDs. Show usage in two test scenarios: a pending order and a delivered order with custom total.

### Solution

```typescript
// src/test/factories/order.factory.ts
let seq = 0

interface Order {
  id:         string
  customerId: string
  status:     'pending' | 'confirmed' | 'delivered' | 'cancelled'
  total:      number
  createdAt:  Date
}

export function createOrder(overrides: Partial<Order> = {}): Order {
  seq++
  return {
    id:         `order-${seq}`,
    customerId: `customer-${seq}`,
    status:     'pending',
    total:      1000,
    createdAt:  new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

// Usage in tests:
// const pendingOrder = createOrder()
// → { id: 'order-1', customerId: 'customer-1', status: 'pending', total: 1000, ... }

// const deliveredOrder = createOrder({ status: 'delivered', total: 5000 })
// → { id: 'order-2', ..., status: 'delivered', total: 5000 }

// Example tests:
import { describe, it, expect } from 'vitest'
import { createOrder }          from '@/test/factories/order.factory'

describe('order factory', () => {
  it('creates a pending order by default', () => {
    const order = createOrder()
    expect(order.status).toBe('pending')
    expect(order.id).toMatch(/^order-/)
  })

  it('allows overriding status and total', () => {
    const order = createOrder({ status: 'delivered', total: 5000 })
    expect(order.status).toBe('delivered')
    expect(order.total).toBe(5000)
  })
})
```

---

---

# 10 — Node Environment Configuration

---

## T — TL;DR

Vitest runs tests in a `node` environment by default — no browser globals, no DOM. For backend/API code this is correct. Configure environment via `vitest.config.ts` (`environment: 'node'`), per-directory using `environmentMatchGlobs`, or per-file using the `@vitest-environment` comment. Always verify your env vars are loaded in tests — use `process.env` reads in `setup.ts`, not at module import time.

---

## K — Key Concepts

```typescript
// ── Environment options ────────────────────────────────────────────────────
// 'node'      → Node.js globals (process, Buffer, __dirname) — default
// 'jsdom'     → browser DOM simulation (document, window, localStorage)
// 'happy-dom' → faster, less complete jsdom alternative
// 'edge-runtime' → Vercel Edge / Cloudflare Workers globals (limited API)

// vitest.config.ts — set for entire project
export default defineConfig({
  test: {
    environment: 'node',   // correct for backend/API testing
  }
})
```

```typescript
// ── Per-file environment override ─────────────────────────────────────────
// At the very top of the file — must be the first line

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

describe('DOM test', () => {
  it('has access to document', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    expect(div.textContent).toBe('hello')
  })
})
```

```typescript
// ── environmentMatchGlobs — per-directory environments ────────────────────
// vitest.config.ts
export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ['src/**/*.test.ts',    'node'],    // backend code → node
      ['src/**/*.test.tsx',   'jsdom'],   // React components → jsdom
      ['src/app/**/*.test.ts','jsdom'],   // Next.js app dir → jsdom
    ],
    // Single environment still works as fallback:
    environment: 'node',
  },
})
```

```typescript
// ── Environment variables in tests ────────────────────────────────────────
// Problem: env vars read at module import time may not be set yet
// setup.ts runs BEFORE the test file is imported

// ✅ Read env vars lazily (inside functions) — safe in tests
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return url
}

// ❌ Reads at import time — may be undefined when module is imported in tests
// export const DATABASE_URL = process.env.DATABASE_URL!  // may be '' in some envs

// ── dotenv in tests ────────────────────────────────────────────────────────
// Vitest does NOT automatically load .env files (Vite does for the app)
// Option 1: Set env vars in setup.ts (explicit)
// Option 2: Use @dotenvx/dotenvx or dotenv in setup.ts
// Option 3: Use vitest's built-in env loading (vitest.config.ts):

export default defineConfig({
  test: {
    env: {
      // Inline env vars (hardcoded — ok for non-secrets in tests)
      NODE_ENV:    'test',
      LOG_LEVEL:   'silent',
    },
    // Or load from a file:
    // envFile: '.env.test',  // (Vitest 1.3+)
  },
})
```

```typescript
// ── Checking your environment in a test ──────────────────────────────────
it('runs in node environment', () => {
  // In node environment:
  expect(typeof process).toBe('object')
  expect(typeof process.env).toBe('object')

  // These should be undefined in node environment:
  // expect(typeof window).toBe('undefined')   ← in jsdom: would be 'object'
})

// Detect current environment:
import { expect } from 'vitest'
console.log('Environment:', typeof window === 'undefined' ? 'node' : 'jsdom')
```

---

## W — Why It Matters

- The node environment is correct for any test that runs server-side code — tRPC handlers, Prisma queries, service functions, utility libraries. Using jsdom for these is wasteful (jsdom initialises a full browser simulation for no reason) and can cause false positives (global DOM objects polluting Node.js-only code).
- Lazy env var reading (inside functions, not at module scope) is a critical pattern for testability — modules that read env vars at import time cannot be imported in tests without setting those env vars in `setup.ts` first. This creates ordering dependencies that are fragile. Functions that read env vars when called are testable in isolation.
- `vitest.config.ts` `env` field is the cleanest way to set test-only env vars — they're visible, checked into git, and not polluted by `.env` files that developers may have locally configured differently.

---

## I — Interview Q&A

### Q: Why might environment variables be undefined in a test file even when you set them in your setup file?

**A:** JavaScript modules are evaluated once and cached. If a module reads `process.env.DATABASE_URL` at the top level (outside any function) during its initial import, and that import happens before `setupFiles` runs, the variable is `undefined` at evaluation time. The setup file sets the variable afterward, but the module's top-level code has already run. The fix is to read environment variables lazily — inside functions, not at module scope. When a function is called during a test, `setupFiles` has already run and the variable is set. The alternative is to ensure the import order is correct by using dynamic imports (`await import(...)`) inside tests, but lazy reads are cleaner and more robust.

---

## C — Common Pitfalls + Fix

### ❌ Reading env vars at module scope — undefined during test import

```typescript
// src/lib/db.ts
// ❌ DATABASE_URL read at import time — may be undefined in tests
const connectionString = process.env.DATABASE_URL!
export const db = createDb(connectionString)
// If imported in a test before setup.ts runs → connectionString = '' or undefined ❌
```

**Fix:** Read lazily:

```typescript
// ✅ Read inside the factory function — called after setup.ts has run
let _db: Db | null = null

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL not configured')
    _db = createDb(url)
  }
  return _db
}
```

---

## K — Coding Challenge + Solution

### Challenge

Configure `vitest.config.ts` to: (1) use `node` for `.test.ts` files and `jsdom` for `.test.tsx` files via `environmentMatchGlobs`; (2) set `NODE_ENV=test` and `LOG_LEVEL=silent` via the `env` field; (3) load `src/test/setup.ts` as a setup file. Show a minimal `.test.tsx` file that uses the jsdom environment.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',   // fallback

    environmentMatchGlobs: [
      ['**/*.test.ts',  'node'],
      ['**/*.test.tsx', 'jsdom'],
    ],

    setupFiles: ['./src/test/setup.ts'],

    env: {
      NODE_ENV:  'test',
      LOG_LEVEL: 'silent',
    },

    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
})
```

```tsx
// src/components/Badge.test.tsx
// No @vitest-environment needed — environmentMatchGlobs handles it
import { describe, it, expect } from 'vitest'

function Badge({ label }: { label: string }) {
  const el = document.createElement('span')
  el.className = 'badge'
  el.textContent = label
  return el
}

describe('Badge', () => {
  it('sets the label text', () => {
    const badge = Badge({ label: 'Admin' })
    expect(badge.textContent).toBe('Admin')    // uses document ✅ (jsdom env)
    expect(badge.className).toBe('badge')
  })
})
```

---

---

# 11 — Coverage Introduction

---

## T — TL;DR

Coverage measures what percentage of your source code is exercised by tests. Vitest uses `@vitest/coverage-v8` (Node's built-in V8 coverage) or Istanbul. The four metrics are: lines, statements, branches (if/else paths), and functions. Coverage is a floor, not a ceiling — 80% coverage with meaningful tests beats 100% with tests that only check `expect(true).toBe(true)`.

---

## K — Key Concepts

```bash
# ── Setup ─────────────────────────────────────────────────────────────────
npm install --save-dev @vitest/coverage-v8

# ── Run with coverage ─────────────────────────────────────────────────────
npx vitest run --coverage

# Output:
# Coverage report from v8
# ────────────────────────────────────────────────────────
# File              | % Stmts | % Branch | % Funcs | % Lines
# ────────────────────────────────────────────────────────
# src/utils         |         |          |         |
#   format.ts       |   92.30 |    83.33 |  100.00 |   92.30
#   validate.ts     |   75.00 |    50.00 |   66.66 |   75.00
# ────────────────────────────────────────────────────────
# All files         |   84.61 |    70.00 |   85.71 |   84.61
```

```typescript
// ── Coverage config in vitest.config.ts ───────────────────────────────────
export default defineConfig({
  test: {
    coverage: {
      provider:  'v8',                 // or 'istanbul'
      reporter:  ['text', 'html', 'json', 'lcov'],
      // text:  terminal table (above)
      // html:  open coverage/index.html in browser for line-by-line view
      // json:  machine-readable (for CI reporting tools)
      // lcov:  for Codecov, Coveralls, GitHub Actions integrations

      include: ['src/**/*.ts', 'src/**/*.tsx'],  // what to measure
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/index.ts',     // re-export barrels — not meaningful to cover
      ],

      // Fail CI if thresholds not met
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,
      },

      // Generate coverage report even when tests fail
      reportOnFailure: true,

      // Show all files (including untested ones) not just covered ones
      all: true,
    },
  },
})
```

```typescript
// ── Understanding the four metrics ────────────────────────────────────────

function processOrder(order: Order) {
  // Line 1 — statement
  const tax = order.total * 0.1          // branch: always executed

  // Lines 2–6 — branch (if/else)
  if (order.status === 'pending') {       // branch A
    notify(order.id)                      // only if 'pending'
  } else {
    archive(order.id)                     // only if not 'pending'
  }

  return { tax, processed: true }
}

// Statements: each executable line
// Lines:      each source line (similar to statements)
// Branches:   each path of conditionals (true + false of every if/ternary/&&/||)
// Functions:  each function definition called at least once

// Example: testing only processOrder({ status: 'pending' })
// Statements: ~83% (all lines except archive())
// Branches:   50% (true branch covered, false branch not)
// Functions:  depends on whether notify/archive are counted
```

```typescript
// ── Istanbul ignore comment — exclude specific lines ──────────────────────
function debugHelper() {
  /* istanbul ignore next */
  if (process.env.NODE_ENV === 'debug') {
    console.log('internal debug state:', state)   // excluded from coverage
  }
}

// Use sparingly — for: impossible branches, debug-only code, generated code
// Don't use to artificially inflate coverage numbers
```

---

## W — Why It Matters

- Branch coverage reveals the most impactful untested paths — a function with 50% branch coverage has an entire `else` branch that's never tested. That untested path is where bugs hide. 80% line coverage can mask 50% branch coverage if you don't check both.
- The `html` reporter is the most useful for developers — open `coverage/index.html` in a browser and click into any file to see exactly which lines are red (uncovered). This is more actionable than the terminal table and directs your next test to write.
- Coverage thresholds in CI enforce a floor — without them, coverage only ever decreases as features are added without tests. A 80% threshold means PRs that reduce coverage below 80% fail CI, prompting the author to add tests before merging.

---

## I — Interview Q&A

### Q: What is branch coverage and why is it more important than line coverage?

**A:** Line coverage (or statement coverage) measures whether a line of code was executed at least once during tests. Branch coverage measures whether each possible path through a conditional was taken. A simple `if (isAdmin)` has two branches: the `true` path and the `false` path. If your tests only call the function with `isAdmin = true`, you have 100% line coverage for that line but only 50% branch coverage — the `false` path (and any bugs in it) was never tested. Branch coverage is more important because bugs overwhelmingly live in conditional logic: the edge case that hits the `else`, the `null` check that's wrong, the fallback path that was never manually tested. A target of 70–80% branch coverage is a practical goal that catches most logic bugs without requiring exhaustive combinatorial testing.

---

## C — Common Pitfalls + Fix

### ❌ Achieving 100% coverage by testing trivial code — false confidence

```typescript
// ❌ This achieves 100% coverage but tests nothing meaningful
it('exists', () => {
  expect(typeof processOrder).toBe('function')   // covers the function declaration
})
// processOrder's logic is completely untested ❌ — 100% coverage = 0% safety
```

**Fix:** Write tests that exercise real behaviour and edge cases:

```typescript
// ✅ Covers real branches and behaviour
it('calculates 10% tax', () => {
  const result = processOrder({ total: 1000, status: 'confirmed' })
  expect(result.tax).toBe(100)
})

it('notifies for pending orders', () => {
  processOrder({ total: 500, status: 'pending' })
  expect(notify).toHaveBeenCalledWith(order.id)
})

it('archives non-pending orders', () => {
  processOrder({ total: 500, status: 'delivered' })
  expect(archive).toHaveBeenCalledWith(order.id)
})
// 100% branch coverage with meaningful assertions ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `src/utils/discount.ts` with a `calculateDiscount(total, code)` function: 20% off for `'SAVE20'`, 10% off for `'SAVE10'`, 0 discount for unknown code, throws `InvalidCodeError` if code is empty. Write tests achieving 100% branch coverage. Show the expected coverage output.

### Solution

```typescript
// src/utils/discount.ts
export class InvalidCodeError extends Error {
  constructor() { super('Discount code cannot be empty') }
}

export function calculateDiscount(total: number, code: string): number {
  if (!code) throw new InvalidCodeError()
  if (code === 'SAVE20') return total * 0.2
  if (code === 'SAVE10') return total * 0.1
  return 0
}

// src/utils/discount.test.ts
import { describe, it, expect }                from 'vitest'
import { calculateDiscount, InvalidCodeError } from './discount'

describe('calculateDiscount', () => {
  it('returns 20% for SAVE20', () => {
    expect(calculateDiscount(1000, 'SAVE20')).toBe(200)
  })

  it('returns 10% for SAVE10', () => {
    expect(calculateDiscount(1000, 'SAVE10')).toBe(100)
  })

  it('returns 0 for unknown code', () => {
    expect(calculateDiscount(1000, 'UNKNOWN')).toBe(0)
  })

  it('throws InvalidCodeError for empty code', () => {
    expect(() => calculateDiscount(1000, '')).toThrow(InvalidCodeError)
    expect(() => calculateDiscount(1000, '')).toThrow('Discount code cannot be empty')
  })
})

// Expected coverage for discount.ts:
// Stmts: 100% | Branches: 100% | Funcs: 100% | Lines: 100%
// All four if branches covered:
//   empty code     → throw (tested)
//   SAVE20         → 20% (tested)
//   SAVE10         → 10% (tested)
//   unknown code   → 0   (tested)
```

---

---

# 12 — Writing First Clean Unit Tests

---

## T — TL;DR

A clean unit test is: one behaviour per test, readable without comments, independent of other tests, fast (< 5ms), and deterministic. The test name reads as a specification: "it returns null when user is not found." The body follows AAA. The function under test has no side effects that leak. Apply these rules to your first real tests and they become the standard for the whole project.

---

## K — Key Concepts

```typescript
// ── Checklist for a clean unit test ──────────────────────────────────────
// ✅ Tests exactly one behaviour
// ✅ Test name describes the expected outcome (not the implementation)
// ✅ Follows AAA (Arrange → Act → Assert)
// ✅ No shared mutable state with other tests
// ✅ No real I/O (no DB, no network, no filesystem)
// ✅ Deterministic — same result every run
// ✅ Fast — completes in < 5ms
// ✅ Fails for the right reason (not because of a different bug)
```

```typescript
// ── Example: testing a real utility function ──────────────────────────────
// src/utils/currency.ts
export function formatCurrency(cents: number, currency = 'USD'): string {
  if (!Number.isInteger(cents))  throw new TypeError('cents must be an integer')
  if (cents < 0)                 throw new RangeError('cents must be non-negative')
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

// src/utils/currency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency }       from './currency'

describe('formatCurrency', () => {
  // Happy path
  it('formats 1999 cents as $19.99', () => {
    expect(formatCurrency(1999)).toBe('$19.99')
  })

  it('formats 0 cents as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats 100 cents as $1.00', () => {
    expect(formatCurrency(100)).toBe('$1.00')
  })

  // Non-default currency
  it('formats with EUR currency code', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€10.00')
  })

  // Error cases
  it('throws TypeError for non-integer cents', () => {
    expect(() => formatCurrency(19.99)).toThrow(TypeError)
    expect(() => formatCurrency(19.99)).toThrow('cents must be an integer')
  })

  it('throws RangeError for negative cents', () => {
    expect(() => formatCurrency(-1)).toThrow(RangeError)
  })
})
```

```typescript
// ── Example: testing a service function with a mock dependency ────────────
// src/services/notification.service.ts
interface EmailClient { send(to: string, subject: string, body: string): Promise<void> }

export class NotificationService {
  constructor(private readonly email: EmailClient) {}

  async notifyOrderShipped(
    userEmail:   string,
    orderId:     string,
    trackingNum: string
  ): Promise<void> {
    if (!trackingNum) throw new Error('trackingNum is required')
    await this.email.send(
      userEmail,
      'Your order has shipped!',
      `Tracking: ${trackingNum} for order ${orderId}`
    )
  }
}

// src/services/notification.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService }                  from './notification.service'

describe('NotificationService', () => {
  describe('notifyOrderShipped', () => {
    let mockEmailClient: { send: ReturnType<typeof vi.fn> }
    let service: NotificationService

    beforeEach(() => {
      mockEmailClient = { send: vi.fn().mockResolvedValue(undefined) }
      service = new NotificationService(mockEmailClient)
    })

    it('sends an email with the tracking number', async () => {
      // Arrange
      const email   = 'mark@example.com'
      const orderId = 'ord-123'
      const tracking = 'TRK-456'

      // Act
      await service.notifyOrderShipped(email, orderId, tracking)

      // Assert
      expect(mockEmailClient.send).toHaveBeenCalledOnce()
      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'mark@example.com',
        'Your order has shipped!',
        expect.stringContaining('TRK-456')
      )
    })

    it('sends the email to the correct address', async () => {
      await service.notifyOrderShipped('alice@example.com', 'ord-1', 'TRK-1')
      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'alice@example.com',
        expect.any(String),
        expect.any(String)
      )
    })

    it('throws when trackingNum is empty', async () => {
      await expect(
        service.notifyOrderShipped('x@x.com', 'ord-1', '')
      ).rejects.toThrow('trackingNum is required')
    })

    it('does not send email when trackingNum is empty', async () => {
      try {
        await service.notifyOrderShipped('x@x.com', 'ord-1', '')
      } catch { /* expected */ }
      expect(mockEmailClient.send).not.toHaveBeenCalled()
    })
  })
})
```

```typescript
// ── What makes a test name bad vs good ────────────────────────────────────

// ❌ Bad test names — describe the implementation or say nothing
it('works')
it('test 1')
it('handles input')
it('calls send')

// ✅ Good test names — describe the observable behaviour and outcome
it('returns $0.00 for zero cents')
it('throws RangeError for negative input')
it('sends the email to the recipient address')
it('does not send email when tracking number is missing')

// Rule: if the test fails, can you understand what broke just from the name?
// If yes: good name. If no: too vague.
```

---

## W — Why It Matters

- Unit tests are specifications — a well-named test suite for `formatCurrency` documents exactly what the function guarantees: it formats 1999 as `$19.99`, it handles zero, it rejects non-integers, it rejects negatives. This is more reliable than prose documentation because it's executable and enforced by CI.
- Injecting dependencies (the `EmailClient` via the constructor) is the design pattern that makes services unit-testable — instead of the service creating its own `nodemailer` instance (which would try to send a real email), it accepts any object with a `send` method. In tests, you pass a mock. In production, you pass the real client. This is dependency injection.
- The "does not send email when trackingNum is empty" test is as important as the error test — it verifies that the guard clause (`if (!trackingNum) throw`) prevents the side effect. Without this test, you only know the error is thrown, not that the email is suppressed.

---

## I — Interview Q&A

### Q: How do you unit test a service that has an external dependency (like an email client or a database) without making real calls?

**A:** Dependency injection — accept the dependency as a constructor parameter or function argument instead of instantiating it inside the service. In the test, pass a mock: a plain object or `vi.fn()` that satisfies the interface. For example, instead of `new EmailService()` creating a `nodemailer` transporter internally, it accepts `{ send: (to, subject, body) => Promise<void> }`. In tests, pass `{ send: vi.fn() }`. This approach has three benefits: (1) tests are instant — no real network calls, (2) tests are deterministic — mock always responds the same way, (3) tests are specific — you can verify exactly what the dependency was called with using `expect(mock.send).toHaveBeenCalledWith(...)`. This is the core of testable design: invert control of dependencies.

---

## C — Common Pitfalls + Fix

### ❌ Testing private implementation — test breaks on refactor

```typescript
// ❌ Accessing a private method / internal state
it('sets the internal _cache', () => {
  service.loadUser('u1')
  expect((service as any)._cache['u1']).toBeDefined()  // ← private, cast to any ❌
})
// If _cache is renamed to cache_, this test breaks — nothing external changed ❌
```

**Fix:** Test the observable behaviour — what external callers see:

```typescript
// ✅ Test via the public API
it('returns cached user on second call without fetching again', async () => {
  await service.getUser('u1')    // first call — fetches
  await service.getUser('u1')    // second call — should use cache
  expect(mockFetch).toHaveBeenCalledOnce()  // ← proves caching, not how it's stored ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `PasswordService` class with: `hash(password: string): Promise<string>` (uses injected hasher), `verify(password: string, hash: string): Promise<boolean>` (uses injected verifier), throws `WeakPasswordError` if password < 8 chars. Write clean unit tests following all rules: factory, AAA, one behaviour per test, mock injection.

### Solution

```typescript
// src/services/password.service.ts
interface Hasher {
  hash:   (pwd: string) => Promise<string>
  verify: (pwd: string, hash: string) => Promise<boolean>
}

export class WeakPasswordError extends Error {
  constructor() { super('Password must be at least 8 characters') }
}

export class PasswordService {
  constructor(private readonly hasher: Hasher) {}

  async hash(password: string): Promise<string> {
    if (password.length < 8) throw new WeakPasswordError()
    return this.hasher.hash(password)
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return this.hasher.verify(password, hash)
  }
}

// src/services/password.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PasswordService, WeakPasswordError }   from './password.service'

function createMockHasher() {
  return {
    hash:   vi.fn().mockResolvedValue('$hashed$'),
    verify: vi.fn().mockResolvedValue(true),
  }
}

describe('PasswordService', () => {
  let mockHasher: ReturnType<typeof createMockHasher>
  let service:    PasswordService

  beforeEach(() => {
    mockHasher = createMockHasher()
    service    = new PasswordService(mockHasher)
  })

  describe('hash', () => {
    it('returns the hashed password', async () => {
      // Arrange
      const password = 'secureP@ss123'

      // Act
      const result = await service.hash(password)

      // Assert
      expect(result).toBe('$hashed$')
      expect(mockHasher.hash).toHaveBeenCalledWith(password)
    })

    it('delegates to the hasher with the original password', async () => {
      await service.hash('mypassword')
      expect(mockHasher.hash).toHaveBeenCalledOnce()
      expect(mockHasher.hash).toHaveBeenCalledWith('mypassword')
    })

    it('throws WeakPasswordError for passwords under 8 characters', async () => {
      await expect(service.hash('short')).rejects.toThrow(WeakPasswordError)
    })

    it('does not call hasher for weak passwords', async () => {
      try { await service.hash('short') } catch { /* expected */ }
      expect(mockHasher.hash).not.toHaveBeenCalled()
    })

    it('accepts passwords exactly 8 characters long', async () => {
      await expect(service.hash('12345678')).resolves.toBe('$hashed$')
    })
  })

  describe('verify', () => {
    it('returns true when hasher returns true', async () => {
      mockHasher.verify.mockResolvedValue(true)
      const result = await service.verify('password', '$hash$')
      expect(result).toBe(true)
    })

    it('returns false when hasher returns false', async () => {
      mockHasher.verify.mockResolvedValue(false)
      const result = await service.verify('wrongpassword', '$hash$')
      expect(result).toBe(false)
    })

    it('delegates to hasher with correct arguments', async () => {
      await service.verify('mypass', '$thehash$')
      expect(mockHasher.verify).toHaveBeenCalledWith('mypass', '$thehash$')
    })
  })
})
```

---

## ✅ Day 1 Complete — Vitest Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1  | Testing Purpose and the Test Pyramid | ☐ |
| 2  | Vitest Setup and Installation | ☐ |
| 3  | Config File Basics — vitest.config.ts | ☐ |
| 4  | Test File Naming Conventions | ☐ |
| 5  | describe → it/test → expect Flow | ☐ |
| 6  | Assertion Patterns — expect Matchers | ☐ |
| 7  | Watch Mode and Filtering Tests | ☐ |
| 8  | Setup Files and Global Hooks | ☐ |
| 9  | Project Structure for Tests | ☐ |
| 10 | Node Environment Configuration | ☐ |
| 11 | Coverage Introduction | ☐ |
| 12 | Writing First Clean Unit Tests | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
TEST PYRAMID
  Unit (bottom, most):        pure functions, services with mocks — < 5ms
  Integration (middle):       real DB, real HTTP — 50–500ms
  E2E (top, fewest):          full browser + real app — 2–30s
  Invert = slow CI = flaky tests = nobody runs it

INSTALL
  npm install --save-dev vitest @vitest/coverage-v8
  "test": "vitest run"     ← CI (exits)
  "test:watch": "vitest"   ← local (watch)

CONFIG (vitest.config.ts)
  environment: 'node'      ← backend code
  environment: 'jsdom'     ← React/DOM code
  globals: false           ← explicit imports (better DX)
  setupFiles: [...]        ← runs before each test file
  coverage.provider: 'v8'
  coverage.thresholds: { lines: 80, branches: 70 }
  plugins: [tsconfigPaths()] ← resolves @/ aliases ✅

FILE NAMING
  format.test.ts           ← co-located next to source (recommended)
  format.spec.ts           ← also valid, pick one
  __tests__/               ← integration tests
  src/test/setup.ts        ← NOT a test file — setup utility
  Rule: .test. or .spec. in the name

STRUCTURE: describe → it → expect
  describe('functionName', () => {
    it('does X when Y', () => {
      // Arrange
      // Act
      // Assert
    })
  })
  it = test (aliases) — it reads as a sentence
  it.only / describe.only → ban in CI (ESLint rule: no-focused-tests)
  it.skip → marks as skipped (not failed)
  it.todo → placeholder, shows in output
  it.each([...]) → data-driven tests

MATCHERS
  toBe          → strict === (primitives)
  toEqual       → deep equality (objects, arrays)
  toMatchObject → partial match (subset)
  toBeNull/Defined/Truthy/Falsy
  toContain     → array/string contains
  toHaveLength  → array or string length
  toThrow()     → wrap in arrow: expect(() => fn()).toThrow()
  resolves/rejects → always await: await expect(p).resolves.toBe(x)

WATCH MODE
  vitest        → watch (press h for help)
  p             → filter by filename
  t             → filter by test name
  f             → run failed only
  a             → run all
  vitest run -t "pattern"   → CLI filter, no file editing

HOOKS
  beforeAll/afterAll     → once per describe (expensive setup)
  beforeEach/afterEach   → before/after each test (reset state)
  vi.clearAllMocks()     → reset call counts (in beforeEach)
  vi.resetAllMocks()     → reset count + implementation
  vi.restoreAllMocks()   → restore spies (in afterEach)

PROJECT STRUCTURE
  src/
    utils/format.ts + format.test.ts    ← co-located unit
    services/order.service.ts + .test.ts
    test/
      setup.ts                           ← global env setup
      factories/user.factory.ts          ← createUser(overrides)
      mocks/prisma.mock.ts               ← createMockPrisma()
    __tests__/                           ← integration tests

COVERAGE
  npx vitest run --coverage
  v8 provider (no extra config needed)
  html reporter → open coverage/index.html for line-by-line view
  4 metrics: lines, statements, branches, functions
  branches most important (reveals untested if/else paths)
  Threshold: 80% lines, 70% branches is a good starting target
  Coverage = floor not ceiling — meaningful tests > 100% trivial coverage

CLEAN TEST RULES
  One behaviour per it()
  Name = specification: "returns null when user not found"
  AAA: Arrange → Act → Assert
  No shared mutable state (use beforeEach to reset)
  No real I/O (mock the dependency, inject via constructor)
  Deterministic — no Date.now(), no Math.random() without mocking
  Test observable behaviour, not private internals
```

> **Your next action:** Install Vitest in your project, create `src/utils/formatCurrency.ts` with a simple cents-to-string function, write `src/utils/formatCurrency.test.ts` with three test cases. Run `npm test`. See green. That's it.

> "Doing one small thing beats opening a feed."