
# 📅 Day 4 — Vitest Advanced and CI

> **Goal:** Push your Vitest setup from "tests pass locally" to "fast, reliable, and maintainable in CI" — master coverage enforcement, parallel execution, sharding, changed-only workflows, flaky test prevention, and the tradeoffs that determine how long your pipeline takes.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Vitest 4.x · TypeScript 6 · Node.js · GitHub Actions

---

## 📋 Day 4 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Coverage — Thresholds, Reporters, and Enforcing Minimums | 12 min |
| 2 | Test Performance Profiling — Finding Slow Tests | 10 min |
| 3 | Worker Pools and Parallel Execution | 12 min |
| 4 | Sharding — Splitting Tests Across CI Nodes | 12 min |
| 5 | Changed-Test Workflows — Running Only What Matters | 10 min |
| 6 | Module Cache and Reducing Setup Overhead | 12 min |
| 7 | Deterministic CI Runs | 10 min |
| 8 | Flaky Test Prevention | 12 min |
| 9 | Balancing Speed, Confidence, and Maintainability | 10 min |

---

---

# 1 — Coverage — Thresholds, Reporters, and Enforcing Minimums

---

## T — TL;DR

Vitest uses V8 or Istanbul to measure which lines, branches, functions, and statements your tests exercise. Set `coverage.thresholds` to fail the CI run when coverage drops below a minimum. Use `lcov` reporter for GitHub Actions annotations, `html` for local browsing, and `text` for terminal output.

---

## K — Key Concepts

```typescript
// vitest.config.ts — full coverage configuration
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // ── Provider ───────────────────────────────────────────────────────
      provider: 'v8',        // 'v8' (fast, built-in) | 'istanbul' (more accurate)

      // ── What to include / exclude ──────────────────────────────────────
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/generated/**',   // generated files
        'src/main.ts',        // entry point — no logic to test
      ],

      // ── Reporters ─────────────────────────────────────────────────────
      reporter: [
        'text',               // terminal table summary
        'lcov',               // for GitHub Actions / Codecov / SonarQube
        'html',               // browsable report in coverage/index.html
        'json-summary',       // machine-readable summary
      ],

      // ── Output directory ───────────────────────────────────────────────
      reportsDirectory: './coverage',

      // ── Thresholds — fail CI if coverage drops below these ────────────
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,

        // Per-file threshold — each individual file must meet this
        perFile:    false,   // set true for stricter enforcement
      },
    }
  }
})
```

```bash
# Run tests with coverage
npx vitest run --coverage

# Output:
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# src/utils/slug.ts     |   100   |   100    |   100   |   100   |
# src/services/auth.ts  |    72   |    60    |    80   |    72   |  ← below threshold → CI fails
# ----------------------|---------|----------|---------|---------|
# ERROR: Coverage for lines (72%) does not meet global threshold (80%)
```

```typescript
// ── v8 vs istanbul ─────────────────────────────────────────────────────────
// v8:       Uses Node.js native coverage — fast, no instrumentation overhead
//           Slightly less precise branch tracking (misses some ternary/nullish paths)
// istanbul: Instruments source code — slower but more accurate branch coverage
//           Required for: accurate branch coverage on ternary expressions, logical OR/AND

// Rule: start with v8 for speed; switch to istanbul if branch coverage numbers
// look wrong or you need SonarQube-compatible reports

// ── Per-file thresholds ────────────────────────────────────────────────────
thresholds: {
  lines: 80,
  // Also enforce on each individual file:
  perFile: true,  // any file below 80% lines fails the run
}
// Useful for: preventing new files from being added with 0% coverage
```

```typescript
// ── Coverage in watch mode (local dev) ────────────────────────────────────
// Don't collect coverage in watch mode — it slows feedback loop
// vitest.config.ts:
export default defineConfig({
  test: {
    coverage: {
      enabled: process.env.CI === 'true',  // only in CI
      // or: run manually with --coverage flag
    }
  }
})

// package.json scripts:
// "test":          "vitest",               ← watch, no coverage
// "test:run":      "vitest run",           ← single run, no coverage
// "test:coverage": "vitest run --coverage" ← coverage report
// "test:ci":       "vitest run --coverage" ← used in CI pipeline
```

```yaml
# .github/workflows/test.yml — upload coverage to Codecov
- name: Run tests with coverage
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

---

## W — Why It Matters

- Coverage thresholds turn coverage from a vanity metric into a CI gate — without a threshold, coverage can silently drop from 85% to 40% across a sprint of feature additions, and no one notices until a production bug in untested code.
- `perFile: true` prevents the "averaging trick" — a new file with 0% coverage added to a codebase with 95% average only nudges the average down slightly. Per-file thresholds catch it immediately.
- `lcov` format is the universal input format for Codecov, Coveralls, SonarQube, and GitHub's code coverage annotations — always include it alongside `text` and `html`.

---

## I — Interview Q&A

### Q: What is the difference between line coverage and branch coverage, and which is more meaningful?

**A:** Line coverage measures what percentage of code lines were executed during tests. Branch coverage measures what percentage of decision branches were taken — each `if/else`, ternary, `||`, `&&`, and `switch` case counts as two branches (true and false path). Branch coverage is more meaningful because a line can be "covered" with a test that only exercises one path — `if (isAdmin) doX()` is 100% line-covered if any test calls it when `isAdmin` is true, but 0% branch-covered on the false path. A bug hiding in the `else` branch is invisible to line coverage. The practical minimum: target 80% line coverage as a baseline and 70% branch coverage — branches are harder to fully cover in complex conditional logic.

---

## C — Common Pitfalls + Fix

### ❌ Including test files and generated code in coverage — inflated numbers

```typescript
// ❌ Test files have 100% coverage trivially — they inflate the percentage
coverage: {
  include: ['src/**'],  // includes *.test.ts, generated/, etc.
}
```

**Fix:** Explicitly exclude non-production code:

```typescript
// ✅
coverage: {
  include:  ['src/**/*.ts'],
  exclude:  ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/generated/**', '**/*.d.ts'],
}
```

---

## K — Coding Challenge + Solution

### Challenge

Configure Vitest coverage for a project with `src/` containing business logic. Requirements: (1) V8 provider; (2) text + html + lcov reporters; (3) 80% threshold for lines/functions/statements, 70% for branches; (4) exclude generated files and test files; (5) only run coverage when `CI=true`. Add the correct `package.json` scripts.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      enabled:          process.env.CI === 'true',
      provider:         'v8',
      include:          ['src/**/*.ts'],
      exclude:          [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/generated/**',
        'src/**/*.d.ts',
        'src/index.ts',   // re-export barrel — no logic
      ],
      reporter:         ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines:      80,
        functions:  80,
        statements: 80,
        branches:   70,
      },
    },
  },
})
```

```json
// package.json
{
  "scripts": {
    "test":          "vitest",
    "test:run":      "vitest run",
    "test:coverage": "CI=true vitest run --coverage",
    "test:ci":       "vitest run --coverage --reporter=verbose"
  }
}
```

