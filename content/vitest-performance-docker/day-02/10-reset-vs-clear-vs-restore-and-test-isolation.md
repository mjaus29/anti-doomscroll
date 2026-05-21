# 10 — Reset vs Clear vs Restore — and Test Isolation

---

## T — TL;DR

Three cleanup methods, three different depths: `clearAllMocks()` resets call history only. `resetAllMocks()` also removes return values. `restoreAllMocks()` undoes `vi.spyOn()` wrapping. Test isolation means each test starts with a blank slate — no state, no stubs, no call history from the previous test. The correct pattern: `clearAllMocks` in `beforeEach`, `restoreAllMocks` in `afterEach`.

---

## K — Key Concepts

```typescript
// ── What each method does ──────────────────────────────────────────────────

// ─ vi.clearAllMocks() ─────────────────────────────────────────────────────
// Clears:    mock.calls, mock.instances, mock.results, mock.invocationCallOrder
// Keeps:     mockReturnValue, mockImplementation (still in effect)
// Use:       beforeEach — reset tracking without losing setup

const mockFn = vi.fn().mockReturnValue(42)
mockFn()
// mock.calls.length === 1

vi.clearAllMocks()
// mock.calls.length === 0    ← cleared
// mockFn()  still returns 42 ← implementation kept


// ─ vi.resetAllMocks() ────────────────────────────────────────────────────
// Clears:    call tracking (same as clear)
// Also:      removes mockReturnValue, mockImplementation → returns undefined
// Use:       when each test should define its own implementation from scratch

const mockFn2 = vi.fn().mockReturnValue(99)
vi.resetAllMocks()
// mock.calls.length === 0
// mockFn2()  returns undefined ← implementation removed


// ─ vi.restoreAllMocks() ──────────────────────────────────────────────────
// Clears:    call tracking
// Resets:    implementations
// Restores:  vi.spyOn() methods to original implementations
// Use:       afterEach when vi.spyOn() was used anywhere

const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
vi.restoreAllMocks()
// console.error is the original function again ✅
// spy.mock.calls === [] (cleared)
```

```typescript
// ── The recommended pattern ────────────────────────────────────────────────
import { beforeEach, afterEach, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
  // Why: reset call counts before each test so tests don't see each other's calls
  // Keep implementations (set in describe-level setup or test-level mocks)
})

afterEach(() => {
  vi.restoreAllMocks()
  // Why: undo any vi.spyOn() wrapping applied during the test
  // Also: cleanup vi.stubGlobal / vi.stubEnv if not done inline
})
```

```typescript
// ── Test isolation — the four sources of state leakage ────────────────────

// 1. Module-level variables (reset in beforeEach)
let requestCount = 0  // ← leaks if tests increment it without reset

beforeEach(() => { requestCount = 0 })  // ✅

// 2. Mock call history (clear in beforeEach)
const mock = vi.fn()
beforeEach(() => { mock.mockClear() })  // ✅ or vi.clearAllMocks()

// 3. vi.spyOn wrapping (restore in afterEach)
afterEach(() => { vi.restoreAllMocks() })  // ✅

// 4. Global state (stub and unstub)
beforeEach(() => { vi.stubEnv('KEY', 'value') })
afterEach(() => { vi.unstubAllEnvs() })    // ✅
```

```typescript
// ── Demonstrating leakage without proper cleanup ───────────────────────────
const emailMock = vi.fn()

// ❌ NO clearAllMocks between tests
it('test 1 sends one email', () => {
  sendWelcomeEmail('a@a.com')   // calls emailMock once
  expect(emailMock).toHaveBeenCalledTimes(1)  // ✅ passes
})

it('test 2 sends one email', () => {
  sendWelcomeEmail('b@b.com')   // calls emailMock again
  expect(emailMock).toHaveBeenCalledTimes(1)  // ❌ FAILS — count is 2 (accumulated from test 1)
})

// ✅ WITH clearAllMocks in beforeEach:
beforeEach(() => { vi.clearAllMocks() })
// test 2 now sees count = 1 ✅
```

