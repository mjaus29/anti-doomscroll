# 5 — `typeof`

## T — TL;DR

`typeof` is a unary operator that returns a **string** indicating the type of a value.

```js
typeof 42          // "number"
typeof "hello"     // "string"
typeof true        // "boolean"
typeof undefined   // "undefined"
typeof null        // "object"    ← famous bug
typeof {}          // "object"
typeof []          // "object"    ← arrays are objects
typeof function(){} // "function"
typeof Symbol()    // "symbol"
typeof 42n         // "bigint"
```

## K — Key Concepts

### The Full Table

| Expression | Result |
|------------|--------|
| `typeof undefined` | `"undefined"` |
| `typeof null` | `"object"` ⚠️ |
| `typeof true` | `"boolean"` |
| `typeof 42` | `"number"` |
| `typeof 42n` | `"bigint"` |
| `typeof "hello"` | `"string"` |
| `typeof Symbol()` | `"symbol"` |
| `typeof {}` | `"object"` |
| `typeof []` | `"object"` |
| `typeof function(){}` | `"function"` |
| `typeof NaN` | `"number"` ⚠️ |
| `typeof Infinity` | `"number"` |

### Key Gotchas

**1. `typeof null === "object"`**

This is a bug from JavaScript's first implementation. It has never been fixed for backward compatibility. To check for `null`:

```js
value === null
```

**2. Arrays return `"object"`**

```js
typeof [] // "object"
```

To check for arrays:

```js
Array.isArray([])  // true
Array.isArray({})  // false
```

**3. `NaN` is of type `"number"`**

```js
typeof NaN // "number"
```

To check for `NaN`:

```js
Number.isNaN(NaN) // true — use this, not global isNaN()
```

**4. `typeof` on undeclared variables does not throw**

```js
typeof someUndeclaredVariable // "undefined" — no ReferenceError
```

This is actually useful for feature detection:

```js
if (typeof window !== "undefined") {
  // running in a browser
}
```

### `typeof` as a Guard

```js
function double(value) {
  if (typeof value !== "number") {
    throw new TypeError("Expected a number")
  }
  return value * 2
}
```

## W — Why It Matters

- `typeof` is the most basic runtime type check in JS.
- You need to know its quirks (`null`, `NaN`, arrays) to avoid bugs.
- It's used in type guards, feature detection, and input validation.
- Interview questions exploit `typeof null` and `typeof NaN` constantly.

## I — Interview Questions with Answers

### Q1: What does `typeof null` return and why?

**A:** `"object"`. It's a historical bug. In the original JS implementation, values had type tags and `null`'s tag was `0` (same as objects).

### Q2: How do you check if a value is an array?

**A:** Use `Array.isArray(value)`. Do not use `typeof` because arrays return `"object"`.

### Q3: What does `typeof NaN` return?

**A:** `"number"`. `NaN` stands for "Not-a-Number" but its type is `number`. Use `Number.isNaN()` to detect it.

### Q4: What does `typeof` return for a function?

**A:** `"function"`. This is the only object subtype that gets its own `typeof` result.

## C — Common Pitfalls with Fix

### Pitfall: Using `typeof` to check for null

```js
typeof null === "null" // false!
```

**Fix:** Use `value === null`.

### Pitfall: Using `typeof` to check for arrays

```js
typeof [] === "array" // false!
```

**Fix:** Use `Array.isArray([])`.

### Pitfall: Using global `isNaN()` instead of `Number.isNaN()`

```js
isNaN("hello")        // true — coerces string to NaN first
Number.isNaN("hello") // false — strict, no coercion
```

**Fix:** Always use `Number.isNaN()`.

## K — Coding Challenge with Solution

### Challenge

What does each return?

```js
typeof "hello"
typeof 0
typeof undefined
typeof null
typeof []
typeof function(){}
typeof NaN
typeof typeof 42
```

### Solution

```js
typeof "hello"         // "string"
typeof 0               // "number"
typeof undefined       // "undefined"
typeof null            // "object"
typeof []              // "object"
typeof function(){}    // "function"
typeof NaN             // "number"
typeof typeof 42       // "string" — typeof 42 = "number", typeof "number" = "string"
```

---