---

---

# 2 — Test Performance Profiling — Finding Slow Tests

---

## T — TL;DR

Vitest has built-in timing for every test. Use `--reporter=verbose` to see per-test durations, `vitest bench` for microbenchmarks, and the `slowTestThreshold` config to flag tests that exceed a time budget. The biggest performance wins come from identifying which test files spend the most time in `beforeAll` setup, not which individual test assertions are slow.

---

## K — Key Concepts

```typescript
// vitest.config.ts — performance settings
export default defineConfig({
  test: {
    // Flag tests that exceed this threshold (ms) in the output
    slowTestThreshold: 300,   // default: 300ms — tests over this show as slow

    // Show timing in reporter
    reporters: ['verbose'],   // shows duration per test
  }
})
```

```bash
# Run with verbose output to see per-test timing
npx vitest run --reporter=verbose

# Output:
# ✓ src/utils/slug.test.ts (3 tests) 4ms
#   ✓ slugifies text 1ms
#   ✓ handles special chars 1ms
#   ✓ trims spaces 1ms
#
# ✓ src/services/order.test.ts (5 tests) 847ms   ← slow!
#   ✓ creates order 12ms
#   ✓ validates items 8ms
#   ✓ beforeAll: seed database 810ms             ← the real problem
```

```bash
# Profile with --reporter=json — machine-readable timing for analysis
npx vitest run --reporter=json --outputFile=vitest-results.json

# Find slowest test files:
node -e "
  const r = require('./vitest-results.json')
  r.testResults
    .map(f => ({ file: f.name, duration: f.perfStats.end - f.perfStats.start }))
    .sort((a,b) => b.duration - a.duration)
    .slice(0, 10)
    .forEach(f => console.log(f.duration + 'ms', f.file))
"
```

```typescript
// ── Where test time actually goes ──────────────────────────────────────────
// Common culprits in order of frequency:

// 1. Heavy beforeAll / beforeEach setup
describe('order service', () => {
  beforeAll(async () => {
    await db.migrate()          // ❌ runs migration on every test file
    await db.seed()             // ❌ reseeds thousands of rows
  })
  // Fix: run migrations once globally, use transactions for isolation
})

// 2. Real timers / setTimeout in code under test
it('retries after 5 seconds', async () => {
  await retryOperation()   // ❌ waits 5 real seconds
})
// Fix: vi.useFakeTimers() + vi.advanceTimersByTimeAsync()

// 3. Unmocked HTTP requests
it('fetches users', async () => {
  const res = await fetch('https://api.example.com/users')  // ❌ real network
})
// Fix: mock fetch with vi.stubGlobal or msw

// 4. Large snapshot files being serialized/compared
// Fix: use specific assertions instead of full snapshots
```

```typescript
// ── Fake timers — eliminate real waits ───────────────────────────────────
import { vi, it, expect, afterEach } from 'vitest'

afterEach(() => vi.useRealTimers())

it('calls callback after 3 second delay', async () => {
  vi.useFakeTimers()
  const cb = vi.fn()

  setTimeout(cb, 3000)

  expect(cb).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(3000)   // instant — no real wait ✅
  expect(cb).toHaveBeenCalledOnce()
})
// Test runs in <1ms instead of 3000ms ✅
```

```typescript
// ── Measuring setup cost directly ────────────────────────────────────────
describe('expensive setup', () => {
  beforeAll(async () => {
    const start = performance.now()
    await heavySetup()
    console.log(`setup took ${(performance.now() - start).toFixed(0)}ms`)
  })
})
// If setup > 200ms: move to global setup or share across files
```

---

## W — Why It Matters

- 90% of slow test suites are caused by 5% of test files — profiling with `--reporter=json` or `--reporter=verbose` identifies them immediately. Fixing three slow `beforeAll` setups can cut a 3-minute suite to 30 seconds.
- `slowTestThreshold` creates a visible record of slow tests in CI output — it doesn't fail the run, but the yellow warning makes slow tests visible before they compound.
- Fake timers are the single most impactful change for codebases that test retry logic, debouncing, polling, or scheduled tasks — replacing real 5-second waits with instant virtual time advances turns minutes of test time into milliseconds.

---

## I — Interview Q&A

### Q: What are the most common causes of slow Vitest test suites and how do you fix each?

**A:** Four main causes: (1) Heavy `beforeAll`/`beforeEach` — running DB migrations or seeding thousands of rows per file. Fix: move to a global setup file that runs once per process, use transactions that rollback instead of re-seeding. (2) Real timers in async code — tests that wait for real `setTimeout`/`setInterval` delays. Fix: `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()` make time virtual and instant. (3) Unmocked network calls — tests hitting real APIs or localhost servers. Fix: mock `fetch` with `vi.stubGlobal` or intercept with `msw`. (4) Too many tests in a single worker — default pool size may not match your CPU count. Fix: tune `pool` and `poolOptions.threads.maxThreads` to match available cores.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `vi.useRealTimers()` after fake timers — pollutes subsequent tests

```typescript
// ❌ Fake timers leak into the next test
it('test A', () => {
  vi.useFakeTimers()
  // ... test ...
  // forgot vi.useRealTimers()
})

it('test B', async () => {
  await new Promise(r => setTimeout(r, 10))  // hangs — timers are still fake ❌
})
```

**Fix:** Always restore in `afterEach`:

```typescript
// ✅
afterEach(() => vi.useRealTimers())
// or per-test:
it('test A', () => {
  vi.useFakeTimers()
  try { /* test */ } finally { vi.useRealTimers() }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a test for a `debounce(fn, delay)` utility using fake timers: (1) function not called immediately; (2) function not called before delay elapses; (3) function called once after delay; (4) multiple rapid calls only fire once. Measure that no real time elapses.

### Solution

```typescript
// src/utils/debounce.ts
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// src/utils/debounce.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { debounce }                             from './debounce'

describe('debounce', () => {
  afterEach(() => vi.useRealTimers())

  it('does not call fn immediately', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    expect(fn).not.toHaveBeenCalled()
  })

  it('does not call fn before delay', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    await vi.advanceTimersByTimeAsync(299)
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls fn once after delay', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    await vi.advanceTimersByTimeAsync(300)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('multiple rapid calls result in one invocation', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced(); debounced(); debounced()
    await vi.advanceTimersByTimeAsync(300)
    expect(fn).toHaveBeenCalledOnce()
  })
})
```

---

---

# 3 — Worker Pools and Parallel Execution

---

## T — TL;DR

Vitest runs test files in parallel across worker threads or child processes. The `pool` setting controls the execution model: `'threads'` (fast, shared memory), `'forks'` (isolated processes, slower), or `'vmThreads'` (threads with VM module isolation). Tune `maxWorkers` to match your CPU count. Use `singleThread` or `singleFork` for tests that require serial execution.

---

## K — Key Concepts

```typescript
// vitest.config.ts — pool configuration
export default defineConfig({
  test: {
    // ── Pool type ─────────────────────────────────────────────────────────
    pool: 'threads',     // default — worker_threads, fastest
    // pool: 'forks'    // child_process — isolated, slower, better for native addons
    // pool: 'vmThreads' // worker_threads + VM module isolation

    // ── Pool sizing ───────────────────────────────────────────────────────
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,        // default: CPU count
        useAtomics:  true,    // faster thread synchronization (default true)
        isolate:     true,    // fresh module registry per file (default true)
        singleThread: false,  // true = run all files in one thread (serial)
      },
      forks: {
        minForks:   1,
        maxForks:   4,
        singleFork: false,
      }
    },

    // ── File isolation ────────────────────────────────────────────────────
    isolate: true,   // each test file gets a fresh module registry (default true)
    // false = files share module singletons — faster but risks state leakage
  }
})
```

```typescript
// ── Understanding parallelism ─────────────────────────────────────────────
// Vitest parallelises at the FILE level, not the test level
// Within one file: tests run serially (in order)
// Across files:    files run in parallel (different workers)

