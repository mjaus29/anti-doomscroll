# 6 — Assertion Patterns — expect Matchers

---

## T — TL;DR

`expect(value).matcher()` is how you assert. Vitest ships with 50+ matchers covering equality, truthiness, numbers, strings, arrays, objects, errors, and async values. Know the ten most common matchers deeply — they cover 95% of all assertions. Use the right matcher for the job: `toBe` for primitives, `toEqual` for objects, `toContain` for arrays/strings.

---

## K — Key Concepts

```typescript
import { expect } from 'vitest'

// ── Equality ──────────────────────────────────────────────────────────────

// toBe — strict equality (===) — use for primitives
expect(2 + 2).toBe(4)
expect('hello').toBe('hello')
expect(null).toBe(null)

// toEqual — deep equality — use for objects and arrays
expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })      // ✅ deep equal
expect({ a: 1, b: 2 }).toBe({ a: 1, b: 2 })          // ❌ fails — different references

// toStrictEqual — deep equal + checks undefined properties + class type
expect({ a: 1, b: undefined }).toEqual({ a: 1 })       // ✅ passes (toEqual ignores undefined)
expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 }) // ❌ fails (toStrictEqual catches it)

// toMatchObject — partial object match (subset check)
expect({ id: 1, name: 'Mark', role: 'admin' }).toMatchObject({ name: 'Mark' })
// Passes even though id and role are not in the expected object ✅
```

```typescript
// ── Truthiness ────────────────────────────────────────────────────────────
expect(true).toBeTruthy()        // truthy: true, 1, 'str', {}
expect(false).toBeFalsy()        // falsy: false, 0, '', null, undefined, NaN
expect(value).toBeNull()         // strictly null
expect(value).toBeUndefined()    // strictly undefined
expect(value).toBeDefined()      // not undefined
expect(value).not.toBeNull()     // negation with .not

// ── Numbers ───────────────────────────────────────────────────────────────
expect(5).toBeGreaterThan(4)
expect(5).toBeGreaterThanOrEqual(5)
expect(3).toBeLessThan(4)
expect(3).toBeLessThanOrEqual(3)
expect(0.1 + 0.2).toBeCloseTo(0.3, 5)  // floating point: 5 decimal places precision

// ── Strings ───────────────────────────────────────────────────────────────
expect('hello world').toContain('world')
expect('hello').toMatch(/^hel/)                    // regex
expect('hello').toMatch('ell')                     // substring
expect('hello').toHaveLength(5)
expect(' trimmed ').not.toBe('trimmed')            // leading/trailing space

// ── Arrays ────────────────────────────────────────────────────────────────
expect([1, 2, 3]).toContain(2)               // contains element
expect([1, 2, 3]).toHaveLength(3)
expect([1, 2, 3]).toEqual(expect.arrayContaining([3, 1]))  // contains these (any order)

// ── Objects ───────────────────────────────────────────────────────────────
expect({ a: 1 }).toHaveProperty('a')          // key exists
expect({ a: 1 }).toHaveProperty('a', 1)       // key exists with value
expect({ a: { b: 2 } }).toHaveProperty('a.b', 2)  // nested path
```

```typescript
// ── Errors ────────────────────────────────────────────────────────────────
function riskyFunction() {
  throw new Error('Something went wrong')
}

// Wrap in arrow function — never call directly in expect()
expect(() => riskyFunction()).toThrow()
expect(() => riskyFunction()).toThrow('Something went wrong')  // message match
expect(() => riskyFunction()).toThrow(Error)                   // class match
expect(() => riskyFunction()).toThrow(/went wrong/i)           // regex match

// ❌ Wrong — calling directly, error not caught by expect
// expect(riskyFunction()).toThrow()  ← the throw happens before expect sees it

// Async errors:
await expect(async () => {
  await fetchUser('nonexistent')
}).rejects.toThrow('User not found')

// Or:
await expect(fetchUser('nonexistent')).rejects.toThrow('User not found')
```

```typescript
// ── Async assertions ──────────────────────────────────────────────────────
// Always await async assertions — forgot await = test passes vacuously ❌

// resolves — the promise resolves with a value
await expect(Promise.resolve(42)).resolves.toBe(42)
await expect(fetchUser('u1')).resolves.toMatchObject({ id: 'u1' })

// rejects — the promise rejects
await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail')
await expect(fetchUser('missing')).rejects.toThrow()

// Both require await — the assertion itself is a Promise ✅
```

