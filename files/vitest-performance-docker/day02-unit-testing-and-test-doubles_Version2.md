
# 📅 Day 2 — Unit Testing and Test Doubles

> **Goal:** Write bulletproof unit tests for pure functions, async code, and time-dependent logic — then master every type of test double (mocks, spies, module mocks) and keep tests isolated so they never interfere with each other.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Vitest 4.x · TypeScript 6 · Node.js

---

## 📋 Day 2 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Pure Function Testing and Edge Cases | 12 min |
| 2 | Error Assertions — Sync and Async | 12 min |
| 3 | Async Tests and Promise Patterns | 12 min |
| 4 | Fake Timers — setTimeout, setInterval, Debounce | 12 min |
| 5 | System Time Control — vi.setSystemTime | 10 min |
| 6 | Mock Functions — vi.fn() | 12 min |
| 7 | Spies — vi.spyOn() | 12 min |
| 8 | Module Mocking — vi.mock() | 12 min |
| 9 | Global Mocking — vi.stubGlobal, vi.stubEnv | 10 min |
| 10 | Reset vs Clear vs Restore — and Test Isolation | 12 min |

---

---

# 1 — Pure Function Testing and Edge Cases

---

## T — TL;DR

A pure function has no side effects and always returns the same output for the same input. These are the easiest functions to test — no mocks, no setup, just call and assert. The discipline is in finding the edge cases: zero, empty, null, boundary values, type coercion traps, and the exact point where behaviour changes.

---

## K — Key Concepts

```typescript
// ── Pure function: fully deterministic, no I/O ────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// No dependencies → no mocks needed → test is instant ✅
```

```typescript
// ── Edge case categories ───────────────────────────────────────────────────
// 1. Empty / zero           → '', 0, [], {}
// 2. Single item / boundary → 1, 'a', [x]
// 3. Maximum / overflow     → Number.MAX_SAFE_INTEGER, very long string
// 4. Null / undefined       → null, undefined
// 5. Type coercion          → '1' vs 1, NaN, Infinity, -0
// 6. Special characters     → unicode, emojis, newlines, tabs
// 7. Negative / below zero  → -1, -Infinity
// 8. Already-processed      → calling twice, idempotency
```

```typescript
// src/utils/slugify.test.ts
import { describe, it, expect } from 'vitest'
import { slugify }              from './slugify'

describe('slugify', () => {
  // ── Happy path ────────────────────────────────────────────────────────
  it('lowercases the string', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('my blog post')).toBe('my-blog-post')
  })

  // ── Boundary ──────────────────────────────────────────────────────────
  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('handles single word', () => {
    expect(slugify('hello')).toBe('hello')
  })

  // ── Edge cases ────────────────────────────────────────────────────────
  it('trims leading and trailing whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
  })

  it('collapses multiple spaces into one hyphen', () => {
    expect(slugify('too   many   spaces')).toBe('too-many-spaces')
  })

  it('replaces underscores with hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world')
  })

  it('removes leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('is idempotent — applying twice gives same result', () => {
    const once  = slugify('Hello World!')
    const twice = slugify(once)
    expect(twice).toBe(once)
  })
})
```

```typescript
// ── Boundary testing with it.each ─────────────────────────────────────────
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

describe('clamp', () => {
  it.each([
    // [value, min, max, expected]
    [5,   0,  10,  5],   // within range
    [-1,  0,  10,  0],   // below min → clamped to min
    [11,  0,  10,  10],  // above max → clamped to max
    [0,   0,  10,  0],   // at min boundary
    [10,  0,  10,  10],  // at max boundary
    [-Infinity, 0, 10, 0],   // -Infinity
    [Infinity,  0, 10, 10],  // +Infinity
  ])('clamp(%i, %i, %i) → %i', (n, min, max, expected) => {
    expect(clamp(n, min, max)).toBe(expected)
  })
})
```

```typescript
// ── Floating-point edge case ───────────────────────────────────────────────
export function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

describe('roundTo', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundTo(1.005, 2)).toBeCloseTo(1.01, 2)
    // toBe(1.01) would fail due to floating point: 1.005 * 100 = 100.50000000000001
  })

  it('handles negative numbers', () => {
    expect(roundTo(-1.5, 0)).toBe(-2)
  })

  it('handles 0 decimal places', () => {
    expect(roundTo(3.7, 0)).toBe(4)
  })
})
```

---

## W — Why It Matters

- Pure functions are the highest-value, lowest-cost tests to write — no setup, no teardown, no flakiness. Every pure utility function should have 100% branch coverage because the test cost is near zero.
- Edge cases found in tests prevent production incidents — the `slugify('')` returning an unexpected value, or `clamp(-Infinity)` crashing, are real bugs that surface as user-visible errors. Testing boundaries is cheaper than debugging production.
- `toBeCloseTo` instead of `toBe` for floating-point is a correctness requirement — `0.1 + 0.2 === 0.3` is `false` in JavaScript. Always use `toBeCloseTo(n, precision)` for computed decimal values.

---

## I — Interview Q&A

### Q: What is a pure function and why are pure functions easier to test than impure ones?

**A:** A pure function always returns the same output for the same input and has no side effects — it doesn't modify external state, make network calls, write to databases, or read system time. Pure functions are easier to test because the entire test is: call the function with specific inputs, assert the output. No mocks, no setup, no teardown. The test is self-contained and deterministic — it passes or fails for exactly one reason: the function's logic. Impure functions require test doubles for their dependencies, careful state management between tests, and assertions about side effects rather than just return values.

---

## C — Common Pitfalls + Fix

### ❌ Testing with only the happy path — missing boundary bugs

```typescript
// ❌ Only tests the obvious case — misses real bugs
it('formats the price', () => {
  expect(formatPrice(1000)).toBe('$10.00')
})
// formatPrice(0) returns '$NaN' — never discovered ❌
```

**Fix:** Add boundary tests after every happy path:

```typescript
// ✅ Systematic: happy, zero, negative, max, edge
it('formats 1000 cents as $10.00', () => { expect(formatPrice(1000)).toBe('$10.00') })
it('formats 0 cents as $0.00',     () => { expect(formatPrice(0)).toBe('$0.00') })
it('throws for negative input',    () => { expect(() => formatPrice(-1)).toThrow() })
```

---

## K — Coding Challenge + Solution

### Challenge

Write `truncate(text: string, maxLength: number): string` — returns text truncated to `maxLength` with `'...'` appended if longer, otherwise returns as-is. Write tests covering: normal truncation, text shorter than max, text exactly at max length, empty string, maxLength of 0, and the ellipsis positioning.

### Solution

```typescript
// src/utils/truncate.ts
export function truncate(text: string, maxLength: number): string {
  if (maxLength <= 0) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// src/utils/truncate.test.ts
import { describe, it, expect } from 'vitest'
import { truncate }             from './truncate'

describe('truncate', () => {
  it('truncates text longer than maxLength', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('returns text unchanged when shorter than maxLength', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('returns text unchanged when exactly maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('returns empty string for empty input', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('returns empty string when maxLength is 0', () => {
    expect(truncate('Hello', 0)).toBe('')
  })

  it('appends ellipsis after the cut', () => {
    const result = truncate('abcdefgh', 3)
    expect(result).toBe('abc...')
    expect(result.endsWith('...')).toBe(true)
  })
})
```

---

---

# 2 — Error Assertions — Sync and Async

---

## T — TL;DR

Testing that functions throw is as important as testing that they return. For sync errors: wrap in an arrow function — `expect(() => fn()).toThrow()`. For async errors: `await expect(fn()).rejects.toThrow()`. Always assert the error type OR message — `toThrow()` alone is too permissive (any error passes). Test that errors are NOT thrown in the happy path too.

---

## K — Key Concepts

```typescript
// ── Sync error assertions ─────────────────────────────────────────────────

function divide(a: number, b: number): number {
  if (b === 0) throw new RangeError('Cannot divide by zero')
  return a / b
}

// ✅ Wrap in arrow — required for sync throw testing
expect(() => divide(10, 0)).toThrow()                     // any error
expect(() => divide(10, 0)).toThrow('Cannot divide by zero') // message substring
expect(() => divide(10, 0)).toThrow(/divide by zero/i)    // regex
expect(() => divide(10, 0)).toThrow(RangeError)           // class
expect(() => divide(10, 0)).toThrow(new RangeError('Cannot divide by zero')) // exact

// ❌ WRONG — error escapes before expect() sees it
// expect(divide(10, 0)).toThrow()   ← test itself throws, not caught ❌
```

