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
