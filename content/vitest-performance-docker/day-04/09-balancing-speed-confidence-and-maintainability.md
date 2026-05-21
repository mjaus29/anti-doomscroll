# 9 — Balancing Speed, Confidence, and Maintainability

---

## T — TL;DR

Every testing decision is a tradeoff between three properties: **speed** (how fast tests run), **confidence** (how much they catch real bugs), and **maintainability** (how easy they are to change). Optimising for only one breaks the others. Aim for a pyramid: many fast unit tests, fewer integration tests, minimal browser/E2E tests — calibrated so the total suite finishes in under 5 minutes in CI.

---

## K — Key Concepts

```
── The testing tradeoff triangle ──────────────────────────────────────────────

          CONFIDENCE
              ▲
              │   E2E tests
              │   (slow, high confidence, expensive to maintain)
              │
              │   Integration tests
              │   (medium speed, good confidence, moderate maintenance)
              │
              │   Unit tests
              │   (fast, lower confidence, easy to maintain)
              ▼
SPEED ◄─────────────────────────────────────► MAINTAINABILITY

More mocking    = faster + easier to maintain - less confidence (may miss integration bugs)
Less mocking    = slower + harder to maintain + more confidence
More assertions = more confidence - slower to write, harder to maintain
```

```typescript
// ── Test pyramid targets (calibrated for a mid-size app) ──────────────────
//
//          ╔═══════════════════╗
//          ║  E2E (Playwright) ║  ← 10–20 tests, ~5 min, critical flows only
//          ╠═══════════════════╣
//          ║ Integration       ║  ← 50–100 tests, ~2 min, component boundaries
//          ╠═══════════════════╣
//          ║ Unit (jsdom)      ║  ← 200–500 tests, ~30 sec, logic + DOM
//          ╠═══════════════════╣
//          ║ Pure unit         ║  ← 300–1000 tests, ~5 sec, functions/utils
//          ╚═══════════════════╝
//
// CI target: everything under 5 minutes total
// PR target: changed tests + unit tests under 2 minutes
```

```typescript
// ── What to unit test vs skip ─────────────────────────────────────────────

// ✅ Unit test these:
// - Business logic (calculation, validation, transformation)
// - Error handling (every throw/catch path)
// - Edge cases (empty, null, boundary values)
// - Utility functions (pure, deterministic)
// - DOM interactions (event handlers, state changes)

// ❌ Don't unit test (or test minimally):
// - Framework boilerplate (React component that just renders static JSX)
// - Simple getters/setters with no logic
// - Generated code
// - Third-party library internals
// - Configuration objects (test them through their users)
```

```typescript
// ── Mock depth calibration ────────────────────────────────────────────────
// Shallow mocking: mock direct dependencies, keep transitive deps real
// Deep mocking:    mock everything down to the DB/network

// Rule: mock at the boundary of your control
// ✅ Mock: HTTP clients (axios, fetch), DB drivers, email senders, file system
// ❌ Don't mock: your own utility functions, pure modules, type validators

// Example: testing an order service
// ✅ Mock the payment gateway (external service)
// ✅ Mock the DB queries (slow + stateful)
// ❌ Don't mock the order validation logic (your own code — test it directly)
```

```typescript
// ── Coverage targets calibration ──────────────────────────────────────────
// Not all code deserves the same coverage target

// Business logic  → 90%+  (validation, calculation, state machines)
// API routes      → 80%   (happy path + main error paths)
// UI components   → 70%   (behaviour, not all visual states)
// Config / setup  → 40%   (hard to test, low bug surface)
// Generated code  → 0%    (excluded from coverage)
// Type definitions → 0%   (excluded from coverage)
```

```typescript
// ── CI pipeline time budget ────────────────────────────────────────────────
// Target: total CI time < 10 min for developer feedback
// Split budget:
// - npm ci (install):      ~30 sec (with cache: ~5 sec)
// - prisma generate:       ~10 sec
// - TypeScript typecheck:  ~20 sec
// - Lint:                  ~15 sec
// - Unit tests:            ~30 sec
// - Integration tests:     ~2 min
// - Build:                 ~1 min
// Total (parallelised):    ~3–4 min ✅

// Parallelise in CI: lint + typecheck + tests can run simultaneously
// jobs:
//   typecheck: ...
//   lint:      ...
//   test:      ...   ← all three in parallel
//   build:
//     needs: [typecheck, lint, test]  ← merge after all pass
```

```yaml
# .github/workflows/ci.yml — parallelised CI pipeline
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx eslint src/

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run test:ci
        env: { CI: 'true' }

  build:
    needs: [typecheck, lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run build
```

---

## W — Why It Matters