```typescript
// ── Testing error properties ───────────────────────────────────────────────
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function validateAge(age: number): void {
  if (age < 0)   throw new AppError('Age cannot be negative', 'INVALID_AGE', 400)
  if (age > 150) throw new AppError('Age is unrealistically high', 'INVALID_AGE', 400)
}

it('throws AppError with correct code for negative age', () => {
  let caughtError: unknown

  try {
    validateAge(-1)
  } catch (err) {
    caughtError = err
  }

  expect(caughtError).toBeInstanceOf(AppError)
  expect((caughtError as AppError).code).toBe('INVALID_AGE')
  expect((caughtError as AppError).statusCode).toBe(400)
  expect((caughtError as AppError).message).toBe('Age cannot be negative')
})
```

```typescript
// ── Async error assertions ─────────────────────────────────────────────────
async function fetchUser(id: string): Promise<{ id: string; name: string }> {
  if (!id) throw new Error('ID is required')
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`User not found: ${id}`)
  return res.json()
}

// Pattern 1: rejects.toThrow (most common)
it('rejects when ID is empty', async () => {
  await expect(fetchUser('')).rejects.toThrow('ID is required')
})

// Pattern 2: rejects.toBeInstanceOf
it('rejects with Error instance', async () => {
  await expect(fetchUser('')).rejects.toBeInstanceOf(Error)
})

// Pattern 3: try/catch for detailed assertions
it('rejects with correct message', async () => {
  let error: Error | undefined

  try {
    await fetchUser('')
  } catch (err) {
    error = err as Error
  }

  expect(error).toBeDefined()
  expect(error!.message).toBe('ID is required')
})
```

```typescript
// ── Testing that errors are NOT thrown ────────────────────────────────────

it('does not throw for valid age', () => {
  expect(() => validateAge(25)).not.toThrow()
})

it('does not reject for valid ID', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: '1', name: 'Mark' }), { status: 200 })
  ))
  await expect(fetchUser('1')).resolves.not.toThrow()
  // Or more directly:
  await expect(fetchUser('1')).resolves.toMatchObject({ id: '1' })
})
```

```typescript
// ── Error assertion strategy ───────────────────────────────────────────────
// Prefer this order of specificity:

// 1. Weakest — only useful if ANY error is the behaviour
expect(() => fn()).toThrow()

// 2. Class — confirms the right error type (best for typed error hierarchies)
expect(() => fn()).toThrow(ValidationError)

// 3. Message — confirms what went wrong (good for user-facing messages)
expect(() => fn()).toThrow('Email is invalid')

// 4. Both — most specific (use for critical public APIs)
expect(() => fn()).toThrow(ValidationError)
// AND separately:
try { fn() } catch (e) {
  expect(e).toBeInstanceOf(ValidationError)
  expect((e as ValidationError).code).toBe('EMAIL_INVALID')
}
```

---

## W — Why It Matters

- Testing errors is testing your contract — a function that says it throws `ValidationError` for invalid input must actually throw `ValidationError`. If it throws a plain `Error`, or throws nothing, consumers that `catch (e instanceof ValidationError)` will behave incorrectly. The error type IS the API.
- `toThrow()` without a class or message is a false safety net — it passes for `throw new Error('Wrong message')` just as well as the correct error. You only catch regressions in the error condition existing, not in what the error communicates.
- The try/catch pattern for async errors is more verbose but necessary when you need to assert on custom error properties — `rejects.toThrow(message)` only checks the message string, not custom `code` or `statusCode` fields on a subclassed error.

---

## I — Interview Q&A

### Q: Why must you wrap a throwing function in an arrow function when using `expect().toThrow()`?

**A:** `expect(value)` receives the return value of evaluating its argument first. If you write `expect(divide(10, 0)).toThrow()`, JavaScript evaluates `divide(10, 0)` before calling `expect` — the throw propagates immediately and the test itself throws, rather than Vitest catching it. By wrapping in an arrow function — `expect(() => divide(10, 0)).toThrow()` — you pass the *function itself* to `expect`. Vitest then calls the function inside a try/catch internally, catches the thrown error, and checks it against your matcher. The arrow function defers execution until Vitest is ready to handle the error. The same applies to async errors, but using `.rejects` instead: `await expect(asyncFn()).rejects.toThrow()` works because the Promise rejection is handled by `.rejects`, but the async function is called immediately (producing a Promise, not throwing synchronously).

---

## C — Common Pitfalls + Fix

### ❌ `toThrow()` with no argument — passes for wrong errors

```typescript
// ❌ Passes even if the wrong error is thrown
it('throws for invalid input', () => {
  expect(() => processInput(null)).toThrow()  // passes for ANY error
})
// A TypeError("Cannot read property of null") would pass this test
// even if your code should throw a ValidationError ❌
```

**Fix:** Always assert the error type or message:

```typescript
// ✅ Specific — only passes for the right error
it('throws ValidationError for null input', () => {
  expect(() => processInput(null)).toThrow(ValidationError)
  expect(() => processInput(null)).toThrow('Input cannot be null')
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `divide(a, b)` and an async `fetchProduct(id)` function. For `divide`: test that it divides correctly, throws `RangeError` with message `'Division by zero'` when b is 0, and does NOT throw for valid inputs. For `fetchProduct`: test that it rejects with a custom `NotFoundError` (with `statusCode: 404`) when a mock fetch returns 404, and resolves when 200. Use try/catch for the custom error property assertions.

### Solution

```typescript
// src/utils/math.ts
export function divide(a: number, b: number): number {
  if (b === 0) throw new RangeError('Division by zero')
  return a / b
}

// src/api/product.ts
export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(id: string) {
    super(`Product not found: ${id}`)
    this.name = 'NotFoundError'
  }
}

export async function fetchProduct(id: string) {
  const res = await fetch(`/api/products/${id}`)
  if (res.status === 404) throw new NotFoundError(id)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<{ id: string; name: string }>
}

// ── Tests ──────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { divide }                               from './math'
import { fetchProduct, NotFoundError }          from './product'

describe('divide', () => {
  it('returns the quotient', () => {
    expect(divide(10, 2)).toBe(5)
  })

  it('throws RangeError when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow(RangeError)
    expect(() => divide(10, 0)).toThrow('Division by zero')
  })

  it('does not throw for valid divisor', () => {
    expect(() => divide(10, 3)).not.toThrow()
  })
})

describe('fetchProduct', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('resolves with product data on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1', name: 'Widget' }), { status: 200 })
    ))
    await expect(fetchProduct('1')).resolves.toMatchObject({ id: '1', name: 'Widget' })
  })

  it('rejects with NotFoundError on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 404 })
    ))
    await expect(fetchProduct('999')).rejects.toThrow(NotFoundError)
    await expect(fetchProduct('999')).rejects.toThrow('Product not found: 999')
  })

  it('rejects with NotFoundError having statusCode 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 404 })
    ))

    let caughtError: unknown
    try { await fetchProduct('999') } catch (e) { caughtError = e }

    expect(caughtError).toBeInstanceOf(NotFoundError)
    expect((caughtError as NotFoundError).statusCode).toBe(404)
  })
})
```

---

---

# 3 — Async Tests and Promise Patterns

---

## T — TL;DR

Vitest handles async tests via `async/await` — mark the test function `async` and `await` every assertion involving a Promise. Three common patterns: `await` the function directly, `await expect().resolves`, or `await expect().rejects`. Always `return` or `await` Promises in tests — a floating Promise causes a test to pass vacuously even when the assertion would fail.

---

## K — Key Concepts

```typescript
// ── Pattern 1: await the call, then assert ────────────────────────────────
it('fetches user data', async () => {
  // Arrange: mock is set in beforeEach

  // Act
  const user = await getUser('u1')

  // Assert
  expect(user).toMatchObject({ id: 'u1', name: 'Alice' })
  // TypeScript-friendly — user is typed ✅
})

// ── Pattern 2: await expect().resolves ────────────────────────────────────
it('resolves with user data', async () => {
  await expect(getUser('u1')).resolves.toMatchObject({ id: 'u1' })
  // Fluent — good for simple assertions
})

// ── Pattern 3: await expect().rejects ────────────────────────────────────
it('rejects when user not found', async () => {
  await expect(getUser('missing')).rejects.toThrow('User not found')
  // Always await — the assertion itself is a Promise ✅
})
```

```typescript
// ── Floating Promise — the silent test failure ────────────────────────────

