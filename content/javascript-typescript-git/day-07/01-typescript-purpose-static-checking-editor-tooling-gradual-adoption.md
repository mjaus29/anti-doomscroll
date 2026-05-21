# 1 — TypeScript Purpose — Static Checking, Editor Tooling, Gradual Adoption

---

## T — TL;DR

TypeScript adds a **static type system** on top of JavaScript. It catches type errors at compile time (before your code runs), provides world-class IDE autocomplete and refactoring, and compiles to plain JavaScript. It's a superset — all valid JavaScript is valid TypeScript, enabling gradual adoption.

---

## K — Key Concepts

```typescript
// ── What TypeScript catches that JavaScript doesn't ────────────────────────
// JavaScript — error only at runtime
function greet(user) {
  return user.naem.toUpperCase()   // typo: 'naem' — crashes at runtime ❌
}

// TypeScript — error at compile time, before shipping
function greet(user: { name: string }) {
  return user.naem.toUpperCase()
  //          ^^^^
  // TS2551: Property 'naem' does not exist. Did you mean 'name'? ✅
}
```

```typescript
// ── Compile-time safety examples ───────────────────────────────────────────
// Calling with wrong argument type
function add(a: number, b: number) { return a + b }
add('1', 2)
// TS2345: Argument of type 'string' is not assignable to parameter of type 'number'

// Missing required argument
add(1)
// TS2554: Expected 2 arguments, but got 1

// Non-existent property on object
const user = { name: 'Mark', age: 28 }
console.log(user.email)
// TS2339: Property 'email' does not exist on type '{ name: string; age: number }'

// All of these would be silent at runtime in JavaScript (returning undefined)
```

```typescript
// ── Editor tooling — the daily value ──────────────────────────────────────
// IntelliSense: autocomplete knows the shape of every object
// Refactoring: rename a type → all usages updated automatically
// Go to definition: jump to the type of any variable instantly
// Inline docs: hover shows JSDoc + type signature in editor
// Error highlighting: red underlines before you save, let alone run

// ── TypeScript as a superset of JavaScript ────────────────────────────────
// .js → .ts: rename the file. That's it for step 1.
// Gradual adoption: start with allowJs: true + checkJs: false
// Add types incrementally to the files you change most
// Use // @ts-check in .js files for lightweight checking without full TS

// @ts-check (JSDoc-based type checking — no compilation needed)
/**
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
function multiply(x, y) {
  return x * y  // checked by TypeScript Language Server ✅
}
```

```
── TypeScript's value proposition ────────────────────────────────────────────

Without TypeScript:
  - Bugs found in production
  - Autocomplete guesses from variable names
  - Refactoring requires grep + manual verification
  - Onboarding requires reading source or docs

With TypeScript:
  - Bugs found in editor before commit
  - Autocomplete knows every field of every object
  - Rename symbol safely refactors all usages
  - Types are living documentation that never goes stale
```

---

## W — Why It Matters

- TypeScript is the de facto standard for production JavaScript in 2025 — React, Next.js, Prisma, tRPC, Zod all ship with first-class TypeScript support and expect typed consumers.
- The ROI is asymmetric — TypeScript setup takes ~30 minutes; it catches bugs that would take hours to debug in production. At scale (team, months, codebase growth) the advantage compounds.
- Gradual adoption removes the "all or nothing" barrier — you can add TypeScript to a file-by-file basis, turning on strict checks progressively.

---

## I — Interview Q&A

### Q: What does TypeScript add over JavaScript, and what does it not change?

**A:** TypeScript adds: (1) a static type system — types are checked at compile time before the code runs, (2) type annotations and inference — explicit or inferred types on variables, parameters, and return values, (3) language features that compile down — enums, decorators, namespace. TypeScript does NOT change JavaScript runtime behaviour — it compiles to plain JavaScript, all types are erased. `tsc` output runs in any JavaScript environment. TypeScript can't catch runtime errors (incorrect API responses, `JSON.parse` results) unless you validate them explicitly (e.g., with Zod).

---

## C — Common Pitfalls + Fix

### ❌ Thinking TypeScript prevents all runtime errors

```typescript
// TypeScript checks compile-time types — it can't verify runtime data
async function getUser(id: number): Promise<{ name: string }> {
  const res  = await fetch(`/api/users/${id}`)
  return res.json()   // TS trusts this return type — but API could return anything ❌
}

// ✅ Validate runtime data with Zod (Day 15) or type guards
import { z } from 'zod'
const UserSchema = z.object({ name: z.string() })
async function getUserSafe(id: number) {
  const res  = await fetch(`/api/users/${id}`)
  const data = await res.json()
  return UserSchema.parse(data)   // runtime validation + TS type ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Take a plain JavaScript function and convert it to TypeScript: `function formatCurrency(amount, currency, locale)`. Add types, show the editor benefit, and demonstrate a compile-time error.

### Solution

```typescript
// Before: plain JS — no safety
function formatCurrency(amount, currency, locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

// After: TypeScript — safe
function formatCurrency(
  amount:   number,
  currency: string,
  locale:   string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

formatCurrency(9.99, 'USD')             // ✅ '$ 9.99'
formatCurrency('9.99', 'USD')           // ❌ TS2345: string not assignable to number
formatCurrency(9.99, 'USD', 'en-US', 'extra')  // ❌ TS2554: Expected 2-3 args, got 4
```

---

---
