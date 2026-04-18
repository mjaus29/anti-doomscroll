# 9 — Optional Chaining (`?.`)

## T — TL;DR

`?.` safely accesses deeply nested properties. If any part in the chain is `null` or `undefined`, it **short-circuits and returns `undefined`** instead of throwing a `TypeError`.

```js
const name = user?.profile?.name // safe, returns undefined if any part is nullish
```

## K — Key Concepts

### The Problem It Solves

```js
const user = { profile: null }

// Without optional chaining — throws TypeError
user.profile.name // TypeError: Cannot read properties of null

// With optional chaining — returns undefined
user?.profile?.name // undefined
```

### Three Forms

**1. Property access: `?.`**

```js
const user = null
user?.name // undefined (no error)
```

**2. Bracket notation: `?.[]`**

```js
const key = "name"
user?.[key] // undefined
```

**3. Method calls: `?.()`**

```js
const obj = { greet: null }
obj.greet?.() // undefined (doesn't throw)

const obj2 = { greet() { return "hi" } }
obj2.greet?.() // "hi"
```

### Short-Circuit Behavior

Once `?.` hits `null` or `undefined`, the **entire rest of the chain** is skipped:

```js
const user = null
user?.address.street.zip // undefined — .address.street.zip is never evaluated
```

### Only Checks for `null` and `undefined`

```js
const obj = { name: "" }
obj?.name?.toUpperCase() // "" — empty string is not nullish, so .toUpperCase() is called on ""
// Wait: "".toUpperCase() = "", so result is ""

const obj2 = { count: 0 }
obj2?.count?.toFixed(2) // "0.00" — 0 is not nullish
```

### With `delete`

```js
delete user?.name // safe — does nothing if user is nullish
```

### Does NOT Work on the Left Side of Assignment

```js
user?.name = "Mark" // SyntaxError
```

### Combining with Nullish Coalescing

```js
const city = user?.address?.city ?? "Unknown"
// If any part is nullish → "Unknown"
```

## W — Why It Matters

- Eliminates verbose `if (obj && obj.prop && obj.prop.nested)` checks.
- Used heavily in API response handling where data shapes are uncertain.
- Prevents `TypeError: Cannot read properties of undefined` — one of the most common JS errors.
- Clean, modern, readable.

## I — Interview Questions with Answers

### Q1: What does `?.` do?

**A:** Optional chaining. It accesses a property or calls a method only if the value before `?.` is not `null` or `undefined`. Otherwise it short-circuits and returns `undefined`.

### Q2: What values trigger optional chaining?

**A:** Only `null` and `undefined`. Other falsy values like `0`, `""`, `false` do NOT trigger it.

### Q3: What does `a?.b.c.d` return if `a` is `null`?

**A:** `undefined`. The entire chain after `?.` is skipped.

### Q4: Can you use optional chaining for assignment?

**A:** No. `obj?.prop = value` is a `SyntaxError`.

## C — Common Pitfalls with Fix

### Pitfall: Overusing `?.` everywhere

```js
user?.name?.toString()?.length // too defensive — if user exists, name is always a string
```

**Fix:** Only use `?.` where the value can actually be `null`/`undefined`.

### Pitfall: Thinking `?.` checks for falsy values

```js
const obj = { count: 0 }
obj?.count?.toFixed(2) // "0.00" — 0 is not nullish
```

**Fix:** `?.` only cares about `null` and `undefined`.

### Pitfall: Not providing a fallback

```js
const name = user?.profile?.name // could be undefined
```

**Fix:** Combine with `??`:

```js
const name = user?.profile?.name ?? "Anonymous"
```

## K — Coding Challenge with Solution

### Challenge

```js
const data = {
  users: [
    { name: "Mark", address: { city: "Manila" } },
    { name: "Alex", address: null },
  ],
}

console.log(data.users[0]?.address?.city)
console.log(data.users[1]?.address?.city)
console.log(data.users[2]?.address?.city)
console.log(data.users[0]?.getAge?.())
```

### Solution

```js
data.users[0]?.address?.city   // "Manila"
data.users[1]?.address?.city   // undefined — address is null
data.users[2]?.address?.city   // undefined — users[2] is undefined
data.users[0]?.getAge?.()      // undefined — getAge doesn't exist
```

---
