# 1 — Narrowing

---

## T — TL;DR

**Narrowing** is TypeScript's ability to refine a broad type to a more specific one inside a conditional block. Each check — `typeof`, `instanceof`, `in`, equality, truthiness — teaches TypeScript what the type must be in that branch. TypeScript tracks this through control flow automatically.

---

## K — Key Concepts

```typescript
// ── typeof narrowing ──────────────────────────────────────────────────────
function format(value: string | number | boolean | null): string {
  if (typeof value === 'string')  return value.toUpperCase()   // string ✅
  if (typeof value === 'number')  return value.toFixed(2)      // number ✅
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'  // boolean ✅
  return 'null'   // TypeScript knows: only null left ✅
}

// typeof limitations:
// typeof null === 'object' — always check null separately
// typeof fn === 'function' — only way to check functions
// typeof [] === 'object' — can't distinguish array from object
```

```typescript
// ── instanceof narrowing ──────────────────────────────────────────────────
class HttpError  { constructor(public status: number, public message: string) {} }
class NetworkError { constructor(public message: string, public retryAfter?: number) {} }

function handle(err: HttpError | NetworkError | Error) {
  if (err instanceof HttpError)   return `HTTP ${err.status}: ${err.message}`
  if (err instanceof NetworkError) return `Network: retry in ${err.retryAfter}s`
  return `Error: ${err.message}`   // Error — only base class left ✅
}

// ── in narrowing — check if property exists ───────────────────────────────
interface Cat { meow(): void; indoor: boolean }
interface Dog { bark(): void; breed: string }

function speak(animal: Cat | Dog) {
  if ('meow' in animal) return animal.meow()   // Cat ✅
  return animal.bark()                          // Dog ✅
}
```

```typescript
// ── Equality narrowing ────────────────────────────────────────────────────
function process(val: string | null | undefined) {
  if (val === null)      return 'null'
  if (val === undefined) return 'undefined'
  return val.toUpperCase()   // string ✅
}

// Loose equality: == null catches both null AND undefined
function processLoose(val: string | null | undefined) {
  if (val == null) return 'empty'    // null | undefined
  return val.toUpperCase()            // string ✅
}

// ── Truthiness narrowing ──────────────────────────────────────────────────
function greet(name: string | null | undefined) {
  if (name) return `Hello, ${name}`   // string (non-empty) ✅
  return 'Hello, stranger'
}
// ⚠️ Truthiness fails for 0, '', false — use != null for those cases
function increment(count: number | null) {
  if (count != null) return count + 1  // 0 is still valid ✅
  return 0
}
```

```typescript
// ── Assignment narrowing ──────────────────────────────────────────────────
// TypeScript narrows after assignment to a more specific type
let id: string | number
id = 1
id.toFixed(2)   // number ✅ — TypeScript knows it was assigned a number

id = 'abc'
id.toUpperCase()  // string ✅

// ── Control flow analysis ─────────────────────────────────────────────────
function getLength(input: string | string[]) {
  // TypeScript tracks BOTH branches simultaneously
  const result = Array.isArray(input)
    ? input.join(', ')   // string[] ✅
    : input.toUpperCase() // string ✅
  return result   // string (both branches return string)
}

// Early return narrows the rest of the function
function processUser(user: User | null): string {
  if (!user) return 'No user'   // null handled
  return user.name               // User ✅ — null eliminated below this point
}
```

---

## W — Why It Matters

- TypeScript's control flow analysis is what makes `strict: true` usable — without narrowing, you'd need to cast everywhere. With it, a simple `if (typeof x === 'string')` unlocks all string methods below.
- `in` narrowing for discriminating interfaces (no shared discriminant field) is the only tool that works without modifying the original types — useful when typing third-party objects.
- Assignment narrowing means `let x: string | number = 1; x.toFixed()` works without a cast — TypeScript tracks the last assignment, not just the declared type.

---

## I — Interview Q&A

### Q: What is control flow analysis in TypeScript?

**A:** TypeScript's compiler analyses every code path through a function — it tracks which types are possible at each point based on the checks that have run. After `if (typeof x === 'string') { ... }`, TypeScript knows `x` is `string` inside the block and narrows its type accordingly. After the block, TypeScript knows the `string` case was handled and narrows to the remaining types. This happens for `typeof`, `instanceof`, `in`, equality checks, truthiness, assignments, and custom type guards. The result: you don't need casts in most cases — just write the checks that your code needs anyway, and TypeScript infers the narrowed type.

---

## C — Common Pitfalls + Fix

### ❌ Truthiness narrowing silently passes `0`, `''`, `false`

```typescript
// ❌ 0 and '' are valid values but falsy — truthiness eliminates them
function double(n: number | null): number {
  if (n) return n * 2    // ❌ n=0 falls through to return 0 below
  return 0               // both null AND 0 reach here
}
double(0)   // returns 0 — looks correct but bypassed the double ❌

// ✅ Use explicit null check
function double2(n: number | null): number {
  if (n != null) return n * 2   // 0 is handled correctly ✅
  return 0
}
double2(0)   // returns 0 (from n * 2) ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `stringify(value: string | number | boolean | null | undefined | object): string` using all narrowing techniques — typeof, Array.isArray, instanceof, and equality.

### Solution

```typescript
function stringify(
  value: string | number | boolean | null | undefined | Date | object
): string {
  if (value === null)        return 'null'
  if (value === undefined)   return 'undefined'
  if (typeof value === 'string')  return `"${value}"`
  if (typeof value === 'number')  return isNaN(value) ? 'NaN' : String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date)      return value.toISOString()
  if (Array.isArray(value))       return `[${value.map(stringify).join(', ')}]`
  // object — at this point TypeScript knows it's a plain object
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${stringify(v as any)}`)
  return `{ ${entries.join(', ')} }`
}

stringify(null)           // 'null'
stringify(42)             // '42'
stringify('hello')        // '"hello"'
stringify(new Date())     // ISO string
stringify([1, 'a', true]) // '[1, "a", true]'
```

---

---