- A slow CI pipeline is a productivity tax — at 20 minutes per run and 10 pushes per day, each developer spends 200 minutes per day waiting for CI. Cutting to 4 minutes saves 160 minutes/day/developer. This compounds across teams.
- Over-mocking creates tests that pass even when the system is broken — a unit test that mocks the DB, the validator, and the HTTP client tests almost nothing about your actual code. The test can be green while the real integration is entirely broken. Know what you're testing vs what you're mocking.
- The 80% coverage threshold is a starting point, not the goal — coverage tells you what code was executed, not whether it was tested meaningfully. 80% coverage with assertions on the return values of critical paths is better than 95% coverage where half the assertions are `expect(true).toBe(true)`.

---

## I — Interview Q&A

### Q: How do you balance test coverage, test speed, and test confidence in a CI pipeline?

**A:** The three form a tradeoff triangle — optimising for one typically costs another. My approach: (1) build a test pyramid with the majority of tests as fast pure unit tests (no IO, no DOM), a moderate layer of jsdom component tests, and a small number of integration and E2E tests; (2) set realistic coverage thresholds calibrated to code criticality — 90%+ for business logic, 70–80% for API routes, lower for glue code; (3) use changed-test filtering on PRs for fast feedback (under 2 min) and full suite on main for confidence; (4) mock at system boundaries (HTTP, DB, email) but avoid mocking your own logic — mocking your own code only tests that you wrote the mock correctly, not that the code works; (5) parallelise CI jobs (lint, typecheck, test) and use sharding for test jobs — target under 5 minutes total wall-clock time for the full pipeline.

---

## C — Common Pitfalls + Fix

### ❌ Chasing 100% coverage with meaningless tests — maintenance hell

```typescript
// ❌ This test adds coverage but tests nothing useful
it('covers the config object', () => {
  expect(config).toBeDefined()           // not a real assertion
  expect(config.timeout).toBeTruthy()    // truthy is not meaningful
  expect(typeof config.retries).toBe('number')  // structure, not behaviour
})
// Coverage: 100% for config.ts
// Confidence: 0% — doesn't test that config values are correct
```

**Fix:** Test behaviour, not existence:

```typescript
// ✅ Tests that the config is used correctly in context
it('retries failed requests the configured number of times', async () => {
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new Error('timeout'))
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValue({ ok: true, json: async () => ({}) })

  await fetchWithRetry('/api/data')

  expect(fetchMock).toHaveBeenCalledTimes(config.retries + 1)  // 3 calls ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Design the complete Vitest configuration for a production Next.js app: (1) separate pools for pure utils (threads/fast) and API routes (forks/isolated); (2) coverage at 80% with per-file threshold off; (3) fake timers auto-enabled; (4) `clearMocks`/`restoreMocks` true; (5) `slowTestThreshold: 200`; (6) `globalSetup` + `setupFiles` entries; (7) `package.json` scripts for dev, CI, coverage, changed, and shard runs.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path              from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  test: {
    // ── Environment ───────────────────────────────────────────────────────
    environment:  'node',    // override per-file with @vitest-environment jsdom

    // ── Setup ─────────────────────────────────────────────────────────────
    globalSetup:  './src/test/global-setup.ts',
    setupFiles:   ['./src/test/setup.ts'],

    // ── Mock management ───────────────────────────────────────────────────
    clearMocks:   true,
    resetMocks:   true,
    restoreMocks: true,

    // ── Timers ────────────────────────────────────────────────────────────
    fakeTimers: {
      // auto-enable fake timers globally (opt-out per test with vi.useRealTimers)
      // Note: Vitest 4 supports toFake config for selective faking
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    },

    // ── Performance ───────────────────────────────────────────────────────
    slowTestThreshold: 200,
    pool:              'threads',
    poolOptions: {
      threads: {
        maxThreads: parseInt(process.env.CI_THREADS ?? '4'),
        isolate:    true,
      }
    },

    // ── Sequence ──────────────────────────────────────────────────────────
    sequence: {
      shuffle: false,
      seed:    42,
    },

    // ── Retries ───────────────────────────────────────────────────────────
    retry: 0,

    // ── Coverage ─────────────────────────────────────────────────────────
    coverage: {
      enabled:          process.env.CI === 'true',
      provider:         'v8',
      include:          ['src/**/*.ts'],
      exclude:          [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/generated/**',
        'src/**/*.d.ts',
        'src/app/layout.tsx',   // Next.js boilerplate
        'src/app/page.tsx',     // entry points with no logic
      ],
      reporter:         ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines:      80,
        functions:  80,
        statements: 80,
        branches:   70,
        perFile:    false,
      },
    },
  },
})
```

```json
// package.json
{
  "scripts": {
    "test":            "vitest",
    "test:run":        "vitest run",
    "test:coverage":   "CI=true vitest run --coverage",
    "test:ci":         "vitest run --coverage",
    "test:changed":    "vitest run --changed=origin/main",
    "test:shard":      "vitest run --coverage --shard",
    "test:debug":      "vitest --reporter=verbose --sequence.shuffle",
    "test:ui":         "vitest --ui",
    "postinstall":     "prisma generate"
  },
  "engines": { "node": ">=22.0.0 <23.0.0" }
}
```

