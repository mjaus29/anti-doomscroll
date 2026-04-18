# 15 — `Error.cause` (ES2022)

## T — TL;DR

`Error.cause` (ES2022) lets you **chain errors** — attach the original error as the `cause` of a new, more descriptive error.

```js
throw new Error("Failed to load user", { cause: originalError })
```

This preserves the original stack trace while adding context.

## K — Key Concepts

### The Problem Before `Error.cause`

```js
try {
  await fetchUser()
} catch (e) {
  // Option 1: rethrow — loses context about what we were doing
  throw e

  // Option 2: new error — loses the original error
  throw new Error("Failed to load user")

  // Option 3: string concatenation — ugly, loses stack trace
  throw new Error(`Failed to load user: ${e.message}`)
}
```

### The Solution

```js
async function getUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`)
    return await response.json()
  } catch (error) {
    throw new Error(`Failed to fetch user ${id}`, { cause: error })
  }
}
```

### Accessing the Cause

```js
try {
  await getUser(42)
} catch (error) {
  console.log(error.message)       // "Failed to fetch user 42"
  console.log(error.cause)         // original fetch error
  console.log(error.cause.message) // "NetworkError" or whatever the original was
}
```

### Chaining Multiple Levels

```js
async function getUserProfile(id) {
  try {
    const user = await getUser(id)
    return await getProfile(user.profileId)
  } catch (error) {
    throw new Error("Failed to load profile", { cause: error })
  }
}

try {
  await getUserProfile(1)
} catch (e) {
  console.log(e.message)              // "Failed to load profile"
  console.log(e.cause.message)        // "Failed to fetch user 1"
  console.log(e.cause.cause.message)  // original network error
}
```

### Works with All Error Types

```js
throw new TypeError("Invalid input", { cause: originalError })
throw new RangeError("Out of bounds", { cause: originalError })
```

### `cause` Can Be Anything

```js
throw new Error("Validation failed", {
  cause: { field: "email", reason: "invalid format" },
})
```

But best practice: keep `cause` as an `Error` object for stack trace continuity.

## W — Why It Matters

- Before `Error.cause`, error chaining in JS was awkward and lossy.
- In production systems, the original error is critical for debugging — a wrapped error without the cause loses the root problem.
- This pattern is standard in Java, Python, C# — now JS has it too.
- Clean error chains make debugging production issues much faster.

## I — Interview Questions with Answers

### Q1: What is `Error.cause`?

**A:** An ES2022 feature that lets you attach an original error to a new error via `new Error("message", { cause: originalError })`. This enables error chaining without losing the original stack trace.

### Q2: Why is error chaining useful?

**A:** It lets you add context ("what were we doing?") while preserving the root cause ("what actually went wrong?"). This is essential for debugging in layered applications.

### Q3: Can `cause` be a non-Error value?

**A:** Yes — it can be any value. But using an `Error` object is best practice because it preserves the stack trace.

## C — Common Pitfalls with Fix

### Pitfall: Forgetting to include `cause` when re-throwing

```js
catch (error) {
  throw new Error("Something failed") // original error is lost!
}
```

**Fix:**

```js
catch (error) {
  throw new Error("Something failed", { cause: error })
}
```

### Pitfall: Logging only the top-level error

```js
catch (error) {
  console.log(error.message) // only shows the wrapper message
}
```

**Fix:** Also log or inspect `error.cause`:

```js
catch (error) {
  console.log(error.message)
  if (error.cause) console.log("Caused by:", error.cause)
}
```

### Pitfall: Not checking if `cause` exists before accessing it

```js
error.cause.message // TypeError if cause is undefined
```

**Fix:** Use optional chaining: `error.cause?.message`.

## K — Coding Challenge with Solution

### Challenge

Write a function `readConfig(path)` that:
1. Tries to read a file (simulate with `JSON.parse`).
2. If it fails, throws a new error with message `"Failed to read config: <path>"` and attaches the original error as `cause`.
3. The caller catches and logs both the message and the cause message.

### Solution

```js
function readConfig(path) {
  try {
    return JSON.parse("{ invalid json }")
  } catch (error) {
    throw new Error(`Failed to read config: ${path}`, { cause: error })
  }
}

try {
  readConfig("/app/config.json")
} catch (error) {
  console.log(error.message)
  // "Failed to read config: /app/config.json"

  console.log(error.cause?.message)
  // "Expected property name or '}' in JSON at position 2"
  // (exact message varies by engine)
}
```

---
