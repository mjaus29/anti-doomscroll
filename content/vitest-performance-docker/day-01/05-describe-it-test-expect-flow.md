# 5 — describe → it/test → expect Flow

---

## T — TL;DR

Every Vitest test follows the same three-level structure: `describe` groups related tests, `it`/`test` defines a single test case, and `expect` makes the assertion. `it` and `test` are identical — `it` reads as natural English ("it returns the sum"), `test` reads as a statement ("test: add function"). Use whichever your team prefers, but be consistent.

---

## K — Key Concepts

```typescript
// ── The three-level structure ─────────────────────────────────────────────
import { describe, it, test, expect } from 'vitest'

// describe — a named group of related tests
// Usually named after the module, function, or class being tested
describe('formatPrice', () => {

  // it — one test case, one behaviour
  // "it [verb] [expected outcome]" — reads as a sentence
  it('formats cents as a dollar string', () => {
    expect(formatPrice(1999)).toBe('$19.99')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })

  // test — identical to it, just different wording preference
  test('throws for negative values', () => {
    expect(() => formatPrice(-1)).toThrow('Price cannot be negative')
  })
})
```

```typescript
// ── Nesting describe blocks ────────────────────────────────────────────────
describe('UserService', () => {

  describe('createUser', () => {
    it('creates a user with valid data', () => { /* ... */ })
    it('throws if email already exists', () => { /* ... */ })
    it('hashes the password', () => { /* ... */ })
  })

  describe('findUser', () => {
    it('returns the user by id', () => { /* ... */ })
    it('returns null if not found', () => { /* ... */ })
  })
})

// Output in terminal:
// ✓ UserService
//   ✓ createUser
//     ✓ creates a user with valid data
//     ✓ throws if email already exists
//     ✓ hashes the password
//   ✓ findUser
//     ✓ returns the user by id
//     ✓ returns null if not found
```

```typescript
// ── The Arrange-Act-Assert (AAA) pattern ──────────────────────────────────
it('calculates the order total', () => {
  // Arrange: set up the data / state
  const items = [
    { price: 1000, quantity: 2 },
    { price: 500,  quantity: 1 },
  ]

  // Act: call the function under test
  const total = calculateTotal(items)

  // Assert: verify the result
  expect(total).toBe(2500)
})

// AAA makes tests readable and shows intent clearly:
// What is the input? (Arrange)
// What is being called? (Act)
// What should the result be? (Assert)
```

```typescript
// ── skip and only — focus testing ─────────────────────────────────────────

// Skip a test temporarily (marked as skipped, not failed)
it.skip('handles unicode names', () => {
  // TODO: implement unicode support
  expect(formatName('José')).toBe('José')
})

// Run ONLY this test — skip all others in this file
it.only('urgent regression test', () => {
  expect(criticalFunction()).toBe(true)
})
// ⚠️ Never commit .only — it hides failures in all other tests

// Nested describe with only:
describe.only('createUser', () => {
  // only this describe block runs
})

// Pending test — placeholder, marked as todo
it.todo('handle unicode email addresses')
// Appears in output as "todo" — not a failure, a reminder
```

```typescript
// ── each — data-driven tests ──────────────────────────────────────────────
import { describe, it, expect } from 'vitest'

describe('formatPrice', () => {
  it.each([
    [0,    '$0.00'],
    [100,  '$1.00'],
    [1999, '$19.99'],
    [5000, '$50.00'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatPrice(cents)).toBe(expected)
  })
})

// Named object form (cleaner):
it.each([
  { cents: 0,    expected: '$0.00'  },
  { cents: 1999, expected: '$19.99' },
])('formats $cents as $expected', ({ cents, expected }) => {
  expect(formatPrice(cents)).toBe(expected)
})
```

---

## W — Why It Matters

- The `describe` → `it` → `expect` nesting creates readable test output — when a test fails, you read `UserService > createUser > throws if email already exists` and immediately know what broke and where. A flat list of test names without grouping is much harder to parse in a 200-test suite.
- `it.each` eliminates duplicated test code — instead of writing 6 identical tests with different inputs, one `it.each` table covers all cases. Adding a new case is one line. Without `it.each`, you're likely to copy-paste tests and forget to update the assertion in one of them.
- `.only` in committed code is one of the most dangerous testing mistakes — it silently disables all other tests in the file. A CI run that passes with `.only` committed may be passing because 90% of tests were skipped. Enable lint rules to ban `it.only` and `describe.only` in committed files.

---

## I — Interview Q&A

### Q: What is the difference between `it` and `test` in Vitest, and when would you use each?

**A:** `it` and `test` are aliases — they are functionally identical. The distinction is stylistic. `it` reads as the beginning of a natural English sentence: "it returns the sum", "it throws for negative values". This follows the RSpec/BDD convention from Ruby where the test description completes the sentence "it [description]". `test` reads as a direct statement: "test: add returns sum". Some teams prefer `test` for clarity that this is a test function, especially when test names are longer or more complex. Most Vitest and Jest projects use `it` inside `describe` blocks (because the `describe` name provides context) and `test` at the top level (without a describe). Both are valid — pick one convention and apply it consistently across the codebase.

---

## C — Common Pitfalls + Fix

### ❌ Multiple assertions testing multiple behaviours in one `it` — hard to diagnose failures

```typescript
// ❌ Three different behaviours in one test — which one failed?
it('formatPrice works', () => {
  expect(formatPrice(0)).toBe('$0.00')
  expect(formatPrice(1999)).toBe('$19.99')
  expect(formatPrice(-1)).toThrow()  // ← if this fails, the name gives no info
})
```

**Fix:** One behaviour per `it`, or use `it.each` for multiple inputs of the same behaviour:

```typescript
// ✅ One concern per test
it('formats zero as $0.00', () => {
  expect(formatPrice(0)).toBe('$0.00')
})

it('formats 1999 cents as $19.99', () => {
  expect(formatPrice(1999)).toBe('$19.99')
})

it('throws for negative values', () => {
  expect(() => formatPrice(-1)).toThrow()
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `describe` block for a `clamp(value, min, max)` function (returns value clamped between min and max). Include: correct clamping, clamping at min boundary, clamping at max boundary, returning value when within bounds. Use AAA pattern. Add one `it.todo` for a planned case.

### Solution

```typescript
// src/utils/clamp.ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// src/utils/clamp.test.ts
import { describe, it, expect } from 'vitest'
import { clamp }                from './clamp'

describe('clamp', () => {
  it('returns min when value is below min', () => {
    // Arrange
    const value = -5, min = 0, max = 10

    // Act
    const result = clamp(value, min, max)

    // Assert
    expect(result).toBe(0)
  })

  it('returns max when value is above max', () => {
    expect(clamp(20, 0, 10)).toBe(10)
  })

  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when value equals min (boundary)', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('returns max when value equals max (boundary)', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it.todo('handles float values')
})
```

---

---