// ❌ Missing await — test passes even if assertion fails
it('WRONG: resolves with correct data', () => {
  // No async, no await — this Promise floats
  expect(getUser('u1')).resolves.toBe('wrong value')
  // Vitest doesn't wait for this → test ends → marked as passed ❌
})

// ✅ Always async + await
it('resolves with correct data', async () => {
  await expect(getUser('u1')).resolves.toMatchObject({ id: 'u1' })
})
```

```typescript
// ── Testing Promise.all and parallel calls ────────────────────────────────
async function getUsers(ids: string[]) {
  return Promise.all(ids.map(id => getUser(id)))
}

it('fetches multiple users in parallel', async () => {
  const users = await getUsers(['u1', 'u2', 'u3'])

  expect(users).toHaveLength(3)
  expect(users[0]).toMatchObject({ id: 'u1' })
  expect(users[1]).toMatchObject({ id: 'u2' })
})
```

```typescript
// ── Testing settled promises (allSettled) ────────────────────────────────
async function tryFetchAll(ids: string[]) {
  return Promise.allSettled(ids.map(id => getUser(id)))
}

it('returns settled results including failures', async () => {
  const results = await tryFetchAll(['u1', 'invalid'])

  expect(results[0].status).toBe('fulfilled')
  expect((results[0] as PromiseFulfilledResult<User>).value.id).toBe('u1')

  expect(results[1].status).toBe('rejected')
  expect((results[1] as PromiseRejectedResult).reason.message)
    .toContain('User not found')
})
```

```typescript
// ── Async setup with beforeEach ────────────────────────────────────────────
describe('async beforeEach', () => {
  let connection: TestDbConnection

  beforeEach(async () => {
    connection = await openTestConnection()   // await async setup ✅
  })

  afterEach(async () => {
    await connection.close()                  // await async teardown ✅
  })

  it('executes a query', async () => {
    const result = await connection.query('SELECT 1')
    expect(result).toBeDefined()
  })
})
```

```typescript
// ── Testing functions that call callbacks-style async (promisified) ────────
import { promisify } from 'util'
import { readFile }  from 'fs'

const readFileAsync = promisify(readFile)

it('reads a file', async () => {
  const content = await readFileAsync('./package.json', 'utf8')
  const pkg     = JSON.parse(content)
  expect(pkg).toHaveProperty('name')
})

// For truly callback-based functions — use done() (legacy, avoid if possible)
it('callback-based (legacy pattern)', (done) => {
  readFile('./package.json', 'utf8', (err, data) => {
    expect(err).toBeNull()
    expect(JSON.parse(data)).toHaveProperty('name')
    done()    // ← must call done() or test hangs until timeout
  })
})
```

---

## W — Why It Matters

- Async tests without `await` create false positives — this is the most dangerous testing mistake because the test report says "passed" and you trust it. Set up ESLint rule `@typescript-eslint/no-floating-promises` to catch these at lint time.
- `beforeEach` and `afterEach` can be async — always `await` async setup in hooks, not just in tests. If `beforeEach` opens a connection and you forget `await`, the connection may not be ready when the test starts, causing flaky failures.
- The `done()` callback pattern is legacy — avoid it in new code. `async/await` handles all Promise-based async. `done()` is only needed for truly callback-based APIs (native Node.js streams, some older libraries) that don't return Promises.

---

## I — Interview Q&A

### Q: What is a floating Promise in tests and how does it cause false positives?

**A:** A floating Promise is a Promise that is created but not awaited — the test function returns before the Promise settles, so Vitest marks the test as passed based on the synchronous code completing without throwing. Example: `expect(asyncFn()).resolves.toBe('wrong')` without `await` creates a Promise containing the assertion. Vitest doesn't wait for it — the assertion may fail internally, but since the rejection isn't observed, the test passes. The fix: mark the test `async` and `await` every Promise-returning assertion. To catch this automatically, enable `@typescript-eslint/no-floating-promises` ESLint rule — TypeScript knows whether a function returns a Promise and will warn if the return value is discarded.

---

## C — Common Pitfalls + Fix

### ❌ Not awaiting `beforeEach` async setup — race condition

```typescript
// ❌ beforeEach returns before setup completes
beforeEach(() => {
  db = createTestDatabase()   // returns Promise but not awaited
  // db may not be ready when the test starts ❌
})
```

**Fix:**

```typescript
// ✅ Async beforeEach — Vitest awaits it before running the test
beforeEach(async () => {
  db = await createTestDatabase()   // fully ready before test runs ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write `getUserWithOrders(userId)` — calls `getUser(id)` then `getOrders(userId)` in sequence, returns `{ user, orders }`. Write tests for: (1) happy path with mocked dependencies; (2) rejects when `getUser` rejects; (3) rejects when `getOrders` rejects; (4) does NOT call `getOrders` if `getUser` fails. Show the floating promise anti-pattern as a comment.

### Solution

```typescript
// src/services/user-orders.ts
export async function getUserWithOrders(userId: string) {
  const user   = await getUser(userId)
  const orders = await getOrders(userId)
  return { user, orders }
}

// src/services/user-orders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser   = vi.fn()
const mockGetOrders = vi.fn()

vi.mock('./api', () => ({
  getUser:   mockGetUser,
  getOrders: mockGetOrders,
}))

import { getUserWithOrders } from './user-orders'

describe('getUserWithOrders', () => {
  const fakeUser   = { id: 'u1', name: 'Alice' }
  const fakeOrders = [{ id: 'o1', total: 999 }]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(fakeUser)
    mockGetOrders.mockResolvedValue(fakeOrders)
  })

  it('returns user and orders on success', async () => {
    const result = await getUserWithOrders('u1')
    expect(result).toEqual({ user: fakeUser, orders: fakeOrders })
  })

  it('rejects when getUser rejects', async () => {
    mockGetUser.mockRejectedValue(new Error('User not found'))
    await expect(getUserWithOrders('u1')).rejects.toThrow('User not found')
  })

  it('rejects when getOrders rejects', async () => {
    mockGetOrders.mockRejectedValue(new Error('Orders unavailable'))
    await expect(getUserWithOrders('u1')).rejects.toThrow('Orders unavailable')
  })

  it('does not call getOrders when getUser fails', async () => {
    mockGetUser.mockRejectedValue(new Error('not found'))
    try { await getUserWithOrders('u1') } catch { /* expected */ }
    expect(mockGetOrders).not.toHaveBeenCalled()
  })

  // ❌ ANTI-PATTERN (shown as comment — don't do this):
  // it('WRONG: floating promise test', () => {
  //   expect(getUserWithOrders('u1')).resolves.toMatchObject({}) // no await → false pass
  // })
})
```

---

---

# 4 — Fake Timers — setTimeout, setInterval, Debounce

---

## T — TL;DR

`vi.useFakeTimers()` replaces the real timer functions (`setTimeout`, `setInterval`, `Date`) with synchronous, manually-controllable versions. `vi.advanceTimersByTime(ms)` fast-forwards time without waiting. `vi.runAllTimers()` fires all pending timers. This makes testing debounce functions, polling loops, and retry logic instant instead of waiting real milliseconds.

---

## K — Key Concepts

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Enable and disable fake timers ────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers()    // replace real timers with controllable fakes
})

afterEach(() => {
  vi.useRealTimers()    // ALWAYS restore — fake timers persist across tests if not restored
})
```

```typescript
// ── setTimeout ────────────────────────────────────────────────────────────
function delayedGreeting(callback: (msg: string) => void) {
  setTimeout(() => callback('Hello!'), 1000)
}

it('calls callback after 1 second delay', () => {
  const callback = vi.fn()

  delayedGreeting(callback)
  expect(callback).not.toHaveBeenCalled()  // not fired yet

  vi.advanceTimersByTime(999)
  expect(callback).not.toHaveBeenCalled()  // still not fired

  vi.advanceTimersByTime(1)                // total: 1000ms
  expect(callback).toHaveBeenCalledOnce()
  expect(callback).toHaveBeenCalledWith('Hello!')
})
```

```typescript
// ── setInterval ───────────────────────────────────────────────────────────
function startHeartbeat(onBeat: () => void, intervalMs = 5000) {
  return setInterval(onBeat, intervalMs)
}