// Example: 20 test files, 4 workers
// Worker 1: file1.test.ts, file5.test.ts, file9.test.ts, file13.test.ts, file17.test.ts
// Worker 2: file2.test.ts, file6.test.ts, file10.test.ts, file14.test.ts, file18.test.ts
// Worker 3: file3.test.ts, file7.test.ts, file11.test.ts, file15.test.ts, file19.test.ts
// Worker 4: file4.test.ts, file8.test.ts, file12.test.ts, file16.test.ts, file20.test.ts
// Total time ≈ slowest worker's total, not sum of all files
```

```typescript
// ── Concurrent tests within a file ────────────────────────────────────────
import { describe, it, expect } from 'vitest'

// By default, tests within a file run serially
// Use .concurrent to run them in parallel within the file
describe.concurrent('parallel within file', () => {
  it('test A', async () => {
    await sleep(100)
    expect(1).toBe(1)
  })
  it('test B', async () => {
    await sleep(100)
    expect(2).toBe(2)
  })
  // Runs in ~100ms instead of ~200ms ✅
})

// ⚠️ Only use .concurrent when tests have NO shared mutable state
// Concurrent tests sharing vi.fn() mocks or module singletons will race ❌
```

```typescript
// ── Serial execution when needed ──────────────────────────────────────────
// Use .sequential (or describe without .concurrent) to force serial order
describe.sequential('must run in order', () => {
  it('step 1: create', () => { /* ... */ })
  it('step 2: update', () => { /* ... */ })  // depends on step 1
  it('step 3: delete', () => { /* ... */ })
})

// Or run entire suite in one thread (for integration tests with shared DB):
// vitest.config.ts:
export default defineConfig({
  test: {
    poolOptions: {
      threads: { singleThread: true }  // all files serial — no parallelism
    }
  }
})
```

```typescript
// ── Choosing the right pool ────────────────────────────────────────────────
// threads (default):
//   ✅ Fastest — shared memory, low overhead
//   ❌ Shared process globals — vi.stubGlobal leaks if isolate:false
//   ✅ Use for: most test suites

// forks:
//   ✅ True process isolation — native addons, process.env mutations
//   ❌ 2–4× slower than threads (process spawn overhead)
//   ✅ Use for: tests that modify process.env, native modules, CLI tools

// vmThreads:
//   ✅ Module isolation via VM context — prevents module singleton leakage
//   ❌ Slower than threads
//   ✅ Use for: tests with complex module mock interactions
```

---

## W — Why It Matters

- Default `maxThreads` equals CPU count — on a 2-core CI machine running 8 test files, only 2 files run simultaneously. On a developer's 10-core machine the same suite runs 5× faster. Knowing `maxThreads` explains why "it's fast on my machine but slow in CI".
- `pool: 'forks'` is required when tests mutate `process.env` — in threads mode, `process.env` is shared across workers in the same process, so `process.env.NODE_ENV = 'test'` in one test file can bleed into another. Forks get separate process environments.
- `isolate: false` is a surgical optimisation for suites where module startup is expensive — use it only when you've profiled and confirmed module initialisation is the bottleneck, and only with tests you've verified have no shared state.

---

## I — Interview Q&A

### Q: What is the difference between `pool: 'threads'` and `pool: 'forks'` in Vitest?

**A:** `threads` uses Node.js `worker_threads` — lightweight threads that share the same process memory. Tests start fast (no process fork overhead), module imports can be cached and shared, and communication is efficient. The limitation: process-level globals like `process.env` are shared. `forks` uses `child_process.fork` — each worker is a fully separate Node.js process with its own memory space, its own `process.env`, and its own module registry. This provides true isolation but costs 2–4× more in startup overhead. Use `threads` (the default) for most test suites. Switch to `forks` when tests mutate `process.env`, use native addons that aren't thread-safe, or test CLI scripts that call `process.exit()`.

---

## C — Common Pitfalls + Fix

### ❌ Using `describe.concurrent` with shared mutable mocks — race conditions

```typescript
// ❌ Both concurrent tests mutate the same mock — data races
const mockFn = vi.fn()

describe.concurrent('race condition', () => {
  it('test A', async () => {
    mockFn.mockReturnValue('A')      // ← may be overwritten by test B
    await sleep(10)
    expect(mockFn()).toBe('A')       // ← flaky ❌
  })
  it('test B', async () => {
    mockFn.mockReturnValue('B')      // ← overwrites test A's mock
    await sleep(10)
    expect(mockFn()).toBe('B')
  })
})
```

**Fix:** Create independent mocks per test or don't use `.concurrent`:

```typescript
// ✅ Each test creates its own mock
describe.concurrent('safe concurrent', () => {
  it('test A', async () => {
    const fn = vi.fn().mockReturnValue('A')   // local, not shared
    expect(fn()).toBe('A')
  })
  it('test B', async () => {
    const fn = vi.fn().mockReturnValue('B')   // local, not shared
    expect(fn()).toBe('B')
  })
})
```

---

## K — Coding Challenge + Solution

### Challenge

Configure Vitest for a monorepo with two packages: `packages/api` (integration tests hitting a test DB — must run serially) and `packages/utils` (pure unit tests — maximise parallelism). Use a workspace config. Set `forks` for api, `threads` with `maxThreads: 8` for utils.

### Solution

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name:    'utils',
      include: ['packages/utils/**/*.test.ts'],
      pool:    'threads',
      poolOptions: {
        threads: {
          maxThreads: 8,
          isolate:    true,
        }
      },
      environment: 'node',
    }
  },
  {
    test: {
      name:    'api',
      include: ['packages/api/**/*.test.ts'],
      pool:    'forks',
      poolOptions: {
        forks: {
          singleFork: true,    // serial — one DB connection, no conflicts
        }
      },
      environment: 'node',
      // Integration tests need env vars
      env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
    }
  }
])
```

---

---

# 4 — Sharding — Splitting Tests Across CI Nodes

---

