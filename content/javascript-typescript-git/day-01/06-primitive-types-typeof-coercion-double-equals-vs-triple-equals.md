# 6 — Primitive Types, typeof, Coercion, == vs ===

---

## T — TL;DR

JavaScript has 7 primitives: `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`. `typeof` returns a string label — except `typeof null === 'object'` (a historic bug). `==` coerces types before comparing; `===` never coerces. Always use `===`. Know the coercion rules so you can read legacy code, not to write new code with `==`.

---

## K — Key Concepts

```javascript
// ── The 7 primitive types ─────────────────────────────────────────────────
typeof 'hello'        // 'string'
typeof 42             // 'number'
typeof 42n            // 'bigint'
typeof true           // 'boolean'
typeof undefined      // 'undefined'
typeof null           // 'object'  ← historic bug, not fixable
typeof Symbol('id')   // 'symbol'

// ── Non-primitives ────────────────────────────────────────────────────────
typeof {}             // 'object'
typeof []             // 'object'  ← arrays are objects
typeof function(){}   // 'function'
typeof class {}       // 'function'

// ── Safe undeclared variable check ────────────────────────────────────────
// ❌ ReferenceError if MISSING_VAR was never declared
if (MISSING_VAR) {}

// ✅ typeof never throws, even for undeclared variables
if (typeof MISSING_VAR !== 'undefined') {
  // safe to use MISSING_VAR here
}
```

```javascript
// ── null vs undefined ─────────────────────────────────────────────────────
let x           // undefined — declared but no value assigned
let y = null    // null — explicitly no value (intentional absence)

// Checking for null — use strict equality
if (x === null)       // false — x is undefined, not null
if (x == null)        // true  — == treats null and undefined as equal (one valid == use)
if (x === undefined)  // true

// Best practice: use !== null and !== undefined explicitly, or:
if (x == null)  { /* handles both null and undefined */ }
```

```javascript
// ── == vs === coercion rules ──────────────────────────────────────────────
// Always use === — these exist so you can read legacy code

// Type coercion with ==:
0   == ''        // true  ('' coerced to 0)
0   == '0'       // true  (string '0' → number 0)
0   == false     // true  (false → 0)
''  == false     // true  (both → 0)
1   == true      // true  (true → 1)
null == undefined  // true  (special case)
null == 0          // false (null only == undefined)
NaN == NaN         // false (NaN is not equal to anything, including itself)

// With ===: never coerces, type must match:
0   === ''       // false
0   === false    // false
null === undefined  // false

// ── instanceof — check prototype chain ───────────────────────────────────
[] instanceof Array    // true
[] instanceof Object   // true (arrays are objects)
{} instanceof Object   // true
'hello' instanceof String  // false — primitive, not a String object

// Better way to check array:
Array.isArray([])   // true ✅
Array.isArray({})   // false ✅
```

```javascript
// ── Falsy and truthy values ───────────────────────────────────────────────
// Falsy (evaluate to false in boolean context):
false, 0, -0, 0n, '', null, undefined, NaN

// Truthy — everything else, including:
'0'          // truthy (non-empty string)
[]           // truthy (empty array is truthy!)
{}           // truthy (empty object is truthy!)
-1           // truthy (non-zero number)
'false'      // truthy (non-empty string)

// Common bug:
const count = 0
if (count) { /* skipped — 0 is falsy */ }   // ❌
if (count !== undefined) { /* runs */ }      // ✅ explicit check
```

---

## W — Why It Matters

- `typeof null === 'object'` is a language bug from 1995 that can never be fixed — code that checks `typeof x === 'object'` to detect objects must also check `x !== null`. This shows up in every JavaScript codebase.
- `==` coercion rules are inconsistent and surprising — `'' == false` is `true` but `'0' == false` is also `true`, and `'' == '0'` is `false`. There's no mental model that makes these consistent. Use `===` always.
- The falsy empty array `[]` gotcha trips up developers from other languages — `if ([])` is `true` in JavaScript, because all objects are truthy. Use `arr.length === 0` to check for an empty array.

---

## I — Interview Q&A

### Q: Why is `typeof null === 'object'` and how do you safely check for null?

**A:** It's a bug in JavaScript's original implementation — null was represented internally with an all-zeros bit pattern, and the type tag for objects was also zero. The language couldn't fix it without breaking existing code. To safely check for null: use `x === null` (strict equality). To check "is this a non-null object", use `x !== null && typeof x === 'object'`. To distinguish null from undefined, `x == null` (loose equality) returns true for both null and undefined — this is one of the few acceptable uses of `==`.

---

## C — Common Pitfalls + Fix

### ❌ Using truthiness to check for zero or empty string

```javascript
// ❌ 0 and '' are valid values but are falsy
function processCount(count) {
  if (count) {             // skips when count === 0 ❌
    console.log(count)
  }
}
processCount(0)   // nothing logged — bug

// ✅ Explicit check
function processCount(count) {
  if (count !== undefined && count !== null) {
    console.log(count)     // logs 0 correctly ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

What does each expression evaluate to? Explain why.

```javascript
typeof null
typeof []
typeof undefined
null == undefined
null === undefined
0 == false
0 === false
[] == false
NaN === NaN
Array.isArray([])
```

### Solution

```javascript
typeof null          // 'object'  — historic bug
typeof []            // 'object'  — arrays are objects
typeof undefined     // 'undefined'
null == undefined    // true      — special case in == spec
null === undefined   // false     — different types
0 == false           // true      — false coerces to 0
0 === false          // false     — number vs boolean
[] == false          // true      — [] → '' → 0, false → 0
NaN === NaN          // false     — NaN is not equal to itself (use Number.isNaN)
Array.isArray([])    // true      — correct way to check arrays
```

---

---
