# 11 — Coverage Introduction

---

## T — TL;DR

Coverage measures what percentage of your source code is exercised by tests. Vitest uses `@vitest/coverage-v8` (Node's built-in V8 coverage) or Istanbul. The four metrics are: lines, statements, branches (if/else paths), and functions. Coverage is a floor, not a ceiling — 80% coverage with meaningful tests beats 100% with tests that only check `expect(true).toBe(true)`.

---

## K — Key Concepts

```bash
# ── Setup ─────────────────────────────────────────────────────────────────
npm install --save-dev @vitest/coverage-v8

# ── Run with coverage ─────────────────────────────────────────────────────
npx vitest run --coverage

# Output:
# Coverage report from v8
# ────────────────────────────────────────────────────────
# File              | % Stmts | % Branch | % Funcs | % Lines
# ────────────────────────────────────────────────────────
# src/utils         |         |          |         |
#   format.ts       |   92.30 |    83.33 |  100.00 |   92.30
#   validate.ts     |   75.00 |    50.00 |   66.66 |   75.00
# ────────────────────────────────────────────────────────
# All files         |   84.61 |    70.00 |   85.71 |   84.61
```

```typescript
// ── Coverage config in vitest.config.ts ───────────────────────────────────
export default defineConfig({
  test: {
    coverage: {
      provider:  'v8',                 // or 'istanbul'
      reporter:  ['text', 'html', 'json', 'lcov'],
      // text:  terminal table (above)
      // html:  open coverage/index.html in browser for line-by-line view
      // json:  machine-readable (for CI reporting tools)
      // lcov:  for Codecov, Coveralls, GitHub Actions integrations

      include: ['src/**/*.ts', 'src/**/*.tsx'],  // what to measure
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/index.ts',     // re-export barrels — not meaningful to cover
      ],

      // Fail CI if thresholds not met
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,
      },

      // Generate coverage report even when tests fail
      reportOnFailure: true,

      // Show all files (including untested ones) not just covered ones
      all: true,
    },
  },
})
```

```typescript
// ── Understanding the four metrics ────────────────────────────────────────

function processOrder(order: Order) {
  // Line 1 — statement
  const tax = order.total * 0.1          // branch: always executed

  // Lines 2–6 — branch (if/else)
  if (order.status === 'pending') {       // branch A
    notify(order.id)                      // only if 'pending'
  } else {
    archive(order.id)                     // only if not 'pending'
  }

  return { tax, processed: true }
}

// Statements: each executable line
// Lines:      each source line (similar to statements)
// Branches:   each path of conditionals (true + false of every if/ternary/&&/||)
// Functions:  each function definition called at least once

// Example: testing only processOrder({ status: 'pending' })
// Statements: ~83% (all lines except archive())
// Branches:   50% (true branch covered, false branch not)
// Functions:  depends on whether notify/archive are counted
```

```typescript
// ── Istanbul ignore comment — exclude specific lines ──────────────────────
function debugHelper() {
  /* istanbul ignore next */
  if (process.env.NODE_ENV === 'debug') {
    console.log('internal debug state:', state)   // excluded from coverage
  }
}

// Use sparingly — for: impossible branches, debug-only code, generated code
// Don't use to artificially inflate coverage numbers
```

---

## W — Why It Matters

- Branch coverage reveals the most impactful untested paths — a function with 50% branch coverage has an entire `else` branch that's never tested. That untested path is where bugs hide. 80% line coverage can mask 50% branch coverage if you don't check both.
- The `html` reporter is the most useful for developers — open `coverage/index.html` in a browser and click into any file to see exactly which lines are red (uncovered). This is more actionable than the terminal table and directs your next test to write.
- Coverage thresholds in CI enforce a floor — without them, coverage only ever decreases as features are added without tests. A 80% threshold means PRs that reduce coverage below 80% fail CI, prompting the author to add tests before merging.

---

## I — Interview Q&A

### Q: What is branch coverage and why is it more important than line coverage?

**A:** Line coverage (or statement coverage) measures whether a line of code was executed at least once during tests. Branch coverage measures whether each possible path through a conditional was taken. A simple `if (isAdmin)` has two branches: the `true` path and the `false` path. If your tests only call the function with `isAdmin = true`, you have 100% line coverage for that line but only 50% branch coverage — the `false` path (and any bugs in it) was never tested. Branch coverage is more important because bugs overwhelmingly live in conditional logic: the edge case that hits the `else`, the `null` check that's wrong, the fallback path that was never manually tested. A target of 70–80% branch coverage is a practical goal that catches most logic bugs without requiring exhaustive combinatorial testing.

---

## C — Common Pitfalls + Fix

### ❌ Achieving 100% coverage by testing trivial code — false confidence

```typescript
// ❌ This achieves 100% coverage but tests nothing meaningful
it('exists', () => {
  expect(typeof processOrder).toBe('function')   // covers the function declaration
})
// processOrder's logic is completely untested ❌ — 100% coverage = 0% safety
```

**Fix:** Write tests that exercise real behaviour and edge cases:

```typescript
// ✅ Covers real branches and behaviour
it('calculates 10% tax', () => {
  const result = processOrder({ total: 1000, status: 'confirmed' })
  expect(result.tax).toBe(100)
})

it('notifies for pending orders', () => {
  processOrder({ total: 500, status: 'pending' })
  expect(notify).toHaveBeenCalledWith(order.id)
})

it('archives non-pending orders', () => {
  processOrder({ total: 500, status: 'delivered' })
  expect(archive).toHaveBeenCalledWith(order.id)
})
// 100% branch coverage with meaningful assertions ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `src/utils/discount.ts` with a `calculateDiscount(total, code)` function: 20% off for `'SAVE20'`, 10% off for `'SAVE10'`, 0 discount for unknown code, throws `InvalidCodeError` if code is empty. Write tests achieving 100% branch coverage. Show the expected coverage output.

### Solution

```typescript
// src/utils/discount.ts
export class InvalidCodeError extends Error {
  constructor() { super('Discount code cannot be empty') }
}

export function calculateDiscount(total: number, code: string): number {
  if (!code) throw new InvalidCodeError()
  if (code === 'SAVE20') return total * 0.2
  if (code === 'SAVE10') return total * 0.1
  return 0
}

// src/utils/discount.test.ts
import { describe, it, expect }                from 'vitest'
import { calculateDiscount, InvalidCodeError } from './discount'

describe('calculateDiscount', () => {
  it('returns 20% for SAVE20', () => {
    expect(calculateDiscount(1000, 'SAVE20')).toBe(200)
  })

  it('returns 10% for SAVE10', () => {
    expect(calculateDiscount(1000, 'SAVE10')).toBe(100)
  })

  it('returns 0 for unknown code', () => {
    expect(calculateDiscount(1000, 'UNKNOWN')).toBe(0)
  })

  it('throws InvalidCodeError for empty code', () => {
    expect(() => calculateDiscount(1000, '')).toThrow(InvalidCodeError)
    expect(() => calculateDiscount(1000, '')).toThrow('Discount code cannot be empty')
  })
})

// Expected coverage for discount.ts:
// Stmts: 100% | Branches: 100% | Funcs: 100% | Lines: 100%
// All four if branches covered:
//   empty code     → throw (tested)
//   SAVE20         → 20% (tested)
//   SAVE10         → 10% (tested)
//   unknown code   → 0   (tested)
```

---

---