it('fires heartbeat on each interval', () => {
  const onBeat = vi.fn()
  const id = startHeartbeat(onBeat, 5000)

  expect(onBeat).not.toHaveBeenCalled()

  vi.advanceTimersByTime(5000)
  expect(onBeat).toHaveBeenCalledTimes(1)

  vi.advanceTimersByTime(10000)           // advance another 10s
  expect(onBeat).toHaveBeenCalledTimes(3) // 3 total beats

  clearInterval(id)
})
```

```typescript
// ── Debounce function testing ─────────────────────────────────────────────
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

describe('debounce', () => {
  it('only fires once after multiple rapid calls', () => {
    const fn      = vi.fn()
    const debounced = debounce(fn, 300)

    debounced('a')
    debounced('b')
    debounced('c')

    expect(fn).not.toHaveBeenCalled()  // debounce window hasn't elapsed

    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledOnce()  // only the last call fires
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('fires again after the debounce window resets', () => {
    const fn      = vi.fn()
    const debounced = debounce(fn, 300)

    debounced('first')
    vi.advanceTimersByTime(300)  // fires
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('second')
    vi.advanceTimersByTime(300)  // fires again
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

```typescript
// ── vi.runAllTimers vs vi.advanceTimersByTime ─────────────────────────────

vi.runAllTimers()
// Runs ALL pending timers immediately, including chained timers
// (a setTimeout inside a setTimeout is also fired)
// Use: when you want to flush all pending work at once

vi.advanceTimersByTime(ms)
// Advances the virtual clock by exactly ms milliseconds
// Fires timers that would have fired in that window
// Use: when timing relationships matter (before/after the delay)

vi.runAllTimersAsync()
// Like runAllTimers but handles async timer callbacks
// Use: when timer callbacks themselves are async

vi.runOnlyPendingTimers()
// Runs only currently queued timers, NOT new ones created during execution
// Prevents infinite loops from recursive setTimeout patterns
```

---

## W — Why It Matters

- Real timers in tests make the suite slow and non-deterministic — a test that `await`s a 500ms debounce takes 500ms every run. With fake timers, `vi.advanceTimersByTime(500)` is synchronous and instant. A test suite with 20 timer-based tests runs in milliseconds instead of 10+ seconds.
- Without `vi.useRealTimers()` in `afterEach`, fake timers leak into subsequent tests — the next test file that uses real `setTimeout` gets the fake version, causing mysterious failures where callbacks never fire. Always restore in `afterEach`.
- `vi.runAllTimers()` can cause infinite loops with recursive timers (`setTimeout` that sets another `setTimeout`) — use `vi.runOnlyPendingTimers()` for those cases or set a finite advance time.

---

## I — Interview Q&A

### Q: How do you test a debounced function without waiting real milliseconds?

**A:** Call `vi.useFakeTimers()` before the test to replace `setTimeout` with a synchronous fake. Call the debounced function one or more times, then call `vi.advanceTimersByTime(delayMs)` to fast-forward the virtual clock by the debounce delay. Vitest executes any timers that would have fired in that window synchronously. After advancing time, assert on the underlying function's call count. This entire test runs in under 1ms regardless of the debounce delay. Clean up with `vi.useRealTimers()` in `afterEach` to prevent fake timers leaking into other test files.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `vi.useRealTimers()` — fake timers leak across tests

```typescript
// ❌ Fake timers installed but never restored
it('tests debounce', () => {
  vi.useFakeTimers()
  // ... test ...
  // No vi.useRealTimers() ← fake timers persist for every subsequent test ❌
})
```

**Fix:** Pair `useFakeTimers` / `useRealTimers` in `beforeEach` / `afterEach`:

```typescript
// ✅ Always restored
beforeEach(() => { vi.useFakeTimers() })
afterEach(()  => { vi.useRealTimers() })
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `retry(fn, maxAttempts, delayMs)` function that retries `fn` up to `maxAttempts` times with `delayMs` between retries. Write tests: (1) resolves immediately on first success; (2) retries on failure and eventually resolves; (3) rejects after maxAttempts with the last error; (4) correct number of delays between retries. Use fake timers.

### Solution

```typescript
// src/utils/retry.ts
export async function retry<T>(
  fn:          () => Promise<T>,
  maxAttempts: number,
  delayMs:     number
): Promise<T> {
  let lastError: Error
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      if (attempt < maxAttempts) {
        await new Promise(res => setTimeout(res, delayMs))
      }
    }
  }
  throw lastError!
}

// src/utils/retry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retry }                                            from './retry'

describe('retry', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(()  => { vi.useRealTimers() })

  it('resolves immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const p  = retry(fn, 3, 100)
    await vi.runAllTimersAsync()
    await expect(p).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('retries on failure and resolves on later attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const p = retry(fn, 3, 100)
    await vi.advanceTimersByTimeAsync(100)
    await expect(p).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('rejects after all attempts are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const p  = retry(fn, 3, 100)

    await vi.advanceTimersByTimeAsync(200)   // 2 delays × 100ms
    await expect(p).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('waits delayMs between attempts', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const p = retry(fn, 3, 500)

    await vi.advanceTimersByTimeAsync(499)
    expect(fn).toHaveBeenCalledTimes(2)   // 2nd call happened, 3rd waiting

    await vi.advanceTimersByTimeAsync(500)
    await expect(p).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
```

---

---

# 5 — System Time Control — vi.setSystemTime

---

## T — TL;DR

`vi.setSystemTime(date)` freezes `Date.now()`, `new Date()`, and `performance.now()` at a specific point in time. This makes any code that depends on the current date deterministic — expiry checks, age calculations, "created today" logic, and cron-style scheduling. Always restore with `vi.useRealTimers()`.

---

## K — Key Concepts

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Freeze time ────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
})
afterEach(() => {
  vi.useRealTimers()
})
```

```typescript
// ── Functions under test ───────────────────────────────────────────────────
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function daysUntilExpiry(expiresAt: Date): number {
  const now  = Date.now()
  const diff = expiresAt.getTime() - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── Tests with frozen time ─────────────────────────────────────────────────
// All tests use: 2025-06-15T12:00:00.000Z (noon UTC)

describe('isExpired', () => {
  it('returns true for a date in the past', () => {
    const past = new Date('2025-01-01')
    expect(isExpired(past)).toBe(true)
  })

  it('returns false for a date in the future', () => {
    const future = new Date('2026-01-01')
    expect(isExpired(future)).toBe(false)
  })

  it('returns false for a date exactly at current time', () => {
    const now = new Date('2025-06-15T12:00:00.000Z')
    expect(isExpired(now)).toBe(false)
  })
})

describe('daysUntilExpiry', () => {
  it('returns 1 for expiry tomorrow', () => {
    const tomorrow = new Date('2025-06-16T12:00:00.000Z')
    expect(daysUntilExpiry(tomorrow)).toBe(1)
  })

  it('returns 0 for expiry today (rounds up)', () => {
    const later = new Date('2025-06-15T18:00:00.000Z')  // 6h from now
    expect(daysUntilExpiry(later)).toBe(1)  // ceil(0.25) = 1
  })
})

describe('getGreeting', () => {
  it('returns Good afternoon at noon UTC', () => {
    // System time is 12:00 UTC — getHours() = 12
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns Good morning before noon', () => {
    vi.setSystemTime(new Date('2025-06-15T08:00:00.000Z'))
    expect(getGreeting()).toBe('Good morning')
  })

  it('returns Good evening after 18:00', () => {
    vi.setSystemTime(new Date('2025-06-15T20:00:00.000Z'))
    expect(getGreeting()).toBe('Good evening')
  })
})
```

```typescript
// ── Advancing time after freezing ─────────────────────────────────────────
it('correctly identifies expiry after time passes', () => {
  const expiresAt = new Date('2025-06-15T12:05:00.000Z')  // 5 min from now
  expect(isExpired(expiresAt)).toBe(false)

  // Advance time by 6 minutes
  vi.advanceTimersByTime(6 * 60 * 1000)
  expect(isExpired(expiresAt)).toBe(true)
})
```

```typescript
// ── Token expiry — real-world pattern ─────────────────────────────────────
interface JwtPayload { exp: number }  // Unix timestamp

export function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() / 1000 > payload.exp
}

describe('isTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns false for a token expiring in the future', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600  // +1h
    expect(isTokenExpired({ exp: futureExp })).toBe(false)
  })

  it('returns true for an already-expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 1
    expect(isTokenExpired({ exp: pastExp })).toBe(true)
  })
})
```

---

## W — Why It Matters

- Without time control, date-dependent tests are non-deterministic — a test for "tokens expire after 1 hour" that uses `Date.now()` will pass differently depending on when it runs. Freezing time makes the test deterministic forever.
- `vi.setSystemTime` patches ALL sources of current time — `Date.now()`, `new Date()`, `performance.now()`. You don't need to mock each one individually. Any code that reads the current time will get your frozen value.
- Tests for timezone-sensitive logic need explicit UTC timestamps — `new Date('2025-06-15T12:00:00.000Z')` is unambiguous. `new Date('2025-06-15')` is timezone-dependent (midnight local time). Always use ISO 8601 UTC format in test time values.

---

## I — Interview Q&A

### Q: How do you test a function that checks whether a JWT token is expired without waiting for real time to pass?

**A:** Use `vi.useFakeTimers()` and `vi.setSystemTime(specificDate)` to freeze the current time at a known point. Then create a token payload with an `exp` (expiry) timestamp that is either before or after your frozen time. The function under test calls `Date.now()` internally — it receives the frozen value instead of the real clock. You can test both "token valid" (exp in the future relative to frozen time) and "token expired" (exp in the past) cases with complete control, regardless of when the test actually runs. Always call `vi.useRealTimers()` in `afterEach` to restore the real clock.

---

## C — Common Pitfalls + Fix

### ❌ Using relative dates like `new Date(Date.now() + 3600000)` in test expectations

```typescript
// ❌ Calculation uses real Date.now() at test-write time — fails later
it('token is valid', () => {
  const payload = { exp: Date.now() / 1000 + 3600 }  // relative to NOW
  expect(isTokenExpired(payload)).toBe(false)
  // If fake timers aren't set, Date.now() is real → works today, maybe fails tomorrow
})
```

**Fix:** Freeze time first, then use absolute values:

```typescript
// ✅ Time is frozen — all Date.now() calls return the same value
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))  // absolute, unambiguous
})

it('token is valid', () => {
  const payload = { exp: 1750003200 + 3600 }  // absolute Unix ts + 1h
  expect(isTokenExpired(payload)).toBe(false)  // deterministic forever ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write `getSubscriptionStatus(plan: { expiresAt: Date }): 'active' | 'expiring_soon' | 'expired'`. Returns `'expired'` if past expiry, `'expiring_soon'` if within 7 days, `'active'` otherwise. Freeze time at `2025-06-15T00:00:00Z`. Write tests for all three states and the exact boundary (7 days).

### Solution

```typescript
// src/utils/subscription.ts
export function getSubscriptionStatus(
  plan: { expiresAt: Date }
): 'active' | 'expiring_soon' | 'expired' {
  const now      = Date.now()
  const exp      = plan.expiresAt.getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  if (now >= exp)            return 'expired'
  if (exp - now <= sevenDays) return 'expiring_soon'
  return 'active'
}

// src/utils/subscription.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSubscriptionStatus }                           from './subscription'

const FROZEN = new Date('2025-06-15T00:00:00.000Z')

describe('getSubscriptionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN)
  })
  afterEach(() => vi.useRealTimers())

  it('returns active for expiry more than 7 days away', () => {
    const expiresAt = new Date('2025-06-23T00:00:01.000Z')  // 8d + 1s away
    expect(getSubscriptionStatus({ expiresAt })).toBe('active')
  })

  it('returns expiring_soon exactly 7 days before expiry', () => {
    const expiresAt = new Date('2025-06-22T00:00:00.000Z')  // exactly 7 days
    expect(getSubscriptionStatus({ expiresAt })).toBe('expiring_soon')
  })

  it('returns expiring_soon within 7 days', () => {
    const expiresAt = new Date('2025-06-20T00:00:00.000Z')  // 5 days away
    expect(getSubscriptionStatus({ expiresAt })).toBe('expiring_soon')
  })

  it('returns expired for past date', () => {
    const expiresAt = new Date('2025-06-14T23:59:59.000Z')  // 1s in the past
    expect(getSubscriptionStatus({ expiresAt })).toBe('expired')
  })

  it('returns expired for exact current time', () => {
    const expiresAt = new Date(FROZEN)  // now === exp → expired
    expect(getSubscriptionStatus({ expiresAt })).toBe('expired')
  })
})
```

---

---

# 6 — Mock Functions — vi.fn()

---

## T — TL;DR

`vi.fn()` creates a mock function that records every call — arguments, return values, call count, call order. You control what it returns with `mockReturnValue`, `mockResolvedValue`, `mockImplementation`. Assert on how it was called with `toHaveBeenCalledWith`, `toHaveBeenCalledTimes`, `toHaveBeenCalledOnce`. Mock functions replace real dependencies in tests without modifying production code.

---

## K — Key Concepts

```typescript
import { vi, expect } from 'vitest'

// ── Creating a mock function ───────────────────────────────────────────────
const mockFn = vi.fn()

mockFn('hello', 42)
mockFn('world')

// Call tracking
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('hello', 42)
expect(mockFn).toHaveBeenLastCalledWith('world')
expect(mockFn).toHaveBeenNthCalledWith(1, 'hello', 42)
```

```typescript
// ── Controlling return values ──────────────────────────────────────────────

// Always return the same value
const getPrice = vi.fn().mockReturnValue(999)
getPrice()  // 999
getPrice()  // 999

// Return different values on sequential calls
const getToken = vi.fn()
  .mockReturnValueOnce('token-1')  // first call
  .mockReturnValueOnce('token-2')  // second call
  .mockReturnValue('token-default') // all subsequent calls

getToken()  // 'token-1'
getToken()  // 'token-2'
getToken()  // 'token-default'
getToken()  // 'token-default'

// Async: resolve a value
const fetchUser = vi.fn().mockResolvedValue({ id: '1', name: 'Alice' })
await fetchUser()  // { id: '1', name: 'Alice' }

// Async: reject with error
const failFetch = vi.fn().mockRejectedValue(new Error('Network error'))
await failFetch().catch(e => e.message)  // 'Network error'

// Mix resolve/reject
const unstable = vi.fn()
  .mockRejectedValueOnce(new Error('first fail'))
  .mockResolvedValue({ data: 'ok' })
```

```typescript
// ── mockImplementation — custom behaviour ────────────────────────────────
const multiply = vi.fn().mockImplementation((a: number, b: number) => a * b)
expect(multiply(3, 4)).toBe(12)

// Async implementation
const fetchData = vi.fn().mockImplementation(async (id: string) => {
  if (id === 'missing') throw new Error('Not found')
  return { id, data: 'value' }
})

// mockImplementationOnce — different implementation for first call only
const service = vi.fn()
  .mockImplementationOnce(() => { throw new Error('first attempt fails') })
  .mockImplementation(() => 'success')
```

```typescript
// ── Inspecting calls ──────────────────────────────────────────────────────
const logger = vi.fn()

logger('error', { code: 500 })
logger('info',  { code: 200 })

// Access call records
console.log(logger.mock.calls)
// [['error', { code: 500 }], ['info', { code: 200 }]]

console.log(logger.mock.calls[0])     // ['error', { code: 500 }]
console.log(logger.mock.calls[0][1])  // { code: 500 }

console.log(logger.mock.results)
// [{ type: 'return', value: undefined }, ...]

// ── Partial argument matching ─────────────────────────────────────────────
expect(logger).toHaveBeenCalledWith('error', expect.objectContaining({ code: 500 }))
expect(logger).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
```

```typescript
// ── Type-safe vi.fn() with generics ──────────────────────────────────────
type SendEmail = (to: string, subject: string) => Promise<void>

const mockSendEmail = vi.fn<SendEmail>()
  .mockResolvedValue(undefined)

// TypeScript enforces correct argument types:
// mockSendEmail(42, 'subject')  ← TS error: number is not string ✅
```

---

## W — Why It Matters

- `vi.fn()` is the unit test workhorse — every time you need to test that "function A calls function B with specific arguments", `vi.fn()` is the tool. It removes the real B (database call, email send, API request) and replaces it with a controllable, inspectable substitute.
- `mockReturnValueOnce` is the key to testing retry logic and state transitions — the first call fails, the second succeeds. Without per-call control, you'd need two separate mocks and two separate tests.
- `mock.calls` gives you access to every argument of every call — when `toHaveBeenCalledWith` isn't expressive enough (e.g. you need to check the third argument of the second call), access `mockFn.mock.calls[1][2]` directly.

---

## I — Interview Q&A

### Q: What is the difference between `mockReturnValue`, `mockResolvedValue`, and `mockImplementation`?

**A:** `mockReturnValue(val)` makes the mock function synchronously return `val` every time it's called — for non-async functions. `mockResolvedValue(val)` makes the mock return `Promise.resolve(val)` — it's shorthand for `mockImplementation(() => Promise.resolve(val))` and is used for mocking async functions. `mockImplementation(fn)` is the most flexible — you provide an actual function that runs when the mock is called, giving you full control over arguments, side effects, and dynamic return values. Use `mockReturnValue` for simple constants, `mockResolvedValue` for async stubs, and `mockImplementation` when the return value depends on the input arguments or when you need to throw.

---

## C — Common Pitfalls + Fix

### ❌ Not resetting mocks between tests — stale call counts

```typescript
// ❌ mockFn.calls accumulates across tests
const mockFn = vi.fn()

it('test 1 calls fn', () => {
  service.run(mockFn)
  expect(mockFn).toHaveBeenCalledTimes(1)  // ✅ passes
})

it('test 2 calls fn once', () => {
  service.run(mockFn)
  expect(mockFn).toHaveBeenCalledTimes(1)  // ❌ fails — count is 2 from both tests
})
```

**Fix:** Clear mocks in `beforeEach`:

```typescript
// ✅
beforeEach(() => { vi.clearAllMocks() })
// Or per-mock: mockFn.mockClear()
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `NotificationService.send(userId, message)` that: looks up a user via `userRepo.findById(userId)`, throws `UserNotFoundError` if null, sends a push notification via `pushClient.send(deviceToken, message)`. Write tests using `vi.fn()`: (1) successful send with correct arguments; (2) throws when user not found; (3) does not call `pushClient` when user is not found; (4) sends to user's deviceToken.

### Solution

```typescript
// src/services/notification.service.ts
export class UserNotFoundError extends Error {
  constructor(id: string) { super(`User not found: ${id}`) }
}

export class NotificationService {
  constructor(
    private userRepo:   { findById: (id: string) => Promise<{ id: string; deviceToken: string } | null> },
    private pushClient: { send: (token: string, message: string) => Promise<void> }
  ) {}

  async send(userId: string, message: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError(userId)
    await this.pushClient.send(user.deviceToken, message)
  }
}

// src/services/notification.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService, UserNotFoundError } from './notification.service'

describe('NotificationService.send', () => {
  const fakeUser = { id: 'u1', deviceToken: 'tok-abc123' }

  let mockFindById:   ReturnType<typeof vi.fn>
  let mockPushSend:   ReturnType<typeof vi.fn>
  let service:        NotificationService

  beforeEach(() => {
    mockFindById = vi.fn().mockResolvedValue(fakeUser)
    mockPushSend = vi.fn().mockResolvedValue(undefined)
    service      = new NotificationService(
      { findById: mockFindById },
      { send:     mockPushSend }
    )
  })

  it('sends a push notification with correct token and message', async () => {
    await service.send('u1', 'Hello!')

    expect(mockPushSend).toHaveBeenCalledOnce()
    expect(mockPushSend).toHaveBeenCalledWith('tok-abc123', 'Hello!')
  })

  it('looks up the user by userId', async () => {
    await service.send('u1', 'Hi')
    expect(mockFindById).toHaveBeenCalledWith('u1')
  })

  it('throws UserNotFoundError when user does not exist', async () => {
    mockFindById.mockResolvedValue(null)
    await expect(service.send('u1', 'Hi')).rejects.toThrow(UserNotFoundError)
    await expect(service.send('u1', 'Hi')).rejects.toThrow('User not found: u1')
  })

  it('does not send push when user is not found', async () => {
    mockFindById.mockResolvedValue(null)
    try { await service.send('u1', 'Hi') } catch { /* expected */ }
    expect(mockPushSend).not.toHaveBeenCalled()
  })
})
```

---

---

# 7 — Spies — vi.spyOn()

---

## T — TL;DR

`vi.spyOn(object, method)` wraps an existing method with a spy — it records calls while still running the original implementation by default. Use it to verify a real method was called with specific arguments without replacing its behaviour. Override the implementation with `.mockImplementation()` or `.mockReturnValue()` when needed. Always `vi.restoreAllMocks()` in `afterEach` to undo the wrapping.

---

## K — Key Concepts

```typescript
import { vi, expect } from 'vitest'

// ── Basic spy — calls original, records usage ─────────────────────────────
const calculator = {
  add: (a: number, b: number) => a + b
}

const spy = vi.spyOn(calculator, 'add')

const result = calculator.add(2, 3)
expect(result).toBe(5)               // original still runs ✅
expect(spy).toHaveBeenCalledWith(2, 3)
expect(spy).toHaveBeenCalledOnce()
```

```typescript
// ── Spy on a class method ─────────────────────────────────────────────────
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

const logger  = new Logger()
const logSpy  = vi.spyOn(logger, 'log')

logger.log('test message')

expect(logSpy).toHaveBeenCalledWith('test message')
expect(logSpy).toHaveBeenCalledTimes(1)

// Restore after test
vi.restoreAllMocks()
// logger.log is back to original implementation ✅
```

```typescript
// ── Spy and override implementation ──────────────────────────────────────
class EmailService {
  async sendWelcome(email: string): Promise<void> {
    // real implementation sends actual email
    await externalMailer.send({ to: email, subject: 'Welcome' })
  }
}

const emailService = new EmailService()

// Override — don't send a real email in tests
const sendSpy = vi.spyOn(emailService, 'sendWelcome')
  .mockResolvedValue(undefined)

await emailService.sendWelcome('test@example.com')

expect(sendSpy).toHaveBeenCalledWith('test@example.com')
// No real email sent ✅
```

```typescript
// ── Spy on console methods ────────────────────────────────────────────────
it('logs the error', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  // mockImplementation(() => {}) suppresses console.error output in test

  someFunction()   // internally calls console.error('Something failed')

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Something failed')
  )

  consoleSpy.mockRestore()  // restore console.error
})
```

```typescript
// ── Spy on module exports ─────────────────────────────────────────────────
import * as utils from './utils'

it('calls formatDate', () => {
  const spy = vi.spyOn(utils, 'formatDate').mockReturnValue('June 15, 2025')

  const result = utils.formatDate(new Date())
  expect(result).toBe('June 15, 2025')
  expect(spy).toHaveBeenCalledOnce()

  spy.mockRestore()
})
```

```typescript
// ── vi.fn() vs vi.spyOn() — when to use each ─────────────────────────────

// vi.fn()
// Use: you're providing a dependency via injection
//      you want a completely fresh mock with no original behaviour
// Example: mockEmailClient = { send: vi.fn() }

// vi.spyOn()
// Use: you need to observe calls to an existing object/module method
//      you want to test the real implementation in most cases
//      you need to temporarily override one method on a real object
// Example: spy on console.error to verify error logging
//          spy on a service method to verify it was called by an orchestrator
```

---

## W — Why It Matters

- `vi.spyOn` is the right tool when the real implementation is correct and you only need to verify it was called — spying on a logging method, observing a cache read, or confirming an event emitter fires. Using `vi.fn()` would require duplicating the implementation.
- Spying on `console.error` / `console.warn` lets you test that your error handling code calls logging correctly, while suppressing the output so the test terminal stays clean. Without the `mockImplementation(() => {})`, the error message clutters every test run.
- `vi.restoreAllMocks()` is mandatory after `vi.spyOn` — unlike `vi.fn()` (which is a fresh function), `vi.spyOn` modifies the original object. Without restore, the spy persists on the object across tests, accumulating call counts and potentially breaking other tests.

---

## I — Interview Q&A

### Q: What is the difference between `vi.fn()` and `vi.spyOn()`, and when would you choose one over the other?

**A:** `vi.fn()` creates an entirely new mock function with no real implementation — you use it when you're constructing a test double from scratch, typically as an injected dependency. `vi.spyOn(object, method)` wraps an existing method on an object with a recording layer — the original implementation still runs by default, and you can optionally override it. Choose `vi.fn()` when providing dependencies via constructor injection or factory functions — you own the whole mock. Choose `vi.spyOn()` when you need to observe or temporarily override a method on an existing object you don't fully control — a module export, a class instance method, `console`, `Math`, `Date`, or a partially-real dependency where you want most methods to be real but need to control one. Always restore spies in `afterEach` with `vi.restoreAllMocks()`.

---

## C — Common Pitfalls + Fix

### ❌ Not restoring spies — spy persists across tests

```typescript
// ❌ consoleSpy wraps console.error for the rest of the suite
it('test with spy', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  runCode()
  expect(consoleSpy).toHaveBeenCalled()
  // No restore — next test's console.error calls add to this spy ❌
})
```

**Fix:** Use `afterEach` restore or `mockRestore()` at end of test:

```typescript
// ✅ Option 1: afterEach
afterEach(() => { vi.restoreAllMocks() })

// ✅ Option 2: explicit restore at test end
it('test with spy', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  runCode()
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()   // restore console.error immediately ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Given an `AuditService` with `log(event, data)` (real implementation writes to DB), and an `OrderService.create(data)` that internally calls `auditService.log('order_created', data)`. Write tests using `vi.spyOn`: (1) `log` is called with correct event on order creation; (2) `log` is called once; (3) `create` still returns the created order (spy doesn't break real logic). Use `beforeEach`/`afterEach` correctly.

### Solution

```typescript
// src/services/audit.service.ts
export class AuditService {
  async log(event: string, data: unknown): Promise<void> {
    // writes to DB in production
  }
}

// src/services/order.service.ts
export class OrderService {
  constructor(private audit: AuditService) {}

  async create(data: { product: string; total: number }) {
    const order = { id: 'ord-1', ...data, createdAt: new Date() }
    await this.audit.log('order_created', order)
    return order
  }
}

// src/services/order.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuditService }                                     from './audit.service'
import { OrderService }                                     from './order.service'

describe('OrderService.create', () => {
  let auditService: AuditService
  let orderService: OrderService
  let logSpy:       ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    auditService = new AuditService()
    orderService = new OrderService(auditService)

    // Spy on real method — no-op the real DB write in tests
    logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs order_created event after creating an order', async () => {
    await orderService.create({ product: 'Widget', total: 999 })
    expect(logSpy).toHaveBeenCalledWith('order_created', expect.objectContaining({
      product: 'Widget',
      total:   999,
    }))
  })

  it('logs exactly once per create call', async () => {
    await orderService.create({ product: 'Widget', total: 999 })
    expect(logSpy).toHaveBeenCalledOnce()
  })

  it('returns the created order with id and timestamp', async () => {
    const order = await orderService.create({ product: 'Widget', total: 999 })
    expect(order).toMatchObject({ id: 'ord-1', product: 'Widget', total: 999 })
    expect(order.createdAt).toBeInstanceOf(Date)
  })
})
```

---

---

# 8 — Module Mocking — vi.mock()

---

## T — TL;DR

`vi.mock('module-path')` replaces an entire module with auto-mocked or factory-defined stubs — every exported function becomes a `vi.fn()`. Call `vi.mock()` at the top level of the test file (it gets hoisted automatically). Use the factory pattern `vi.mock('path', () => ({ ... }))` for precise control. Import the module after `vi.mock()` to get the mocked version.

---

## K — Key Concepts

```typescript
// ── vi.mock() is hoisted — always runs before imports ─────────────────────
// Vitest hoists vi.mock() calls to the top of the file at compile time.
// This means even if you write it after imports, it runs first.

import { describe, it, expect, vi }    from 'vitest'
import { createOrder }                 from './order.service'

// This vi.mock runs BEFORE the import above (hoisted by Vitest)
vi.mock('./db', () => ({
  db: {
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
    }
  }
}))

// Now db.order.create is a vi.fn() inside createOrder ✅
```

```typescript
// ── Factory pattern — recommended ─────────────────────────────────────────
vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
}))