## T — TL;DR

Sharding splits your test suite across multiple parallel CI machines. Each CI node runs a fraction of test files: shard 1 of 3 runs files 1–33%, shard 2 runs 34–66%, shard 3 runs 67–100%. Combined, they finish in 1/N the time of a single machine. Vitest has built-in sharding via `--shard=1/3`.

---

## K — Key Concepts

```bash
# ── Vitest sharding CLI ───────────────────────────────────────────────────
# Run shard 1 of 3 (first third of test files)
npx vitest run --shard=1/3

# Run shard 2 of 3 (second third)
npx vitest run --shard=2/3

# Run shard 3 of 3 (final third)
npx vitest run --shard=3/3

# Vitest distributes files evenly — same files go to same shard every run
# (deterministic: file list is sorted alphabetically before splitting)
```

```yaml
# .github/workflows/test.yml — parallel matrix sharding
name: Test

on: [push, pull_request]

jobs:
  test:
    name: Test (shard ${{ matrix.shard }}/3)
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]   # 3 parallel runners

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run tests (shard ${{ matrix.shard }}/3)
        run: npx vitest run --shard=${{ matrix.shard }}/3

      # Optional: upload coverage from each shard
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-shard-${{ matrix.shard }}
          path: coverage/
```

```yaml
# ── Merging coverage from all shards ─────────────────────────────────────
# After all shards complete, merge lcov files
  merge-coverage:
    name: Merge Coverage
    needs: test          # wait for all shards
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: coverage-shard-*
          merge-multiple: true
          path: ./coverage-shards

      - name: Install lcov
        run: sudo apt-get install -y lcov

      - name: Merge lcov files
        run: |
          lcov \
            --add-tracefile coverage-shards/lcov.info \
            --output-file coverage/lcov-merged.info

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov-merged.info
```

```typescript
// ── Shard count guidelines ─────────────────────────────────────────────────
// Test suite size  │ Recommended shards │ Target time per shard
// ─────────────────┼────────────────────┼──────────────────────
// < 1 min          │ 1 (no sharding)    │ < 1 min
// 1–5 min          │ 2–3 shards         │ ~1–2 min
// 5–15 min         │ 4–6 shards         │ ~2–3 min
// 15–60 min        │ 6–10 shards        │ ~5–6 min
// > 60 min         │ 10+ shards         │ ~6 min target

// Rule: target ~2–3 min per shard — fast enough for PR feedback,
//       not so many shards that orchestration overhead dominates
```

```typescript
// ── Uneven shard distribution — slow file problem ─────────────────────────
// Vitest splits by file count, not execution time
// If one file takes 2 minutes and others take 1 second,
// one shard finishes in 2 min while others finish in 10 seconds

// Fix 1: split large test files into smaller ones
// Fix 2: move heavy integration tests to a separate suite

// ── Custom shard reporter for timing analysis ─────────────────────────────
// npx vitest run --shard=1/3 --reporter=json --outputFile=shard-1-results.json
// Analyse which shard took longest, rebalance file distribution
```

---

## W — Why It Matters

- Sharding is the highest-leverage CI optimisation for large suites — going from 1 runner to 4 runners cuts wall-clock time by ~4× with no code changes. A 16-minute suite becomes 4 minutes with 4 shards.
- Shard distribution is deterministic — the same files always go to the same shard because Vitest sorts files alphabetically before splitting. This means coverage reports are consistent and reproducible across runs.
- The "merge coverage" step is often skipped — teams add sharding and then discover their Codecov reports only show 1/N of their actual coverage. Always add a post-shard merge job.

---

## I — Interview Q&A

### Q: How does Vitest sharding work and what are its limitations?

**A:** Vitest sharding splits the list of test files into N equal groups (by file count, alphabetically sorted) and runs only one group per process. `--shard=2/3` means "run the second third of all test files". The main limitation: distribution is by file count, not execution time. If you have one 5-minute integration test file and 99 one-second unit test files split across 3 shards, the shard containing the integration file takes 5+ minutes while the others finish in 33 seconds. The practical fix is to split large test files, isolate slow integration tests into a separate suite, or use an external test orchestrator (like Nx Cloud or Turborepo) that distributes by historical execution time. Coverage must be merged after all shards complete since each shard only covers its fraction of tests.

---

## C — Common Pitfalls + Fix

### ❌ Different shard counts for coverage vs regular runs — files split differently

```bash
# ❌ Regular run uses 3 shards, coverage run uses 2 — different file distribution
npx vitest run --shard=1/3         # development
CI=true npx vitest run --shard=1/2 --coverage  # CI coverage — different split!
# Coverage is incomplete because files moved between shards ❌
```

**Fix:** Keep shard count consistent between all run types:

```bash
# ✅ Always 3 shards — same file distribution
npx vitest run --shard=$SHARD/3 --coverage
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete GitHub Actions workflow for a project with 200 test files. Use 4 shards, collect coverage from each, merge them, and upload to Codecov. Include: cache for `node_modules`, fail-fast disabled (all shards run even if one fails), and a final merge job that depends on all 4 shards.

### Solution

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Test shard ${{ matrix.shard }}/4
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false    # all shards run even if one fails
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run shard ${{ matrix.shard }}/4
        run: npx vitest run --shard=${{ matrix.shard }}/4 --coverage
        env:
          CI: 'true'

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-shard-${{ matrix.shard }}
          path: coverage/lcov.info
          retention-days: 1

  coverage:
    name: Merge and Upload Coverage
    runs-on: ubuntu-latest
    needs: test      # waits for ALL 4 shards
    if: always()     # run even if some shards failed

    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: coverage-shard-*
          path: ./coverage-parts

      - name: Install lcov
        run: sudo apt-get install -y lcov

      - name: Merge coverage reports
        run: |
          find ./coverage-parts -name 'lcov.info' \
            -exec echo "--add-tracefile {}" \; | \
            xargs lcov --output-file ./coverage/lcov-merged.info

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov-merged.info
          fail_ci_if_error: false
```

---

---

# 5 — Changed-Test Workflows — Running Only What Matters

---

## T — TL;DR

Running the full test suite on every file change wastes time. Vitest's `--changed` flag runs only tests affected by uncommitted Git changes. The `related` filter runs tests for specific files. In CI on PRs, combine `--changed=origin/main` with full suite on merge to `main` — fast feedback on PRs, full confidence on main.

---

## K — Key Concepts

```bash
# ── Vitest --changed flag ─────────────────────────────────────────────────

# Run tests related to uncommitted changes (vs HEAD)
npx vitest run --changed

# Run tests related to changes since a specific commit/branch
npx vitest run --changed=HEAD~1          # since last commit
npx vitest run --changed=origin/main     # since branching from main
npx vitest run --changed=abc1234         # since specific commit SHA

# How it works:
# 1. Git diff identifies changed source files
# 2. Vitest resolves which test files import (directly or transitively) those files
# 3. Only those test files run
```

