# 16 — `throw`

## T — TL;DR

`throw` stops execution and sends an error up the call stack. It can throw **any value**, but you should always throw `Error` objects.

```js
throw new Error("Something went wrong")
```

## K — Key Concepts

### Basic Usage

```js
function divide(a, b) {
  if (b === 0) {
    throw new Error("Division by zero")
  }
  return a / b
}
```

When `throw` executes:
1. Execution stops immediately in the current function.
2. The error propagates up the call stack.
3. If a `try`/`catch` is found, it catches the error.
4. If no `try`/`catch` exists, the program crashes (or the promise rejects).

### You Can Throw Anything

```js
throw "error"           // string — avoid
throw 42                // number — avoid
throw { msg: "fail" }   // object — avoid
throw new Error("fail") // Error — always do this
```

**Always throw `Error` objects** because:
- They have `.message`, `.name`, `.stack`.
- They support `Error.cause`.
- They work with `instanceof` checks.
- They give you a stack trace for debugging.

### Throwing Custom Errors

```js
class ValidationError extends Error {
  constructor(field, message) {
    super(message)
    this.name = "ValidationError"
    this.field = field
  }
}

function validateAge(age) {
  if (typeof age !== "number") {
    throw new TypeError("Age must be a number")
  }
  if (age < 0 || age > 150) {
    throw new RangeError("Age must be between 0 and 150")
  }
  if (age < 18) {
    throw new ValidationError("age", "Must be at least 18")
  }
}
```

### Catching Specific Errors

```js
try {
  validateAge("hello")
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed on field: ${error.field}`)
  } else if (error instanceof TypeError) {
    console.log(`Type error: ${error.message}`)
  } else {
    throw error // re-throw unknown errors
  }
}
```

### Re-throwing

If you catch an error you can't handle, **re-throw it**:

```js
try {
  doSomething()
} catch (error) {
  if (error instanceof NetworkError) {
    retry()
  } else {
    throw error // let someone else handle it
  }
}
```

### `throw` in Expressions (Throw Expressions — Proposal)

Currently, `throw` is a **statement**, not an expression:

```js
// These don't work (yet):
const value = input ?? throw new Error("Required") // SyntaxError

// Workaround: use a helper function
function required(name) {
  throw new Error(`${name} is required`)
}
const value = input ?? required("input")
```

### `throw` in Async Functions

```js
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

// Caller:
try {
  await fetchUser(42)
} catch (error) {
  console.log(error.message) // "HTTP 404"
}
```

In async functions, `throw` rejects the returned promise.

## W — Why It Matters

- `throw` is how you signal that something has gone wrong.
- Always throwing `Error` objects (not strings or numbers) is a professional standard.
- Custom error classes make error handling precise and maintainable.
- Re-throwing patterns prevent swallowing errors you can't handle.
- This connects directly to the `Result` pattern you'll learn on Day 12.

## I — Interview Questions with Answers

### Q1: What does `throw` do?

**A:** It stops execution, creates an exception, and propagates it up the call stack until a `try`/`catch` catches it or the program crashes.

### Q2: Why should you throw `Error` objects instead of strings?

**A:** `Error` objects have `.message`, `.name`, `.stack`, and support `Error.cause` and `instanceof` checks. Strings have none of these.

### Q3: What happens if you throw inside an `async` function?

**A:** The returned promise is rejected with the thrown value.

### Q4: What is re-throwing?

**A:** Catching an error, determining you can't handle it, and using `throw error` to pass it up the call stack.

### Q5: How do you create a custom error class?

**A:** Extend `Error`, call `super(message)`, and set `this.name`:

```js
class AppError extends Error {
  constructor(message) {
    super(message)
    this.name = "AppError"
  }
}
```

## C — Common Pitfalls with Fix

### Pitfall: Throwing strings

```js
throw "Something went wrong" // no stack trace, no instanceof
```

**Fix:** `throw new Error("Something went wrong")`

### Pitfall: Catching and swallowing errors

```js
try { doWork() } catch (e) {} // silent failure
```

**Fix:** At minimum, log the error. Better: handle or re-throw.

### Pitfall: Not re-throwing unhandled error types

```js
catch (error) {
  // handles all errors the same way — dangerous
  console.log("Error:", error.message)
}
```

**Fix:** Check the error type and re-throw what you can't handle:

```js
catch (error) {
  if (error instanceof ExpectedError) {
    handle(error)
  } else {
    throw error
  }
}
```

### Pitfall: Forgetting `new` with `Error`

```js
throw Error("oops")     // works but inconsistent
throw new Error("oops") // preferred — standard constructor pattern
```

## K — Coding Challenge with Solution

### Challenge

Write a function `parseAge(input)` that:
1. Throws a `TypeError` if input is not a string.
2. Throws a `RangeError` if the parsed number is negative or over 150.
3. Returns the parsed number otherwise.

Then write a caller that catches each error type differently.

### Solution

```js
function parseAge(input) {
  if (typeof input !== "string") {
    throw new TypeError("Input must be a string")
  }

  const age = Number(input)

  if (Number.isNaN(age)) {
    throw new TypeError("Input must be a numeric string")
  }

  if (age < 0 || age > 150) {
    throw new RangeError("Age must be between 0 and 150")
  }

  return age
}

// Caller
try {
  const age = parseAge("25")
  console.log("Age:", age) // Age: 25
} catch (error) {
  if (error instanceof TypeError) {
    console.log("Type problem:", error.message)
  } else if (error instanceof RangeError) {
    console.log("Range problem:", error.message)
  } else {
    throw error // re-throw unknown errors
  }
}
```

---

# ✅ Day 1 Complete

You've covered all 16 subtopics:

| # | Topic | Status |
|---|-------|--------|
| 1 | Node.js LTS, pnpm, ESLint, Prettier | ✅ |
| 2 | `var`, `let`, `const` | ✅ |
| 3 | Primitives vs Objects | ✅ |
| 4 | Type Coercion | ✅ |
| 5 | `typeof` | ✅ |
| 6 | `==` vs `===` | ✅ |
| 7 | Operators | ✅ |
| 8 | Logical Assignment Operators | ✅ |
| 9 | Optional Chaining (`?.`) | ✅ |
| 10 | Nullish Coalescing (`??`) | ✅ |
| 11 | `void` Operator | ✅ |
| 12 | Control Flow | ✅ |
| 13 | `try` / `catch` / `finally` | ✅ |
| 14 | Built-in Error Types | ✅ |
| 15 | `Error.cause` (ES2022) | ✅ |
| 16 | `throw` | ✅ |

## Next Steps

- `Quiz Day 1` — 5 interview-style problems covering all topics
- `Generate Day 2` — Functions, Scope & Hoisting
- `next topic` — continue to Day 2's first subtopic