// Import after vi.mock — gets the mocked version
import { sendEmail } from './email'

it('calls sendEmail', async () => {
  await notifyUser('mark@example.com')
  expect(sendEmail).toHaveBeenCalledWith('mark@example.com', expect.any(String))
})
```

```typescript
// ── Auto-mock — every export becomes vi.fn() with no return value ─────────
vi.mock('./prisma')   // no factory — Vitest auto-mocks all exports

import { prisma } from './prisma'
// prisma.user.findMany is now vi.fn() returning undefined

// Override in the test:
vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 1, name: 'Alice' }])
// vi.mocked() is a TypeScript helper that casts to vi.Mock with correct types
```

```typescript
// ── Mocking a module with a default export ────────────────────────────────
vi.mock('./config', () => ({
  default: {
    apiUrl:  'http://test-api.com',
    timeout: 1000,
  }
}))

import config from './config'
// config.apiUrl === 'http://test-api.com' ✅
```

```typescript
// ── Mocking third-party modules ───────────────────────────────────────────
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' })
  }))
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
    $disconnect: vi.fn(),
  }))
}))
```

```typescript
// ── vi.importActual — mock some, keep others real ─────────────────────────
vi.mock('./utils', async (importActual) => {
  const actual = await importActual<typeof import('./utils')>()
  return {
    ...actual,                           // keep all real exports
    generateId: vi.fn(() => 'test-id'),  // override only generateId
  }
})
```

```typescript
// ── Resetting module mocks between tests ──────────────────────────────────
import { prisma } from './prisma'

