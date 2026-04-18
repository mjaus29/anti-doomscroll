# 13 — `try` / `catch` / `finally`

## T — TL;DR

`try`/`catch`/`finally` is JavaScript's structured error handling mechanism.

```js
try {
  // code that might throw
} catch (error) {
  // handle the error
} finally {
  // always runs — whether error or not
}
```

## K — Key Concepts

### Basic Structure

```js
try {
  const result = JSON.parse("invalid json")
} catch (error) {
  console.error("Parse failed:", error.message)
} finally {
  console.log("This always runs")
}
```

### Only `try` is Required with Either `catch` or `finally`

```js
// try + catch (most common)
try {
  riskyOperation()
} catch (e) {
  handleError(e)
}

// try + finally (no catch)
try {
  acquireResource()
} finally {
  releaseResource() // cleanup runs even if error is thrown upward
}

// try + catch + finally
try {
  doWork()
} catch (e) {
  handleError(e)
} finally {
  cleanup()
}
```

### The `error` Object

```js
try {
  null.toString()
} catch (error) {
  console.log(error.message)  // "Cannot read properties of null (reading 'toString')"
  console.log(error.name)     // "TypeError"
  console.log(error.stack)    // full stack trace
}
```

### Optional Catch Binding (ES2019)

You can omit the error parameter:

```js
try {
  JSON.parse(data)
} catch {
  // don't need the error object
  console.log("Parse failed")
}
```

### `finally` Always Runs

```js
function example() {
  try {
    return "try"
  } finally {
    console.log("finally runs")
  }
}

example() // logs "finally runs", returns "try"
```

Even if there's a `return` in `try` or `catch`, `finally` runs before the function actually returns.

⚠️ If `finally` also has a `return`, it **overrides** the `try`/`catch` return:

```js
function example() {
  try {
    return "try"
  } finally {
    return "finally" // this wins
  }
}

example() // "finally"
```

### Nesting

```js
try {
  try {
    throw new Error("inner")
  } catch (e) {
    console.log("Caught inner:", e.message)
    throw new Error("re-thrown")
  }
} catch (e) {
  console.log("Caught outer:", e.message)
}

// Output:
// Caught inner: inner
// Caught outer: re-thrown
```

### `try`/`catch` Does NOT Catch Async Errors (Without `await`)

```js
try {
  setTimeout(() => {
    throw new Error("async error") // NOT caught!
  }, 100)
} catch (e) {
  console.log("This never runs")
}
```

For async code, you need `async`/`await` with `try`/`catch`, or `.catch()` on promises (covered on Day 5).

## W — Why It Matters

- All real-world code must handle errors — network failures, invalid input, unexpected state.
- `finally` is critical for cleanup: closing connections, releasing locks, hiding loaders.
- Understanding that `try`/`catch` doesn't catch async errors prevents one of the most common async bugs.
- Interview questions test `finally` behavior with `return` statements.

## I — Interview Questions with Answers

### Q1: What is the purpose of `finally`?

**A:** It runs code regardless of whether an error occurred. Used for cleanup like closing connections, releasing resources, or resetting state.

### Q2: Does `finally` run if `try` has a `return`?

**A:** Yes. `finally` always runs. If `finally` itself has a `return`, it overrides the `try`/`catch` return.

### Q3: Can `try`/`catch` catch errors from `setTimeout`?

**A:** No. `setTimeout` callbacks run in a separate call stack. You need error handling inside the callback itself.

### Q4: What is optional catch binding?

**A:** Since ES2019, you can write `catch { }` without the error parameter if you don't need it.

## C — Common Pitfalls with Fix

### Pitfall: `return` in `finally` overrides `try` return

```js
function f() {
  try { return 1 } finally { return 2 }
}
f() // 2 — not 1!
```

**Fix:** Avoid `return` in `finally`. Use `finally` only for cleanup.

### Pitfall: Catching all errors and silencing them

```js
try {
  doSomething()
} catch {
  // empty — swallowed error
}
```

**Fix:** At minimum, log the error. Silent catches hide bugs.

### Pitfall: Assuming `try`/`catch` works for async code

```js
try {
  fetch("/api") // returns a Promise — errors are NOT caught here
} catch (e) {}
```

**Fix:** Use `await`:

```js
try {
  await fetch("/api")
} catch (e) {
  // now it catches
}
```

## K — Coding Challenge with Solution

### Challenge

What is the output?

```js
function test() {
  try {
    console.log("A")
    throw new Error("fail")
    console.log("B")
  } catch (e) {
    console.log("C")
    return "D"
  } finally {
    console.log("E")
  }
}

console.log(test())
```

### Solution

```
A
C
E
D
```

Explanation:
1. `"A"` — logged in try
2. Error is thrown — `"B"` is skipped
3. `"C"` — logged in catch
4. `return "D"` is scheduled but `finally` runs first
5. `"E"` — logged in finally
6. `"D"` — the return value from catch

---
