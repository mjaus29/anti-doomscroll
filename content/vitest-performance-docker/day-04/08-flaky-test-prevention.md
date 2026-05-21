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