---

## ✅ Day 4 Complete — Vitest Advanced and CI

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Coverage — Thresholds and Reporters | ☐ |
| 2 | Test Performance Profiling | ☐ |
| 3 | Worker Pools and Parallel Execution | ☐ |
| 4 | Sharding — Splitting Across CI Nodes | ☐ |
| 5 | Changed-Test Workflows | ☐ |
| 6 | Module Cache and Setup Overhead | ☐ |
| 7 | Deterministic CI Runs | ☐ |
| 8 | Flaky Test Prevention | ☐ |
| 9 | Balancing Speed, Confidence, Maintainability | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
COVERAGE
  provider: 'v8' (fast) | 'istanbul' (accurate branches)
  thresholds: lines/functions/statements 80, branches 70
  perFile: true  → each file must meet threshold individually
  reporter: ['text', 'html', 'lcov', 'json-summary']
  enabled: process.env.CI === 'true'  → only collect in CI
  exclude: test files, generated code, entry points
  lcov → Codecov/SonarQube; html → local browsing; text → terminal

PERFORMANCE PROFILING
  --reporter=verbose  → per-test timing in terminal
  --reporter=json     → machine-readable timing for analysis
  slowTestThreshold: 200  → flags slow tests (ms)
  Biggest wins: heavy beforeAll/beforeEach, real timers, unmocked network
  vi.useFakeTimers() + vi.advanceTimersByTimeAsync(n) → eliminates real waits
  afterEach(() => vi.useRealTimers())  → always restore

WORKER POOLS
  pool: 'threads'  (default — fastest, shared memory)
  pool: 'forks'    (process isolation — for process.env mutations, native addons)
  pool: 'vmThreads' (VM isolation — for complex module mock scenarios)
  maxThreads: CPU count by default — set lower in CI (check CI_THREADS)
  isolate: true (default) → fresh module registry per file
  describe.concurrent → parallel within file (no shared mutable state!)
  singleThread/singleFork → serial execution for DB integration tests

SHARDING
  --shard=N/TOTAL  → runs the Nth segment of test files
  Deterministic: files sorted alphabetically, split evenly by count
  GitHub Actions: strategy.matrix.shard: [1,2,3]
  Coverage: upload artifact per shard, merge lcov files, upload once
  Target: 2–3 min per shard; 3–6 shards for 10–30 min suites
  Limitation: splits by count not time → uneven if one file is very slow

CHANGED-TEST WORKFLOW
  --changed              → tests related to uncommitted changes vs HEAD
  --changed=origin/main  → since branching from main
  --changed=HEAD~1       → since last commit
  vitest related f1.ts f2.ts → tests that import these files
  fetch-depth: 0 in GitHub Actions checkout → REQUIRED for git diff
  Strategy: --changed on PRs, full suite on merge to main
  Limitation: dynamic imports not traced → may miss some affected tests

MODULE CACHE / SETUP OVERHEAD
  globalSetup → once per process (before workers start) — DB start, fixtures
  setupFiles  → once per worker × workerCount — custom matchers, global stubs
  beforeAll   → once per describe/file — suite-specific resources
  beforeEach  → per test — cheapest repeatable isolation
  Transaction pattern: beforeEach(begin) + afterEach(rollback) → fast DB isolation
  isolate: false → shared module registry (faster, risky — only for stateless modules)

DETERMINISM
  vi.setSystemTime(fixedDate)  → no more date-boundary failures
  vi.useFakeTimers()           → no more timing races
  faker.seed(42)               → reproducible random test data
  clearMocks/resetMocks/restoreMocks: true → no mock state leakage
  sequence.shuffle: false      → stable file ordering
  --sequence.shuffle to FIND hidden order dependencies
  pinned Node.js version in CI (22.4.0 not 22)
  retry: 0 → never retry, fix root cause

FLAKY TEST PREVENTION
  Always await async operations
  afterEach(() => clearSharedState())
  vi.waitFor(() => assertion, { timeout, interval })  → poll until passes
  Mock external services — never real network in unit/integration tests
  server.listen(0)  → OS-assigned port, no conflicts
  repeats: 3  → run each test 3× to verify stability (for validation)
  retry: 0    → don't mask flakiness with retries

SPEED / CONFIDENCE / MAINTAINABILITY
  Pyramid: many unit → fewer integration → minimal E2E
  Mock at boundaries (HTTP, DB, email) NOT your own logic
  Coverage: 90% business logic, 80% API, 70% UI, 0% generated
  CI target: < 5 min total; parallelise lint + typecheck + test
  PR target: < 2 min with --changed
  Test behaviour (what changes in the system), not implementation (how)
  Don't chase 100% with meaningless assertions — reduces maintainability
```

> **Your next action:** Run `npx vitest run --reporter=verbose` on your project right now. Find the single slowest test file. Check if it has a heavy `beforeAll` — if so, you just found 5 minutes of savings.

> "Doing one small thing beats opening a feed."