```bash
# ── --related flag — explicit file list ───────────────────────────────────
# Run tests for a specific source file
npx vitest related src/utils/slug.ts

# Multiple files
npx vitest related src/utils/slug.ts src/services/auth.ts

# Useful in git hooks (pre-commit):
# Run tests only for staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$' | tr '\n' ' ')
if [ -n "$STAGED" ]; then
  npx vitest related $STAGED --run
fi
```

```typescript
// ── Dependency graph — how Vitest traces affected tests ────────────────────
// Changed file:     src/utils/format.ts
// Imports it:       src/services/invoice.ts
//                   src/components/price-display.ts
// Test files for:   src/utils/format.test.ts
//                   src/services/invoice.test.ts
//                   src/components/price-display.test.ts
// → Vitest runs all three even though only format.ts changed ✅

// Limitation: dynamic imports and require() may not be traced
// Limitation: external file reads (fs.readFileSync) not traced
// Safe fallback: always run full suite on merge to main
```

```yaml
# .github/workflows/pr.yml — fast PR checks with --changed
name: PR Tests

on: pull_request

jobs:
  test-changed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0    # ← required: full history for git diff

      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }

      - run: npm ci

      - name: Run changed tests
        run: npx vitest run --changed=origin/main
        # Runs only tests affected by this PR's changes
        # Typically 5–20% of the full suite on small PRs
```

```yaml
# .github/workflows/main.yml — full suite on merge
name: Main Branch Tests

on:
  push:
    branches: [main]

jobs:
  test-full:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx vitest run --coverage
        env: { CI: 'true' }
      # Full suite + coverage on every merge to main
```

```bash
# ── Watch mode is automatic changed-detection in development ──────────────
npx vitest
# Vitest watch mode automatically re-runs affected tests on every file save
# This is the local equivalent of --changed: instant feedback loop
# No configuration needed — this is Vitest's default when not using --run
```

---

## W — Why It Matters

- `--changed=origin/main` on PRs turns a 10-minute suite into a 30-second check for a small PR that touches 2 files — developers get feedback before they've switched mental context.
- `fetch-depth: 0` in the checkout action is required — without it, GitHub Actions does a shallow clone with no history, and `git diff origin/main` has nothing to compare against. This is the most common reason `--changed` runs the full suite unexpectedly.
- The two-tier strategy (fast `--changed` on PRs, full suite on `main`) gives the best tradeoff: developers iterate quickly, and the `main` branch is always verified against the complete test suite before any code is considered deployed.

---

## I — Interview Q&A

### Q: How does `vitest --changed` determine which tests to run?

**A:** Vitest asks Git for the list of files changed since the specified ref (`HEAD`, `origin/main`, or a commit SHA). It then builds a module dependency graph by statically analysing ES module `import` statements in all test files. Any test file that directly or transitively imports one of the changed source files is included in the run. For example, if `utils/format.ts` changed and `services/invoice.ts` imports it and `invoice.test.ts` imports `invoice.ts`, all three are traced and `invoice.test.ts` runs. Limitations: dynamic imports (`import(path)`), CommonJS `require()`, and file system reads (`fs.readFile`) are not traced by the static analyser. For these cases, affected tests may be missed — which is why the full suite runs on the main branch, not just on PRs.

---

## C — Common Pitfalls + Fix

### ❌ Shallow clone — `--changed` runs all tests instead of the affected subset

```yaml
# ❌ Default checkout is shallow — git diff has no base to compare against
- uses: actions/checkout@v4
# No fetch-depth → shallow clone → --changed falls back to running everything
```

**Fix:** Set `fetch-depth: 0` for full history:

```yaml
# ✅
- uses: actions/checkout@v4
  with:
    fetch-depth: 0   # full git history — required for --changed
```

---

## K — Coding Challenge + Solution

### Challenge

Create two workflow files: (1) `pr.yml` — runs `--changed=origin/main`, requires `fetch-depth: 0`, runs on all PRs, no coverage; (2) `ci.yml` — runs full suite with 3 shards and coverage, triggers on push to `main` and `develop`. Show the `package.json` scripts used by each.

### Solution

```yaml
# .github/workflows/pr.yml
name: PR — Changed Tests
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  test-changed:
    name: Run changed tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run tests for changed files
        run: npm run test:changed
```

```yaml
# .github/workflows/ci.yml
name: CI — Full Suite
on:
  push:
    branches: [main, develop]

jobs:
  test:
    name: Test shard ${{ matrix.shard }}/3
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run test:ci -- --shard=${{ matrix.shard }}/3
        env: { CI: 'true' }
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/lcov.info
```

```json
// package.json
{
  "scripts": {
    "test":         "vitest",
    "test:run":     "vitest run",
    "test:changed": "vitest run --changed=origin/main",
    "test:ci":      "vitest run --coverage",
    "test:related": "vitest related"
  }
}
```

---

---

# 6 — Module Cache and Reducing Setup Overhead

---

## T — TL;DR

Every test file in Vitest reimports its modules fresh (when `isolate: true`). For expensive modules (DB clients, compiled WASM, config parsers), this setup cost multiplies across files. Use `globalSetup` for once-per-process setup (start test DB), `setupFiles` for once-per-worker setup (configure matchers), and `beforeAll` only for per-suite setup. Share expensive resources through globals.

---

## K — Key Concepts

```typescript
// vitest.config.ts — setup hierarchy
export default defineConfig({
  test: {
    // ── 1. globalSetup — runs ONCE per test process (before any workers start)
    globalSetup: './src/test/global-setup.ts',
    // Use for: start test database, launch test server, generate fixtures

    // ── 2. setupFiles — runs ONCE per WORKER before each test file
    setupFiles: ['./src/test/setup.ts'],
    // Use for: configure testing-library, add custom matchers, mock globals

    // ── 3. beforeAll / beforeEach — runs per suite/test (inside test files)
    // Use for: per-test state, per-suite DB transactions
  }
})
```

```typescript
// src/test/global-setup.ts — runs once before all tests
import type { GlobalSetupContext } from 'vitest/node'

export async function setup(ctx: GlobalSetupContext) {
  // Runs once — before any worker starts
  console.log('Starting test database...')

  // Store shared state for workers to access
  process.env.TEST_DB_PORT = '5433'

  // Return teardown function — called once after all tests finish
  return async function teardown() {
    console.log('Stopping test database...')
  }
}
```

```typescript
// src/test/setup.ts — runs in each worker before each test file
import { expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'  // add custom matchers

// Mock globals once per worker
vi.stubGlobal('ResizeObserver', class {
  observe()    {}
  unobserve()  {}
  disconnect() {}
})

// Configure fetch mock baseline
vi.stubGlobal('fetch', vi.fn())

// Reset mocks between files — happens after each file via clearMocks config
```