beforeEach(() => {
  vi.clearAllMocks()   // clear call counts on all vi.fn()s from vi.mock()
})

it('finds user', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, email: 'a@a.com' })
  const user = await getUser(1)
  expect(user.email).toBe('a@a.com')
})

it('returns null for missing user', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
  const user = await getUser(999)
  expect(user).toBeNull()
})
```

---

## W — Why It Matters

- `vi.mock()` is the only correct way to mock ES modules — you cannot reassign an ES module export with `import { fn } from './mod'; fn = vi.fn()` because ES module bindings are read-only. `vi.mock()` intercepts the module at the loader level before any code runs.
- The hoisting of `vi.mock()` solves the chicken-and-egg problem — the module under test imports its dependencies when it loads. You need the mock in place before that import. Hoisting ensures `vi.mock()` runs first regardless of where in the file you write it.
- `vi.importActual` for partial mocks is a practical escape hatch — when you need to mock `generateId` but keep `formatDate` and `validate` real, replacing the entire module with stubs means maintaining duplicates of all real functionality. `importActual` spreads the real module then overrides specific exports.

---

## I — Interview Q&A

### Q: Why is `vi.mock()` hoisted in Vitest and what would go wrong without hoisting?

**A:** When a module is imported, Node.js executes the module's top-level code immediately, including its own imports. The module under test imports `prisma` from `'./lib/prisma'` at load time. If `vi.mock('./lib/prisma')` ran after the import statement, `prisma` would already be the real module — the mock would have no effect on the already-evaluated import. Vitest hoists `vi.mock()` calls to before all imports using its transform pipeline (like Babel's `babel-plugin-jest-hoist`). This guarantees the mock is registered in the module registry before any module that depends on it is loaded. Without hoisting, you'd have to use dynamic `import()` inside tests to get mocked versions — which is verbose and error-prone.

---

## C — Common Pitfalls + Fix

### ❌ Calling `vi.mock()` inside a function or conditional — not hoisted correctly

```typescript
// ❌ vi.mock inside a function — NOT hoisted, executes too late
beforeEach(() => {
  vi.mock('./db')  // ← too late — module already imported ❌
})
```

**Fix:** Always call `vi.mock()` at the top level of the test file:

```typescript
// ✅ Top-level — hoisted before all imports
vi.mock('./db', () => ({
  db: { user: { findUnique: vi.fn() } }
}))

