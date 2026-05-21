# 8 — Number Methods, Math, NaN, Infinity, EPSILON

---

## T — TL;DR

JavaScript uses IEEE 754 double-precision floating point for all numbers — this causes `0.1 + 0.2 !== 0.3`. `NaN` is the result of invalid numeric operations and is not equal to itself. Use `Number.isNaN` (not global `isNaN`). `Number.isFinite`, `Number.isInteger`, `Number.EPSILON`, and `Number.MAX_SAFE_INTEGER` are essential guards. `Math` provides standard math utilities.

---

## K — Key Concepts

```javascript
// ── Floating point gotcha ──────────────────────────────────────────────────
0.1 + 0.2 === 0.3       // false
0.1 + 0.2               // 0.30000000000000004

// Fix: compare with EPSILON tolerance
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON  // true ✅

// Or round for display
(0.1 + 0.2).toFixed(2)   // '0.30' (string)
Number((0.1 + 0.2).toFixed(2))  // 0.3 (number)
```

```javascript
// ── NaN — Not a Number ────────────────────────────────────────────────────
Number('abc')       // NaN
parseInt('hello')   // NaN
0 / 0               // NaN
Math.sqrt(-1)       // NaN

// NaN is the ONLY value not equal to itself:
NaN === NaN         // false ← the defining quirk
NaN !== NaN         // true

// ❌ Global isNaN — coerces argument first (misleading)
isNaN('hello')      // true  — coerces 'hello' to NaN, then checks
isNaN(undefined)    // true  — coerces undefined to NaN
isNaN('123')        // false — coerces '123' to 123, not NaN

// ✅ Number.isNaN — no coercion, true ONLY for actual NaN
Number.isNaN(NaN)       // true ✅
Number.isNaN('hello')   // false ✅ (not NaN, it's a string)
Number.isNaN(undefined) // false ✅

// Safe NaN check
const result = Number(someInput)
if (Number.isNaN(result)) {
  console.error('Invalid number input')
}
```

```javascript
// ── Infinity ──────────────────────────────────────────────────────────────
1 / 0            // Infinity
-1 / 0           // -Infinity
Infinity > 9999  // true

// ❌ Global isFinite — coerces
isFinite('42')   // true (coerces '42' to 42)
isFinite(null)   // true (coerces null to 0)

// ✅ Number.isFinite — no coercion
Number.isFinite(42)         // true ✅
Number.isFinite(Infinity)   // false ✅
Number.isFinite('42')       // false ✅ (it's a string, not a number)
Number.isFinite(NaN)        // false ✅

// ── Number.isInteger ──────────────────────────────────────────────────────
Number.isInteger(42)      // true
Number.isInteger(42.0)    // true  (42.0 === 42 in JS)
Number.isInteger(42.5)    // false
Number.isInteger('42')    // false (not a number)

// ── Safe integer range ────────────────────────────────────────────────────
Number.MAX_SAFE_INTEGER    // 9007199254740991 = 2^53 - 1
Number.MIN_SAFE_INTEGER    // -9007199254740991
Number.isSafeInteger(9007199254740991)   // true
Number.isSafeInteger(9007199254740992)   // false — precision lost

// For large integers: use BigInt
const big = 9007199254740992n  // BigInt (n suffix)
```

```javascript
// ── Math object ───────────────────────────────────────────────────────────
Math.round(4.5)    // 5   (rounds half up)
Math.ceil(4.1)     // 5   (round up always)
Math.floor(4.9)    // 4   (round down always)
Math.trunc(4.9)    // 4   (truncate decimal, towards zero)
Math.trunc(-4.9)   // -4  (different from floor for negatives)

Math.abs(-5)       // 5
Math.min(3, 1, 2)  // 1
Math.max(3, 1, 2)  // 3
Math.min(...[3, 1, 2])  // 1 (spread array)

Math.pow(2, 10)    // 1024  (same as 2 ** 10)
Math.sqrt(16)      // 4
Math.cbrt(27)      // 3

Math.PI            // 3.141592653589793
Math.E             // 2.718281828459045

Math.random()      // random float [0, 1)  — not cryptographically secure
// Random integer in range [min, max] inclusive:
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
randInt(1, 6)      // dice roll ✅

Math.log(Math.E)   // 1
Math.log2(8)       // 3
Math.log10(1000)   // 3
```

---

## W — Why It Matters

- `0.1 + 0.2 !== 0.3` is the most-cited JavaScript "bug" — it's not a bug, it's IEEE 754 floating point, present in all languages. For money and precision-sensitive calculations, use integers (cents instead of dollars) or a `Decimal` library.
- `Number.isNaN` vs `isNaN` is a real footgun — `isNaN('')` returns `false`, `isNaN(null)` returns `false`, `isNaN('abc')` returns `true`. These results make no sense for checking if something is the actual NaN value. Always use `Number.isNaN`.
- `Number.MAX_SAFE_INTEGER` matters for database IDs — PostgreSQL `BIGINT` can exceed JavaScript's safe integer range. Large IDs from the database may lose precision when parsed as JS numbers. Use `BigInt` or keep them as strings.

---

## I — Interview Q&A

### Q: What is the difference between `isNaN()` and `Number.isNaN()`?

**A:** The global `isNaN(value)` coerces its argument to a number first, then checks if it's NaN. This gives surprising results: `isNaN('hello')` is `true` (because `Number('hello')` is `NaN`), but `isNaN('')` is `false` (because `Number('')` is `0`). `Number.isNaN(value)` does no coercion — it returns `true` only if the value is exactly the `NaN` primitive. `Number.isNaN('hello')` is `false` because `'hello'` is a string, not `NaN`. Always use `Number.isNaN` when you want to check if a value is actually `NaN`.

---

## C — Common Pitfalls + Fix

### ❌ Comparing floating point values directly

```javascript
// ❌ Floating point imprecision
const price = 0.1 + 0.2
if (price === 0.3) {   // false — never true!
  checkout()
}

// ✅ Use EPSILON tolerance for equality
if (Math.abs(price - 0.3) < Number.EPSILON) {
  checkout()
}

// ✅ For money: work in integer cents
const cents = 10 + 20   // 30 cents — exact integer arithmetic
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `safeParseInt(value)` function that: parses a value to a number, returns `null` if the result is `NaN` or not a safe integer, and uses `Number.isNaN`, `Number.isFinite`, and `Number.isSafeInteger`.

### Solution

```javascript
function safeParseInt(value) {
  const n = Number(value)

  if (Number.isNaN(n))         return null   // couldn't parse
  if (!Number.isFinite(n))     return null   // Infinity or -Infinity
  if (!Number.isSafeInteger(n)) return null  // too large or has decimals

  return n
}

console.log(safeParseInt('42'))          // 42
console.log(safeParseInt('3.14'))        // null — not integer
console.log(safeParseInt('hello'))       // null — NaN
console.log(safeParseInt(Infinity))      // null — not finite
console.log(safeParseInt(9e20))          // null — exceeds MAX_SAFE_INTEGER
console.log(safeParseInt(0))             // 0 ✅ — 0 is safe
```

---

---
