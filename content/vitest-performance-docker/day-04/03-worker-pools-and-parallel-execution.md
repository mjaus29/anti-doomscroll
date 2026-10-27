# 3 — Worker Pools and Parallel Execution

---

## T — TL;DR

Vitest runs test files in parallel across worker threads or child processes. The `pool` setting controls the execution model: `'forks'` (child processes — the default since Vitest 2), `'threads'` (worker threads, shared process), `'vmThreads'` / `'vmForks'` (VM module isolation). Tune the top-level `maxWorkers` to match your CPU count (Vitest 4 removed `poolOptions`; `maxThreads`/`maxForks` became `maxWorkers`). Use `maxWorkers: 1` (or `fileParallelism: false`) for tests that require serial execution.

---

## K — Key Concepts

```typescript
// vitest.config.ts — pool configuration
export default defineConfig({
  test: {
    // ── Pool type ─────────────────────────────────────────────────────────
    pool: 'forks',       // default (since Vitest 2) — child_process, safest for native addons / process APIs
    // pool: 'threads'   // worker_threads — lighter, but native modules (Prisma, bcrypt, canvas) may segfault
    // pool: 'vmThreads' // worker_threads + VM module isolation (also 'vmForks')

    // ── Pool sizing (Vitest 4: top-level, `poolOptions` was removed) ──────
    maxWorkers: 4,        // default: available parallelism (half of it in watch mode); number or '50%'
    //   was poolOptions.threads.maxThreads / poolOptions.forks.maxForks
    //   minThreads / minForks / useAtomics are gone
    // fileParallelism: false   // run test files one at a time (same as maxWorkers: 1)

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

// Or run the entire suite one file at a time (for integration tests with a shared DB):
// vitest.config.ts:
export default defineConfig({
  test: {
    maxWorkers: 1,   // all files serial — no parallelism
    // Vitest 4 mapping of the old singleThread/singleFork is `maxWorkers: 1, isolate: false`;
    // keep `isolate: true` (default) if files must not share module state.
    // Before Vitest 4: poolOptions: { threads: { singleThread: true } }
  }
})
```

```typescript
// ── Choosing the right pool ────────────────────────────────────────────────
// forks (default):
//   ✅ True process isolation — native addons, process.env mutations, process.chdir()
//   ❌ Slower communication / process spawn overhead than threads
//   ✅ Use for: most suites, tests that modify process.env, native modules (Prisma, bcrypt), CLI tools

// threads:
//   ✅ Lighter — shared process memory, lower overhead
//   ❌ No process.chdir(); native-module libraries may segfault; shared process globals
//   ✅ Use for: pure JS/TS suites where you've measured a speed-up

// vmThreads:
//   ✅ Module isolation via VM context — prevents module singleton leakage
//   ❌ Slower than threads
//   ✅ Use for: tests with complex module mock interactions
```

---

## W — Why It Matters

- Default `maxWorkers` equals the machine's available parallelism — on a 2-core CI machine running 8 test files, only 2 files run simultaneously. On a developer's 10-core machine the same suite runs 5× faster. Knowing `maxWorkers` explains why "it's fast on my machine but slow in CI".
- `pool: 'forks'` (the default) is what you want when tests mutate `process.env` or use native modules — in threads mode, workers live in one process, so `process.env.NODE_ENV = 'test'` in one test file can bleed into another. Forks get separate process environments.
- `isolate: false` is a surgical optimisation for suites where module startup is expensive — use it only when you've profiled and confirmed module initialisation is the bottleneck, and only with tests you've verified have no shared state.

---

## I — Interview Q&A

### Q: What is the difference between `pool: 'threads'` and `pool: 'forks'` in Vitest?

**A:** `threads` uses Node.js `worker_threads` — lightweight threads inside the same process. Communication is efficient, but process-level APIs (`process.chdir()`) are unavailable and native-module libraries (Prisma, bcrypt, canvas) may segfault. `forks` uses `child_process` — each worker is a fully separate Node.js process with its own memory space and `process.env`. Communication is slower, but isolation is stronger. `forks` is the default (since Vitest 2); switch to `threads` only for pure JS/TS suites where you've measured a speed-up. In Vitest 4 the number of workers is the top-level `maxWorkers` option (the old `poolOptions.*` settings were removed).

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

Configure Vitest for a monorepo with two packages: `packages/api` (integration tests hitting a test DB — must run serially) and `packages/utils` (pure unit tests — maximise parallelism). Use `test.projects`. Set `forks` serial for api, `threads` with 8 workers for utils.

### Solution

```typescript
// vitest.config.ts  (Vitest 4: `test.projects` replaced vitest.workspace.ts; poolOptions was removed)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name:    'utils',
          include: ['packages/utils/**/*.test.ts'],
          pool:    'threads',
          maxWorkers: 8,
          isolate:    true,
          environment: 'node',
        }
      },
      {
        test: {
          name:    'api',
          include: ['packages/api/**/*.test.ts'],
          pool:    'forks',
          fileParallelism: false,    // serial — one DB connection, no conflicts
          environment: 'node',
          // Integration tests need env vars
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
        }
      }
    ]
  }
})
```

---

---
