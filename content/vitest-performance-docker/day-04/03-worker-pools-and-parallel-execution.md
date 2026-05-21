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
