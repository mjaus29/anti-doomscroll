# 10 — Nullish Coalescing (`??`)

## T — TL;DR

`??` returns the **right-hand side** only when the left-hand side is **`null` or `undefined`**. It is a safer alternative to `||` for default values.

```js
value ?? "default"
```

| Left value | `\|\|` result | `??` result |
|-----------|------------|-----------|
| `null` | `"default"` | `"default"` |
| `undefined` | `"default"` | `"default"` |
| `0` | `"default"` | `0` |
| `""` | `"default"` | `""` |
| `false` | `"default"` | `false` |

## K — Key Concepts

### `||` vs `??`

```js
// || treats ALL falsy values as "missing"
0 || 10         // 10
"" || "default" // "default"
false || true   // true

// ?? only treats null/undefined as "missing"
0 ?? 10         // 0
"" ?? "default" // ""
false ?? true   // false
null ?? 10      // 10
undefined ?? 10 // 10
```

### Real-World Use

```js
function createUser(options) {
  const name = options.name ?? "Anonymous"
  const age = options.age ?? 0
  const active = options.active ?? true
  return { name, age, active }
}

createUser({ name: "", age: 0, active: false })
// { name: "", age: 0, active: false } — all values preserved with ??
// With || this would be { name: "Anonymous", age: 0, active: true } — wrong!
```

### Cannot Mix with `&&` or `||` Without Parentheses

```js
// SyntaxError:
// null || undefined ?? "default"

// Must use parentheses:
(null || undefined) ?? "default" // "default"
```

This is intentional — it prevents ambiguous precedence.

### Chaining

```js
const value = a ?? b ?? c ?? "final default"
// Returns the first non-nullish value, or "final default"
```

### With Optional Chaining

This is the most common combination:

```js
const city = response?.data?.user?.address?.city ?? "Unknown"
```

## W — Why It Matters

- `||` has been the default-value operator for years, but it has a bug: it treats `0`, `""`, and `false` as "missing."
- `??` fixes this. It is the **correct** operator for default values in almost all cases.
- APIs and configs frequently use `0`, `""`, and `false` as valid values.
- Modern codebases use `??` extensively.

## I — Interview Questions with Answers

### Q1: What is the difference between `||` and `??`?

**A:** `||` returns the right side for any **falsy** left value (including `0`, `""`, `false`). `??` returns the right side only for **`null` or `undefined`**.

### Q2: When should you use `??` over `||`?

**A:** When `0`, `""`, or `false` are valid values that should not be replaced by a default.

### Q3: Can you use `??` with `||` in the same expression without parentheses?

**A:** No. It's a `SyntaxError`. You must use parentheses to clarify precedence.

## C — Common Pitfalls with Fix

### Pitfall: Using `||` for defaults when `0` or `""` is valid

```js
const port = config.port || 3000
// If config.port is 0, you get 3000 — wrong!
```

**Fix:**

```js
const port = config.port ?? 3000
// If config.port is 0, you get 0 — correct
```

### Pitfall: Mixing `??` with `||` or `&&` without parentheses

```js
a || b ?? c // SyntaxError
```

**Fix:** `(a || b) ?? c` or `a || (b ?? c)`.

## K — Coding Challenge with Solution

### Challenge

```js
console.log(0 ?? 42)
console.log("" ?? "default")
console.log(null ?? "fallback")
console.log(undefined ?? null ?? "end")
console.log(false ?? true)
console.log(0 || 42)
console.log("" || "default")
```

### Solution

```js
0 ?? 42               // 0
"" ?? "default"       // ""
null ?? "fallback"    // "fallback"
undefined ?? null ?? "end" // null (undefined is nullish → null, null is not nullish for second ??... wait)
// Actually: undefined ?? null → null, then null ?? "end" → "end"
// So: "end"
false ?? true         // false
0 || 42               // 42
"" || "default"       // "default"
```

Corrected output:

```
0
""
"fallback"
"end"
false
42
"default"
```

---
