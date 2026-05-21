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