```typescript
// ── Sharing expensive resources across tests in a file ────────────────────
// ❌ Creating a heavy resource in beforeEach — recreated for every test
describe('database service', () => {
  let db: Database

  beforeEach(async () => {
    db = await createDatabase()   // ❌ expensive — repeated 100 times
  })
})

// ✅ Create once in beforeAll, isolate state with transactions
describe('database service', () => {
  let db: Database

  beforeAll(async () => {
    db = await createDatabase()   // ✅ once per suite
  })

  afterAll(async () => {
    await db.close()
  })

  beforeEach(async () => {
    await db.beginTransaction()   // cheap — per-test isolation
  })

  afterEach(async () => {
    await db.rollback()           // cheap — undo per-test changes
  })
})
```

```typescript
// ── Module cache tuning — isolate:false for shared singletons ─────────────
// Default: isolate: true → fresh module registry per file
// Each file gets its own copy of every imported module
// Cost: N test files × module init time

// For pure utility modules with no side effects:
export default defineConfig({
  test: {
    isolate: false,   // share module registry across files in same worker
    // ⚠️ Danger: module-level singletons shared across files
    // Only safe when modules have no mutable state at module level
  }
})

// Safer alternative: isolate specific files with config patterns
// Use isolate: true (default) and fix actual slow setup instead
```

```typescript
// ── Measuring setup cost ───────────────────────────────────────────────────
// globalSetup timing:
export async function setup() {
  const start = performance.now()
  await heavySetup()
  console.log(`globalSetup: ${(performance.now() - start).toFixed(0)}ms`)
}

// setupFiles timing:
const start = performance.now()
// ... setup code ...
console.log(`setupFiles: ${(performance.now() - start).toFixed(0)}ms`)
// This runs per worker — multiply by worker count for total overhead
```

---

## W — Why It Matters

- `globalSetup` vs `setupFiles` is a cost multiplier — `globalSetup` runs once, `setupFiles` runs once per worker thread (e.g. 8 times on an 8-core machine). If your `setupFiles` takes 500ms, it adds 4 seconds of overhead before the first test runs. Expensive setup belongs in `globalSetup`.
- The transaction pattern for DB tests (`beforeEach: beginTransaction`, `afterEach: rollback`) is the gold standard for test isolation — it's 10–100× faster than re-seeding the database per test, provides perfect isolation, and leaves the database clean without any cleanup code.
- `isolate: false` is a footgun — module-level variables (counters, caches, singletons) become shared across all test files in the same worker. One test modifying a module-level singleton corrupts every test that runs after it in the same worker. Use it only for stateless utility-only modules.

---

## I — Interview Q&A

### Q: What is the difference between `globalSetup`, `setupFiles`, and `beforeAll` in Vitest?

**A:** They run at different scopes. `globalSetup` runs exactly once in the Vitest main process before any workers start — use it for process-wide setup like starting a test database server or generating shared fixtures. It has no access to test APIs (`expect`, `vi`). `setupFiles` runs in each worker process/thread once before every test file — use it for configuring test utilities, adding custom matchers, and stubbing browser globals that every test needs. It runs in the same environment as tests and has access to `vi`. `beforeAll` runs inside a test file before the describe block's tests — use it for suite-specific setup like creating test data. The hierarchy by cost: `globalSetup` (run once total) → `setupFiles` (run once per worker) → `beforeAll` (run once per file or describe) → `beforeEach` (run before every single test).

---

## C — Common Pitfalls + Fix

### ❌ Expensive work in `setupFiles` — runs N times (once per worker)

```typescript
// src/test/setup.ts — setupFiles
// ❌ Compiles 50MB WASM module — takes 2 seconds — runs once per worker
const wasm = await WebAssembly.instantiateStreaming(fetch('/heavy.wasm'))
```

**Fix:** Move once-per-process work to `globalSetup`:

```typescript
// src/test/global-setup.ts
export async function setup() {
  // ✅ Runs ONCE — compile and cache result in process.env or a shared file
  const compiled = await compileWasm()
  process.env.WASM_READY = 'true'
  // Workers can check process.env.WASM_READY
}
```

---

## K — Coding Challenge + Solution

### Challenge

Configure a Vitest project with: (1) `globalSetup` that "starts a test server" (log + set env var) and returns a teardown; (2) `setupFiles` that stubs `window.matchMedia` and adds a mock `fetch`; (3) a test suite using `beforeAll`/`afterAll` for a DB connection and `beforeEach`/`afterEach` for transactions; (4) `clearMocks: true` in config to reset mocks between files.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globalSetup:  './src/test/global-setup.ts',
    setupFiles:   ['./src/test/setup.ts'],
    clearMocks:   true,     // reset mock state between test files
    restoreMocks: true,     // restore vi.spyOn between test files
    environment:  'jsdom',
  }
})

// src/test/global-setup.ts
export async function setup() {
  console.log('[global-setup] Starting test server...')
  process.env.TEST_API_URL = 'http://localhost:9999'
  return async () => {
    console.log('[global-setup] Stopping test server...')
  }
}

// src/test/setup.ts
import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches:             false,
    media:               query,
    onchange:            null,
    addListener:         vi.fn(),
    removeListener:      vi.fn(),
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent:       vi.fn(),
  })),
})

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok:   true,
  json: async () => ({}),
}))

// src/services/user.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

describe('user service with DB', () => {
  let db: { connect: () => Promise<void>; begin: () => Promise<void>; rollback: () => Promise<void>; close: () => Promise<void> }

  beforeAll(async () => {
    db = createTestDb()
    await db.connect()
  })
  afterAll(async  () => await db.close())
  beforeEach(async () => await db.begin())
  afterEach(async  () => await db.rollback())

  it('creates a user', async () => {
    expect(process.env.TEST_API_URL).toBe('http://localhost:9999')
    expect(fetch).toBeDefined()   // stubbed in setupFiles ✅
  })
})

function createTestDb() {
  return {
    connect:  async () => console.log('DB connected'),
    begin:    async () => console.log('TX begin'),
    rollback: async () => console.log('TX rollback'),
    close:    async () => console.log('DB closed'),
  }
}
```

---

---

# 7 — Deterministic CI Runs

---

## T — TL;DR

Deterministic CI means the same code always produces the same test result — no "passes on retry", no "fails only on Tuesdays". Achieve it by: fixing Node.js versions, pinning dependencies, seeding random data, mocking dates and timers, removing test order dependencies, and using `--sequence.seed` for reproducible ordering.

---

## K — Key Concepts

```typescript
// vitest.config.ts — determinism settings
export default defineConfig({
  test: {
    // ── Fixed test ordering ────────────────────────────────────────────────
    sequence: {
      shuffle:    false,    // don't randomise file order (default: false)
      seed:       12345,    // fixed seed when shuffle:true — reproducible "random"
      concurrent: false,    // don't randomise concurrent test order
    },

    // ── Mock reset between files ───────────────────────────────────────────
    clearMocks:   true,     // clear mock.calls, mock.results between files
    resetMocks:   true,     // reset mock implementation between files
    restoreMocks: true,     // restore vi.spyOn originals between files

    // ── Retry — LAST resort for genuinely flaky external dependencies ──────
    retry: 0,               // 0 = no retry (default) — use this
    // retry: 2,            // retry failing tests up to 2 times — masks problems
  }
})
```

```typescript
// ── Mocking dates for deterministic time-dependent tests ─────────────────
import { vi, it, expect, afterEach } from 'vitest'