```typescript
// ── Per-mock clear vs global clear ────────────────────────────────────────
// Individual:
mockFn.mockClear()     // clear this mock's call history
mockFn.mockReset()     // clear + remove implementation
mockFn.mockRestore()   // clear + reset + restore (only works on spies)

// Global (affects ALL mocks created in this test context):
vi.clearAllMocks()     // = mockClear() on every vi.fn() / vi.spyOn()
vi.resetAllMocks()     // = mockReset() on every mock
vi.restoreAllMocks()   // = mockRestore() on every spy
```

```typescript
// ── Vitest config — auto-clear and auto-restore ───────────────────────────
// vitest.config.ts — set globally instead of writing beforeEach/afterEach
export default defineConfig({
  test: {
    clearMocks:    true,   // auto clearAllMocks before each test
    resetMocks:    false,  // auto resetAllMocks before each test
    restoreMocks:  true,   // auto restoreAllMocks after each test
  }
})

// With these settings, you don't need beforeEach/afterEach cleanup hooks
// for standard mock management. Only add explicit hooks for custom setup.
```

---

## W — Why It Matters

- Mock call history leaking between tests is the number one cause of intermittent test failures in larger suites — a test that passes alone fails when preceded by a test that called the same mock. `vi.clearAllMocks()` in `beforeEach` (or `clearMocks: true` in config) eliminates this entire class of failures.
- The config options `clearMocks: true` and `restoreMocks: true` are the right default for most projects — they apply globally without writing `beforeEach`/`afterEach` boilerplate in every test file. Set them in `vitest.config.ts` once.
- `resetAllMocks` removing implementations is a double-edged sword — if your test setup in `beforeAll` or `describe`-level `beforeEach` sets `mockReturnValue`, a subsequent `resetAllMocks` wipes it. This causes "returns undefined" bugs that are hard to trace. Prefer `clearAllMocks` (keeps implementations) over `resetAllMocks` unless you explicitly need a clean slate.

---

## I — Interview Q&A

### Q: What is the difference between `vi.clearAllMocks()`, `vi.resetAllMocks()`, and `vi.restoreAllMocks()`, and which should you use in `beforeEach` vs `afterEach`?

**A:** `clearAllMocks()` resets the recorded call history (`.mock.calls`, `.mock.results`) but preserves any configured return values or implementations. Use it in `beforeEach` so each test starts with a clean call count but retains the mock implementation configured in `describe`-level setup. `resetAllMocks()` does everything `clear` does, plus it removes all configured implementations — mocks return `undefined` again. Use it in `beforeEach` when every test must define its own implementation from scratch and you don't want any shared setup. `restoreAllMocks()` does everything `reset` does, plus it undoes `vi.spyOn()` wrapping and restores the original method. Use it in `afterEach` because its purpose is cleanup: removing spy wrappers after a test so the original method is available for the next test. The recommended combination: `clearAllMocks` in `beforeEach` (preserves shared setup, resets counts) and `restoreAllMocks` in `afterEach` (undoes spies). Or set both in `vitest.config.ts` to apply globally.

---

## C — Common Pitfalls + Fix

### ❌ Using `vi.resetAllMocks()` in `beforeEach` when mocks are set up in `describe`

```typescript
// ❌ resetAllMocks wipes the mockResolvedValue set in beforeEach!
describe('UserService', () => {
  const mockFindUser = vi.fn().mockResolvedValue({ id: 1, name: 'Alice' })

  beforeEach(() => {
    vi.resetAllMocks()  // ← WIPES mockResolvedValue ❌
    // After reset, mockFindUser() returns undefined, not { id: 1, ... }
  })

  it('finds user', async () => {
    const user = await getUser(1)  // internally calls mockFindUser
    expect(user.name).toBe('Alice')  // ❌ fails — mock returns undefined
  })
})
```

**Fix:** Use `clearAllMocks` in `beforeEach` — keeps implementation, resets counts:

```typescript
// ✅
beforeEach(() => {
  vi.clearAllMocks()   // call counts reset, mockResolvedValue preserved ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate all three isolation failures in a test suite, then fix each. Write three pairs of tests showing: (1) call count leakage — fix with `clearAllMocks`; (2) stale spy — fix with `restoreAllMocks`; (3) leaked env var — fix with `unstubAllEnvs`. Show the broken version commented out and the fixed version active.

### Solution

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── (1) Call count leakage — fixed with clearAllMocks ─────────────────────
describe('call count isolation', () => {
  const processItem = vi.fn()

  // ❌ WITHOUT this line, test 2 fails:
  // beforeEach(() => {})

  // ✅ Fix:
  beforeEach(() => { vi.clearAllMocks() })

  it('test A processes one item', () => {
    processItem('a')
    expect(processItem).toHaveBeenCalledTimes(1)  // ✅
  })

  it('test B processes one item', () => {
    processItem('b')
    expect(processItem).toHaveBeenCalledTimes(1)  // ✅ (would be 2 without clear)
  })
})

// ── (2) Stale spy — fixed with restoreAllMocks ────────────────────────────
const realUtils = {
  formatDate: (d: Date) => d.toISOString().slice(0, 10)
}

describe('spy isolation', () => {
  // ✅ Fix: restore spies after each test
  afterEach(() => { vi.restoreAllMocks() })

  it('test A overrides formatDate with a spy', () => {
    const spy = vi.spyOn(realUtils, 'formatDate').mockReturnValue('2025-01-01')
    expect(realUtils.formatDate(new Date())).toBe('2025-01-01')
    // Without afterEach restore, the spy persists ❌
  })

  it('test B uses the real formatDate', () => {
    const result = realUtils.formatDate(new Date('2025-06-15'))
    expect(result).toBe('2025-06-15')  // ✅ real implementation used
    // Would return '2025-01-01' if spy wasn't restored ❌
  })
})

// ── (3) Leaked env var — fixed with unstubAllEnvs ─────────────────────────
function getMode() { return process.env.APP_MODE ?? 'development' }

describe('env isolation', () => {
  // ✅ Fix: unstub after each test
  afterEach(() => { vi.unstubAllEnvs() })

  it('test A stubs APP_MODE to production', () => {
    vi.stubEnv('APP_MODE', 'production')
    expect(getMode()).toBe('production')
    // Without afterEach unstub, test B sees 'production' ❌
  })

  it('test B sees the original APP_MODE', () => {
    // No stub — should see default or undefined
    expect(getMode()).toBe('development')  // ✅ original restored
    // Would fail with 'production' without unstubAllEnvs ❌
  })
})
```

---

## ✅ Day 2 Complete — Unit Testing and Test Doubles

| # | Subtopic | Status |
|---|----------|--------|
| 1  | Pure Function Testing and Edge Cases | ☐ |
| 2  | Error Assertions — Sync and Async | ☐ |
| 3  | Async Tests and Promise Patterns | ☐ |
| 4  | Fake Timers — setTimeout, setInterval, Debounce | ☐ |
| 5  | System Time Control — vi.setSystemTime | ☐ |
| 6  | Mock Functions — vi.fn() | ☐ |
| 7  | Spies — vi.spyOn() | ☐ |
| 8  | Module Mocking — vi.mock() | ☐ |
| 9  | Global Mocking — vi.stubGlobal, vi.stubEnv | ☐ |
| 10 | Reset vs Clear vs Restore + Test Isolation | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
PURE FUNCTION TESTING
  No mocks needed — call and assert
  Edge cases: empty, zero, null, boundary, negative, unicode, overflow
  toBeCloseTo(n, p) for floating point
  it.each([...]) for multiple input/output pairs

ERROR ASSERTIONS
  Sync:  expect(() => fn()).toThrow(ErrorClass)
  Async: await expect(fn()).rejects.toThrow('message')
  ALWAYS wrap sync throws in arrow function
  ALWAYS await async rejections
  Prefer: .toThrow(ErrorClass) over .toThrow() alone
  For custom properties: try/catch → expect(e).toBeInstanceOf(MyError)

