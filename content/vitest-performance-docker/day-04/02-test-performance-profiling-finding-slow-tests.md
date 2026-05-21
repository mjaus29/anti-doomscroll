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