afterEach(() => vi.useRealTimers())

it('generates a timestamp-based ID', () => {
  const FIXED_DATE = new Date('2025-06-15T12:00:00Z')
  vi.setSystemTime(FIXED_DATE)

  const id = generateId()  // uses Date.now() internally

  expect(id).toBe('20250615-120000')  // deterministic ✅
})

// ── Seeding random data ───────────────────────────────────────────────────
// ❌ Random data causes non-deterministic failures
function generateTestUser() {
  return { email: `user-${Math.random()}@test.com` }  // different every run
}

// ✅ Deterministic test data
function generateTestUser(seed: number = 1) {
  return { email: `user-${seed}@test.com` }  // same every run
}

// Or use a seeded random library (e.g. @faker-js/faker with seed):
import { faker } from '@faker-js/faker'
faker.seed(42)  // same data every run ✅
const email = faker.internet.email()
```

```typescript
// ── Avoiding test order dependencies ──────────────────────────────────────
// ❌ Test B depends on state created by Test A
describe('❌ order-dependent tests', () => {
  it('A: creates a user', async () => {
    createdUserId = await createUser()  // stores in outer scope
  })
  it('B: updates the user', async () => {
    await updateUser(createdUserId)     // depends on A having run first
  })
})

// ✅ Each test is self-contained
describe('✅ independent tests', () => {
  it('creates a user', async () => {
    const id = await createUser()
    expect(id).toBeDefined()
  })
  it('updates a user', async () => {
    const id = await createUser()       // creates its own user
    await updateUser(id)
    expect(/* ... */).toBe(/* ... */)
  })
})
```

```yaml
# .github/workflows/ci.yml — pinned Node.js version
- uses: actions/setup-node@v4
  with:
    node-version: '22.4.0'    # ✅ exact version — not '22' or 'lts/*'
    cache: 'npm'

# package.json — engines field enforces version range
# "engines": { "node": ">=22.0.0 <23.0.0" }
```

```typescript
// ── Shuffle-and-seed for finding hidden order dependencies ────────────────
// Run with shuffle:true to actively find order-dependent tests
// vitest.config.ts for debugging:
sequence: {
  shuffle: true,
  seed: Date.now(),  // different order every run — surfaces hidden dependencies
}

