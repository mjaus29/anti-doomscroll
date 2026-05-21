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
