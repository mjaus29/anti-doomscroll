# 6 — `==` vs `===`

## T — TL;DR

| Operator | Name | Coercion? |
|----------|------|-----------|
| `==` | Loose equality | Yes — converts types first |
| `===` | Strict equality | No — types must match |

**Always use `===` unless you have a specific reason for `==`.**

## K — Key Concepts

### Strict Equality (`===`)

No coercion. If the types differ, it immediately returns `false`.

```js
5 === 5         // true
5 === "5"       // false — different types
null === undefined // false
NaN === NaN     // false — NaN is not equal to itself
```

### Loose Equality (`==`)

Coerces operands to the same type before comparing. The rules are complex:

```js
5 == "5"          // true — "5" coerced to 5
0 == false        // true — false coerced to 0
"" == false       // true — both coerce to 0
null == undefined // true — special rule
null == 0         // false — null only == undefined
1 == true         // true — true coerced to 1
```

### The Coercion Algorithm (Simplified)

1. If types are the same → behave like `===`.
2. `null == undefined` → `true` (and nothing else).
3. Number vs String → convert string to number.
4. Boolean vs anything → convert boolean to number first.
5. Object vs primitive → call `ToPrimitive` on object.

### `null` and `undefined` Special Case

```js
null == undefined   // true
null == null        // true
undefined == undefined // true
null == 0           // false
null == ""          // false
null == false       // false
```

`null` and `undefined` are only `==` to each other and themselves.

This is actually the **one legitimate use** of `==`:

```js
// Instead of:
if (value === null || value === undefined)

// You can write:
if (value == null) // catches both null and undefined
```

### `NaN` Is Not Equal to Anything

```js
NaN === NaN  // false
NaN == NaN   // false
```

To check: `Number.isNaN(value)` or `Object.is(NaN, NaN)` → `true`.

### `Object.is()`

Like `===` but fixes two edge cases:

```js
Object.is(NaN, NaN)   // true (=== gives false)
Object.is(0, -0)      // false (=== gives true)
```

## W — Why It Matters

- `==` coercion rules are the most common source of unexpected behavior in JS.
- Using `===` eliminates an entire class of bugs.
- The `null == undefined` pattern is useful but should be a conscious choice.
- Interviewers use `==` questions to gauge how deeply you understand JS.

## I — Interview Questions with Answers

### Q1: What is the difference between `==` and `===`?

**A:** `===` (strict equality) compares without type coercion — types must match. `==` (loose equality) coerces operands to the same type first. Always prefer `===`.

### Q2: When would you use `==`?

**A:** The main legitimate case: `value == null` to check for both `null` and `undefined` in one expression.

### Q3: Why is `NaN !== NaN`?

**A:** By the IEEE 754 floating-point specification, `NaN` is not equal to anything, including itself. Use `Number.isNaN()` to check.

### Q4: What does `"" == false` return?

**A:** `true`. `false` coerces to `0`, `""` coerces to `0`, and `0 === 0`.

## C — Common Pitfalls with Fix

### Pitfall: Using `==` by habit

```js
0 == "" // true — probably not what you wanted
```

**Fix:** Always use `===`.

### Pitfall: Checking `NaN` with `===`

```js
const result = parseInt("abc")
result === NaN // false — always false!
```

**Fix:** `Number.isNaN(result)`.

### Pitfall: Thinking `null == false`

```js
null == false // false — null only == undefined
```

**Fix:** Know the special rule: `null` is only loosely equal to `undefined`.

## K — Coding Challenge with Solution

### Challenge

Predict `true` or `false`:

```js
1 === "1"
1 == "1"
null === undefined
null == undefined
NaN === NaN
"" == false
"" === false
0 == null
```

### Solution

```js
1 === "1"          // false — different types
1 == "1"           // true — "1" coerced to 1
null === undefined // false — different types
null == undefined  // true — special rule
NaN === NaN        // false — NaN is never equal to itself
"" == false        // true — both coerce to 0
"" === false       // false — different types
0 == null          // false — null only == undefined
```

---