import { getUser } from './user.service'  // gets the mocked db ✅
```

---

## K — Coding Challenge + Solution

### Challenge

You have `src/services/auth.service.ts` that imports `bcrypt` (for `hash` and `compare`) and `prisma` (for `user.findUnique` and `user.create`). Mock both modules. Write tests for `register(email, password)`: (1) creates user with hashed password; (2) throws `DuplicateEmailError` if user exists; (3) calls `bcrypt.hash` with correct rounds. Mock `bcrypt.hash` to return `'$hashed$'` and `user.findUnique` to return null for new registrations.

### Solution

```typescript
// src/services/auth.service.ts
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

export class DuplicateEmailError extends Error {
  constructor(email: string) { super(`Email already in use: ${email}`) }
}

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new DuplicateEmailError(email)
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.create({ data: { email, passwordHash } })
}

// src/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('bcrypt', () => ({
  default: {
    hash:    vi.fn().mockResolvedValue('$hashed$'),
    compare: vi.fn(),
  }
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    }
  }
}))

import bcrypt            from 'bcrypt'
import { prisma }        from '../lib/prisma'
import { register, DuplicateEmailError } from './auth.service'

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(
      { id: 1, email: 'mark@example.com', passwordHash: '$hashed$', createdAt: new Date(), updatedAt: new Date() }
    )
  })

  it('creates user with hashed password', async () => {
    await register('mark@example.com', 'mypassword')
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'mark@example.com', passwordHash: '$hashed$' }
    })
  })

  it('hashes password with 12 rounds', async () => {
    await register('mark@example.com', 'mypassword')
    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12)
  })

  it('throws DuplicateEmailError when email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, email: 'mark@example.com' } as any)
    await expect(register('mark@example.com', 'pass')).rejects.toThrow(DuplicateEmailError)
  })

  it('does not call create when email exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as any)
    try { await register('mark@example.com', 'pass') } catch { /* expected */ }
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
```

---

---

# 9 — Global Mocking — vi.stubGlobal and vi.stubEnv

---

## T — TL;DR

`vi.stubGlobal(name, value)` replaces a global variable (`fetch`, `window`, `localStorage`, custom globals) for the duration of a test. `vi.stubEnv(key, value)` safely sets `process.env` variables without polluting other tests. Both are automatically restored with `vi.unstubAllGlobals()` / `vi.unstubAllEnvs()`. Use these instead of direct `process.env.KEY = 'val'` assignment — the stubs restore cleanly.

---

## K — Key Concepts

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

// ── vi.stubGlobal — replace a global ─────────────────────────────────────
// Replace fetch with a mock
vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ id: 1 }), { status: 200 })
))

// Restored with:
vi.unstubAllGlobals()
```

```typescript
// ── Mocking fetch for HTTP calls ──────────────────────────────────────────
describe('fetchUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns user on 200', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: '1', name: 'Alice' }), { status: 200 })
    )
    const user = await fetchUser('1')
    expect(user).toEqual({ id: '1', name: 'Alice' })
  })

  it('throws on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 404 })
    )
    await expect(fetchUser('missing')).rejects.toThrow('Not found')
  })

  it('calls fetch with correct URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )
    await fetchUser('42')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/42'),
      expect.any(Object)
    )
  })
})
```

```typescript
// ── vi.stubEnv — safe environment variable overrides ─────────────────────
describe('with test env vars', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/testdb')
    vi.stubEnv('JWT_SECRET',   'test-secret')
    vi.stubEnv('NODE_ENV',     'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()   // restores all env vars to their original values
  })

  it('reads the database URL', () => {
    const url = getDatabaseUrl()
    expect(url).toBe('postgresql://localhost/testdb')
  })
})

// vs the WRONG approach:
// ❌ Direct assignment — leaks across tests, no auto-restore
// process.env.JWT_SECRET = 'test'   // persists until next overwrite ❌

// ✅ vi.stubEnv — tracked and restored automatically
vi.stubEnv('JWT_SECRET', 'test')
```

```typescript
// ── Mocking custom globals (browser environment) ──────────────────────────
// @vitest-environment jsdom

vi.stubGlobal('localStorage', {
  getItem:    vi.fn().mockReturnValue(null),
  setItem:    vi.fn(),
  removeItem: vi.fn(),
  clear:      vi.fn(),
})

it('reads from localStorage', () => {
  vi.mocked(localStorage.getItem).mockReturnValue('stored-token')
  const token = getStoredToken()
  expect(localStorage.getItem).toHaveBeenCalledWith('auth_token')
  expect(token).toBe('stored-token')
})
```

```typescript
// ── Mocking window.location ────────────────────────────────────────────────
// @vitest-environment jsdom

it('redirects to login on 401', () => {
  vi.stubGlobal('location', {
    ...window.location,
    assign: vi.fn()
  })

  handleUnauthorized()

  expect(window.location.assign).toHaveBeenCalledWith('/login')

  vi.unstubAllGlobals()
})
```

```typescript
// ── Feature flag via env var ───────────────────────────────────────────────
function isFeatureEnabled(flag: string): boolean {
  return process.env[`FEATURE_${flag.toUpperCase()}`] === 'true'
}

describe('isFeatureEnabled', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('returns true when env var is "true"', () => {
    vi.stubEnv('FEATURE_NEW_CHECKOUT', 'true')
    expect(isFeatureEnabled('new_checkout')).toBe(true)
  })

  it('returns false when env var is absent', () => {
    // No stub — env var doesn't exist
    expect(isFeatureEnabled('new_checkout')).toBe(false)
  })

  it('returns false for any value other than "true"', () => {
    vi.stubEnv('FEATURE_NEW_CHECKOUT', '1')
    expect(isFeatureEnabled('new_checkout')).toBe(false)
  })
})
```

---

## W — Why It Matters

- `vi.stubEnv` over direct assignment is a correctness issue — `process.env.KEY = 'value'` modifies the process environment and never rolls back unless you manually delete it. In a test suite with 300 tests, one stray `process.env.NODE_ENV = 'production'` in test 50 changes behaviour for tests 51–300. `vi.stubEnv` tracks and restores automatically.
- Stubbing `fetch` globally is essential for unit tests that call HTTP APIs — without it, the test makes real network calls, fails in CI with no internet access, and takes seconds per test. A stubbed `fetch` is instant and deterministic.
- The difference between `vi.stubGlobal` and direct assignment on `globalThis`: `vi.stubGlobal` tracks what it replaced so `vi.unstubAllGlobals()` can restore the original. Direct assignment loses the original value.

---

## I — Interview Q&A

### Q: Why is `vi.stubEnv` preferred over directly assigning to `process.env`?

**A:** Direct `process.env` assignment has no cleanup mechanism — if you set `process.env.NODE_ENV = 'production'` in a test, every subsequent test in the same process sees `'production'` unless explicitly reset. In a large suite this causes subtle, hard-to-trace failures where tests pass in isolation but fail in sequence. `vi.stubEnv(key, value)` registers the original value before overwriting it, so `vi.unstubAllEnvs()` in `afterEach` can restore the exact original — including `undefined` if the variable didn't exist. This makes env var overrides atomic and test-scoped rather than process-scoped.

---

## C — Common Pitfalls + Fix

### ❌ Not restoring stubbed globals — bleeds into other tests

```typescript
// ❌ fetch is stubbed but never restored
it('fetches data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
  await fetchData()
  // No vi.unstubAllGlobals() — next test's fetch is still the mock ❌
})
```

**Fix:**

```typescript
// ✅
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write `getRemoteConfig(env: string)` that calls `fetch(\`https://config.api.com/${env}\`)` and returns parsed JSON. Test: (1) returns config on 200; (2) throws `ConfigError` on non-200; (3) called with correct URL; (4) uses different results for different `env` values. Stub `fetch` globally. Use `vi.stubEnv` to set an `API_BASE_URL` env var.

### Solution

```typescript
// src/utils/remote-config.ts
export class ConfigError extends Error {
  constructor(public status: number) {
    super(`Failed to load config: HTTP ${status}`)
  }
}

export async function getRemoteConfig(env: string) {
  const base = process.env.API_BASE_URL ?? 'https://config.api.com'
  const res  = await fetch(`${base}/${env}`)
  if (!res.ok) throw new ConfigError(res.status)
  return res.json()
}

// src/utils/remote-config.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRemoteConfig, ConfigError }                     from './remote-config'

describe('getRemoteConfig', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://test-config.internal')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns parsed config on 200', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ theme: 'dark', lang: 'en' }), { status: 200 })
    )
    const config = await getRemoteConfig('production')
    expect(config).toEqual({ theme: 'dark', lang: 'en' })
  })

  it('calls fetch with the correct URL from env var', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))
    await getRemoteConfig('staging')
    expect(fetch).toHaveBeenCalledWith('https://test-config.internal/staging')
  })

  it('throws ConfigError on non-200 response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }))
    await expect(getRemoteConfig('production')).rejects.toThrow(ConfigError)
    await expect(getRemoteConfig('production')).rejects.toThrow('HTTP 503')
  })

  it('returns different config for different env params', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ env: 'prod' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ env: 'dev'  }), { status: 200 }))

    const prod = await getRemoteConfig('production')
    const dev  = await getRemoteConfig('development')

    expect(prod).toEqual({ env: 'prod' })
    expect(dev).toEqual({ env: 'dev' })
  })
})
```

---

---

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