ASYNC TESTS
  async/await in test function: it('name', async () => { ... })
  await the act + assert directly: const r = await fn(); expect(r)...
  OR: await expect(fn()).resolves.toMatchObject(...)
  Floating promise = false positive: ALWAYS await
  beforeEach/afterEach can be async — always await setup too

FAKE TIMERS
  vi.useFakeTimers()                  ← replaces setTimeout/setInterval/Date
  vi.advanceTimersByTime(ms)          ← fast-forward virtual clock by ms
  vi.runAllTimers()                   ← fire all pending timers immediately
  vi.runAllTimersAsync()              ← for async timer callbacks
  vi.runOnlyPendingTimers()           ← prevent infinite recursive timer loops
  vi.useRealTimers()                  ← ALWAYS restore in afterEach

SYSTEM TIME
  vi.setSystemTime(new Date('...'))   ← freeze Date.now(), new Date()
  Use absolute ISO 8601 UTC strings in test dates
  Combine with vi.advanceTimersByTime() to move time forward
  Restore with vi.useRealTimers()

vi.fn()
  vi.fn()                             → blank mock
  .mockReturnValue(val)               → always returns val
  .mockReturnValueOnce(val)           → returns val first call only
  .mockResolvedValue(val)             → returns Promise.resolve(val)
  .mockRejectedValue(err)             → returns Promise.reject(err)
  .mockImplementation((a,b) => ...)   → custom logic
  mock.calls                          → [[arg1, arg2], [arg1, arg2]]
  expect(fn).toHaveBeenCalledWith(...)
  expect(fn).toHaveBeenCalledTimes(n)
  expect(fn).toHaveBeenCalledOnce()

vi.spyOn()
  vi.spyOn(object, 'method')          → wrap method, keep original
  .mockImplementation(() => {})       → silence or override
  .mockReturnValue(val)               → override return
  vi.restoreAllMocks()                → ALWAYS in afterEach — undoes spy wrapping
  Use for: existing objects, console, Math, module exports
  Use vi.fn() for: injected dependencies from scratch

vi.mock()
  vi.mock('./path', () => ({ ... }))  → hoisted, runs before imports
  vi.mock('./path')                   → auto-mock: all exports → vi.fn()
  vi.mocked(fn).mockResolvedValue(v)  → typed override after auto-mock
  vi.importActual() in factory        → keep real exports, override specific ones
  Top-level ONLY — never inside functions or beforeEach

vi.stubGlobal / vi.stubEnv
  vi.stubGlobal('fetch', vi.fn())     → replace global
  vi.stubEnv('KEY', 'value')          → safe process.env override
  vi.unstubAllGlobals()               → restore in afterEach
  vi.unstubAllEnvs()                  → restore in afterEach
  NEVER directly assign process.env.KEY = '...' (no auto-restore)

RESET VS CLEAR VS RESTORE
  clearAllMocks()   → resets calls; KEEPS implementation  → beforeEach
  resetAllMocks()   → resets calls + REMOVES implementation → careful
  restoreAllMocks() → resets calls + removes impl + RESTORES spies → afterEach

  Config shortcut (vitest.config.ts):
    clearMocks:   true   ← auto-clear before each test
    restoreMocks: true   ← auto-restore spies after each test

TEST ISOLATION CHECKLIST
  ☐ Module-level mutable vars reset in beforeEach
  ☐ vi.clearAllMocks() in beforeEach (or clearMocks: true in config)
  ☐ vi.restoreAllMocks() in afterEach (or restoreMocks: true in config)
  ☐ vi.unstubAllGlobals() in afterEach
  ☐ vi.unstubAllEnvs() in afterEach
  ☐ vi.useRealTimers() in afterEach (if fake timers used)
  ☐ No it.only / describe.only committed to git
```

> **Your next action:** Find one `setTimeout` or `Date.now()` call in your codebase (or write `isExpired(date)` from scratch). Write one test using `vi.useFakeTimers()` and `vi.setSystemTime()`. Run it. See green in under 50ms.

> "Doing one small thing beats opening a feed."