// CLI:
// npx vitest run --sequence.shuffle --sequence.seed=99999
// If tests fail in shuffled order but pass normally → order dependency found
```

---

## W — Why It Matters

- Date/time-dependent tests are the most common source of CI flakiness — a test that checks `createdAt > new Date('2025-01-01')` passes all year then fails on Dec 31st because `now()` drifted past a boundary. `vi.setSystemTime()` eliminates this class of flakiness entirely.
- `clearMocks: true` in config prevents one of the most subtle bugs in test suites — a mock set up in file A (which runs first in worker 1) bleeds into file B when they share the same module registry. With `clearMocks`, each file starts with a clean mock state.
- Running with `--sequence.shuffle` periodically is a health check for your test suite — order-independent tests should pass in any order. If shuffling breaks tests, you've found hidden coupling that will cause real CI failures as the file system ordering changes.

---

## I — Interview Q&A

### Q: What causes non-deterministic test failures in CI and how do you prevent each?

**A:** Five main causes: (1) Date/time dependence — tests that compare against `Date.now()` or `new Date()` fail when time changes. Fix: `vi.setSystemTime(fixedDate)`. (2) Random data — `Math.random()` produces different values each run. Fix: use seeded random (faker.seed(42)) or hardcode test data. (3) Test order dependence — test B assumes state created by test A. Fix: make each test self-contained with its own setup. (4) Uncleared mocks — a mock from one test file bleeds into the next. Fix: `clearMocks: true` and `restoreMocks: true` in config. (5) Race conditions in async tests — timing-dependent assertions that pass when the machine is fast but fail under CI load. Fix: `vi.useFakeTimers()` and `await vi.runAllTimersAsync()` to control timing deterministically.

---

## C — Common Pitfalls + Fix

### ❌ Testing against `Date.now()` directly — time-dependent failure

```typescript
// ❌ This test will fail if run at midnight or near a date boundary
it('sets createdAt to today', () => {
  const user = createUser()
  const today = new Date().toISOString().split('T')[0]  // '2025-06-15'
  expect(user.createdAt.startsWith(today)).toBe(true)   // fails at 23:59:59 ❌
})
```

**Fix:** Fix the system time:

```typescript
// ✅
it('sets createdAt to the current time', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-06-15T10:00:00Z'))

  const user = createUser()
  expect(user.createdAt.toISOString()).toBe('2025-06-15T10:00:00.000Z')

  vi.useRealTimers()
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a deterministic test for a `createSession(userId)` function that: sets `createdAt` to `Date.now()`, sets `expiresAt` to 24 hours later, generates a `token` using `crypto.randomUUID()`. Use fake timers and mock `crypto.randomUUID`. Verify both timestamps and the token. Ensure `afterEach` cleanup.

### Solution

```typescript
// src/auth/session.ts
export function createSession(userId: number) {
  return {
    userId,
    token:     crypto.randomUUID(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
}

// src/auth/session.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSession }                        from './session'

describe('createSession', () => {
  const FIXED_NOW   = new Date('2025-06-15T08:00:00.000Z')
  const FIXED_UUID  = 'abc-123-def-456'
  const EXPIRES_AT  = new Date('2025-06-16T08:00:00.000Z')

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates a session with correct timestamps and token', () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(FIXED_UUID as `${string}-${string}-${string}-${string}-${string}`)

    const session = createSession(42)

    expect(session.userId).toBe(42)
    expect(session.token).toBe(FIXED_UUID)
    expect(session.createdAt).toEqual(FIXED_NOW)
    expect(session.expiresAt).toEqual(EXPIRES_AT)    // exactly 24h later ✅
  })
})
```

---

---

# 8 — Flaky Test Prevention

---

## T — TL;DR

A flaky test passes and fails intermittently without code changes — the worst kind of test because it erodes trust in the suite. The main causes: async timing assumptions, shared global state, test order dependencies, and real external services. Fix each with fake timers, proper awaiting, isolated state, and mocks. The `--retry` flag masks flakiness — fix the root cause instead.

---

## K — Key Concepts

```typescript
// ── The 5 sources of flakiness ─────────────────────────────────────────────

// 1. TIMING — async operations that may resolve in different orders
// ❌ Race condition: promise may not have resolved
it('updates status', () => {
  updateStatus('active')         // async, not awaited
  expect(getStatus()).toBe('active')  // may still be 'pending' ❌
})
// ✅ Always await async operations
it('updates status', async () => {
  await updateStatus('active')
  expect(getStatus()).toBe('active')  // deterministic ✅
})
```

```typescript
// 2. SHARED STATE — module-level variables mutated across tests
// ❌ Cache persists between tests
let cache: Map<string, unknown> = new Map()
export function getCached(key: string) { return cache.get(key) }
export function setCache(key: string, val: unknown) { cache.set(key, val) }

it('test A', () => { setCache('x', 1); expect(getCached('x')).toBe(1) })
it('test B', () => { expect(getCached('x')).toBeUndefined() })  // ❌ A's cache persists

// ✅ Clear shared state in afterEach
afterEach(() => cache.clear())
// Or: refactor to avoid module-level mutable state
```

```typescript
// 3. UNCONTROLLED ASYNC — promises that settle after the test ends
it('❌ fire-and-forget creates dangling promise', () => {
  fireAndForget()  // starts async work, test ends before it settles
  // Vitest may report the settled promise's error in the NEXT test ❌
})

// ✅ Capture and await all promises
it('awaits all async work', async () => {
  await fireAndForget()  // test waits for completion
})

// ✅ Or use vi.waitFor for DOM/state changes
await vi.waitFor(() => expect(state.done).toBe(true))
```

```typescript
// 4. REAL EXTERNAL SERVICES — network calls that may timeout
// ❌ Real HTTP — flaky if service is slow or down
it('fetches user from API', async () => {
  const user = await fetch('https://api.example.com/users/1').then(r => r.json())
  expect(user.id).toBe(1)  // ❌ flaky — depends on external service
})

// ✅ Mock the HTTP call
it('fetches user from API', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ id: 1, name: 'Mark' })
  }))
  const user = await fetchUser(1)
  expect(user.id).toBe(1)  // ✅ deterministic
})
```

```typescript
// 5. PORT CONFLICTS — integration tests using hardcoded ports
// ❌ Port 3000 already in use → test fails
const server = createServer().listen(3000)  // ❌ hardcoded port

// ✅ Listen on port 0 — OS assigns a free port
const server = createServer().listen(0)
const port   = (server.address() as AddressInfo).port  // actual port
const url    = `http://localhost:${port}`
```

```typescript
// ── Detecting flakiness — run tests multiple times ────────────────────────
// CLI: repeat a test file 10 times looking for flakiness
for i in {1..10}; do npx vitest run src/flaky.test.ts; done

// Vitest config: repeats option (run each test N times)
export default defineConfig({
  test: {
    repeats: 3,  // run each test 3 times — fails if any run fails
    // Use to confirm a test is reliably passing before removing retry logic
  }
})

// ── retry — last resort (not a fix) ──────────────────────────────────────
// retry: 2 masks the root cause and hides infrastructure problems
// Only use for: tests that hit genuinely unreliable external services
// (third-party APIs you don't control)
export default defineConfig({
  test: {
    retry: 0,  // ✅ never retry — fix the root cause
  }
})
```

---

## W — Why It Matters

- Flaky tests destroy CI trust faster than any other quality problem — when developers start ignoring "flaky" red builds and re-running until green, real failures get missed. One flaky test in 100 degrades the entire suite's credibility.
- The `retry` config is the most dangerous Vitest option — it makes flaky tests "pass" by hiding them. A test that passes on retry 50% of the time is a test that will miss real bugs 50% of the time. Fix the flakiness; don't mask it.
- The `repeats` config is the correct tool for verifying a fixed flaky test — run it 20 times before declaring victory. If it passes all 20, you've fixed it. If it fails once, you haven't.

---

## I — Interview Q&A

### Q: What is a flaky test and what are the most effective strategies to prevent them?

**A:** A flaky test is one that produces different results (pass/fail) on repeated runs of the same code — not due to actual bugs but due to implementation issues in the test itself. The most effective prevention strategies: (1) always `await` async operations — unawaited promises create timing races where test assertions run before async work completes; (2) clear all shared mutable state in `afterEach` — module-level caches, singletons, and global stores must be reset; (3) use fake timers for any time-dependent logic — `vi.useFakeTimers()` makes time controllable and deterministic; (4) mock all external services — network calls are flaky by nature; (5) use random ports for test servers — `server.listen(0)` lets the OS pick a free port, avoiding conflicts. Never use `retry` as a solution — it masks the symptom and lets the underlying problem survive.

---

## C — Common Pitfalls + Fix

### ❌ Checking async state without waiting — assertion runs before update

```typescript
// ❌ Async update may not have completed when expect runs
it('shows notification', () => {
  triggerNotification('Saved!')          // async state update
  expect(notifications).toHaveLength(1) // may be 0 — update not done yet ❌
})
```

**Fix:** Use `vi.waitFor` to poll until the condition is met:

```typescript
// ✅
it('shows notification', async () => {
  triggerNotification('Saved!')
  await vi.waitFor(() => expect(notifications).toHaveLength(1))
  expect(notifications[0].message).toBe('Saved!')
})
```

---

## K — Coding Challenge + Solution

### Challenge

Fix three flaky tests: (1) a test that checks a value set by an unresolved promise; (2) a test polluted by a counter incremented in a previous test; (3) a test that uses `Date.now()` for uniqueness in assertions. Show the broken version and the fixed version for each.

### Solution

```typescript
// ── Fix 1: unresolved promise ─────────────────────────────────────────────
// ❌
it('sets result after async computation', () => {
  let result = ''
  Promise.resolve('computed').then(v => { result = v })
  expect(result).toBe('computed')   // ❌ empty — promise not resolved yet
})

// ✅
it('sets result after async computation', async () => {
  let result = ''
  await Promise.resolve('computed').then(v => { result = v })
  expect(result).toBe('computed')   // ✅ awaited
})

// ── Fix 2: shared counter state leaks ─────────────────────────────────────
// Module: src/counter.ts
let count = 0
export const increment = () => ++count
export const getCount  = () => count
export const reset     = () => { count = 0 }

// ❌ Polluted by previous test
it('starts at 0', () => {
  expect(getCount()).toBe(0)   // ❌ fails if another test called increment
})

// ✅ Reset state in afterEach
import { reset, increment, getCount } from './counter'
afterEach(() => reset())

it('starts at 0', () => {
  expect(getCount()).toBe(0)   // ✅ always clean
})

it('increments to 1', () => {
  increment()
  expect(getCount()).toBe(1)   // ✅ starts from 0
})

// ── Fix 3: Date.now() for "unique" values ─────────────────────────────────
// ❌ Two calls in the same millisecond produce the same value
it('generates unique IDs', () => {
  const id1 = Date.now()  // e.g. 1718432000000
  const id2 = Date.now()  // same millisecond → same value ❌
  expect(id1).not.toBe(id2)  // ❌ flaky
})

// ✅ Use crypto.randomUUID or a proper ID generator
it('generates unique IDs', () => {
  const id1 = crypto.randomUUID()   // guaranteed unique ✅
  const id2 = crypto.randomUUID()
  expect(id1).not.toBe(id2)         // ✅ always different
})
```

---

---

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