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