```typescript
// ── expect.objectContaining / expect.arrayContaining ──────────────────────
// Use inside toEqual to do partial matching within deep equality

const user = { id: 1, name: 'Mark', createdAt: new Date() }

// Check only what matters — ignore createdAt
expect(user).toEqual(
  expect.objectContaining({ id: 1, name: 'Mark' })
)

// Array of objects — check specific properties
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob',   role: 'user' },
]
expect(users).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: 'Alice', role: 'admin' })
  ])
)
```

---

## W — Why It Matters

- `toBe` vs `toEqual` is the most common source of test confusion — `toBe` uses `===`, so two objects with the same properties fail (`{}` !== `{}`). Always use `toEqual` for objects and arrays. Use `toBe` for strings, numbers, booleans, and null.
- `toThrow()` requires wrapping in a function — this is a consistent gotcha. `expect(fn()).toThrow()` calls `fn()` first, the error propagates before `expect` can catch it, and the test itself throws. `expect(() => fn()).toThrow()` wraps the call so `expect` catches it.
- Missing `await` on async assertions is a silent test failure — `expect(fetchUser()).resolves.toBe(...)` without `await` creates a floating Promise. The assertion may not run before the test ends, so the test passes even if the assertion would fail. Always `await expect(...)`.

---

## I — Interview Q&A

### Q: When would you use `toEqual` vs `toStrictEqual` vs `toMatchObject`?

**A:** `toEqual` performs deep equality ignoring `undefined` properties — `{ a: 1, b: undefined }` equals `{ a: 1 }` with `toEqual`. Use it for most object comparisons when you own both objects. `toStrictEqual` is stricter — it checks that `undefined` properties are explicitly present, and that objects created from different classes are not considered equal. Use it when the distinction between `undefined` being present and absent matters. `toMatchObject` checks that the received object contains at least the expected properties — extra properties in the received object are allowed. Use it when testing a subset of an object's properties (e.g. checking an API response has the right `id` and `name` without caring about `createdAt` or `updatedAt`). For most unit tests, `toEqual` and `toMatchObject` cover the majority of cases.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `await` on async `resolves`/`rejects` assertions

```typescript
// ❌ Test passes even if assertion fails — floating promise
it('fetches user', () => {
  expect(getUser('1')).resolves.toEqual({ id: '1' })  // no await ❌
})
```

**Fix:** Always `await` async assertions:

```typescript
// ✅
it('fetches user', async () => {
  await expect(getUser('1')).resolves.toEqual({ id: '1' })
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write tests for a `parseUserInput` function that: (1) returns `{ name: string, age: number }` for valid input; (2) throws `ValidationError` with message "Name required" if name is empty; (3) throws "Age must be positive" if age ≤ 0; (4) the returned object's `name` is trimmed. Use the correct matcher for each case.

### Solution

```typescript
// src/utils/parse-user-input.ts
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function parseUserInput(input: { name: string; age: number }) {
  if (!input.name.trim()) throw new ValidationError('Name required')
  if (input.age <= 0)     throw new ValidationError('Age must be positive')
  return { name: input.name.trim(), age: input.age }
}

// src/utils/parse-user-input.test.ts
import { describe, it, expect } from 'vitest'
import { parseUserInput }       from './parse-user-input'

describe('parseUserInput', () => {
  it('returns parsed object for valid input', () => {
    const result = parseUserInput({ name: 'Mark', age: 25 })
    expect(result).toEqual({ name: 'Mark', age: 25 })
  })

  it('trims whitespace from name', () => {
    const result = parseUserInput({ name: '  Mark  ', age: 25 })
    expect(result.name).toBe('Mark')
  })

  it('throws ValidationError when name is empty', () => {
    expect(() => parseUserInput({ name: '', age: 25 }))
      .toThrow('Name required')
  })

  it('throws ValidationError class for empty name', () => {
    expect(() => parseUserInput({ name: '   ', age: 25 }))
      .toThrow(ValidationError)
  })

  it('throws for age of zero', () => {
    expect(() => parseUserInput({ name: 'Mark', age: 0 }))
      .toThrow('Age must be positive')
  })

  it('throws for negative age', () => {
    expect(() => parseUserInput({ name: 'Mark', age: -1 }))
      .toThrow('Age must be positive')
  })
})
```

---

---
